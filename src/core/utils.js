// Small shared helpers. No game state here.
export const $ = id => document.getElementById(id);
export const fmt = n => '₦' + Math.round(n).toLocaleString('en-US');
export const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
export const approach = (v, t, s) => (v < t ? Math.min(t, v + s) : Math.max(t, v - s));
export const lerpAngle = (a, b, t) => {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
};
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const ago = t => {
  const s = (Date.now() - t) / 1000;
  return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd';
};
