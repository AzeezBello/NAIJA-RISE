import * as THREE from 'three';
import { G, frozen } from '../core/context.js';
import { pick, dist } from '../core/utils.js';
import { BUSSTOPS, SERVICE_NPCS, UNIFORMS, NIGHTLIFE_NPCS, placeOf, inWater } from '../data/locations.js';
import { runAgbero } from '../systems/dialogue.js';
import { PERF } from '../data/config.js';
import { createCharacter, pickStreetRig } from './character.js';
import { buildPrimitive } from './wardrobe.js';
import { blockedAt } from '../systems/movement.js';
import { heightAt } from '../world/terrain.js';
import { randomWalkPoint, onWalkable, projectToWalk, nearestCrossing } from '../world/walkables.js';

const hex = c => '#' + c.toString(16).padStart(6, '0');
const chance = p => Math.random() < p;

function streetLook() {
  const r = Math.random(), outfit = r < 0.2 ? 0 : r < 0.3 ? 1 : r < 0.42 ? 2 : r < 0.46 ? 3 : r < 0.52 ? 4 : r < 0.64 ? 5 : r < 0.72 ? 6 : r < 0.78 ? 7 : r < 0.86 ? 8 : r < 0.93 ? 9 : 10;
  return {
    outfit, shirt: outfit === 4 ? 7 : Math.floor(Math.random() * 7), pants: Math.floor(Math.random() * 4),
    skin: Math.floor(Math.random() * 5), hair: Math.floor(Math.random() * 5), hairColor: 0,
    bodyType: chance(0.25) ? 0 : chance(0.2) ? 2 : 1,
    accessory: outfit === 3 || chance(0.25) ? 1 : chance(0.1) ? 2 : 0,
    facialHair: chance(0.3) ? 1 : 0,
  };
}

function person({ look = streetLook(), tint = null, scale = 1 } = {}) {
  const useRig = G.state?.settings?.rig !== false;
  const rig = tint ? 0 : pickStreetRig(PERF.lowEnd);
  const c = createCharacter({
    build: (l, t) => buildPrimitive(l, { scale: scale * 0.74, tint: t }),
    useRig, scale: scale * (0.84 + Math.random() * 0.1), look, tint, rig,
  });
  c.group.userData.c = c;
  return c.group;
}

const uniform = (top, cap, skin = '#5a3a28') => ({
  look: { outfit: 5, shirt: 8, pants: 3, skin: 3, hair: 1, hairColor: 0, bodyType: 1, accessory: cap ? 2 : 0, facialHair: 0 },
  tint: { top: hex(top), bottom: hex(top & 0x7f7f7f), skin, shoes: '#1b1b1b', cap: cap ? hex(cap) : null },
});

// ---- walk / avoidance constants ----
const NPC_R = 0.55;
const SEP_R = 1.8;
const SEP_FORCE = 3.2;
const PLAYER_SEP = 2.4;
const SPEED = 1.55;
const CROSS_CHANCE = 0.28;   // chance to start a crossing when near a junction
const CROSS_SPEED = 2.1;     // slightly brisker across the road

// Scratch vectors — no per-frame allocations in the hot path.
const _old = new THREE.Vector3();
const _sep = new THREE.Vector3();

function normalizeSpeed(v, speed) {
  const len = Math.hypot(v.x, v.z) || 1;
  v.x = (v.x / len) * speed;
  v.z = (v.z / len) * speed;
}

function steerAway(from, others, radius, force, out) {
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    if (o === from) continue;
    const dx = from.x - o.x, dz = from.z - o.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > 0.01 && d2 < radius * radius) {
      const inv = force / d2;
      out.x += dx * inv;
      out.z += dz * inv;
    }
  }
}

export function spawnNpcs(count = 28) {
  G.npcs = [];
  let placed = 0, guard = count * 4;
  while (placed < count && guard-- > 0) {
    const p = randomWalkPoint();
    if (inWater(p.x, p.z)) continue;
    const n = person();
    n.position.set(p.x, heightAt(p.x, p.z), p.z);
    G.scene.add(n);
    const alongH = Math.random() < 0.5;
    const dir = Math.random() < 0.5 ? 1 : -1;
    G.npcs.push({
      g: n,
      v: new THREE.Vector3(
        alongH ? dir * SPEED : (Math.random() - 0.5) * 0.35,
        0,
        alongH ? (Math.random() - 0.5) * 0.35 : dir * SPEED
      ),
      turn: 2 + Math.random() * 4,
      hitT: 0,
      crossing: null,   // { x, z, r, t } while mid-crossing
    });
    placed++;
  }
}

