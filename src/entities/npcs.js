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
import { bindSchedule, applyScheduleSteer } from '../systems/npcSchedule.js';
import {
  TRAITS, DRIVER_NAMES, CONDUCTOR_NAMES, ROUTES, CREW_LOOK, pickTrait, fareFor,
} from '../data/crew.js';
import { runCrewDialog } from '../systems/crew.js';
import { VEH } from '../data/vehicles.js';


const hex = c => '#' + c.toString(16).padStart(6, '0');
const chance = p => Math.random() < p;

function crewUniform(roleKey) {
  const u = CREW_LOOK[roleKey] || CREW_LOOK.danfo_driver;
  return {
    look: {
      outfit: 5, shirt: 8, pants: 3, skin: 2 + Math.floor(Math.random() * 3),
      hair: Math.floor(Math.random() * 4), hairColor: 0, bodyType: 1,
      accessory: 2, facialHair: Math.random() < 0.4 ? 1 : 0,
    },
    tint: {
      top: hex(u.top),
      bottom: hex(u.bottom),
      skin: '#5a3a28',
      shoes: '#1b1b1b',
      cap: u.cap ? hex(u.cap) : null,
    },
  };
}

/**
 * Spawn drivers + conductors at bus stops.
 * Danfo stops: 1 driver standing near queue + 1 conductor calling route.
 * BRT: 1 driver in blue.
 */
export function spawnCrew() {
  G.crew = [];
  const stops = BUSSTOPS || [];
  stops.forEach((b, bi) => {
    const isBrt = /brt|ikorodu|cms/i.test(b.name || '');
    const vehType = isBrt ? 'brt' : (Math.random() < 0.25 ? 'keke' : 'danfo');
    const route = pick(ROUTES.filter(r =>
      isBrt ? r.id === 'brt_corridor' : r.id !== 'brt_corridor'
    ));

    // Driver
    const dRole = vehType === 'brt' ? 'brt_driver' : vehType === 'keke' ? 'keke_driver' : 'danfo_driver';
    const dTrait = pickTrait();
    const dg = person({ ...crewUniform(dRole), scale: 1.02 });
    dg.position.set(b.x + 4, 0, b.z - 3);
    G.scene.add(dg);
    G.crew.push({
      g: dg,
      role: 'driver',
      vehType,
      name: pick(DRIVER_NAMES),
      trait: dTrait,
      traitLabel: TRAITS[dTrait].label,
      route,
      fare: fareFor(vehType, dTrait),
      stop: b,
      x: dg.position.x,
      z: dg.position.z,
      cool: 0,
      callT: 2 + Math.random() * 4,
    });

    // Conductor (danfo / BRT only — keke is usually solo)
    if (vehType !== 'keke') {
      const cRole = vehType === 'brt' ? 'brt_conductor' : 'danfo_conductor';
      const cTrait = pickTrait();
      const cg = person({ ...crewUniform(cRole), scale: 0.98 });
      cg.position.set(b.x - 2 + (bi % 3), 0, b.z - 1.5);
      G.scene.add(cg);
      G.crew.push({
        g: cg,
        role: 'conductor',
        vehType,
        name: pick(CONDUCTOR_NAMES),
        trait: cTrait,
        traitLabel: TRAITS[cTrait].label,
        route,
        fare: fareFor(vehType, cTrait),
        stop: b,
        x: cg.position.x,
        z: cg.position.z,
        cool: 0,
        callT: 1 + Math.random() * 3,
      });
    }
  });
}

// Alpha 1.1: the crew update used to sit at module top level (dead code — it ran once at import
// against an empty G.crew and never again). It now lives in updateNpcs, after the agberos loop.
function updateCrew(dt) {
  for (const c of G.crew || []) {
    c.g.rotation.y = Math.sin(performance.now() / 800 + c.x) * 0.35;
    c.cool -= dt;
    c.callT -= dt;
    // Conductors pace a short line while calling
    if (c.role === 'conductor' && c.callT <= 0) {
      c.callT = 3 + Math.random() * 4;
      c.g.position.x = c.x + (Math.random() - 0.5) * 2.5;
      c.g.position.z = c.z + (Math.random() - 0.5) * 1.5;
    }
    if (!G.inCar && !frozen() && c.cool <= 0 && dist(G.player.position, c) < 3.2) {
      runCrewDialog(c);
      break;
    }
  }
}


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
  for (let i = 0; i < count; i++) {
    const n = person();
    // Prefer sidewalk spawn if walkables registered
    let x, z;
    try {
      const p = randomWalkPoint?.();
      if (p) { x = p.x; z = p.z; }
    } catch { /* walkables optional */ }
    if (x == null) {
      x = (Math.random() - 0.5) * 125;
      z = (Math.random() - 0.5) * 125;
      if (Math.abs(x) < 14 || Math.abs(z) < 14) x += 22;
    }
    n.position.set(x, 0, z);
    G.scene.add(n);
    const rec = {
      g: n,
      v: new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2),
      turn: 2 + Math.random() * 4,
      hitT: 0,
    };
    bindSchedule(rec);
    G.npcs.push(rec);
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
    const marketHour = h >= 10 && h < 16; // keep for backwards compat
  const lateNight = h >= 23 || h < 5;

  for (const n of G.npcs) {
    if (n.hidden) { n.g.visible = false; continue; }

    // Schedule drives intent; fall back to old market pull / random
    const steered = applyScheduleSteer(n, h);
    if (!steered) {
      n.g.visible = !(lateNight && (G.npcs.indexOf(n) % 2));
      if (marketHour && n.turn <= 0.05) {
        const m = pick([placeOf('yaba'), placeOf('shitta'), placeOf('mushin')]);
        if (m && dist(n.g.position, m) > 18) {
          n.v.set(m.x - n.g.position.x, 0, m.z - n.g.position.z).normalize().multiplyScalar(1.6);
          n.turn = 2;
        }
      }
      n.turn -= dt;
      if (n.turn <= 0) {
        n.turn = 2 + Math.random() * 4;
        n.v.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
      }
    }

    n.g.position.addScaledVector(n.v, dt);
    const sp = Math.hypot(n.v.x, n.v.z);
    if (sp > 0.2) n.g.rotation.y = Math.atan2(n.v.x, n.v.z);
    n.g.userData.c?.setState(sp > 0.2 ? 'walk' : 'idle', sp);

    if (Math.abs(n.g.position.x) > 200 || Math.abs(n.g.position.z) > 200) {
      n.v.x *= -1; n.v.z *= -1;
    }
    if (n.hitT > 0) {
      n.hitT -= dt;
      n.g.rotation.x = n.hitT > 0 ? Math.PI / 2 : 0;
    }
  }

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
  updateCrew(dt);   // Alpha 1.1: crew was orphaned at module top level; now runs every frame
  for (const s of G.service || []) s.g.rotation.y = Math.sin(t * 0.6 + s.x) * 0.25;
}