import * as THREE from 'three';
import { G, frozen } from '../core/context.js';
import { pick, dist } from '../core/utils.js';
import {
  BUSSTOPS,
  SERVICE_NPCS,
  ARTISAN_NPCS,
  UNIFORMS,
  NIGHTLIFE_NPCS,
  placeOf,
  inWater,
} from '../data/locations.js';
import { runAgbero } from '../systems/dialogue.js';
import { PERF, WORLD } from '../data/config.js';
import { createCharacter, pickStreetRig } from './character.js';
import { buildPrimitive } from './wardrobe.js';
import { blockedAt } from '../systems/movement.js';
import { heightAt } from '../world/terrain.js';
import {
  randomWalkPoint,
  onWalkable,
  projectToWalk,
  nearestCrossing,
} from '../world/walkables.js';
import { bindSchedule, applyScheduleSteer } from '../systems/npcSchedule.js';
import {
  TRAITS,
  DRIVER_NAMES,
  CONDUCTOR_NAMES,
  ROUTES,
  CREW_LOOK,
  pickTrait,
  fareFor,
} from '../data/crew.js';
import { VEH } from '../data/vehicles.js';

const hex = c => '#' + c.toString(16).padStart(6, '0');
const chance = p => Math.random() < p;

function crewUniform(roleKey) {
  const u = CREW_LOOK[roleKey] || CREW_LOOK.danfo_driver;
  return {
    look: {
      outfit: 5,
      shirt: 8,
      pants: 3,
      skin: 2 + Math.floor(Math.random() * 3),
      hair: Math.floor(Math.random() * 4),
      hairColor: 0,
      bodyType: 1,
      accessory: 2,
      facialHair: Math.random() < 0.4 ? 1 : 0,
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
 * Danfo stops: 1 driver + 1 conductor.
 * BRT: blue crew. Keke: driver only.
 */
export function spawnCrew() {
  G.crew = [];
  const stops = BUSSTOPS || [];

  stops.forEach((b, bi) => {
    const isBrt = /brt|ikorodu|cms/i.test(b.name || '');
    const vehType = isBrt ? 'brt' : Math.random() < 0.25 ? 'keke' : 'danfo';
    const route = pick(
      ROUTES.filter(r =>
        isBrt ? r.id === 'brt_corridor' : r.id !== 'brt_corridor'
      )
    );

    const dRole =
      vehType === 'brt'
        ? 'brt_driver'
        : vehType === 'keke'
          ? 'keke_driver'
          : 'danfo_driver';
    const dTrait = pickTrait();
    const dg = person({ ...crewUniform(dRole), scale: 1.02 });
    dg.position.set(b.x + 4, 0, b.z - 3);
    dg.position.y = heightAt(b.x + 4, b.z - 3);
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
      callT: 2 + Math.random() * 4,
    });

    if (vehType !== 'keke') {
      const cRole =
        vehType === 'brt' ? 'brt_conductor' : 'danfo_conductor';
      const cTrait = pickTrait();
      const cg = person({ ...crewUniform(cRole), scale: 0.98 });
      cg.position.set(b.x - 2 + (bi % 3), 0, b.z - 1.5);
      cg.position.y = heightAt(cg.position.x, cg.position.z);
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
        callT: 1 + Math.random() * 3,
      });
    }
  });
}

function updateCrew(dt) {
  for (const c of G.crew || []) {
    if (!c?.g) continue;
    c.g.rotation.y = Math.sin(performance.now() / 800 + c.x) * 0.35;
    c.callT -= dt;

    if (c.role === 'conductor' && c.callT <= 0) {
      c.callT = 3 + Math.random() * 4;
      c.g.position.x = c.x + (Math.random() - 0.5) * 2.5;
      c.g.position.z = c.z + (Math.random() - 0.5) * 1.5;
      c.g.position.y = heightAt(c.g.position.x, c.g.position.z);
    }

  }
}

