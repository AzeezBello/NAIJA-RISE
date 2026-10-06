import { G, pos } from '../core/context.js';
import { $, clampN } from '../core/utils.js';
import { ROADS, LANDMARKS, BUSSTOPS, PROPERTIES, WATER } from '../data/locations.js';
import { BUSINESSES } from '../data/businesses.js';
import { VEH } from '../data/vehicles.js';
import { vForward } from '../entities/vehicles.js';
import { gpsTarget, setWaypoint } from '../systems/navigation.js';
import { toast } from './feedback.js';

const KIND_COLORS = { police: '#2c3f70', army: '#3f5a2a', service: '#8a4a2a', bank: '#4a4a8a', venue: '#7a2a6a', hotel: '#6a5a9a', market: '#6b4737', checkpoint: '#e4d14b', post: '#8b1e2d' };

// Shared world drawing in world units; callers set up the transform.
function drawWorld(g) {
  g.fillStyle = '#122820'; g.fillRect(-200, -200, 400, 400);
  g.fillStyle = '#0e5f72'; g.fillRect(WATER.x - WATER.w / 2, -200, WATER.w, 400);
  g.fillStyle = '#2b3f38'; for (const z of ROADS.h) g.fillRect(-150, z - 10, 300, 20); for (const x of ROADS.v) g.fillRect(x - 10, -150, 20, 300);
  g.fillStyle = '#e6d58a33'; for (const z of ROADS.h) g.fillRect(-150, z - 0.4, 300, 0.8); for (const x of ROADS.v) g.fillRect(x - 0.4, -150, 0.8, 300);
  for (const l of LANDMARKS) {
    if (l.stadium) { g.fillStyle = l.c; g.beginPath(); g.arc(l.x, l.z, 22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a5055'; g.beginPath(); g.arc(l.x, l.z, 14, 0, Math.PI * 2); g.fill(); continue; }
    g.fillStyle = KIND_COLORS[l.kind] || l.c;
    if (l.kind === 'checkpoint' || l.kind === 'post') g.fillRect(l.x - 2.5, l.z - 2.5, 5, 5); else g.fillRect(l.x - 9, l.z - 7, 18, 14);
  }
  for (const b of BUSSTOPS) { g.fillStyle = '#f5c518'; g.fillRect(b.x - 3.5, b.z - 1.3, 7, 2.6); }
  for (const p of PROPERTIES) { g.fillStyle = G.state.props.includes(p.id) ? (p.id === G.state.home ? '#3dff79' : '#9fe3b8') : '#4a5a52'; g.fillRect(p.x - 8, p.z - 6, 16, 12); }
  for (const b of BUSINESSES) if (G.state.owned.includes(b.id)) { g.fillStyle = '#ffc52f'; g.fillRect(b.x - 2.5, b.z - 2.5, 5, 5); }
  if (G.currentRoute) { g.strokeStyle = '#3dff79'; g.lineWidth = 2.4; g.setLineDash([3, 2]); g.beginPath(); G.currentRoute.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.stroke(); g.setLineDash([]); }
  g.fillStyle = '#ffffffaa'; for (const c of G.parked) { if (G.inCar && c === G.car) continue; g.fillRect(c.position.x - 1.5, c.position.z - 2, 3, 4); }
  for (const t of G.traffic) {
    g.fillStyle = t.type === 'police' ? (t.pursuit ? '#ff4040' : '#7fa0ff') : '#ffffff66';
    const L = VEH[t.type].len / 2;
    if (t.axis === 'h' && !t.pursuit) g.fillRect(t.g.position.x - L, t.g.position.z - 1.1, L * 2, 2.2); else g.fillRect(t.g.position.x - 1.1, t.g.position.z - L, 2.2, L * 2);
  }
  const dot = (x, z, c, r = 3.2) => { g.fillStyle = c; g.beginPath(); g.arc(x, z, r, 0, Math.PI * 2); g.fill(); };
  const M = G.markers;
  if (M.mission.visible) dot(M.mission.position.x, M.mission.position.z, '#ffc52f');
  if (M.job.visible) dot(M.job.position.x, M.job.position.z, '#5db8ff');
  if (M.wp.visible) dot(M.wp.position.x, M.wp.position.z, '#c77dff');
}
function arrow(g, x, y, ang, sz, c) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = c;
  g.beginPath(); g.moveTo(0, -sz); g.lineTo(sz * 0.68, sz * 0.8); g.lineTo(0, sz * 0.45); g.lineTo(-sz * 0.68, sz * 0.8); g.closePath(); g.fill(); g.restore();
}
function heading() {
  if (G.inCar) { const f = vForward(G.car); return Math.atan2(f.x, -f.z); }
  return Math.atan2(Math.sin(G.player.rotation.y), -Math.cos(G.player.rotation.y));
}

// Circular HUD minimap, centred on the player, rotating with the camera.
export function mapDraw() {
  const map = $('map'), ctx = map.getContext('2d');
  const R = 150, W = 300, p = pos(), s = R / 52, rot = G.state.settings.rotateMap ? G.camYaw : 0;
  ctx.clearRect(0, 0, W, W); ctx.fillStyle = '#0a1612'; ctx.fillRect(0, 0, W, W);
  ctx.save(); ctx.translate(R, R); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-p.x, -p.z); drawWorld(ctx); ctx.restore();
  arrow(ctx, R, R, rot + heading(), 9, '#fff');
  const t = gpsTarget();
  if (t) {
    const rel = { x: (t.x - p.x) * s, y: (t.z - p.z) * s };
    const rx = rel.x * Math.cos(rot) - rel.y * Math.sin(rot), ry = rel.x * Math.sin(rot) + rel.y * Math.cos(rot), d = Math.hypot(rx, ry);
    if (d > R - 14) { const k = (R - 14) / d; arrow(ctx, R + rx * k, R + ry * k, Math.atan2(rx, -ry), 8, { wp: '#c77dff', job: '#5db8ff', mission: '#ffc52f' }[t.kind]); }
  }
  ctx.fillStyle = '#ffffffcc'; ctx.font = '900 13px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N', R + Math.sin(rot) * (R - 13), R - Math.cos(rot) * (R - 13));
}

