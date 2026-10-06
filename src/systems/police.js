import * as THREE from 'three';
import { G, pos, frozen } from '../core/context.js';
import { emit } from '../core/events.js';
import { dist, fmt } from '../core/utils.js';
import { ECON, LAW } from '../data/config.js';
import { placeOf } from '../data/locations.js';
import { rejoinTraffic } from '../entities/vehicles.js';
import { toast } from '../ui/feedback.js';
import { tx, msg, pay, addHeat } from './economy.js';

// Law and order: FRSC speeding tickets, army checkpoint, pedestrian hits, police pursuit and arrest at Heat 3+.
let ticketT = 0, checkT = 0, bustT = 0, flash = 0;
const kmh = () => Math.abs(G.carSpeed) * 3.6;

function bust() {
  const s = G.state, fine = s.heat * ECON.bustRate;
  if (!pay(fine, 'Police fine')) { s.cash = 0; s.bank = 0; tx('Police fine (all funds)', -fine); }
  s.heat = 0;
  if (G.inCar) { G.inCar = false; G.player.visible = true; G.car = null; G.carSpeed = 0; }
  const st = placeOf('police');
  G.player.position.set(st.x, 0, st.z + 12);
  G.camYaw = Math.PI;
  for (const t of G.traffic) if (t.pursuit) rejoinTraffic(t);
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
}
export const wanted = () => G.state.heat >= LAW.pursuitHeat;
