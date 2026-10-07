import * as THREE from 'three';
import { G, frozen } from '../core/context.js';
import { pick, dist } from '../core/utils.js';
import { mat } from '../world/builders.js';
import { BUSSTOPS, SERVICE_NPCS, UNIFORMS, NIGHTLIFE_NPCS, placeOf } from '../data/locations.js';
import { runAgbero } from '../systems/dialogue.js';
import { PERF } from '../data/config.js';
import { createCharacter, pickStreetRig } from './character.js';
import { buildPrimitive } from './wardrobe.js';

const hex = c => '#' + c.toString(16).padStart(6, '0');
const chance = p => Math.random() < p;
// Everyday Lagos wear for the street: mostly ankara / buba / senator, some jerseys and t-shirts, a fila now and then.
function streetLook() {
  const r = Math.random(), outfit = r < 0.2 ? 0 : r < 0.3 ? 1 : r < 0.42 ? 2 : r < 0.46 ? 3 : r < 0.52 ? 4 : r < 0.64 ? 5 : r < 0.72 ? 6 : r < 0.78 ? 7 : r < 0.86 ? 8 : r < 0.93 ? 9 : 10;
  return { outfit, shirt: outfit === 4 ? 7 : Math.floor(Math.random() * 7), pants: Math.floor(Math.random() * 4), skin: Math.floor(Math.random() * 5), hair: Math.floor(Math.random() * 5),
    hairColor: 0, bodyType: chance(0.25) ? 0 : chance(0.2) ? 2 : 1, accessory: outfit === 3 || chance(0.25) ? 1 : chance(0.1) ? 2 : 0, facialHair: chance(0.3) ? 1 : 0 };
}
// A person: primitives until the shared rig is cloned in (desktop only; low-end keeps primitives). n.userData.c is the character.
// `look` picks outfit/fabric; `tint` forces plain colours for uniforms ({ top, bottom, skin, cap }).
function person({ look = streetLook(), tint = null, scale = 1 } = {}) {
  const useRig = G.state?.settings?.rig !== false;
  const rig = tint ? 0 : pickStreetRig(PERF.lowEnd);   // uniforms stay on the main rig
  const c = createCharacter({ build: (l, t) => buildPrimitive(l, { scale: scale * 0.74, tint: t }), useRig, scale: scale * (0.84 + Math.random() * 0.1), look, tint, rig });
  c.group.userData.c = c;
  return c.group;
}
const uniform = (top, cap, skin = '#5a3a28') => ({ look: { outfit: 5, shirt: 8, pants: 3, skin: 3, hair: 1, hairColor: 0, bodyType: 1, accessory: cap ? 2 : 0, facialHair: 0 }, tint: { top: hex(top), bottom: hex(top & 0x7f7f7f), skin, shoes: '#1b1b1b', cap: cap ? hex(cap) : null } });

export function spawnNpcs(count = 22) {
  G.npcs = [];
  for (let i = 0; i < count; i++) {
    const n = person();
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
    const n = person({ ...uniform(pick([0xc8d400, 0x2bb34a]), 0xd62828), scale: 1.08 });
    n.position.set(b.x - 6 + i * 12, 0, b.z - 2.5);
    G.scene.add(n);
    G.agberos.push({ g: n, x: n.position.x, z: n.position.z, cool: 0, stop: b });
  }
}

// Police, soldiers, firemen, LAWMA sweepers, LASTMA and FRSC officers at their posts.
export function spawnServiceNpcs() {
  G.service = [];
  for (const s of SERVICE_NPCS) {
    const n = person({ ...uniform(UNIFORMS[s.u], s.u === 'police' ? 0x111318 : s.u === 'army' ? 0x3f5a2a : s.u === 'lastma' ? 0x7a1e2d : 0x1b1b1b), scale: 1.05 });
    n.position.set(s.x, 0, s.z);
    G.scene.add(n);
    G.service.push({ g: n, x: s.x, z: s.z, u: s.u });
  }
}

// Night hustlers outside the clubs (shown 20:00–04:00) and school kids in the day.
export function spawnExtras() {
  G.nightlife = NIGHTLIFE_NPCS.map(n => {
    const g = person({ look: { ...streetLook(), outfit: 5, accessory: 0 }, tint: { top: hex(pick([0xff2d7a, 0xff7a1a, 0xd62878, 0x7a28d6])), bottom: '#1b1b1b', skin: '#5a3a28', shoes: '#f0f0f0' }, scale: 0.95 });
    g.position.set(n.x, 0, n.z); g.visible = false; G.scene.add(g);
    return { g, x: n.x, z: n.z, name: n.name };
  });
  const sc = placeOf('school'); G.kids = [];
  for (let i = 0; i < 8; i++) {
    const g = person({ look: { ...streetLook(), outfit: 5, accessory: 0, facialHair: 0, bodyType: 0 }, tint: { top: hex(pick([0xf0f0f0, 0x2f5fd0])), bottom: '#1f2a44', skin: '#6a4a3a', shoes: '#1b1b1b' }, scale: 0.7 });
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
    const sp = n.v.length(), c = n.g.userData.c;
    if (sp > 0.2) n.g.rotation.y = Math.atan2(n.v.x, n.v.z);
    c?.setState(sp > 0.2 ? 'walk' : 'idle', sp);
    n.turn -= dt;
    if (n.turn <= 0) { n.turn = 1 + Math.random() * 3; n.v.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2); }
    if (Math.abs(n.g.position.x) > 140 || Math.abs(n.g.position.z) > 140) n.v.multiplyScalar(-1);
    if (n.hitT > 0) { n.hitT -= dt; n.g.rotation.x = n.hitT > 0 ? Math.PI / 2 : 0; }
  }
  const t = performance.now() / 900;
  for (const a of G.agberos) {
    a.g.rotation.y = Math.sin(t + a.x) * 0.4;
    a.cool -= dt;
    const guarded = G.state.home && G.state.upgrades?.[G.state.home]?.includes('security');
    if (!G.inCar && !frozen() && !G.state.pet && !guarded && a.cool <= 0 && dist(G.player.position, a) < 3.6) { runAgbero(a); break; }
  }
  for (const s of G.service || []) s.g.rotation.y = Math.sin(t * 0.6 + s.x) * 0.25;
}