export function spawnAgberos() {
  G.agberos = [];
  for (const b of BUSSTOPS) for (let i = 0; i < b.agberos; i++) {
    const n = person({ ...uniform(pick([0xc8d400, 0x2bb34a]), 0xd62828), scale: 1.08 });
    n.position.set(b.x - 6 + i * 12, 0, b.z - 2.5);
    G.scene.add(n);
    G.agberos.push({ g: n, x: n.position.x, z: n.position.z, cool: 0, stop: b });
  }
}

export function spawnServiceNpcs() {
  G.service = [];
  for (const s of SERVICE_NPCS) {
    const n = person({
      ...uniform(UNIFORMS[s.u], s.u === 'police' ? 0x111318 : s.u === 'army' ? 0x3f5a2a : s.u === 'lastma' ? 0x7a1e2d : 0x1b1b1b),
      scale: 1.05,
    });
    n.position.set(s.x, 0, s.z);
    G.scene.add(n);
    G.service.push({ g: n, x: s.x, z: s.z, u: s.u });
  }
}

export function spawnExtras() {
  G.nightlife = NIGHTLIFE_NPCS.map(n => {
    const g = person({
      look: { ...streetLook(), outfit: 5, accessory: 0 },
      tint: { top: hex(pick([0xff2d7a, 0xff7a1a, 0xd62878, 0x7a28d6])), bottom: '#1b1b1b', skin: '#5a3a28', shoes: '#f0f0f0' },
      scale: 0.95,
    });
    g.position.set(n.x, 0, n.z); g.visible = false; G.scene.add(g);
    return { g, x: n.x, z: n.z, name: n.name };
  });
  const sc = placeOf('school'); G.kids = [];
  for (let i = 0; i < 8; i++) {
    const g = person({
      look: { ...streetLook(), outfit: 5, accessory: 0, facialHair: 0, bodyType: 0 },
      tint: { top: hex(pick([0xf0f0f0, 0x2f5fd0])), bottom: '#1f2a44', skin: '#6a4a3a', shoes: '#1b1b1b' },
      scale: 0.7,
    });
    g.position.set(sc.x + (Math.random() - 0.5) * 16, 0, sc.z - 10 - Math.random() * 5);
    g.visible = false; G.scene.add(g);
    G.kids.push({ g, home: { x: g.position.x, z: g.position.z }, t: Math.random() * 3 });
  }
}

