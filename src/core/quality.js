import { G } from './context.js';
import { PERF } from '../data/config.js';
import { notify } from '../ui/feedback.js';
import { saveState } from './state.js';

// Graphics compatibility. Three levels; "auto" picks one from the GPU and then steps down whenever the frame time
// stays high, so an integrated or older GPU never has to run bloom, HDR targets or 2× pixel ratio.
// Alpha 1.1 perf pass: dynamic resolution (continuous pixel-ratio scaling within the tier), step-up recovery,
// and a #debug FPS/perf overlay. All three live here because updateQuality() is already called every frame.
export const LEVELS = ['low', 'medium', 'high'];
export const QUALITY = {
  // fx = HDR target + bloom. msaa = samples on the HDR target (costly on integrated GPUs, so High only); fxaa = a cheap
  // post-process anti-alias used instead of MSAA on Medium.
  low:    { label: 'Low',    pixelRatio: 1,    shadows: 0,    fx: false, msaa: 0, fxaa: false, env: 0.2,  npcs: 24, traffic: 16, animRange: 60,  shadowRange: 25, fogScale: 0.75 },
  medium: { label: 'Medium', pixelRatio: 1.25, shadows: 1536, fx: true,  msaa: 0, fxaa: true,  env: 0.4,  npcs: 68, traffic: 28, animRange: 90,  shadowRange: 35, fogScale: 0.9 },
  high:   { label: 'High',   pixelRatio: 1.5,  shadows: 2048, fx: true,  msaa: 2, fxaa: false, env: 0.4,  npcs: 130, traffic: 99, animRange: 120, shadowRange: 50, fogScale: 1 },
};
export const current = () => QUALITY[G.quality || 'medium'];

// GPU heuristic: software / mobile → low; Intel or unknown integrated → medium; Apple M-series, NVIDIA, AMD → high.
export function detectQuality(renderer) {
  let gpu = '';
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch { /* ignore */ }
  G.gpu = gpu;
  if (/swiftshader|llvmpipe|software/i.test(gpu) || PERF.lowEnd) return 'low';
  if (/apple m\d|apple gpu|nvidia|geforce|rtx|radeon|amd/i.test(gpu)) return 'high';
  return 'medium';
}

// ---- dynamic resolution state ----
// Every change reallocates the canvas backbuffer and (with the cinematic look on) the HDR targets and bloom mips, so the
// scale moves in a few discrete steps with hysteresis rather than in small increments, and it gives up when shrinking
// the frame does not make it faster (CPU-bound, or a display capped at 30 fps).
const DYN_STEPS = [1, 0.85, 0.7, 0.55];   // fractions of the tier's pixel-ratio cap; never below 55 %
let dynIdx = 0;                  // index into DYN_STEPS: 0 = full tier resolution
let ema = 1 / 60;                // smoothed frame time (s)
let dynT = 0, fastT = 0;         // dynamic-res tick timer / sustained-fast timer for step-up
let slowTicks = 0, fastTicks = 0;   // consecutive slow / fast evaluations (0.6 s each)
let recoverTicks = 5;            // fast evaluations needed before resolution steps back up; doubles after a failed recovery
let lastRecoverAt = -1e9;        // performance.now() of the last upward step
let streakBase = 0;              // smoothed frame time when the current shrink streak began
let noGainLock = 60000, noGainUntil = 0;   // shrinking is off until this time after a shrink that bought nothing
let autoCeiling = null;          // highest tier the auto governor may climb back to

// Effective pixel ratio: the tier's cap (which itself caps devicePixelRatio) scaled by the current dynamic step.
function applyPixelRatio() {
  const cap = Math.min(devicePixelRatio || 1, current().pixelRatio);
  const pr = cap * DYN_STEPS[dynIdx];
  G.renderer?.setPixelRatio(pr);
  G.composer?.setPixelRatio?.(pr);   // also resizes the composer targets
}

