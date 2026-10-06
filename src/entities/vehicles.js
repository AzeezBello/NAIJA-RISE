import * as THREE from 'three';
import { G, pos } from '../core/context.js';
import { approach, pick, rnd } from '../core/utils.js';
import { mat, lamps } from '../world/builders.js';
import { VEH, PARKED, TRAFFIC_MIX, TRAFFIC_COLORS, LANE_OFFSET } from '../data/vehicles.js';
import { ROADS } from '../data/locations.js';

// Local forward: every vehicle model faces -z.
export const vForward = o => new THREE.Vector3(-Math.sin(o.rotation.y), 0, -Math.cos(o.rotation.y));

function wheel(g, x, y, z, r = 0.38) {
  const wh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 14), mat(0x101111));
  wh.rotation.z = Math.PI / 2; wh.position.set(x, y, z); g.add(wh);
}
function lamp(g, x, y, z) {
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.05), mat(0xffe7ad));
  l.position.set(x, y, z); g.add(l); lamps.push(l.material);
}
const body = c => new THREE.MeshStandardMaterial({ color: c, metalness: 0.35, roughness: 0.38 });
const GLASS = () => new THREE.MeshStandardMaterial({ color: 0x152022, roughness: 0.15, metalness: 0.3 });
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function truck(g, add, len, cabColor, bedColor, extra) {
  const glass = GLASS();
  add(B(2.4, 2.3, 2.4), body(cabColor), 0, 1.55, -len / 2 + 1.2);
  add(B(2.44, 0.7, 0.1), glass, 0, 1.9, -len / 2 - 0.02);
  add(B(2.5, 1.9, len - 2.8), body(bedColor), 0, 1.5, 1.5);
  for (const sx of [-1, 1]) for (const sz of [-len / 2 + 1.1, len / 2 - 2.6, len / 2 - 1]) wheel(g, sx * 1.15, 0.5, sz, 0.48);
  lamp(g, -0.8, 0.9, -len / 2 - 0.03); lamp(g, 0.8, 0.9, -len / 2 - 0.03);
  if (extra) extra();
}