function streetLook() {
  const r = Math.random();
  const outfit =
    r < 0.2
      ? 0
      : r < 0.3
        ? 1
        : r < 0.42
          ? 2
          : r < 0.46
            ? 3
            : r < 0.52
              ? 4
              : r < 0.64
                ? 5
                : r < 0.72
                  ? 6
                  : r < 0.78
                    ? 7
                    : r < 0.86
                      ? 8
                      : r < 0.93
                        ? 9
                        : 10;
  return {
    outfit,
    shirt: outfit === 4 ? 7 : Math.floor(Math.random() * 7),
    pants: Math.floor(Math.random() * 4),
    skin: Math.floor(Math.random() * 5),
    hair: Math.floor(Math.random() * 5),
    hairColor: 0,
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
    useRig,
    scale: scale * (0.84 + Math.random() * 0.1),
    look,
    tint,
    rig,
  });
  c.group.userData.c = c;
  return c.group;
}

/** Export for occupants / other systems that need a body. */
export { person, streetLook };

const uniform = (top, cap, skin = '#5a3a28') => ({
  look: {
    outfit: 5,
    shirt: 8,
    pants: 3,
    skin: 3,
    hair: 1,
    hairColor: 0,
    bodyType: 1,
    accessory: cap ? 2 : 0,
    facialHair: 0,
  },
  tint: {
    top: hex(top),
    bottom: hex(top & 0x7f7f7f),
    skin,
    shoes: '#1b1b1b',
    cap: cap ? hex(cap) : null,
  },
});

const NPC_R = 0.55;
const SEP_R = 1.8;
const SEP_FORCE = 3.2;
const PLAYER_SEP = 2.4;
const SPEED = 1.55;
const CROSS_CHANCE = 0.28;
const CROSS_SPEED = 2.1;
const NEAR2 = 60 * 60;
const MID2 = 120 * 120;
const FAR2 = 200 * 200;
const AJ_NIGHT_R2 = 55 * 55;

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
    const dx = from.x - o.x;
    const dz = from.z - o.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > 0.01 && d2 < radius * radius) {
      const inv = force / d2;
      out.x += dx * inv;
      out.z += dz * inv;
    }
  }
}

export function spawnNpcs(count = 28) {
  const demographicNpcs = spawnCityDemographics();
  G.npcs = [];
  for (let i = 0; i < count; i++) {
    const n = person();
    let x;
    let z;
    try {
      const p = randomWalkPoint?.();
      if (p) {
        x = p.x;
        z = p.z;
      }
    } catch {
      /* walkables optional */
    }
    if (x == null) {
      x = (Math.random() - 0.5) * 125;
      z = (Math.random() - 0.5) * 125;
      if (Math.abs(x) < 14 || Math.abs(z) < 14) x += 22;
    }
    n.position.set(x, heightAt(x, z), z);
    G.scene.add(n);
    const rec = {
      g: n,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ),
      turn: 2 + Math.random() * 4,
      hitT: 0,
    };
    bindSchedule(rec);
    G.npcs.push(rec);
  }
  G.npcs.unshift(...demographicNpcs);
}

