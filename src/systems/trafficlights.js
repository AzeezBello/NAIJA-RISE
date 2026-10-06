import * as THREE from 'three';
import { G, pos } from '../core/context.js';
import { dist, fmt } from '../core/utils.js';
import { JUNCTIONS, ROAD_WIDTHS, roadRules, SERVICE_NPCS } from '../data/locations.js';
import { mat, box, staticCyl } from '../world/builders.js';
import { toast } from '../ui/feedback.js';
import { pay, addHeat } from './economy.js';

// Traffic lights at every grid junction (expressway excluded). One cycle: h-green 12 s, amber 2 s, v-green 12 s, amber 2 s.
// Traffic AI stops on red; the player running a red near a LASTMA officer gets a ticket.
const CYCLE = 28, lamps = [];
let t = 0, ticketT = 0, lastJ = null;
export const JUNCTION_LIGHTS = JUNCTIONS.filter(j => roadRules('h', j.z).lights !== false);

// 'green' | 'amber' | 'red' for the given axis at the current phase.
export function lightFor(axis) {
  const p = t % CYCLE;
  if (axis === 'h') return p < 12 ? 'green' : p < 14 ? 'amber' : 'red';
  return p < 14 ? 'red' : p < 26 ? 'green' : 'amber';
}
const COLORS = { green: 0x19c45a, amber: 0xffb020, red: 0xff2d2d };

export function buildTrafficLights() {
  for (const j of JUNCTION_LIGHTS) {
    const hw = ROAD_WIDTHS.v[j.x] / 2 + 1.5, hd = ROAD_WIDTHS.h[j.z] / 2 + 1.5;
    // one pole per corner: two face each axis
    for (const [sx, sz, axis] of [[1, 1, 'h'], [-1, -1, 'h'], [1, -1, 'v'], [-1, 1, 'v']]) {
      const x = j.x + sx * hw, z = j.z + sz * hd;
      staticCyl('poles', x, z, 0.1, 4.6, 0, 6);
      const head = box(x, z, 0.5, 0.5, 1.3, 0x1b1b1b, 'prop', 4.6);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0xff2d2d, emissiveIntensity: 1.2 }));
      lamp.position.set(axis === 'h' ? 0 : 0.26, 0.3, axis === 'h' ? 0.26 : 0); head.add(lamp);
      lamps.push({ m: lamp.material, axis });
    }
  }
}

export function updateTrafficLights(dt) {
  t += dt; ticketT -= dt;
  const h = lightFor('h'), v = lightFor('v');
  for (const l of lamps) { const c = COLORS[l.axis === 'h' ? h : v]; if (l.m.color.getHex() !== c) { l.m.color.set(c); l.m.emissive.set(c); } }
  // player running a red light under LASTMA's eye
  if (!G.inCar || ticketT > 0) return;
  const p = pos(), kmh = Math.abs(G.carSpeed) * 3.6; if (kmh < 12) return;
  const f = Math.abs(Math.sin(G.car.rotation.y)) > 0.7 ? 'h' : 'v';   // heading along x → h-axis
  for (const j of JUNCTION_LIGHTS) {
    const inside = Math.abs(p.x - j.x) < ROAD_WIDTHS.v[j.x] / 2 && Math.abs(p.z - j.z) < ROAD_WIDTHS.h[j.z] / 2;
    if (!inside) { if (lastJ === j) lastJ = null; continue; }
    if (lastJ === j) return; lastJ = j;
    if (lightFor(f) !== 'red') return;
    const lastma = SERVICE_NPCS.some(n => n.u === 'lastma' && dist(p, n) < 45);
    ticketT = 20;
    if (lastma) { if (pay(5000, 'LASTMA · ran a red light')) toast(`LASTMA · ${fmt(5000)} for running the red light`); else addHeat(1, 'Ran a red light past LASTMA'); }
    return;
  }
}
