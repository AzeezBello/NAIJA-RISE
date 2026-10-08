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
  low:    { label: 'Low',    pixelRatio: 1,    shadows: 0,    fx: false, env: 0.2,  npcs: 10, traffic: 12, animRange: 60,  shadowRange: 25, fogScale: 0.75 },
  medium: { label: 'Medium', pixelRatio: 1.25, shadows: 1024, fx: false, env: 0.35, npcs: 16, traffic: 18, animRange: 90,  shadowRange: 35, fogScale: 0.9 },
  high:   { label: 'High',   pixelRatio: 1.5,  shadows: 2048, fx: true,  env: 0.4,  npcs: 99, traffic: 99, animRange: 120, shadowRange: 50, fogScale: 1 },
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
const DYN_MIN = 0.55;            // never render below 55% of the tier's pixel-ratio cap
let dynScale = 1;                // 1 = full tier resolution, drops under load, recovers when fast
let ema = 1 / 60;                // smoothed frame time (s)
let dynT = 0, fastT = 0;         // dynamic-res tick timer / sustained-fast timer for step-up
let autoCeiling = null;          // highest tier the auto governor may climb back to

// Effective pixel ratio: the tier's cap (which itself caps devicePixelRatio) scaled by dynScale.
function applyPixelRatio() {
  const cap = Math.min(devicePixelRatio || 1, current().pixelRatio);
  const pr = cap * Math.max(DYN_MIN, Math.min(1, dynScale));
  G.renderer?.setPixelRatio(pr);
  G.composer?.setPixelRatio?.(pr);
  G.composer?.setSize?.(innerWidth, innerHeight);
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
    dynT = 0.6;                            // re-evaluate twice a second, not every frame
    if (ema > 0.027 && dynScale > DYN_MIN) {          // ~37 FPS or worse: shrink
      dynScale = Math.max(DYN_MIN, dynScale - 0.06);
      applyPixelRatio(); fastT = 0;
    } else if (ema < 0.017) {                          // ~59 FPS or better: recover
      if (dynScale < 1) { dynScale = Math.min(1, dynScale + 0.02); applyPixelRatio(); }
      else if (auto) { fastT += 0.6; if (fastT >= 6) { fastT = 0; stepUp(); } }   // 6 s of headroom → higher tier
    } else fastT = 0;
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
    'NAIJA RISE DEV',
    `FPS        ${(1 / ema).toFixed(0)}`,
    `Frame      ${(ema * 1000).toFixed(1)} ms`,
    `Draw Calls ${info?.render.calls ?? '—'}`,
    `Triangles  ${((info?.render.triangles ?? 0) / 1000).toFixed(0)}K`,
    `Textures   ${info?.memory.textures ?? '—'} · Geo ${info?.memory.geometries ?? '—'}`,
    `Vehicles   ${active(G.traffic)} · NPCs ${active(G.npcs)}`,
    `PixelRatio ${r?.getPixelRatio().toFixed(2)} (${(Math.min(1, dynScale) * 100).toFixed(0)}% of tier)`,
    `Graphics   ${(G.quality || '?').toUpperCase()}${autoCeiling ? ` (auto ≤ ${autoCeiling})` : ''}`,
  ].join('\n');
}