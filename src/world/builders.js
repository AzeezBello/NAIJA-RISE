import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G } from '../core/context.js';
import { facadeTextures, roofTexture } from './textures.js';

// Registries filled while building the world.
export const colliders = [];   // {x,z,w,d} axis-aligned footprints that block movement
export const occluders = [];   // meshes the camera must not clip through
export const lamps = [];       // materials that glow at night (headlights, floodlights, street lamps)
export const windows = [];     // facade materials whose windows light up at night
export const glows = [];       // sprites shown only at night (street-light halos)

export const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, ...o });

// Static geometry buckets: many small boxes of the same material become one mesh (one draw call each).
const buckets = {};
export function staticBox(bucket, x, z, w, d, h, y = 0) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z);
  (buckets[bucket] ??= []).push(g);
}
export function staticCyl(bucket, x, z, r, h, y = 0, seg = 8, rTop = r) {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg); g.translate(x, y + h / 2, z);
  (buckets[bucket] ??= []).push(g);
}
export function staticLeaf(geo) { (buckets.leaves ??= []).push(geo); }
export function flushStatic(materials) {
  const out = {};
  for (const [name, geos] of Object.entries(buckets)) {
    if (!geos.length) continue;
    const merged = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
    const m = new THREE.Mesh(merged, materials[name] || mat(0x888888));
    m.castShadow = name !== 'lanes'; m.receiveShadow = true; m.userData.name = name;
    G.scene.add(m); out[name] = m; buckets[name] = [];
  }
  return out;
}

const SOLID = ['building', 'landmark', 'kiosk', 'property', 'fence'];
export function box(x, z, w, d, h, c, name = 'building', y = 0, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material || mat(c));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true; m.userData.name = name;
  if (SOLID.includes(name)) { colliders.push({ x, z, w, d }); occluders.push(m); }
  G.scene.add(m);
  return m;
}
export function cyl(x, z, r, h, c, name = 'prop', y = 0, seg = 12, rTop = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, seg), mat(c));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true; m.userData.name = name;
  if (name === 'palm' || name === 'pole') colliders.push({ x, z, w: r * 2 + 0.3, d: r * 2 + 0.3 });
  G.scene.add(m);
  return m;
}

// Textured building: window facades on the sides, plain roof, lit windows registered for night.
let roofMat;
export function building(x, z, w, d, h, color, name = 'building') {
  roofMat ??= new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.95 });
  const { map, glow } = facadeTextures(color);
  const floors = Math.max(1, Math.round(h / 3.4));
  const side = cols => {
    const m = map.clone(), e = glow.clone();
    m.repeat.set(cols, floors); e.repeat.set(cols, floors); m.needsUpdate = e.needsUpdate = true;
    const mm = new THREE.MeshStandardMaterial({ map: m, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.75 });
    windows.push(mm);
    return mm;
  };
  const sx = side(Math.max(1, Math.round(d / 5))), sz = side(Math.max(1, Math.round(w / 5)));
  return box(x, z, w, d, h, color, name, 0, [sx, sx, roofMat, roofMat, sz, sz]);
}

export function textSprite(label, color = '#ffffff', bg = 'rgba(5,12,11,.92)') {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, 512, 128);
  c.strokeStyle = '#ffffff30'; c.strokeRect(2, 2, 508, 124);
  c.fillStyle = color; c.font = '900 38px Arial'; c.textAlign = 'center'; c.fillText(label, 256, 78);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  s.scale.set(8, 2, 1);
  return s;
}
export function sign(label, x, y, z, color, sx, sy, bg) {
  const s = textSprite(label, color, bg);
  s.position.set(x, y, z); s.scale.set(sx, sy, 1);
  G.scene.add(s);
  return s;
}

