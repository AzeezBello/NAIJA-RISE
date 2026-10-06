import * as THREE from 'three';
import { G } from '../core/context.js';
import { facadeTextures, roofTexture } from './textures.js';

// Registries filled while building the world.
export const colliders = [];   // {x,z,w,d} axis-aligned footprints that block movement
export const occluders = [];   // meshes the camera must not clip through
export const lamps = [];       // materials that glow at night (headlights, floodlights, street lamps)
export const windows = [];     // facade materials whose windows light up at night
export const glows = [];       // sprites shown only at night (street-light halos)

export const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, ...o });

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
export function compound(x, z, pw, pd, style, color, name = 'building', h) {
  const bw = pw - 7, bd = pd - 7;
  let house;
  if (style === 'bungalow') {
    h = h || 3.4 + Math.random() * 0.6;
    house = building(x, z + 1, bw, bd, h, color, name);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.78, 2.2, 4), mat(ZINC[Math.floor(Math.random() * ZINC.length)], { roughness: 0.6, metalness: 0.3 }));
    roof.position.set(x, h + 1.1, z + 1); roof.rotation.y = Math.PI / 4; roof.scale.set(bw / Math.max(bw, bd), 1, bd / Math.max(bw, bd)); roof.castShadow = true;
    G.scene.add(roof);
  } else if (style === 'storey') {
    h = h || 6.8 + Math.random() * 4.2;
    house = building(x, z + 1, bw, bd, h, color, name);
    box(x, z + 1, bw + 0.4, bd + 0.4, 0.5, color, 'prop', h);                 // parapet
    box(x, z + 1 + bd / 2 + 0.3, bw * 0.6, 0.6, 0.12, 0x3a3a3a, 'prop', h * 0.5); // balcony slab
  } else {
    h = h || 15 + Math.random() * 13;
    house = building(x, z, pw - 4, pd - 4, h, color, name);
    return house;
  }
  // fence with a gate gap on the street side
  const fc = 0xbfb8a6, fh = 1.8, t = 0.3, gate = 3.2;
  box(x, z + pd / 2, pw, t, fh, fc, 'fence');                                  // back
  box(x - pw / 2, z, t, pd, fh, fc, 'fence'); box(x + pw / 2, z, t, pd, fh, fc, 'fence');
  const side = (pw - gate) / 2;
  box(x - pw / 2 + side / 2, z - pd / 2, side, t, fh, fc, 'fence'); box(x + pw / 2 - side / 2, z - pd / 2, side, t, fh, fc, 'fence');
  const g = box(x, z - pd / 2, gate, 0.12, fh + 0.2, 0x2b2b2b, 'prop'); g.userData.gate = true; g.visible = Math.random() < 0.5; // half the gates stand open
  for (const sx of [-gate / 2 - 0.25, gate / 2 + 0.25]) box(x + sx, z - pd / 2, 0.5, 0.5, fh + 0.6, 0x8a8a8a, 'prop');
  house.userData.door = { x, z: z - pd / 2 - 1.5 };
  return house;
}