// Low-poly Lagos vehicles: sedan, danfo, korope, keke napep, okada, BRT, police, fire, LAWMA, army.
export function makeVehicle(type, color = 0x172e35) {
  const g = new THREE.Group(); g.userData.type = type;
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const glass = GLASS();
  switch (type) {
    case 'car': case 'police': {
      const c = type === 'police' ? 0x14213d : color;
      add(B(2.55, 0.56, 4.75), body(c), 0, 0.65, 0); add(B(2.08, 0.72, 2.15), glass, 0, 1.1, 0.15);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(g, sx * 1.16, 0.42, sz * 1.55);
      lamp(g, -0.7, 0.72, -2.39); lamp(g, 0.7, 0.72, -2.39);
      if (type === 'police') {
        add(B(2.58, 0.2, 4.75), body(0xf0f0f0), 0, 0.78, 0);
        const bar = add(B(1, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 0.4 }), 0, 1.55, 0.1);
        g.userData.lightbar = bar.material;
      }
      break;
    }
    case 'danfo':
      add(B(2.3, 2, 5.2), body(0xf5c518), 0, 1.35, 0); add(B(2.34, 0.62, 3.4), glass, 0, 1.85, 0.3); add(B(2.34, 0.6, 0.1), glass, 0, 1.85, -2.56);
      for (const sx of [-1.17, 1.17]) add(B(0.04, 0.28, 5.2), body(0x111111), sx, 1.05, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(g, sx * 1.05, 0.42, sz * 1.7, 0.4);
      lamp(g, -0.7, 0.9, -2.62); lamp(g, 0.7, 0.9, -2.62); break;
    case 'korope':
      add(B(1.9, 1.8, 3.6), body(0xf5c518), 0, 1.2, 0); add(B(1.94, 0.55, 2.4), glass, 0, 1.65, 0.2); add(B(1.94, 0.55, 0.1), glass, 0, 1.65, -1.76);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(g, sx * 0.85, 0.36, sz * 1.2, 0.34);
      lamp(g, -0.55, 0.8, -1.82); lamp(g, 0.55, 0.8, -1.82); break;
    case 'keke':
      add(B(1.3, 0.8, 2.4), body(0xf5c518), 0, 0.75, 0); add(B(1.22, 0.85, 1.6), glass, 0, 1.45, 0.25); add(B(1.42, 0.1, 2.2), body(0xf5c518), 0, 1.92, 0.1);
      wheel(g, 0, 0.32, -1.05, 0.3); wheel(g, -0.6, 0.32, 0.8, 0.3); wheel(g, 0.6, 0.32, 0.8, 0.3);
      lamp(g, 0, 0.95, -1.22); break;
    case 'okada':
      add(B(0.3, 0.5, 1.8), body(color), 0, 0.65, 0); add(B(0.5, 0.12, 0.6), body(0x222222), 0, 0.95, 0.2);
      wheel(g, 0, 0.35, -0.85, 0.35); wheel(g, 0, 0.35, 0.85, 0.35);
      add(new THREE.CapsuleGeometry(0.24, 0.55, 4, 8), mat(pick([0x356a50, 0x8b5a31, 0x4c5178])), 0, 1.3, 0.15);
      add(new THREE.SphereGeometry(0.22, 10, 8), mat(0x1b1b1b), 0, 1.85, 0.05);
      lamp(g, 0, 0.85, -0.95); break;
    case 'brt':
      add(B(2.6, 3, 11), body(0x1c4fa0), 0, 1.7, 0); add(B(2.64, 0.5, 11), body(0xf0f0f0), 0, 1.25, 0); add(B(2.64, 0.85, 10), glass, 0, 2.4, 0); add(B(2.64, 0.9, 0.1), glass, 0, 2.4, -5.52);
      for (const sx of [-1, 1]) for (const sz of [-3.8, 0, 3.8]) wheel(g, sx * 1.2, 0.5, sz, 0.48);
      lamp(g, -0.9, 1, -5.55); lamp(g, 0.9, 1, -5.55); break;
    case 'fire':
      truck(g, add, 8, 0xc62828, 0xb71c1c, () => { add(B(0.5, 0.3, 4.5), body(0xdddddd), 0.6, 2.6, 1.6); add(B(0.5, 0.3, 4.5), body(0xdddddd), -0.6, 2.6, 1.6); const bar = add(B(1.2, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.5 }), 0, 2.8, -2.8); g.userData.lightbar = bar.material; });
      break;
    case 'lawma':
      truck(g, add, 7, 0xf07a1e, 0xd96a12, () => { add(B(2.2, 0.3, 3.4), body(0x4a4a4a), 0, 2.6, 1.5); });
      break;
    case 'army':
      truck(g, add, 7, 0x3f5a2a, 0x4e6b36, () => { add(B(2.5, 1.2, 4.2), body(0x5f7a45), 0, 3.0, 1.5); });
      break;
    case 'tanker': {
      truck(g, add, 10, 0xe0e0e0, 0x3a3a3a, () => {
        const tank = add(new THREE.CylinderGeometry(1.25, 1.25, 6.8, 18), body(0xd9d9d9), 0, 2.1, 1.6); tank.rotation.x = Math.PI / 2;
        add(B(0.2, 0.9, 5.5), body(0xc62828), 1.26, 2.1, 1.6); add(B(0.2, 0.9, 5.5), body(0xc62828), -1.26, 2.1, 1.6);
      });
      break;
    }
  }
  G.scene.add(g);
  return g;
}

export function spawnParked() {
  G.parked = PARKED.map(p => { const v = makeVehicle(p.type, p.color); v.position.set(p.x, 0, p.z); v.rotation.y = p.rot; v.userData.cond = 100; return v; });
}
// Owned vehicles (PRD §11) park outside the player's home gate, or at Ladipo when there is no home.
export function spawnOwned(home) {
  for (const o of G.state.vehicles || []) {
    if (G.parked.some(v => v.userData.ownedId === o.id)) continue;
    const v = makeVehicle(o.type, 0x1f3a5a); v.userData.ownedId = o.id; v.userData.owned = true; v.userData.cond = o.cond ?? 100;
    const base = home ? home.door : { x: -42, z: 62 }; const i = G.parked.filter(v => v.userData.owned).length;
    v.position.set(base.x + 6 + i * 4, 0, base.z - 3); v.rotation.y = Math.PI / 2; G.parked.push(v);
  }
}