function spawnCityDemographics() {
  const people = [];
  const spawnGroup = (anchor, count, demographic, uniform, radius = 30) => {
    if (!anchor) return;
    for (let i = 0; i < count; i++) {
      const look = {
        ...streetLook(),
        ...(uniform.look || {}),
      };
      const n = person({ look, tint: uniform.tint, scale: uniform.scale || 1 });
      const offset = () => (Math.random() - 0.5) * Math.min(radius, 14);
      const point = projectToWalk(anchor.x + offset(), anchor.z + offset(), 28) || randomWalkPoint();
      n.position.set(point.x, heightAt(point.x, point.z), point.z);
      G.scene.add(n);
      const rec = {
        g: n,
        v: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2),
        turn: 2 + Math.random() * 4,
        hitT: 0,
        demographic,
        anchor,
        radius,
        speed: 1.05,
      };
      bindSchedule(rec);
      rec.archetype = demographic === 'student' ? 'youth' : 'office';
      rec.home = projectToWalk(
        anchor.x + (Math.random() - 0.5) * 52,
        anchor.z + (Math.random() - 0.5) * 52,
        32
      ) || point;
      if (demographic === 'student') rec.schoolSpot = anchor;
      else rec.workSpot = anchor;
      people.push(rec);
    }
  };
  const uniform = (top, bottom, options = {}) => ({
    look: { outfit: 8, shirt: 8, pants: 3, accessory: options.accessory ?? 0, facialHair: options.facialHair ?? 0 },
    tint: { top, bottom, skin: options.skin || '#5a3a28', shoes: '#1b1b1b' },
    scale: options.scale || 0.98,
  });

  for (const id of ['bank1', 'bank2', 'marinabank', 'vibank']) {
    const bank = placeOf(id);
    spawnGroup(bank, 2, 'banker', uniform('#e8e4da', '#202630', { accessory: 3 }), 24);
  }
  for (const id of ['cafe', 'yabatech', 'vibank', 'lekkimart', 'alagomeji-tech', 'alagomeji-startups', 'ikeja-tech']) {
    const hub = placeOf(id);
    spawnGroup(hub, 2, 'tech-bro', uniform(pick(['#1c3152', '#2f5a4b', '#47365e', '#29343a']), '#252b32', { accessory: 3 }), 34);
  }
  const schools = [
    ['school', '#f0ead7', '#263a60'],
    ['yabatech', '#f1bf2d', '#183b32'],
    ['unilag', '#f0ead7', '#386a42'],
    ['ajah-school', '#d9e3ef', '#394b86'],
    ['ikorodu-school', '#f2d778', '#5c312f'],
    ['apapa-school', '#edf0e7', '#2e5b42'],
    ['ikeja-school', '#f1d89b', '#4c376c'],
  ];
  for (const [id, top, bottom] of schools) {
    const school = placeOf(id);
    spawnGroup(school, 2, 'student', {
      ...uniform(top, bottom, { scale: 0.78 }),
      look: { outfit: 5, shirt: 8, pants: 3, bodyType: 0, accessory: 0, facialHair: 0 },
    }, 24);
  }
  const busyCrowd = PERF.lowEnd ? 3 : 8;
  for (const id of ['yaba', 'shitta', 'mushin', 'ajegunle', 'ikorodu-market', 'ikeja-tech', 'tejuosho', 'oyingbo-market', 'agege-market', 'apapa-market', 'ojo-market', 'ojo-alaba', 'sangotedo', 'ikoyi-market', 'balogun-market']) {
    spawnGroup(
      placeOf(id),
      PERF.lowEnd ? 4 : busyCrowd,
      'market-crowd',
      uniform(pick(['#e7a62c', '#2f8050', '#b9473e', '#7b4a9d']), '#24272c', { scale: 1.02 }),
      12
    );
  }
  const busyStops = ['ojstop', 'kilo', 'costain', 'cms', 'stadstop', 'jibowu', 'ikorodu-garage-stop', 'ajstop', 'makoko-shore-stop', 'oyingbo-market-bus', 'agege-motor-road-stop', 'apapa-bus', 'alaba-bus', 'sangotedo-bus', 'tejuosho-bus'];
  for (const id of busyStops) {
    const stop = placeOf(id);
    spawnGroup(
      stop,
      PERF.lowEnd ? 3 : 6,
      'bus-stop-crowd',
      uniform(pick(['#d94b3d', '#f0bf2c', '#3572aa', '#39935a']), '#22262b', { scale: 1.0 }),
      9
    );
  }
  people.sort((a, b) =>
    Number(b.demographic.includes('crowd')) - Number(a.demographic.includes('crowd'))
  );
  return people;
}