export function updateNpcs(dt) {
  const h = G.state.clock;
  const nightOpen = h >= 20 || h < 4;
  const schoolTime = h >= 7 && h < 14;
  const marketHour = h >= 10 && h < 16;
  const lateNight = h >= 23 || h < 5;

  for (const n of G.nightlife || []) {
    n.g.visible = nightOpen && G.state.settings.mature !== false;
    n.g.rotation.y = Math.sin(performance.now() / 700 + n.x) * 0.5;
  }
  for (const k of G.kids || []) {
    k.g.visible = schoolTime;
    k.t += dt;
    k.g.position.x = k.home.x + Math.sin(k.t) * 2;
    k.g.position.y = Math.abs(Math.sin(k.t * 5)) * 0.1;
  }

  G.npcs.forEach((n, i) => { n.g.visible = !n.hidden && !(lateNight && i % 2); });

  // Snapshot positions for separation (reused array length)
  const positions = G._npcPos || (G._npcPos = []);
  positions.length = 0;
  for (const n of G.npcs) if (n.g.visible) positions.push(n.g.position);
  const playerPos = G.player?.position;

  for (const n of G.npcs) {
    if (!n.g.visible) continue;
    const pos = n.g.position;

    // ---- market pull ----
    if (marketHour && !n.market) n.market = pick([placeOf('yaba'), placeOf('shitta'), placeOf('mushin')]);
    if (!marketHour) n.market = null;
    if (n.market && !n.crossing && n.turn <= 0.05 && dist(pos, n.market) > 18) {
      n.v.set(n.market.x - pos.x, 0, n.market.z - pos.z);
      normalizeSpeed(n.v, SPEED);
      n.turn = 2.5;
    }

    // ---- start a deliberate junction crossing ----
    if (!n.crossing && n.turn < 0.4 && Math.random() < CROSS_CHANCE * dt * 2) {
      const j = nearestCrossing(pos.x, pos.z, 12);
      if (j) {
        // Aim for the far side of the junction (opposite sidewalk direction)
        const dx = j.x - pos.x, dz = j.z - pos.z;
        // Push past the centre so they land on the opposite strip
        n.v.set(dx + (dx || (Math.random() - 0.5)) * 0.4, 0, dz + (dz || (Math.random() - 0.5)) * 0.4);
        normalizeSpeed(n.v, CROSS_SPEED);
        n.crossing = { x: j.x, z: j.z, r: j.r, t: 3.5 }; // timeout safety
        n.turn = 3.5;
      }
    }

    // ---- finish crossing when back on a sidewalk or timeout ----
    if (n.crossing) {
      n.crossing.t -= dt;
      if (n.crossing.t <= 0 || (onWalkable(pos.x, pos.z, 2.2) && Math.hypot(pos.x - n.crossing.x, pos.z - n.crossing.z) > n.crossing.r * 0.55)) {
        n.crossing = null;
        normalizeSpeed(n.v, SPEED);
      }
    }

    // ---- separation (NPCs + player) ----
    _sep.set(0, 0, 0);
    steerAway(pos, positions, SEP_R, SEP_FORCE, _sep);
    if (playerPos && !G.inCar) steerAway(pos, [playerPos], PLAYER_SEP, SEP_FORCE * 1.4, _sep);
    if (_sep.x || _sep.z) {
      n.v.x += _sep.x * dt;
      n.v.z += _sep.z * dt;
      normalizeSpeed(n.v, n.crossing ? CROSS_SPEED : SPEED);
    }

    // ---- integrate ----
    _old.copy(pos);
    pos.addScaledVector(n.v, dt);
    pos.y = heightAt(pos.x, pos.z);

    // ---- hard collision (buildings, vehicles, water) ----
    if (blockedAt(pos, NPC_R) || inWater(pos.x, pos.z)) {
      pos.copy(_old);
      n.v.x = -n.v.x + (Math.random() - 0.5) * 0.9;
      n.v.z = -n.v.z + (Math.random() - 0.5) * 0.9;
      normalizeSpeed(n.v, SPEED);
      n.crossing = null;
      n.turn = 0.6 + Math.random() * 0.8;
    }

    // ---- soft leash onto sidewalk (skipped while crossing) ----
    if (!n.crossing && !onWalkable(pos.x, pos.z, 3.5)) {
      const p = projectToWalk(pos.x, pos.z, 10);
      if (p) {
        n.v.x += (p.x - pos.x) * 0.7 * dt;
        n.v.z += (p.z - pos.z) * 0.7 * dt;
        normalizeSpeed(n.v, SPEED);
      }
    }

    // ---- animate ----
    const sp = Math.hypot(n.v.x, n.v.z);
    if (sp > 0.2) n.g.rotation.y = Math.atan2(n.v.x, n.v.z);
    n.g.userData.c?.setState(sp > 0.2 ? 'walk' : 'idle', sp);

    // ---- periodic re-steer along the strip ----
    n.turn -= dt;
    if (n.turn <= 0 && !n.crossing) {
      n.turn = 2 + Math.random() * 4;
      const flip = Math.random() < 0.32;
      if (Math.abs(n.v.x) >= Math.abs(n.v.z)) {
        n.v.set((flip ? -Math.sign(n.v.x) || 1 : Math.sign(n.v.x) || 1) * SPEED, 0, (Math.random() - 0.5) * 0.45);
      } else {
        n.v.set((Math.random() - 0.5) * 0.45, 0, (flip ? -Math.sign(n.v.z) || 1 : Math.sign(n.v.z) || 1) * SPEED);
      }
    }

    // world bounds
    if (Math.abs(pos.x) > 220 || Math.abs(pos.z) > 220) {
      n.v.x *= -1; n.v.z *= -1;
      n.crossing = null;
    }

    if (n.hitT > 0) {
      n.hitT -= dt;
      n.g.rotation.x = n.hitT > 0 ? Math.PI / 2 : 0;
    }
  }

  // ---- agberos + service (unchanged behaviour) ----
  const t = performance.now() / 900;
  for (const a of G.agberos) {
    a.g.rotation.y = Math.sin(t + a.x) * 0.4;
    a.cool -= dt;
    const guarded = G.state.home && G.state.upgrades?.[G.state.home]?.includes('security');
    if (!G.inCar && !frozen() && !G.state.pet && !guarded && a.cool <= 0 && dist(G.player.position, a) < 3.6) {
      runAgbero(a);
      break;
    }
  }
  for (const s of G.service || []) s.g.rotation.y = Math.sin(t * 0.6 + s.x) * 0.25;
}