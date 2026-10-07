import { G } from './context.js';
import { PERF } from '../data/config.js';
import { notify } from '../ui/feedback.js';
import { saveState } from './state.js';

// Graphics compatibility. Three levels; "auto" picks one from the GPU and then steps down whenever the frame time
// stays high, so an integrated or older GPU never has to run bloom, HDR targets or 2× pixel ratio.
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

export function applyQuality(level, { silent = true } = {}) {
  const q = QUALITY[level]; if (!q) return;
  G.quality = level;
  const { renderer, sun, scene } = G;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  const shadows = q.shadows > 0 && G.state?.settings?.shadows !== false;
  sun.castShadow = shadows;
  if (q.shadows > 0 && sun.shadow.mapSize.x !== q.shadows) { sun.shadow.mapSize.set(q.shadows, q.shadows); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (scene.environmentIntensity !== undefined) scene.environmentIntensity = q.env;
  G.composer?.setPixelRatio?.(Math.min(devicePixelRatio || 1, q.pixelRatio)); G.composer?.setSize(innerWidth, innerHeight);
  // crowd and traffic caps: extras are hidden and skipped, not destroyed, so a step up brings them back
  (G.npcs || []).forEach((n, i) => { n.hidden = i >= q.npcs; });
  (G.traffic || []).forEach((t, i) => { t.hidden = i >= q.traffic; if (t.hidden) t.g.visible = false; });
  if (!silent) notify('Graphics', `${q.label} quality — change it under Settings › Graphics.`);
}

// Adaptive: in "auto" mode, 2.5 s of real frame times above 45 ms drops one level (never below low). Manual levels are left alone.
let slowT = 0, settleT = 4, lastT = 0;
export function updateQuality() {
  const now = performance.now(), ft = Math.min(0.5, lastT ? (now - lastT) / 1000 : 0), gap = lastT ? (now - lastT) / 1000 : 0; lastT = now;
  if (G.state?.settings?.quality && G.state.settings.quality !== 'auto') return;
  if (gap > 5) return;                           // tab was hidden
  if (settleT > 0) { settleT -= ft; return; }    // let shaders compile and assets stream in first
  if (ft >= 0.045) slowT += ft; else slowT = Math.max(0, slowT - ft * 0.5);
  if (slowT > 2.5) {
    slowT = 0; settleT = 6;
    const i = LEVELS.indexOf(G.quality); if (i <= 0) return;
    applyQuality(LEVELS[i - 1], { silent: false });
  }
}

// Called once after the renderer exists and whenever the Settings value changes.
export function setQuality(setting) {
  const level = !setting || setting === 'auto' ? detectQuality(G.renderer) : setting;
  if (G.state) { G.state.settings.quality = setting || 'auto'; saveState(G.state); }
  applyQuality(level);
  slowT = 0; settleT = 4;
}
