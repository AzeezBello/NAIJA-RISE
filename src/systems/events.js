import * as THREE from 'three';
import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { rnd, pick } from '../core/utils.js';
import { ROADS, placeOf } from '../data/locations.js';
import { mat } from '../world/builders.js';
import { notify } from '../ui/feedback.js';
import { msg } from './economy.js';

// Dynamic city events: NEPA power outages, go-slow traffic jams, Owambe parties.
const JAM_NAMES = { 'h0': 'Western Avenue', 'h-66': 'Ojuelegba axis', 'v0': 'Bode Thomas', 'v72': 'Adeniran Ogunsanya', 'v-72': 'Shitta road' };
let outageT = 0, jamT = 0, partyDay = 0, crowd = [];

export const powerOut = () => !!G.outage;
export const owambeOn = () => G.state.clock >= 19 && G.state.clock < 23.5;

function startOutage() {
  G.outage = rnd(50, 120);
  notify('NEPA', 'NEPA don take light! Generators dey hum across Surulere.');
  emit('sky');
}
function endOutage() { G.outage = 0; notify('NEPA', 'Up NEPA! Light don come back.'); emit('sky'); }

function startJam() {
  const axis = pick(['h', 'v']), k = pick(axis === 'h' ? ROADS.h : ROADS.v), from = rnd(-120, 60);
  G.jam = { axis, k, from, to: from + 60, until: rnd(60, 120) };
  notify('Traffic', `Go-slow on ${JAM_NAMES[axis + k] || 'the main road'} — danfos dey crawl. Find another route.`);
}

function spawnCrowd() {
  const hall = placeOf('owambe');
  for (let i = 0; i < 14; i++) {
    const n = new THREE.Group();
    const col = pick([0xd62878, 0x2878d6, 0xf5c518, 0x7a28d6, 0x28b57a, 0xff6a1a]);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.75, 5, 8), mat(col)); b.position.y = 0.78; n.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), mat(0x5a3a28)); h.position.y = 1.48; n.add(h);
    const gele = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.3, 8), mat(col)); gele.position.y = 1.75; n.add(gele);
    n.position.set(hall.x + rnd(-11, 11), 0, hall.z + rnd(8, 15));
    G.scene.add(n); crowd.push(n);
  }
}
function clearCrowd() { for (const n of crowd) G.scene.remove(n); crowd = []; }

export function updateEvents(dt) {
  const s = G.state, night = s.clock > 18.5 || s.clock < 6;
  // NEPA
  if (G.outage) { G.outage -= dt; if (G.outage <= 0) endOutage(); }
  else { outageT -= dt; if (outageT <= 0) { outageT = rnd(120, 260); if (night && Math.random() < 0.6) startOutage(); } }
  // Go-slow
  if (G.jam) { G.jam.until -= dt; if (G.jam.until <= 0) { G.jam = null; notify('Traffic', 'Go-slow don clear.'); } }
  else { jamT -= dt; if (jamT <= 0) { jamT = rnd(90, 200); if (Math.random() < 0.7) startJam(); } }
  // Owambe
  if (owambeOn()) {
    if (partyDay !== s.day) { partyDay = s.day; spawnCrowd(); msg('babak', 'Owambe dey Surulere Event Centre tonight. Come spray small, meet people.'); }
    const t = performance.now() / 400; crowd.forEach((n, i) => { n.position.y = Math.abs(Math.sin(t + i)) * 0.12; n.rotation.y = Math.sin(t * 0.5 + i) * 0.5; });
  } else if (crowd.length) clearCrowd();
}