export function applyQuality(level, { silent = true } = {}) {
  const q = QUALITY[level]; if (!q) return;
  G.quality = level;
  const { renderer, sun, scene } = G;
  applyPixelRatio();
  renderer.setSize(innerWidth, innerHeight);
  const shadows = q.shadows > 0 && G.state?.settings?.shadows !== false;
  sun.castShadow = shadows;
  if (q.shadows > 0 && sun.shadow.mapSize.x !== q.shadows) { sun.shadow.mapSize.set(q.shadows, q.shadows); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (scene.environmentIntensity !== undefined) scene.environmentIntensity = q.env;
  // crowd and traffic caps: extras are hidden and skipped, not destroyed, so a step up brings them back
  (G.npcs || []).forEach((n, i) => { n.hidden = i >= q.npcs; });
  (G.traffic || []).forEach((t, i) => { t.hidden = i >= q.traffic; if (t.hidden) t.g.visible = false; });
  if (!silent) notify('Graphics', `${q.label} quality — change it under Settings › Graphics.`);
}

// Auto governor: step down on sustained slow frames (existing behaviour), recover resolution continuously,
// and step back UP a tier after sustained fast frames once resolution is back at 100%.
let slowT = 0, settleT = 4, lastT = 0;
function stepUp() {
  const i = LEVELS.indexOf(G.quality);
  const ceil = autoCeiling ? LEVELS.indexOf(autoCeiling) : LEVELS.length - 1;
  if (i < 0 || i >= ceil) return;
  applyQuality(LEVELS[i + 1], { silent: true });
  slowT = 0; settleT = 4;
  notify('Graphics', `${QUALITY[LEVELS[i + 1]].label} quality restored.`);
}

export function updateQuality() {
  const now = performance.now(), ft = Math.min(0.5, lastT ? (now - lastT) / 1000 : 0), gap = lastT ? (now - lastT) / 1000 : 0; lastT = now;
  const auto = !G.state?.settings?.quality || G.state.settings.quality === 'auto';
  // Show the dev overlay automatically in #debug mode.
  if (G.debug && !overlayEl && !overlayFailed) { try { togglePerfOverlay(true); } catch { overlayFailed = true; } }
  // Dynamic resolution: runs in every mode — it is the safety net under the tier system.
  ema = ema * 0.95 + ft * 0.05;
  dynT -= ft;
  if (dynT <= 0 && gap <= 5) {
    dynT = 0.6;                            // re-evaluate about twice a second, not every frame
    if (ema > 0.027) {                     // ~37 FPS or worse
      fastT = 0; fastTicks = 0;
      if (++slowTicks >= 2 && dynIdx < DYN_STEPS.length - 1 && now >= noGainUntil) {   // ~1.2 s of slow frames: shrink one step
        slowTicks = 0;
        if (dynIdx === 0) streakBase = ema;
        else if (dynIdx >= 2 && ema > streakBase * 0.9) {
          // two steps (about half the pixels) bought less than 10 % frame time: the frame is not fill-rate bound.
          // Go back to full resolution and stop shrinking for a while instead of paying for pointless reallocations.
          dynIdx = 0; applyPixelRatio();
          noGainUntil = now + noGainLock; noGainLock = Math.min(600000, noGainLock * 2);
          return void updateOverlay(ft);
        }
        if (now - lastRecoverAt < 10000) recoverTicks = Math.min(80, recoverTicks * 2);   // we recovered too early: wait longer next time
        dynIdx++; applyPixelRatio();
      }
    } else if (ema < 0.017) {              // ~59 FPS or better
      slowTicks = 0;
      if (dynIdx > 0) {
        if (++fastTicks >= recoverTicks) { fastTicks = 0; dynIdx--; lastRecoverAt = now; applyPixelRatio(); }   // recover one step
      } else if (auto) { fastT += 0.6; if (fastT >= 6) { fastT = 0; stepUp(); } }   // 6 s of headroom → higher tier
    } else { slowTicks = 0; fastTicks = 0; fastT = 0; }
  }
  updateOverlay(ft);
  if (!auto) return;                       // manual levels: resolution still adapts, tiers don't
  if (gap > 5) return;                     // tab was hidden
  if (settleT > 0) { settleT -= ft; return; }    // let shaders compile and assets stream in first
  if (ft >= 0.045) slowT += ft; else slowT = Math.max(0, slowT - ft * 0.5);
  if (slowT > 2.5) {
    slowT = 0; settleT = 6;
    const i = LEVELS.indexOf(G.quality); if (i <= 0) return;
    applyQuality(LEVELS[i - 1], { silent: false });
    fastT = 0;
  }
}

// Called once after the renderer exists and whenever the Settings value changes.
export function setQuality(setting) {
  const detected = !setting || setting === 'auto';
  const level = detected ? detectQuality(G.renderer) : setting;
  autoCeiling = level;                     // auto may climb back to (but not past) the detected tier
  if (G.state) { G.state.settings.quality = setting || 'auto'; saveState(G.state); }
  applyQuality(level);
  slowT = 0; settleT = 4; fastT = 0;
}

// ---- dev overlay (#debug): FPS, frame time, renderer stats, sim counts, dynamic-res state ----
let overlayEl = null, overlayFailed = false, overlayT = 0;
export function togglePerfOverlay(force) {
  const show = force !== undefined ? force : !overlayEl;
  if (overlayEl) { overlayEl.remove(); overlayEl = null; return false; }
  if (!show) return false;
  overlayEl = document.createElement('div');
  overlayEl.style.cssText = 'position:fixed;top:8px;left:8px;z-index:9999;background:rgba(5,12,11,.88);color:#3dff79;' +
    'font:12px/1.55 ui-monospace,monospace;padding:8px 10px;border:1px solid #ffffff30;border-radius:4px;pointer-events:none;white-space:pre;';
  document.body.appendChild(overlayEl);
  return true;
}

function updateOverlay(ft) {
  if (!overlayEl) return;
  overlayT -= ft;
  if (overlayT > 0) return;
  overlayT = 0.25;
  const r = G.renderer, info = r?.info;
  const active = a => (a || []).filter(x => x.g?.visible !== false && !x.hidden).length;
  overlayEl.textContent = [
    'RISE DEV',
    `FPS        ${(1 / ema).toFixed(0)}`,
    `Frame      ${(ema * 1000).toFixed(1)} ms`,
    `Draw Calls ${info?.render.calls ?? '—'}`,
    `Triangles  ${((info?.render.triangles ?? 0) / 1000).toFixed(0)}K`,
    `Textures   ${info?.memory.textures ?? '—'} · Geo ${info?.memory.geometries ?? '—'}`,
    `Vehicles   ${active(G.traffic)} · NPCs ${active(G.npcs)}`,
    `PixelRatio ${r?.getPixelRatio().toFixed(2)} (${(DYN_STEPS[dynIdx] * 100).toFixed(0)}% of tier)`,
    `Graphics   ${(G.quality || '?').toUpperCase()}${autoCeiling ? ` (auto ≤ ${autoCeiling})` : ''}`,
  ].join('\n');
}