export function spawnAgberos() {
  G.agberos = [];
  for (const b of BUSSTOPS) {
    for (let i = 0; i < b.agberos; i++) {
      const n = person({
        ...uniform(pick([0xc8d400, 0x2bb34a]), 0xd62828),
        scale: 1.08,
      });
      const x = b.x - 6 + i * 12;
      const z = b.z - 2.5;
      n.position.set(x, heightAt(x, z), z);
      G.scene.add(n);
      G.agberos.push({
        g: n,
        x: n.position.x,
        z: n.position.z,
        cool: 0,
        stop: b,
      });
    }
  }
}

export function spawnServiceNpcs() {
  G.service = [];
  const capColors = {
    police: 0x111318,
    army: 0x3f5a2a,
    lastma: 0x7a1e2d,
    lawma: 0xf07a1e,
    vio: 0x174a78,
    kai: 0x8a2638,
    civildefence: 0x245a74,
  };
  for (const s of SERVICE_NPCS) {
    const n = person({
      ...uniform(UNIFORMS[s.u], capColors[s.u] || 0x1b1b1b),
      scale: 1.05,
    });
    n.position.set(s.x, heightAt(s.x, s.z), s.z);
    G.scene.add(n);
    G.service.push({ g: n, x: s.x, z: s.z, u: s.u });
  }
}

export function spawnArtisanNpcs() {
  G.artisans = [];
  const workwear = {
    Carpenter: 0x8a5a32,
    Tailor: 0x765b82,
    Shoemaker: 0x654834,
    Welder: 0x4e5960,
    Painter: 0x6d7841,
  };
  for (const artisan of ARTISAN_NPCS) {
    const color = workwear[artisan.profession] || 0x69523b;
    const n = person({ ...uniform(color, color), scale: 1.02 });
    n.position.set(artisan.x + 2.5, heightAt(artisan.x + 2.5, artisan.z - 6), artisan.z - 6);
    G.scene.add(n);
    G.artisans.push({ g: n, profession: artisan.profession, x: n.position.x, z: n.position.z });
  }
}

/** Sisi Kemi — AJ City contact (story / errands). */
export function spawnAjContacts() {
  const aj = placeOf('ajegunle');
  if (!aj || !G.scene) return;

  G.contacts = G.contacts || [];
  // Avoid duplicate if city re-inits
  if (G.contacts.some(c => c.id === 'sisi')) return;

  const g = person({ look: streetLook(), scale: 0.98 });
  const x = aj.x + 3;
  const z = aj.z + 2;
  g.position.set(x, heightAt(x, z), z);
  G.scene.add(g);
  G.contacts.push({
    id: 'sisi',
    g,
    x: g.position.x,
    z: g.position.z,
  });
}

/**
 * Extra foot traffic for Ajegunle at night (19:00–05:00).
 * Hidden by day; leashed near AJ centre at night.
 */
export function spawnAjNightCrowd(count = 10) {
  const aj = placeOf('ajegunle');
  if (!aj || !G.scene) return;

  G.ajNight = [];
  for (let i = 0; i < count; i++) {
    const n = person();
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 28;
    let x = aj.x + Math.cos(a) * r;
    let z = aj.z + Math.sin(a) * r;
    if (inWater(x, z)) continue;

    n.position.set(x, heightAt(x, z), z);
    n.visible = false;
    G.scene.add(n);

    G.ajNight.push({
      g: n,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        0,
        (Math.random() - 0.5) * 1.4
      ),
      turn: 1 + Math.random() * 3,
      home: { x: aj.x, z: aj.z },
    });
  }
}

