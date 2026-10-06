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

const SOLID = ['building', 'landmark', 'kiosk', 'property'];
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
