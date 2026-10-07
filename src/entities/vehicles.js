import * as THREE from 'three';
import { G, pos } from '../core/context.js';
import { approach, pick, rnd } from '../core/utils.js';
import { mat, lamps } from '../world/builders.js';
import { VEH, PARKED, TRAFFIC_MIX, TRAFFIC_COLORS, LANE_OFFSET, MODELS, MODEL_PAINT, USE_MODELS } from '../data/vehicles.js';
import { attachModel, spinWheels } from './vehicleModels.js';
import { ROADS, roadRules, JUNCTIONS, roadExtent, BRIDGE_RUSH, onBridge } from '../data/locations.js';
import { heightAt } from '../world/terrain.js';
import { lightFor } from '../systems/trafficlights.js';
import { PERF } from '../data/config.js';
import { BUSSTOPS } from '../data/locations.js';

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
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.userData.body = m.isMeshStandardMaterial && m !== glass && m.color.getHex() !== 0x111111 && m.color.getHex() !== 0x101111; g.add(o); return o; };
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
        case 'danfo': {
      // Yellow VW-style high-roof bus: boxy body, black stripe, rear engine hump
      const Y = 0xf5c518, BLK = 0x111111;
      add(B(2.35, 2.15, 5.4), body(Y), 0, 1.4, 0);                    // body
      add(B(2.38, 0.55, 3.6), glass, 0, 1.95, 0.15);                  // side windows
      add(B(2.38, 0.7, 0.08), glass, 0, 1.9, -2.68);                  // windscreen
      add(B(2.38, 0.5, 0.08), glass, 0, 1.85, 2.68);                  // rear window
      // classic black waist stripe
      for (const sx of [-1.19, 1.19]) add(B(0.05, 0.32, 5.4), body(BLK), sx, 1.05, 0);
      add(B(2.36, 0.28, 5.42), body(BLK), 0, 1.05, 0);
      // rear engine bulge (VW)
      add(B(2.1, 0.7, 0.9), body(Y), 0, 0.95, 2.35);
      // bumper + number plate stub
      add(B(2.2, 0.25, 0.15), body(0x333333), 0, 0.55, -2.72);
      for (const sx of [-1, 1]) for (const sz of [-1.6, 1.6]) wheel(g, sx * 1.05, 0.42, sz, 0.4);
      lamp(g, -0.75, 0.95, -2.72); lamp(g, 0.75, 0.95, -2.72);
      g.userData.commercial = true;
      break;
    }
    case 'keke': {
      // Napep: yellow cabin, open rear passenger bench, 3 wheels
      const Y = 0xf5c518, GRN = 0x2bb34a;
      add(B(1.35, 0.9, 1.5), body(Y), 0, 0.85, -0.35);               // cabin
      add(B(1.28, 0.75, 1.0), glass, 0, 1.45, -0.35);                 // cabin glass
      add(B(1.45, 0.08, 1.4), body(Y), 0, 1.9, -0.3);                 // roof
      // open passenger tub behind
      add(B(1.4, 0.55, 1.15), body(Y), 0, 0.7, 0.85);
      add(B(1.42, 0.5, 0.06), body(GRN), 0, 0.95, 1.4);               // rear panel stripe
      // roll bars
      for (const sx of [-0.6, 0.6]) add(B(0.06, 0.7, 0.06), body(0x333333), sx, 1.35, 0.7);
      add(B(1.3, 0.06, 0.06), body(0x333333), 0, 1.7, 0.7);
      // 1 front + 2 rear wheels
      wheel(g, 0, 0.32, -1.0, 0.28);
      wheel(g, -0.55, 0.32, 0.85, 0.28);
      wheel(g, 0.55, 0.32, 0.85, 0.28);
      lamp(g, 0, 0.95, -1.15);
      g.userData.commercial = true;
      break;
    }
    case 'brt': {
      // Blue “London-style” single-deck city bus (Lagos BRT blue + white band)
      const BLU = 0x1c4fa0, WHT = 0xf0f0f0;
      add(B(2.7, 3.1, 12), body(BLU), 0, 1.85, 0);                    // body
      add(B(2.74, 0.55, 12), body(WHT), 0, 1.35, 0);                  // white waist band
      add(B(2.74, 0.95, 11.2), glass, 0, 2.55, 0);                    // windows
      add(B(2.74, 1.0, 0.1), glass, 0, 2.5, -5.95);                   // front glass
      add(B(2.74, 0.8, 0.1), glass, 0, 2.4, 5.95);                    // rear glass
      // roof route box
      add(B(1.6, 0.35, 0.8), body(0x111111), 0, 3.5, -4.2);
      add(B(1.5, 0.25, 0.08), body(0xffc52f), 0, 3.5, -4.62);         // amber destination stub
      // doors (left side indent)
      add(B(0.08, 1.8, 1.4), body(WHT), -1.36, 1.5, -2.5);
      for (const sx of [-1, 1]) for (const sz of [-4.2, 0, 4.2]) wheel(g, sx * 1.2, 0.5, sz, 0.5);
      lamp(g, -0.95, 1.05, -6.0); lamp(g, 0.95, 1.05, -6.0);
      g.userData.commercial = true;
      break;
    }
    case 'korope':
      add(B(1.9, 1.8, 3.6), body(0xf5c518), 0, 1.2, 0); add(B(1.94, 0.55, 2.4), glass, 0, 1.65, 0.2); add(B(1.94, 0.55, 0.1), glass, 0, 1.65, -1.76);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(g, sx * 0.85, 0.36, sz * 1.2, 0.34);
      lamp(g, -0.55, 0.8, -1.82); lamp(g, 0.55, 0.8, -1.82); break;
    
    case 'okada':
      add(B(0.3, 0.5, 1.8), body(color), 0, 0.65, 0); add(B(0.5, 0.12, 0.6), body(0x222222), 0, 0.95, 0.2);
      wheel(g, 0, 0.35, -0.85, 0.35); wheel(g, 0, 0.35, 0.85, 0.35);
      add(new THREE.CapsuleGeometry(0.24, 0.55, 4, 8), mat(pick([0x356a50, 0x8b5a31, 0x4c5178])), 0, 1.3, 0.15);
      add(new THREE.SphereGeometry(0.22, 10, 8), mat(0x1b1b1b), 0, 1.85, 0.05);
      lamp(g, 0, 0.85, -0.95); break;
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
  // real model where one exists: the primitives above stay as the placeholder until it streams in
  const names = USE_MODELS && MODELS[type];
  if (names) attachModel(g, type, pick(names), type in MODEL_PAINT ? MODEL_PAINT[type] : color, { lightbar: type === 'police' ? 0x2244ff : type === 'fire' ? 0xff2222 : null });
  if (VEH[type]?.commercial) g.userData.commercial = true;
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
    if (o.pos) { v.position.set(o.pos.x, 0, o.pos.z); v.rotation.y = o.pos.rot; } else { v.position.set(base.x + 6 + i * 4, 0, base.z - 3); v.rotation.y = Math.PI / 2; }
    G.parked.push(v);
    import('../systems/interaction.js').then(m => { if (o.livery !== undefined) m.applyLivery(v, o); if (o.slogan !== undefined) m.applySlogan(v, o); });
  }
}

