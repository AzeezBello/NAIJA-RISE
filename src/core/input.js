import * as THREE from 'three';
import { G } from './context.js';
import { emit } from './events.js';

// Arrow keys alias WASD so both layouts work.
const ALIAS = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' };
export const isTouchDevice = () => matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

// Keyboard state lives in G.keys; discrete key presses are broadcast on the 'key' event.
export function setupInput(canvas) {
  G.stick = { x: 0, y: 0, active: false };   // virtual joystick (ui/touch.js)
  addEventListener('keydown', e => {
    if (e.target?.matches?.('input,textarea,select')) return;
    let k = e.key.toLowerCase();
    if (ALIAS[k]) { e.preventDefault(); k = ALIAS[k]; }
    G.keys[k] = true;
    if (k === ' ') e.preventDefault();
    if (!e.repeat) emit('key', k, e);
  });
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); G.keys[ALIAS[k] || k] = false; });
  addEventListener('blur', () => { for (const k in G.keys) G.keys[k] = false; });

  let last = { x: 0, y: 0 }; const touches = new Map(); let pinch = 0;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } }
    if (e.button !== 2 && e.pointerType !== 'touch') return;
    G.dragging = true; last = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); G.camDistance = THREE.MathUtils.clamp(G.camDistance - (d - pinch) * 0.03, 5.5, 18); pinch = d; return; } }
    if (!G.dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    const s = G.state.settings.sens * (e.pointerType === 'touch' ? 1.4 : 1);
    G.camYaw -= dx * 0.006 * s;
    G.camPitch = THREE.MathUtils.clamp(G.camPitch - dy * 0.004 * s, -0.05, 1.05);
  });
  const end = e => { touches.delete(e.pointerId); if (!G.dragging) return; G.dragging = false; canvas.releasePointerCapture?.(e.pointerId); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => {
    G.camDistance = THREE.MathUtils.clamp(G.camDistance + e.deltaY * 0.008, 5.5, 18);
    e.preventDefault();
  }, { passive: false });
}
