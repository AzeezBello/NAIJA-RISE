import * as THREE from 'three';
import { G, pos, frozen } from '../core/context.js';
import { emit } from '../core/events.js';
import { dist, fmt } from '../core/utils.js';
import { ECON, LAW } from '../data/config.js';
import { placeOf } from '../data/locations.js';
import { rejoinTraffic } from '../entities/vehicles.js';
import { toast } from '../ui/feedback.js';
import { tx, msg, pay, addHeat, addRep, removeItem } from './economy.js';
import { startDialog } from './dialogue.js';
import { failTaskOnArrest } from './missions.js';
import { box } from '../world/builders.js';
import { colliders } from '../world/builders.js';
import { homeProp } from './navigation.js';

// Law and order: FRSC speeding tickets, army checkpoint, pedestrian hits, police pursuit and arrest at Heat 3+.
let ticketT = 0, checkT = 0, bustT = 0, flash = 0;
const kmh = () => Math.abs(G.carSpeed) * 3.6;

let busting = false;
function bust() {
  if (busting) return; busting = true;
  const s = G.state, bribe = s.heat * 5000;
  G.carSpeed = 0;
  startDialog([{ s: 'police', t: `Oga, pull over. Heat ${s.heat}. We fit settle am here for ${fmt(bribe)}, or you follow us go station.` }], [
    { label: `Settle here · ${fmt(bribe)}`, apply() { if (!pay(bribe, 'Settled with the police')) { toast('No money — station it is'); arrest(); return; } if (Math.random() < 0.6) { s.heat = 0; addRep('street', 2); for (const t of G.traffic) if (t.pursuit) rejoinTraffic(t); toast('They collect and let you go'); } else { toast('Wrong officer. You still go station.'); arrest(); } } },
    { label: 'Follow them to Area C', apply() { arrest(); } },
  ], ch => { ch.apply(); busting = false; emit('hud'); });
}
function arrest() {
  const s = G.state, fine = s.heat * ECON.bustRate;
  failTaskOnArrest();
  if (!pay(fine, 'Police fine')) { s.cash = 0; s.bank = 0; tx('Police fine (all funds)', -fine); }
  s.heat = 0;
  if (G.inCar) { G.inCar = false; G.player.visible = true; G.car = null; G.carSpeed = 0; }
  const st = placeOf('police');
  G.player.position.set(st.x, 0, st.z + 12);
  G.camYaw = Math.PI;
  for (const t of G.traffic) if (t.pursuit) rejoinTraffic(t);
  addRep('public', -10); addRep('street', 3);
  if (s.chase) { s.chase = false; removeItem('package'); s.mission = Math.max(0, s.mission - 1); msg('amaka', 'Dem catch you with the package? Wahala. Come back when the heat don cool, we go try again.'); emit('mission:refresh'); }
  toast(`Arrested · ${fmt(fine)} fine · released at Area C`);
  msg('police', `You were booked at Area C. Fine of ${fmt(fine)} paid. Next time we no go be so gentle.`);
  emit('hud');
}

export function updateLaw(dt) {
  const s = G.state, p = pos();
  ticketT -= dt; checkT -= dt;
  if (G.inCar && !frozen()) {
    // FRSC checkpoint on the x=72 road
    const frsc = placeOf('frsc');
    if (ticketT <= 0 && kmh() > LAW.ticketKmh && Math.abs(p.x - 72) < 12 && Math.abs(p.z - frsc.z) < 10) {
      ticketT = 60;
      if (pay(ECON.speedTicket, 'FRSC speeding ticket')) toast(`FRSC · speeding ticket ${fmt(ECON.speedTicket)}`); else addHeat(1, 'Ran the FRSC checkpoint');
      emit('hud');
    }
    // Army checkpoint by the barracks gate
    const army = placeOf('army');
    if (checkT <= 0 && kmh() > LAW.checkpointKmh && dist(p, { x: army.x - 4, z: army.z + 14 }) < 12) { checkT = 45; addHeat(1, 'Sped past the army checkpoint'); }
    // Pedestrians
    if (kmh() > 25) for (const n of G.npcs) {
      if (n.hitT > 0 || dist(p, n.g.position) > 1.9) continue;
      n.hitT = 6; n.v.set(0, 0, 0);
      const away = new THREE.Vector3().subVectors(n.g.position, p).setY(0).normalize();
      n.g.position.addScaledVector(away, 3);
      addHeat(1, 'Hit a pedestrian');
      break;
    }
  }
  // Pursuit
  const chasing = s.heat >= LAW.pursuitHeat && !frozen();
  flash += dt;
  let near = false;
  for (const t of G.traffic) {
    if (t.type !== 'police') continue;
    const bar = t.g.userData.lightbar;
    if (!chasing) { if (t.pursuit) rejoinTraffic(t); if (bar) { bar.emissive.set(0x2244ff); bar.emissiveIntensity = 0.4; } continue; }
    t.pursuit = true;
    const dx = p.x - t.g.position.x, dz = p.z - t.g.position.z, d = Math.hypot(dx, dz);
    if (d > 1) {
      const sp = Math.min(24, 6 + d * 1.5);
      t.g.position.x += dx / d * sp * dt; t.g.position.z += dz / d * sp * dt;
      t.g.rotation.y = Math.atan2(-dx, -dz);
    }
    if (bar) { bar.emissive.set(Math.floor(flash * 6) % 2 ? 0xff2222 : 0x2244ff); bar.emissiveIntensity = 2; }
    if (d < 4.5) near = true;
  }
  if (chasing && near) { bustT += dt; if (bustT > LAW.bustSeconds) { bustT = 0; bust(); } } else bustT = 0;
  updateRoadblocks(s.heat >= 4);
  layLow(dt, chasing);
}
export const wanted = () => G.state.heat >= LAW.pursuitHeat;

// Heat 4+: the army blocks Funsho Williams at Bode Thomas and Ogunlana Drive at Shitta.
const BLOCKS = [{ x: 72, z: 14, w: 18, d: 2.5 }, { x: -72, z: -14, w: 18, d: 2.5 }];
let blocks = null;
function updateRoadblocks(on) {
  if (on && !blocks) {
    blocks = BLOCKS.map(b => { const m = box(b.x, b.z, b.w, b.d, 1.2, 0x3f5a2a, 'prop'); const c = { x: b.x, z: b.z, w: b.w, d: b.d }; colliders.push(c); m.userData.collider = c; for (const ox of [-6, 0, 6]) box(b.x + ox, b.z, 0.5, 0.5, 2.2, 0xd9c22e, 'prop').userData.block = m; return m; });
    toast('ARMY ROADBLOCKS — Funsho Williams and Ogunlana Drive are closed');
  }
  if (!on && blocks) { for (const m of blocks) { const i = colliders.indexOf(m.userData.collider); if (i >= 0) colliders.splice(i, 1); G.scene.remove(m); } G.scene.children.filter(o => o.userData.block).forEach(o => G.scene.remove(o)); blocks = null; }
}
// Safe house: stay at your gate for ten seconds while wanted and the patrols give up (heat drops to 2).
let lowT = 0;
function layLow(dt, chasing) {
  const h = homeProp();
  if (chasing && h && !G.inCar && dist(G.player.position, h.door) < 6) { lowT += dt; if (lowT > 10) { lowT = 0; G.state.heat = 2; for (const t of G.traffic) if (t.pursuit) rejoinTraffic(t); toast('You lay low at home — the patrols move on'); emit('hud'); } }
  else lowT = 0;
}