export function spawnExtras() {
  G.nightlife = NIGHTLIFE_NPCS.map(n => {
    const g = person({
      look: { ...streetLook(), outfit: 5, accessory: 0 },
      tint: {
        top: hex(pick([0xff2d7a, 0xff7a1a, 0xd62878, 0x7a28d6])),
        bottom: '#1b1b1b',
        skin: '#5a3a28',
        shoes: '#f0f0f0',
      },
      scale: 0.95,
    });
    g.position.set(n.x, heightAt(n.x, n.z), n.z);
    g.visible = false;
    G.scene.add(g);
    return { g, x: n.x, z: n.z, name: n.name };
  });

  const sc = placeOf('school');
  G.kids = [];
  if (sc) {
    for (let i = 0; i < 8; i++) {
      const g = person({
        look: {
          ...streetLook(),
          outfit: 5,
          accessory: 0,
          facialHair: 0,
          bodyType: 0,
        },
        tint: {
          top: hex(pick([0xf0f0f0, 0x2f5fd0])),
          bottom: '#1f2a44',
          skin: '#6a4a3a',
          shoes: '#1b1b1b',
        },
        scale: 0.7,
      });
      const x = sc.x + (Math.random() - 0.5) * 16;
      const z = sc.z - 10 - Math.random() * 5;
      g.position.set(x, heightAt(x, z), z);
      g.visible = false;
      G.scene.add(g);
      G.kids.push({
        g,
        home: { x: g.position.x, z: g.position.z },
        t: Math.random() * 3,
      });
    }
  }

  // AJ City: contact + night density
  spawnAjContacts();
  spawnAjNightCrowd(10);
}

function updateAjNightCrowd(dt, nightOpen) {
  for (const n of G.ajNight || []) {
    if (!n?.g) continue;
    n.g.visible = nightOpen;
    if (!nightOpen) continue;

    n.turn -= dt;
    if (n.turn <= 0) {
      n.turn = 1 + Math.random() * 3;
      n.v.set(
        (Math.random() - 0.5) * 1.6,
        0,
        (Math.random() - 0.5) * 1.6
      );
    }

    n.g.position.addScaledVector(n.v, dt);

    const dx = n.g.position.x - n.home.x;
    const dz = n.g.position.z - n.home.z;
    if (dx * dx + dz * dz > 40 * 40) {
      n.v.set(-dx, 0, -dz).normalize().multiplyScalar(1.5);
    }

    if (inWater(n.g.position.x, n.g.position.z) || blockedAt(n.g.position, NPC_R)) {
      n.v.x *= -1;
      n.v.z *= -1;
      n.g.position.addScaledVector(n.v, dt);
    }

    n.g.position.y = heightAt(n.g.position.x, n.g.position.z);

    const sp = Math.hypot(n.v.x, n.v.z);
    if (sp > 0.15) n.g.rotation.y = Math.atan2(n.v.x, n.v.z);
    n.g.userData.c?.setState(sp > 0.15 ? 'walk' : 'idle', sp);
  }
}

