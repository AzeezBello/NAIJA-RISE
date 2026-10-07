import * as THREE from 'three';
import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { rnd, pick } from '../core/utils.js';
import { ROADS, placeOf, roadNameAt, roadExtent } from '../data/locations.js';
import { mat } from '../world/builders.js';
import { notify } from '../ui/feedback.js';
import { msg } from './economy.js';

// Dynamic city events: NEPA power outages, go-slow traffic jams, Owambe parties.
let outageT = 0, jamT = 0, partyDay = 0, crowd = [], wreck = null;

export const powerOut = () => !!G.outage;
export const owambeOn = () => G.state.clock >= 19 && G.state.clock < 23.5;

function startOutage() {
  G.outage = rnd(50, 120);
  notify('NEPA', 'NEPA don take light! Generators dey hum across Surulere.');
  emit('sky');
}
function endOutage() { G.outage = 0; notify('NEPA', 'Up NEPA! Light don come back.'); emit('sky'); }

let works = [];
function startJam() {
  const axis = pick(['h', 'v']), k = pick(axis === 'h' ? ROADS.h : ROADS.v), [ea, eb] = roadExtent(axis, k), from = rnd(ea + 20, eb - 80);
  G.jam = { axis, k, from, to: from + 60, until: rnd(60, 120) };
  const r = Math.random();
  if (r < 0.3) {
    // road construction: cones, concrete barriers and a DIVERSION sign close one lane for a long stretch
    G.jam.until = rnd(150, 260); G.jam.works = true;
    import('../world/builders.js').then(b => {
      for (let c = from; c <= from + 60; c += 6) { const x = axis === 'h' ? c : k + 4.5, z = axis === 'h' ? k - 4.5 : c; works.push(b.cyl(x, z, 0.25, 0.7, 0xff6a1a, 'prop', 0, 8, 0.08)); }
      for (let c = from + 3; c <= from + 57; c += 12) { const x = axis === 'h' ? c : k + 2.2, z = axis === 'h' ? k - 2.2 : c; works.push(b.box(x, z, axis === 'h' ? 8 : 0.6, axis === 'h' ? 0.6 : 8, 0.9, 0xbfb8a6, 'prop')); }
      const sx = axis === 'h' ? from - 6 : k + 7, sz = axis === 'h' ? k - 7 : from - 6;
      works.push(b.sign('ROAD WORKS · DIVERSION', sx, 3, sz, '#07100e', 6.5, 1.3, 'rgba(255,106,26,.97)'));
    });
    notify('LASTMA', `Road construction on ${roadNameAt(axis, k, from + 30)} — one lane closed, follow the diversion.`);
  } else if (r < 0.6) {
    // road incident: an overturned keke in the lane, hazard cones, crowd of onlookers
    const mid = from + 30, x = axis === 'h' ? mid : k + 4.5, z = axis === 'h' ? k - 4.5 : mid;
    import('../entities/vehicles.js').then(v => { wreck = v.makeVehicle('keke'); wreck.position.set(x, 0.6, z); wreck.rotation.z = Math.PI / 2.2; wreck.rotation.y = rnd(0, 6); });
    G.jam.wreck = true;
    notify('Traffic', `Accident on ${roadNameAt(axis, k, mid)} — keke don tumble. Expect go-slow.`);
  } else notify('Traffic', `Go-slow on ${roadNameAt(axis, k, from + 30)} — danfos dey crawl. Find another route.`);
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
  if (G.jam) { G.jam.until -= dt; if (G.jam.until <= 0) { const w = G.jam.works; G.jam = null; if (wreck) { G.scene.remove(wreck); wreck = null; } for (const o of works) G.scene.remove(o); works = []; notify(w ? 'LASTMA' : 'Traffic', w ? 'Road works done — lane reopened.' : 'Go-slow don clear.'); } }
  else { jamT -= dt; if (jamT <= 0) { jamT = rnd(90, 200); if (Math.random() < 0.7) startJam(); } }
  // Owambe
  if (owambeOn()) {
    if (partyDay !== s.day) { partyDay = s.day; spawnCrowd(); msg('babak', 'Owambe dey Surulere Event Centre tonight. Come spray small, meet people.'); }
    const t = performance.now() / 400; crowd.forEach((n, i) => { n.position.y = Math.abs(Math.sin(t + i)) * 0.12; n.rotation.y = Math.sin(t * 0.5 + i) * 0.5; });
  } else if (crowd.length) clearCrowd();
}