/* ---------- traffic AI: lane following on the road grid with random turns ---------- */
const poseFor = t => (t.axis === 'h' ? (t.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (t.dir > 0 ? Math.PI : 0));
const snapLane = t => { if (t.axis === 'h') t.g.position.z = t.k + t.dir * LANE_OFFSET; else t.g.position.x = t.k - t.dir * LANE_OFFSET; };

export function spawnTraffic() {
  G.traffic = TRAFFIC_MIX.slice(0, PERF.lowEnd ? PERF.trafficCap.low : PERF.trafficCap.full).map(type => {
    const axis = type === 'brt' || type === 'tanker' ? 'h' : pick(['h', 'v']);
    const k = pick(axis === 'h' ? ROADS.h : ROADS.v), dir = pick([1, -1]), [ea, eb] = roadExtent(axis, k);
    let c = rnd(ea + 10, eb - 10); if (Math.abs(c) < 25 && Math.abs(k) < 1) c += 40;
    const g = makeVehicle(type, pick(TRAFFIC_COLORS));
    const t = { g, type, axis, dir, k, speed: 0, cruise: VEH[type].max * rnd(0.5, 0.7), cool: rnd(0, 2), pursuit: false };
    if (type === 'brt') {
      t.axis = 'h';
      t.k = pick(ROADS.h.filter(z => Math.abs(z) < 5 || z === -330 || z === 240) || ROADS.h);
    }
    if (axis === 'h') g.position.set(c, 0, k + dir * LANE_OFFSET); else g.position.set(k - dir * LANE_OFFSET, 0, c);
    g.rotation.y = poseFor(t);
    return t;
  });
}

// Returns a pursuing car to its nearest lane.
export function rejoinTraffic(t) {
  const p = t.g.position;
  let best = null;
  for (const z of ROADS.h) { const [a, b] = roadExtent('h', z); if (p.x < a || p.x > b) continue; const d = Math.abs(p.z - z); if (!best || d < best.d) best = { d, axis: 'h', k: z }; }
  for (const x of ROADS.v) { const [a, b] = roadExtent('v', x); if (p.z < a || p.z > b) continue; const d = Math.abs(p.x - x); if (!best || d < best.d) best = { d, axis: 'v', k: x }; }
  t.axis = best.axis; t.k = best.k; t.dir = pick([1, -1]); t.pursuit = false; snapLane(t); t.g.rotation.y = poseFor(t);
}

export function updateTraffic(dt) {
  const pp = pos();
  for (const t of G.traffic) {
    if (t.pursuit) continue;   // systems/police.js drives it
    if (t.hidden) continue;    // over the quality level's traffic cap
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
    target *= roadRules(t.axis, t.k).speed;
    if (onBridge(t.axis, t.k, t.axis === 'h' ? t.g.position.x : t.g.position.z)) target *= 1.4 * BRIDGE_RUSH(G.state.clock);   // bridges: fast at night, crawling at rush hour
    // red lights: stop 3–9 m before the junction box on this axis
    if (roadRules(t.axis, t.k).lights !== false && lightFor(t.axis) !== 'green') {
      for (const j of JUNCTIONS) {
        const jc = t.axis === 'h' ? j.x : j.z, jk = t.axis === 'h' ? j.z : j.x; if (jk !== t.k) continue;
        const c = t.axis === 'h' ? t.g.position.x : t.g.position.z, ahead = (jc - c) * t.dir - (t.axis === 'h' ? 14 : 14);
        if (ahead > -2 && ahead < 10) { target = Math.min(target, Math.max(0, (ahead - 3) * 1.2)); break; }
      }
    }
    t.speed = approach(t.speed, target, (target < t.speed ? 22 : 7) * dt);
    t.g.position.x += fx * t.speed * dt; t.g.position.z += fz * t.speed * dt;
    t.cool -= dt;
    if (t.cool <= 0 && t.type !== 'brt') {
      const cross = t.axis === 'h' ? ROADS.v : ROADS.h;
      const c = t.axis === 'h' ? t.g.position.x : t.g.position.z;
      for (const k of cross) {
        if (Math.abs(c - k) >= 1.2) continue;
        const [xa, xb] = roadExtent(t.axis === 'h' ? 'v' : 'h', k); if (t.k < xa || t.k > xb) continue;
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
    const c2 = t.axis === 'h' ? t.g.position.x : t.g.position.z, [ea, eb] = roadExtent(t.axis, t.k);
    if (c2 > eb + 2 || c2 < ea - 2) { const nc = c2 > eb ? ea : eb; if (t.axis === 'h') t.g.position.x = nc; else t.g.position.z = nc; }
    t.g.position.y = heightAt(t.g.position.x, t.g.position.z);
  }
  for (const t of G.traffic) if (!t.hidden) spinWheels(t.g, t.speed, dt);
}