// Surulere compound: a house inside a fenced plot with a gate gap on the street (-z) side.
// style: bungalow (one floor, pitched zinc roof) | storey (2–3 floors, flat roof with parapet) | highrise (textured tower).
const ZINC = [0x8a4a2a, 0x6b6b6b, 0x4a5a6a, 0x7a3a2a];
// Rooftop and facade detail that makes a box read as a Lagos house: GeePee water tank, satellite dish, split-unit ACs,
// floor ledges, a street-side balcony with railings on storey buildings, a shop awning, and a generator by the fence.
export function dressBuilding(x, z, bw, bd, h, style, front = -1) {
  const floors = Math.max(1, Math.round(h / 3.4)), fz = z + front * bd / 2;
  if (style !== 'bungalow') for (let f = 1; f < floors; f++) { const y = f * (h / floors); staticBox('ledges', x, z, bw + 0.3, bd + 0.3, 0.18, y); }   // floor ledges
  if (style === 'storey') for (let f = 1; f < floors; f++) {                                                                                     // balconies
    const y = f * (h / floors), w = Math.min(bw * 0.7, 7);
    staticBox('ledges', x, fz + front * 0.7, w, 1.4, 0.16, y);
    staticBox('rails', x, fz + front * 1.35, w, 0.06, 1.0, y + 0.16); staticBox('rails', x - w / 2, fz + front * 0.7, 0.06, 1.3, 1.0, y + 0.16); staticBox('rails', x + w / 2, fz + front * 0.7, 0.06, 1.3, 1.0, y + 0.16);
  }
  const acs = style === 'bungalow' ? 1 : Math.min(floors * 2, 6);                                                                               // split-unit ACs
  for (let i = 0; i < acs; i++) { const f = style === 'bungalow' ? 0 : 1 + (i % Math.max(1, floors - 1)); const sx = (i % 2 ? 1 : -1) * (bw / 2 - 1 - (i >> 1) * 1.6); staticBox('ac', x + sx, fz + front * 0.3, 0.9, 0.4, 0.6, f * (h / floors) + 1.9); }
  if (Math.random() < 0.75) staticCyl('tanks', x + bw / 2 - 1.3, z + bd / 2 - 1.3, 0.8, 1.5, h, 10);                                            // black water tank
  if (Math.random() < 0.5) staticCyl('ac', x - bw / 2 + 1, z + bd / 2 - 1, 0.55, 0.08, h + 0.6, 10);                                             // satellite dish
  if (style !== 'bungalow' && Math.random() < 0.6) { staticBox('awnings', x, fz + front * 0.8, Math.min(bw * 0.8, 8), 1.6, 0.1, 3.2); for (const sx of [-1, 1]) staticBox('rails', x + sx * Math.min(bw * 0.4, 4), fz + front * 1.5, 0.08, 0.08, 3.2); }   // shop awning
  if (Math.random() < 0.5) staticBox('gens', x + bw / 2 + 1.6, z, 0.8, 1.3, 0.9);                                                                 // "I better pass my neighbour" generator
}

export function compound(x, z, pw, pd, style, color, name = 'building', h) {
  const bw = pw - 7, bd = pd - 7;
  let house;
  if (style === 'bungalow') {
    h = h || 3.4 + Math.random() * 0.6;
    house = building(x, z + 1, bw, bd, h, color, name); dressBuilding(x, z + 1, bw, bd, h, style);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.78, 2.2, 4), mat(ZINC[Math.floor(Math.random() * ZINC.length)], { roughness: 0.6, metalness: 0.3 }));
    roof.position.set(x, h + 1.1, z + 1); roof.rotation.y = Math.PI / 4; roof.scale.set(bw / Math.max(bw, bd), 1, bd / Math.max(bw, bd)); roof.castShadow = true;
    G.scene.add(roof);
  } else if (style === 'storey') {
    h = h || 6.8 + Math.random() * 4.2;
    house = building(x, z + 1, bw, bd, h, color, name); dressBuilding(x, z + 1, bw, bd, h, style);
    box(x, z + 1, bw + 0.4, bd + 0.4, 0.5, color, 'prop', h);                 // parapet
    box(x, z + 1 + bd / 2 + 0.3, bw * 0.6, 0.6, 0.12, 0x3a3a3a, 'prop', h * 0.5); // balcony slab
  } else {
    h = h || 15 + Math.random() * 13;
    house = building(x, z, pw - 4, pd - 4, h, color, name); dressBuilding(x, z, pw - 4, pd - 4, h, style);
    return house;
  }
  // fence with a gate gap on the street side
  const fh = 1.8, t = 0.3, gate = 3.2;
  const wall = (wx, wz, ww, wd) => { staticBox('fences', wx, wz, ww, wd, fh); colliders.push({ x: wx, z: wz, w: ww, d: wd }); };
  wall(x, z + pd / 2, pw, t);                                                   // back
  wall(x - pw / 2, z, t, pd); wall(x + pw / 2, z, t, pd);
  const side = (pw - gate) / 2;
  wall(x - pw / 2 + side / 2, z - pd / 2, side, t); wall(x + pw / 2 - side / 2, z - pd / 2, side, t);
  const g = box(x, z - pd / 2, gate, 0.12, fh + 0.2, 0x2b2b2b, 'prop'); g.userData.gate = true; g.visible = Math.random() < 0.5; // half the gates stand open
  for (const sx of [-gate / 2 - 0.25, gate / 2 + 0.25]) box(x + sx, z - pd / 2, 0.5, 0.5, fh + 0.6, 0x8a8a8a, 'prop');
  house.userData.door = { x, z: z - pd / 2 - 1.5 };
  return house;
}
