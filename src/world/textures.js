import * as THREE from 'three';

// Procedural canvas textures so the build needs no image assets.
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, repeat = 1) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
};
function grain(ctx, w, h, amp) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}
const hex = n => '#' + n.toString(16).padStart(6, '0');

export function asphaltTexture() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#26292b'; g.fillRect(0, 0, 256, 256); grain(g, 256, 256, 26);
  g.strokeStyle = '#1b1d1f'; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(Math.random() * 256, Math.random() * 256); g.lineTo(Math.random() * 256, Math.random() * 256); g.stroke(); }
  return tex(c);
}
export function groundTexture() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#55684f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) { g.fillStyle = Math.random() < 0.5 ? '#4a5b45' : '#6a6f4a'; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 14, 0, Math.PI * 2); g.fill(); }
  grain(g, 256, 256, 22);
  return tex(c);
}
export function concreteTexture() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#9a9b95'; g.fillRect(0, 0, 128, 128); grain(g, 128, 128, 20);
  g.strokeStyle = '#7d7e79'; g.lineWidth = 2; g.strokeRect(1, 1, 126, 126);
  return tex(c);
}
export function roofTexture() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#3a3d3f'; g.fillRect(0, 0, 128, 128); grain(g, 128, 128, 18);
  g.fillStyle = '#2d2f31'; g.fillRect(20, 20, 30, 30); g.fillRect(70, 60, 40, 24);
  return tex(c);
}

// One tile = two windows wide, one floor high. Returns {map, glow}; glow is the emissive map of lit windows.
const facadeCache = new Map();
export function facadeTextures(color) {
  const key = hex(color);
  if (facadeCache.has(key)) return facadeCache.get(key);
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = key; g.fillRect(0, 0, 128, 128); grain(g, 128, 128, 16);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 118, 128, 10);      // floor band
  const e = canvas(128, 128), ge = e.getContext('2d');
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 128);
  for (const x of [14, 70]) {
    g.fillStyle = '#0e1418'; g.fillRect(x, 26, 44, 62);               // frame
    const grd = g.createLinearGradient(0, 26, 0, 88); grd.addColorStop(0, '#2b3f4b'); grd.addColorStop(1, '#16242c');
    g.fillStyle = grd; g.fillRect(x + 3, 29, 38, 56);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 3, 29, 38, 10);
    g.fillStyle = '#0e1418'; g.fillRect(x + 21, 29, 2, 56);           // mullion
    if (Math.random() < 0.45) { ge.fillStyle = Math.random() < 0.7 ? '#ffd48a' : '#cfe6ff'; ge.fillRect(x + 3, 29, 38, 56); }
  }
  const out = { map: tex(c), glow: tex(e) };
  facadeCache.set(key, out);
  return out;
}

export function cloudTexture() {
  const c = canvas(256, 128), g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 40 + Math.random() * 176, y = 40 + Math.random() * 48, r = 22 + Math.random() * 30;
    const grd = g.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function glowTexture() {
  const c = canvas(128, 128), g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(255,230,170,.9)'); grd.addColorStop(0.35, 'rgba(255,220,150,.35)'); grd.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
