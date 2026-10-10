import { G, pos } from '../core/context.js';
import { $, clampN } from '../core/utils.js';
import { ROADS, ROAD_NAMES, LANDMARKS, BUSSTOPS, PROPERTIES, WATER, WATERS, roadExtent, ROAD_WIDTHS, BRIDGES, META, REGIONS } from '../data/locations.js';
import { BUSINESSES } from '../data/businesses.js';
import { VEH } from '../data/vehicles.js';
import { vForward } from '../entities/vehicles.js';
import { gpsTarget, setWaypoint } from '../systems/navigation.js';
import { toast } from './feedback.js';

const KIND_COLORS = { police: '#2c3f70', army: '#3f5a2a', service: '#8a4a2a', bank: '#4a4a8a', venue: '#7a2a6a', hotel: '#6a5a9a', market: '#6b4737', checkpoint: '#e4d14b', post: '#8b1e2d' };
const PHONE_MAP_ZOOM = { value: 1, min: 1, max: 6 };
const PHONE_MAP_PAN = { x: 0, y: 0 };

// Shared world drawing in world units; callers set up the transform.
function drawWorld(g) {
  g.fillStyle = '#122820'; g.fillRect(META.bounds.x[0] - 40, META.bounds.z[0] - 40, META.bounds.x[1] - META.bounds.x[0] + 80, META.bounds.z[1] - META.bounds.z[0] + 80);
  g.fillStyle = '#0e5f72'; for (const w of WATERS) g.fillRect(w.x[0], w.z[0], w.x[1] - w.x[0], w.z[1] - w.z[0]);
  for (const z of ROADS.h) { const [a, b] = roadExtent('h', z), w = ROAD_WIDTHS.h[z] * 0.9; g.fillStyle = z === 142 ? '#3a4d46' : '#2b3f38'; g.fillRect(a, z - w / 2, b - a, w); }
  for (const x of ROADS.v) { const [a, b] = roadExtent('v', x), w = ROAD_WIDTHS.v[x] * 0.9; g.fillStyle = '#2b3f38'; g.fillRect(x - w / 2, a, w, b - a); }
  g.fillStyle = '#4a5a62'; for (const b of BRIDGES) { const w = ROAD_WIDTHS[b.axis][b.k] * 0.9; if (b.axis === 'h') g.fillRect(b.from, b.k - w / 2, b.to - b.from, w); else g.fillRect(b.k - w / 2, b.from, w, b.to - b.from); }
  g.fillStyle = '#e6d58a33'; for (const z of ROADS.h) { const [a, b] = roadExtent('h', z); g.fillRect(a, z - 0.4, b - a, 0.8); } for (const x of ROADS.v) { const [a, b] = roadExtent('v', x); g.fillRect(x - 0.4, a, 0.8, b - a); }
  for (const l of LANDMARKS) {
    if (l.stadium) { g.fillStyle = l.c; g.beginPath(); g.arc(l.x, l.z, 22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a5055'; g.beginPath(); g.arc(l.x, l.z, 14, 0, Math.PI * 2); g.fill(); continue; }
    g.fillStyle = KIND_COLORS[l.kind] || l.c;
    if (l.kind === 'checkpoint' || l.kind === 'post') g.fillRect(l.x - 2.5, l.z - 2.5, 5, 5); else if (l.kind === 'theatre') { g.beginPath(); g.arc(l.x, l.z, 16, 0, Math.PI * 2); g.fill(); } else g.fillRect(l.x - 9, l.z - 7, 18, 14);
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
  if (!map.dataset.expandBound) {
    map.dataset.expandBound = 'true';
    map.addEventListener('click', () => emit('phone:open', 'map'));
  }
  const R = 150, W = 300, p = pos(), s = R / 52, rot = G.state.settings.rotateMap ? G.camYaw : 0;
  ctx.clearRect(0, 0, W, W); ctx.fillStyle = '#0a1612'; ctx.fillRect(0, 0, W, W);
  ctx.save(); ctx.translate(R, R); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-p.x, -p.z); drawWorld(ctx); ctx.restore();
  arrow(ctx, R, R, rot + heading(), 9, '#fff');
  // soft ring under player
  ctx.beginPath(); ctx.arc(R, R, 14, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 2; ctx.stroke();

  // GPS edge arrow already exists; ensure mission kind stays brightest:
  // (no change required if t.kind === 'mission' uses #ffc52f)
  
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
  const pctx = pmap.getContext('2d'), W = pmap.width, { cx, cy, s } = phoneMapTransform(W, pmap.height);
  pctx.clearRect(0, 0, W, W); pctx.fillStyle = '#0a1612'; pctx.fillRect(0, 0, W, W);
  pctx.save(); pctx.translate(cx, cy); pctx.scale(s, s); drawWorld(pctx); pctx.restore();
  const p = pos(); arrow(pctx, cx + p.x * s, cy + p.z * s, heading(), 9, '#fff');
  pctx.textAlign = 'center'; pctx.textBaseline = 'top';
  for (const l of LANDMARKS) {
    const small = l.kind === 'checkpoint' || l.kind === 'post';
    pctx.fillStyle = small ? l.c : '#fff'; pctx.font = `700 ${small ? 8 : 11}px Inter,sans-serif`;
    pctx.fillText(l.short, cx + l.x * s, cy + (l.z + (l.stadium ? 24 : small ? 4 : 9)) * s);
  }
  pctx.fillStyle = '#f5c518'; pctx.font = '700 8px Inter,sans-serif'; for (const b of BUSSTOPS) pctx.fillText(b.short, cx + b.x * s, cy + (b.z + 3) * s);
  pctx.fillStyle = '#bfe8cf'; pctx.font = '700 9px Inter,sans-serif';
  for (const pr of PROPERTIES) if (G.state.props.includes(pr.id)) pctx.fillText(pr.id === G.state.home ? 'HOME' : pr.name.toUpperCase(), cx + pr.x * s, cy + (pr.z + 8) * s);
  pctx.fillStyle = '#c9d6cf'; pctx.font = '600 8px Inter,sans-serif'; pctx.textBaseline = 'middle';
  for (const z of ROADS.h) { const [a, b] = roadExtent('h', z); pctx.fillText(ROAD_NAMES.h[z].toUpperCase().split(' · ')[0], cx + ((a + b) / 2 + (z === 0 ? -90 : 0)) * s, cy + (z - 9) * s); }
  for (const x of ROADS.v) { const [a] = roadExtent('v', x); pctx.save(); pctx.translate(cx + (x + 7) * s, cy + (a + 60) * s); pctx.rotate(-Math.PI / 2); pctx.fillText(ROAD_NAMES.v[x].toUpperCase().split(' · ')[0], 0, 0); pctx.restore(); }
  pctx.fillStyle = '#9fd8e6'; pctx.font = '700 10px Inter,sans-serif'; pctx.fillText('LAGOS LAGOON', cx + WATER.x * s, cy + 60 * s); pctx.fillText('ATLANTIC', cx + 480 * s, cy + 360 * s);
  pctx.fillStyle = '#ffffff'; pctx.font = '800 10px Inter,sans-serif';
  for (const r of REGIONS) {
    const x = (r.x[0] + r.x[1]) / 2, z = (r.z[0] + r.z[1]) / 2;
    pctx.fillText(r.name.toUpperCase(), cx + x * s, cy + z * s);
  }
}
function phoneMapTransform(width, height) {
  const { x, z } = META.bounds;
  const s = Math.min(width / (x[1] - x[0]), height / (z[1] - z[0])) * 0.92 * PHONE_MAP_ZOOM.value;
  return {
    s,
    cx: width / 2 - (x[0] + x[1]) / 2 * s + PHONE_MAP_PAN.x,
    cy: height / 2 - (z[0] + z[1]) / 2 * s + PHONE_MAP_PAN.y,
  };
}
function setPhoneMapZoom(zoom, anchorX, anchorY, width, height) {
  const previous = phoneMapTransform(width, height);
  const worldX = (anchorX - previous.cx) / previous.s;
  const worldZ = (anchorY - previous.cy) / previous.s;
  PHONE_MAP_ZOOM.value = Math.max(PHONE_MAP_ZOOM.min, Math.min(PHONE_MAP_ZOOM.max, zoom));
  const { x, z } = META.bounds;
  const baseScale = Math.min(width / (x[1] - x[0]), height / (z[1] - z[0])) * 0.92;
  const s = baseScale * PHONE_MAP_ZOOM.value;
  PHONE_MAP_PAN.x = anchorX - (width / 2 - (x[0] + x[1]) / 2 * s + worldX * s);
  PHONE_MAP_PAN.y = anchorY - (height / 2 - (z[0] + z[1]) / 2 * s + worldZ * s);
}
export function bindPhoneMap() {
  const pmap = $('pmap'); if (!pmap) return;
  if (pmap.dataset.mapBound) return;
  pmap.dataset.mapBound = 'true';
  const point = e => {
    const r = pmap.getBoundingClientRect();
    return { x: (e.clientX - r.left) * pmap.width / r.width, y: (e.clientY - r.top) * pmap.height / r.height };
  };
  let drag = null;
  pmap.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, moved: false, startX: PHONE_MAP_PAN.x, startY: PHONE_MAP_PAN.y };
    pmap.setPointerCapture(e.pointerId);
  });
  pmap.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = pmap.getBoundingClientRect();
    const dx = (e.clientX - drag.x) * pmap.width / r.width;
    const dy = (e.clientY - drag.y) * pmap.height / r.height;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    PHONE_MAP_PAN.x = drag.startX + dx;
    PHONE_MAP_PAN.y = drag.startY + dy;
    phoneMapDraw();
  });
  const endDrag = e => {
    if (!drag) return;
    const moved = drag.moved;
    if (!moved) setMapWaypoint(e);
    drag = null;
  };
  pmap.addEventListener('pointerup', endDrag);
  pmap.addEventListener('pointercancel', () => { drag = null; });
  pmap.addEventListener('wheel', e => {
    e.preventDefault();
    const p = point(e);
    setPhoneMapZoom(PHONE_MAP_ZOOM.value * (e.deltaY < 0 ? 1.2 : 1 / 1.2), p.x, p.y, pmap.width, pmap.height);
    phoneMapDraw();
  }, { passive: false });
  pmap.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  pmap.addEventListener('touchmove', e => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  for (const button of document.querySelectorAll('[data-map-zoom]')) {
    if (button.dataset.mapZoomBound) continue;
    button.dataset.mapZoomBound = 'true';
    button.addEventListener('click', () => {
      if (button.dataset.mapZoom === 'reset') {
        PHONE_MAP_ZOOM.value = 1;
        PHONE_MAP_PAN.x = PHONE_MAP_PAN.y = 0;
      } else {
        const r = pmap.getBoundingClientRect();
        const factor = button.dataset.mapZoom === 'in' ? 1.5 : 1 / 1.5;
        setPhoneMapZoom(PHONE_MAP_ZOOM.value * factor, pmap.width / 2, pmap.height / 2, pmap.width, pmap.height);
      }
      phoneMapDraw();
    });
  }
}
function setMapWaypoint(e) {
    const pmap = $('pmap');
    if (!pmap) return;
    const r = pmap.getBoundingClientRect();
    const px = (e.clientX - r.left) * pmap.width / r.width;
    const py = (e.clientY - r.top) * pmap.height / r.height;
    const { cx, cy, s } = phoneMapTransform(pmap.width, pmap.height);
    const x = (px - cx) / s, z = (py - cy) / s;
    const b = META.bounds; setWaypoint({ x: clampN(x, b.x[0], b.x[1]), z: clampN(z, b.z[0], b.z[1]), label: 'Waypoint' }); toast('GPS waypoint set');
}
