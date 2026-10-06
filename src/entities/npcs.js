import * as THREE from 'three';
import { G, frozen } from '../core/context.js';
import { pick, dist } from '../core/utils.js';
import { mat } from '../world/builders.js';
import { BUSSTOPS, SERVICE_NPCS, UNIFORMS, NIGHTLIFE_NPCS, placeOf } from '../data/locations.js';
import { runAgbero } from '../systems/dialogue.js';

function person(bodyColor, skin, scale = 1, cap) {
  const n = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.32 * scale, 0.75 * scale, 5, 8), mat(bodyColor)); b.position.y = 0.78 * scale; b.castShadow = true; n.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 10, 7), mat(skin)); h.position.y = 1.48 * scale; h.castShadow = true; n.add(h);
  if (cap !== undefined) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 10), mat(cap)); c.position.y = 1.63 * scale; n.add(c); }
  return n;
}

export function spawnNpcs(count = 22) {
  G.npcs = [];
  for (let i = 0; i < count; i++) {
    const n = person(pick([0x356a50, 0x8b5a31, 0x774444, 0x4c5178, 0x9a7a38, 0xd9d9d9, 0x2b2b2b]), pick([0x68422f, 0x5a3a28, 0x8a5a3c]));
    n.position.set((Math.random() - 0.5) * 125, 0, (Math.random() - 0.5) * 125);
    if (Math.abs(n.position.x) < 14 || Math.abs(n.position.z) < 14) n.position.x += 22;
    G.scene.add(n);
    G.npcs.push({ g: n, v: new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2), turn: 1 + Math.random() * 3, hitT: 0 });
  }
}

// Agberos stand at bus stops in yellow/green and shake you down when you walk past.
export function spawnAgberos() {
  G.agberos = [];
  for (const b of BUSSTOPS) for (let i = 0; i < b.agberos; i++) {
    const n = person(pick([0xc8d400, 0x2bb34a]), 0x5a3a28, 1.08, 0xd62828);
    n.position.set(b.x - 6 + i * 12, 0, b.z - 2.5);
    G.scene.add(n);
    G.agberos.push({ g: n, x: n.position.x, z: n.position.z, cool: 0, stop: b });
  }
}

// Police, soldiers, firemen, LAWMA sweepers, LASTMA and FRSC officers at their posts.
export function spawnServiceNpcs() {
  G.service = [];
  for (const s of SERVICE_NPCS) {
    const n = person(UNIFORMS[s.u], 0x5a3a28, 1.05, s.u === 'police' ? 0x111318 : s.u === 'army' ? 0x3f5a2a : s.u === 'lastma' ? 0x7a1e2d : 0x1b1b1b);
    n.position.set(s.x, 0, s.z);
    G.scene.add(n);
    G.service.push({ g: n, x: s.x, z: s.z, u: s.u });
  }
}

// Night hustlers outside the clubs (shown 20:00–04:00) and school kids in the day.
export function spawnExtras() {
  G.nightlife = NIGHTLIFE_NPCS.map(n => {
    const g = person(pick([0xff2d7a, 0xff7a1a, 0xd62878, 0x7a28d6]), 0x5a3a28, 0.95);
    g.position.set(n.x, 0, n.z); g.visible = false; G.scene.add(g);
    return { g, x: n.x, z: n.z, name: n.name };
  });
  const sc = placeOf('school'); G.kids = [];
  for (let i = 0; i < 8; i++) {
    const g = person(pick([0xf0f0f0, 0x2f5fd0]), 0x6a4a3a, 0.7);
    g.position.set(sc.x + (Math.random() - 0.5) * 16, 0, sc.z - 10 - Math.random() * 5); g.visible = false; G.scene.add(g);
    G.kids.push({ g, home: { x: g.position.x, z: g.position.z }, t: Math.random() * 3 });
  }
}

export function updateNpcs(dt) {
  const h = G.state.clock, nightOpen = h >= 20 || h < 4, schoolTime = h >= 7 && h < 14;
  for (const n of G.nightlife || []) { n.g.visible = nightOpen && G.state.settings.mature !== false; n.g.rotation.y = Math.sin(performance.now() / 700 + n.x) * 0.5; }
  for (const k of G.kids || []) { k.g.visible = schoolTime; k.t += dt; k.g.position.x = k.home.x + Math.sin(k.t) * 2; k.g.position.y = Math.abs(Math.sin(k.t * 5)) * 0.1; }
  const marketHour = h >= 10 && h < 16, lateNight = h >= 23 || h < 5;
  G.npcs.forEach((n, i) => { n.g.visible = !(lateNight && i % 2); });     // half the street goes home late at night
  for (const n of G.npcs) {
    if (marketHour && !n.market) { n.market = pick([placeOf('yaba'), placeOf('shitta'), placeOf('mushin')]); }
    if (!marketHour) n.market = null;
    if (n.market && n.turn <= 0.05 && dist(n.g.position, n.market) > 18) { n.v.set(n.market.x - n.g.position.x, 0, n.market.z - n.g.position.z).normalize().multiplyScalar(1.6); n.turn = 2; }
    n.g.position.addScaledVector(n.v, dt);
    n.turn -= dt;
    if (n.turn <= 0) { n.turn = 1 + Math.random() * 3; n.v.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2); }
    if (Math.abs(n.g.position.x) > 140 || Math.abs(n.g.position.z) > 140) n.v.multiplyScalar(-1);
    if (n.hitT > 0) { n.hitT -= dt; n.g.rotation.x = n.hitT > 0 ? Math.PI / 2 : 0; }
  }
  const t = performance.now() / 900;
  for (const a of G.agberos) {
    a.g.rotation.y = Math.sin(t + a.x) * 0.4;
    a.cool -= dt;
    if (!G.inCar && !frozen() && !G.state.pet && a.cool <= 0 && dist(G.player.position, a) < 3.6) { runAgbero(a); break; }
  }
  for (const s of G.service || []) s.g.rotation.y = Math.sin(t * 0.6 + s.x) * 0.25;
}