// Full district map inside the phone, north-up, with labels. Tap sets a waypoint.
export function phoneMapDraw() {
  const pmap = $('pmap'); if (!pmap) return;
  const pctx = pmap.getContext('2d'), W = pmap.width, s = W / 330;
  pctx.clearRect(0, 0, W, W); pctx.fillStyle = '#0a1612'; pctx.fillRect(0, 0, W, W);
  pctx.save(); pctx.translate(W / 2, W / 2); pctx.scale(s, s); drawWorld(pctx); pctx.restore();
  const p = pos(); arrow(pctx, W / 2 + p.x * s, W / 2 + p.z * s, heading(), 9, '#fff');
  pctx.textAlign = 'center'; pctx.textBaseline = 'top';
  for (const l of LANDMARKS) {
    const small = l.kind === 'checkpoint' || l.kind === 'post';
    pctx.fillStyle = small ? l.c : '#fff'; pctx.font = `700 ${small ? 8 : 11}px Inter,sans-serif`;
    pctx.fillText(l.short, W / 2 + l.x * s, W / 2 + (l.z + (l.stadium ? 24 : small ? 4 : 9)) * s);
  }
  pctx.fillStyle = '#f5c518'; pctx.font = '700 8px Inter,sans-serif'; for (const b of BUSSTOPS) pctx.fillText(b.short, W / 2 + b.x * s, W / 2 + (b.z + 3) * s);
  pctx.fillStyle = '#bfe8cf'; pctx.font = '700 9px Inter,sans-serif';
  for (const pr of PROPERTIES) if (G.state.props.includes(pr.id)) pctx.fillText(pr.id === G.state.home ? 'HOME' : pr.name.toUpperCase(), W / 2 + pr.x * s, W / 2 + (pr.z + 8) * s);
  pctx.fillStyle = '#9fd8e6'; pctx.font = '700 11px Inter,sans-serif'; pctx.save(); pctx.translate(W / 2 + WATER.x * s + 20, W / 2); pctx.rotate(-Math.PI / 2); pctx.textBaseline = 'middle'; pctx.fillText('LAGOON', 0, 0); pctx.restore();
}
export function bindPhoneMap() {
  const pmap = $('pmap'); if (!pmap) return;
  pmap.addEventListener('click', e => {
    const r = pmap.getBoundingClientRect(), s = pmap.width / 330;
    const x = ((e.clientX - r.left) * pmap.width / r.width - pmap.width / 2) / s, z = ((e.clientY - r.top) * pmap.height / r.height - pmap.height / 2) / s;
    setWaypoint({ x: clampN(x, -145, 145), z: clampN(z, -145, 145), label: 'Waypoint' }); toast('GPS waypoint set');
  });
}