/* ---------- traffic AI: lane following on the road grid with random turns ---------- */
const poseFor = t => (t.axis === 'h' ? (t.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (t.dir > 0 ? Math.PI : 0));
const snapLane = t => { if (t.axis === 'h') t.g.position.z = t.k + t.dir * LANE_OFFSET; else t.g.position.x = t.k - t.dir * LANE_OFFSET; };

export function spawnTraffic() {
  G.traffic = TRAFFIC_MIX.map(type => {
    const axis = type === 'brt' || type === 'tanker' ? 'h' : pick(['h', 'v']);
    const k = pick(axis === 'h' ? ROADS.h : ROADS.v), dir = pick([1, -1]);
    let c = rnd(-140, 140); if (Math.abs(c) < 25 && Math.abs(k) < 1) c += 40;
    const g = makeVehicle(type, pick(TRAFFIC_COLORS));
    const t = { g, type, axis, dir, k, speed: 0, cruise: VEH[type].max * rnd(0.5, 0.7), cool: rnd(0, 2), pursuit: false };
    if (axis === 'h') g.position.set(c, 0, k + dir * LANE_OFFSET); else g.position.set(k - dir * LANE_OFFSET, 0, c);
    g.rotation.y = poseFor(t);
    return t;
  });
}

// Returns a pursuing car to its nearest lane.
export function rejoinTraffic(t) {
  const p = t.g.position;
  let best = null;
  for (const z of ROADS.h) { const d = Math.abs(p.z - z); if (!best || d < best.d) best = { d, axis: 'h', k: z }; }
  for (const x of ROADS.v) { const d = Math.abs(p.x - x); if (d < best.d) best = { d, axis: 'v', k: x }; }
  t.axis = best.axis; t.k = best.k; t.dir = pick([1, -1]); t.pursuit = false; snapLane(t); t.g.rotation.y = poseFor(t);
}

export function updateTraffic(dt) {
  const pp = pos();
  for (const t of G.traffic) {
    if (t.pursuit) continue;   // systems/police.js drives it
    const fx = t.axis === 'h' ? t.dir : 0, fz = t.axis === 'v' ? t.dir : 0;
    let target = t.cruise;
    const check = (px, pz, gap) => {
      const dx = px - t.g.position.x, dz = pz - t.g.position.z;
      const along = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < gap + 9 && lat < 3) target = Math.min(target, Math.max(0, (along - gap) * 1.6));
    };
    for (const o of G.traffic) if (o !== t) check(o.g.position.x, o.g.position.z, VEH[t.type].len / 2 + VEH[o.type].len / 2 + 1.5);
    check(pp.x, pp.z, VEH[t.type].len / 2 + 3);
    const jam = G.jam;
    if (jam && jam.axis === t.axis && jam.k === t.k) { const c = t.axis === 'h' ? t.g.position.x : t.g.position.z; if (c > jam.from && c < jam.to) target = Math.min(target, 1.6); }
    if (G.rain) target *= 0.7;
    t.speed = approach(t.speed, target, (target < t.speed ? 22 : 7) * dt);
    t.g.position.x += fx * t.speed * dt; t.g.position.z += fz * t.speed * dt;
    t.cool -= dt;
    if (t.cool <= 0 && t.type !== 'brt') {
      const cross = t.axis === 'h' ? ROADS.v : ROADS.h;
      const c = t.axis === 'h' ? t.g.position.x : t.g.position.z;
      for (const k of cross) {
        if (Math.abs(c - k) >= 1.2) continue;
        t.cool = 2.5;
        if (Math.random() < 0.4) {
          const nd = pick([1, -1]);
          if (t.axis === 'h') { t.axis = 'v'; t.k = k; t.dir = nd; t.g.position.x = k - nd * LANE_OFFSET; }
          else { t.axis = 'h'; t.k = k; t.dir = nd; t.g.position.z = k + nd * LANE_OFFSET; }
          t.g.rotation.y = poseFor(t);
        }
        break;
      }
    }
    const c2 = t.axis === 'h' ? t.g.position.x : t.g.position.z;
    if (c2 > 152 || c2 < -152) { const nc = c2 > 0 ? -150 : 150; if (t.axis === 'h') t.g.position.x = nc; else t.g.position.z = nc; }
  }
}