export function updateNpcs(dt) {
  const h = G.state.clock;
  const nightOpen = h >= 19 || h < 5; // AJ night strip starts earlier
  const marketHour = h >= 10 && h < 16;
  const lateNight = h >= 23 || h < 5;
  const playerPos = G.player?.position;
  const aj = placeOf('ajegunle');

  for (const n of G.npcs) {
    if (n.hidden) {
      n.g.visible = false;
      continue;
    }

    const pdx = playerPos ? n.g.position.x - playerPos.x : 0;
    const pdz = playerPos ? n.g.position.z - playerPos.z : 0;
    const pd2 = pdx * pdx + pdz * pdz;
    n.far = pd2 > FAR2;
    n.band = n.far ? 4 : pd2 > MID2 ? 2 : pd2 > NEAR2 ? 1 : 0;

    const steered = applyScheduleSteer(n, h);
    if (!steered) {
      // Keep more bodies near AJ City at night; thin elsewhere late night
      let nearAj = false;
      if (aj) {
        const adx = n.g.position.x - aj.x;
        const adz = n.g.position.z - aj.z;
        nearAj = adx * adx + adz * adz < AJ_NIGHT_R2;
      }

      if (lateNight && !nearAj && G.npcs.indexOf(n) % 2) {
        n.g.visible = false;
      } else {
        n.g.visible = true;
      }

      if (marketHour && n.turn <= 0.05) {
        const m = pick([
          placeOf('yaba'),
          placeOf('shitta'),
          placeOf('mushin'),
          placeOf('ajegunle'),
        ].filter(Boolean));
        if (m && dist(n.g.position, m) > 18) {
          n.v
            .set(m.x - n.g.position.x, 0, m.z - n.g.position.z)
            .normalize()
            .multiplyScalar(1.6);
          n.turn = 2;
        }
      }

      n.turn -= dt;
      if (n.turn <= 0) {
        n.turn = 2 + Math.random() * 4;
        n.v.set(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        );
      }
    }

    if (!n.far) n.g.position.addScaledVector(n.v, dt);

    const sp = Math.hypot(n.v.x, n.v.z);
    if (sp > 0.2) n.g.rotation.y = Math.atan2(n.v.x, n.v.z);
    n.g.userData.c?.setState(sp > 0.2 ? 'walk' : 'idle', sp);

    if (n.anchor && dist(n.g.position, n.anchor) > n.radius) {
      n.v.set(n.anchor.x - n.g.position.x, 0, n.anchor.z - n.g.position.z).normalize().multiplyScalar(n.speed);
    }
    if (n.g.position.x < WORLD.bounds.x[0] || n.g.position.x > WORLD.bounds.x[1] ||
        n.g.position.z < WORLD.bounds.z[0] || n.g.position.z > WORLD.bounds.z[1]) {
      n.g.position.x = Math.max(WORLD.bounds.x[0], Math.min(WORLD.bounds.x[1], n.g.position.x));
      n.g.position.z = Math.max(WORLD.bounds.z[0], Math.min(WORLD.bounds.z[1], n.g.position.z));
      n.v.x *= -1;
      n.v.z *= -1;
    }
    if (n.hitT > 0) {
      n.hitT -= dt;
      n.g.rotation.x = n.hitT > 0 ? Math.PI / 2 : 0;
    }
  }

  const positions = G._npcPos || (G._npcPos = []);
  positions.length = 0;
  for (const n of G.npcs) {
    if (n.g.visible) positions.push(n.g.position);
  }

  for (const n of G.npcs) {
    if (!n.g.visible) continue;
    if (n.far) {
      n.g.userData.c?.setState('idle', 0);
      continue;
    }

    n._f = (n._f || 0) + 1;
    if ((n.band === 2 && n._f % 4) || (n.band === 1 && n._f % 2)) continue;

    const pos = n.g.position;

    if (marketHour && !n.market) {
      n.market = pick(
        [
          placeOf('yaba'),
          placeOf('shitta'),
          placeOf('mushin'),
          placeOf('ajegunle'),
        ].filter(Boolean)
      );
    }
    if (!marketHour) n.market = null;

    if (
      n.market &&
      !n.crossing &&
      n.turn <= 0.05 &&
      dist(pos, n.market) > 18
    ) {
      n.v.set(n.market.x - pos.x, 0, n.market.z - pos.z);
      normalizeSpeed(n.v, SPEED);
      n.turn = 2.5;
    }

    if (!n.crossing && n.turn < 0.4 && Math.random() < CROSS_CHANCE * dt * 2) {
      const j = nearestCrossing(pos.x, pos.z, 12);
      if (j) {
        const dx = j.x - pos.x;
        const dz = j.z - pos.z;
        n.v.set(
          dx + (dx || Math.random() - 0.5) * 0.4,
          0,
          dz + (dz || Math.random() - 0.5) * 0.4
        );
        normalizeSpeed(n.v, CROSS_SPEED);
        n.crossing = { x: j.x, z: j.z, r: j.r, t: 3.5 };
        n.turn = 3.5;
      }
    }

    if (n.crossing) {
      n.crossing.t -= dt;
      if (
        n.crossing.t <= 0 ||
        (onWalkable(pos.x, pos.z, 2.2) &&
          Math.hypot(pos.x - n.crossing.x, pos.z - n.crossing.z) >
            n.crossing.r * 0.55)
      ) {
        n.crossing = null;
        normalizeSpeed(n.v, SPEED);
      }
    }

    _sep.set(0, 0, 0);
    steerAway(pos, positions, SEP_R, SEP_FORCE, _sep);
    if (playerPos && !G.inCar) {
      steerAway(pos, [playerPos], PLAYER_SEP, SEP_FORCE * 1.4, _sep);
    }
    if (_sep.x || _sep.z) {
      n.v.x += _sep.x * dt;
      n.v.z += _sep.z * dt;
      normalizeSpeed(n.v, n.crossing ? CROSS_SPEED : SPEED);
    }

    _old.copy(pos);
    pos.addScaledVector(n.v, dt);
    pos.y = heightAt(pos.x, pos.z);

    if (blockedAt(pos, NPC_R) || inWater(pos.x, pos.z)) {
      pos.copy(_old);
      n.v.x = -n.v.x + (Math.random() - 0.5) * 0.9;
      n.v.z = -n.v.z + (Math.random() - 0.5) * 0.9;
      normalizeSpeed(n.v, SPEED);
      n.crossing = null;
      n.turn = 0.6 + Math.random() * 0.8;
    }

    if (!n.crossing && !onWalkable(pos.x, pos.z, 3.5)) {
      const p = projectToWalk(pos.x, pos.z, 10);
      if (p) {
        n.v.x += (p.x - pos.x) * 0.7 * dt;
        n.v.z += (p.z - pos.z) * 0.7 * dt;
        normalizeSpeed(n.v, SPEED);
      }
    }

    const sp2 = Math.hypot(n.v.x, n.v.z);
    if (sp2 > 0.2) n.g.rotation.y = Math.atan2(n.v.x, n.v.z);
    n.g.userData.c?.setState(sp2 > 0.2 ? 'walk' : 'idle', sp2);

    n.turn -= dt;
    if (n.turn <= 0 && !n.crossing) {
      n.turn = 2 + Math.random() * 4;
      const flip = Math.random() < 0.32;
      if (Math.abs(n.v.x) >= Math.abs(n.v.z)) {
        n.v.set(
          (flip ? -Math.sign(n.v.x) || 1 : Math.sign(n.v.x) || 1) * SPEED,
          0,
          (Math.random() - 0.5) * 0.45
        );
      } else {
        n.v.set(
          (Math.random() - 0.5) * 0.45,
          0,
          (flip ? -Math.sign(n.v.z) || 1 : Math.sign(n.v.z) || 1) * SPEED
        );
      }
    }

    if (Math.abs(pos.x) > 220 || Math.abs(pos.z) > 220) {
      n.v.x *= -1;
      n.v.z *= -1;
      n.crossing = null;
    }

    if (n.hitT > 0) {
      n.hitT -= dt;
      n.g.rotation.x = n.hitT > 0 ? Math.PI / 2 : 0;
    }
  }

  const t = performance.now() / 900;
  for (const a of G.agberos) {
    a.g.rotation.y = Math.sin(t + a.x) * 0.4;
    a.cool -= dt;
    const guarded =
      G.state.home && G.state.upgrades?.[G.state.home]?.includes('security');
    if (
      !G.inCar &&
      !frozen() &&
      !G.state.pet &&
      !guarded &&
      a.cool <= 0 &&
      dist(G.player.position, a) < 3.6
    ) {
      runAgbero(a);
      break;
    }
  }

  updateCrew(dt);
  updateAjNightCrowd(dt, nightOpen);

  for (const s of G.service || []) {
    s.g.rotation.y = Math.sin(t * 0.6 + s.x) * 0.25;
  }

  // Nightlife venue NPCs (existing)
  for (const n of G.nightlife || []) {
    if (n.g) n.g.visible = nightOpen && (h >= 20 || h < 4);
  }
}