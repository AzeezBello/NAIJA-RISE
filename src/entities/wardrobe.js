import * as THREE from 'three';
import { FABRICS, LOOK } from '../data/characters.js';
import { mat } from '../world/builders.js';

// Nigerian wardrobe: procedural fabric prints (ankara, adire, aso-oke, lace, jersey) and primitive outfit bodies
// (ankara shirt, senator, buba & sokoto, agbada, Super Eagles, t-shirt & jeans). Rigged characters wear the prints
// as texture maps on their clothing materials; the primitive fallback builds the silhouette from boxes and cylinders.

const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
const canvases = new Map(), textures = new Map();

// A 128×128 tile of the fabric, drawn once per fabric and shared by the 3D textures and the 2D portrait.
export function fabricCanvas(i) {
  if (canvases.has(i)) return canvases.get(i);
  const f = FABRICS[i] || FABRICS[0], c = document.createElement('canvas'), S = 128; c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = f.base; g.fillRect(0, 0, S, S);
  const dark = shade(f.base, 0.6);
  if (f.pattern === 'ankara') {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = x * 32 + 16, cy = y * 32 + 16, alt = (x + y) % 2;
      g.fillStyle = alt ? f.accent : dark; g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = alt ? dark : f.accent; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = f.base; g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = f.accent; g.lineWidth = 2; g.globalAlpha = 0.55;
    for (let d = -S; d < S * 2; d += 32) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + S, S); g.stroke(); }
    g.globalAlpha = 1;
  } else if (f.pattern === 'adire') {
    g.strokeStyle = f.accent; g.lineWidth = 2;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const cx = x * 64 + 32, cy = y * 64 + 32; for (let r = 6; r <= 26; r += 7) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); } }
    g.fillStyle = f.accent; for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x += 16) { if ((x + y) % 32 === 0) g.fillRect(x + 6, y + 6, 3, 3); }
  } else if (f.pattern === 'stripe') {
    for (let y = 0; y < S; y += 16) { g.fillStyle = (y / 16) % 2 ? shade(f.base, 0.85) : f.base; g.fillRect(0, y, S, 16); g.fillStyle = f.accent; g.fillRect(0, y + 13, S, 2); }
  } else if (f.pattern === 'lace') {
    g.fillStyle = f.accent; for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 8) { g.beginPath(); g.arc(x + 4 + ((y / 8) % 2) * 2, y + 4, 1.6, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = shade(f.base, 0.9); g.lineWidth = 1; for (let y = 0; y < S; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  } else if (f.pattern === 'jersey') {
    g.fillStyle = f.accent; g.fillRect(0, 0, 12, S); g.fillRect(S - 12, 0, 12, S);
    g.beginPath(); g.moveTo(32, 70); g.lineTo(64, 40); g.lineTo(96, 70); g.lineTo(96, 80); g.lineTo(64, 50); g.lineTo(32, 80); g.closePath(); g.fill();
  }
  canvases.set(i, c); return c;
}

export function fabricTexture(i) {
  if (textures.has(i)) return textures.get(i);
  const t = new THREE.CanvasTexture(fabricCanvas(i)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace;
  textures.set(i, t); return t;
}
// Clothing material: a plain tint for uniforms, otherwise the chosen fabric print.
export function fabricMaterial(look, tint) {
  if (tint) return mat(tint);
  const m = mat(0xffffff, { roughness: 0.88 }); m.map = fabricTexture(look.shirt ?? 0); return m;
}
export const fabricOf = look => FABRICS[look.shirt ?? 0] || FABRICS[0];

// Primitive body in the chosen outfit. userData: { head, hairs } for later tinting.
export function buildPrimitive(look, { scale = 1, tint = null } = {}) {
  const g = new THREE.Group(), L = LOOK, out = L.outfit[look.outfit ?? 0], fab = fabricOf(look);
  const skin = L.skin[look.skin ?? 2], pants = tint?.bottom || L.pants[look.pants ?? 0], hairC = L.hairColor[look.hairColor ?? 0];
  const bt = L.bodyType[look.bodyType ?? 1], wide = bt === 'Big' ? 1.14 : bt === 'Slim' ? 0.9 : 1;
  const cloth = () => fabricMaterial(look, tint?.top);
  const add = (m, y, x = 0, z = 0) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const shoes = tint?.shoes || L.shoes[look.shoes ?? 0], skinM = () => mat(skin);
  // legs: long trousers / sokoto, shorts with bare calves, or bare legs under a gown or skirt; sneakers on every outfit
  const shorts = out === 'Super Eagles' || out === 'Tank top & shorts', bare = out === 'Gown' || out === 'Skirt & blouse';
  if (bare || shorts) { add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 1.0, 8), skinM()), 0.55, 0.2); add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 1.0, 8), skinM()), 0.55, -0.2); }
  if (!bare) add(new THREE.Mesh(new THREE.CapsuleGeometry(0.46 * wide, shorts ? 0.5 : 1.2, 6, 10), mat(out === 'Senator' ? (tint?.top || fab.base) : out === 'Super Eagles' ? '#f0f0f0' : pants, { roughness: 0.8 })), shorts ? 1.3 : 1.12);
  for (const sx of [-0.18, 0.18]) add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.42), mat(shoes, { roughness: 0.6 })), 0.07, sx, 0.06);
  // torso by outfit
  if (out === 'Singlet & jeans' || out === 'Tank top & shorts') {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.62 * wide, 0.74, 0.4), cloth()), 1.36);                                   // armless top
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 8), skinM()), 1.27, 0.43 * wide); add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 8), skinM()), 1.27, -0.43 * wide);
  } else if (out === 'Jacket & jeans') {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.82 * wide, 0.78, 0.48), cloth()), 1.36);                                   // jacket
    add(new THREE.Mesh(new THREE.BoxGeometry(0.2 * wide, 0.6, 0.06), mat(pants)), 1.34, 0, 0.25);                        // tee showing under the open zip
    add(new THREE.Mesh(new THREE.BoxGeometry(1.18 * wide, 0.22, 0.4), cloth()), 1.6);                                     // shoulders
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.72, 8), cloth()), 1.2, 0.54 * wide); add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.72, 8), cloth()), 1.2, -0.54 * wide);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 14), mat(tint?.top || fab.accent)), 1.78).rotation.x = Math.PI / 2;   // collar
  } else if (out === 'Gown') {
    const gown = add(new THREE.Mesh(new THREE.CylinderGeometry(0.4 * wide, 0.78 * wide, 1.85, 16), cloth()), 1.05);       // floor-length gown
    gown.material.side = THREE.DoubleSide;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 8), skinM()), 1.27, 0.46 * wide); add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 8), skinM()), 1.27, -0.46 * wide);
  } else if (out === 'Skirt & blouse') {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.66 * wide, 0.7, 0.42), cloth()), 1.4);                                     // blouse
    add(new THREE.Mesh(new THREE.BoxGeometry(1.0 * wide, 0.2, 0.38), cloth()), 1.62);                                     // short sleeves
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42 * wide, 0.62 * wide, 0.8, 14), mat(pants)), 0.75);               // skirt to the knee
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.6, 8), skinM()), 1.14, 0.46 * wide); add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.6, 8), skinM()), 1.14, -0.46 * wide);
  } else if (out === 'Ankara shirt' || out === 'T-shirt & jeans' || out === 'Super Eagles') {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.74 * wide, 0.72, 0.44), cloth()), 1.36);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.08 * wide, 0.22, 0.4), cloth()), 1.58);                    // short sleeves
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 8), mat(skin)), 1.12, 0.47 * wide); add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 8), mat(skin)), 1.12, -0.47 * wide);
  } else if (out === 'Senator') {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.4 * wide, 0.5 * wide, 1.55, 12), cloth()), 1.3);     // long kaftan to the knee
    add(new THREE.Mesh(new THREE.BoxGeometry(1.16 * wide, 0.2, 0.36), cloth()), 1.7);                    // long sleeves (upper)
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.7, 8), cloth()), 1.25, 0.54 * wide); add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.7, 8), cloth()), 1.25, -0.54 * wide);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 14), mat(tint?.top || fab.accent)), 1.98).rotation.x = Math.PI / 2;   // round collar
  } else if (out === 'Buba & Sokoto') {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.98 * wide, 0.9, 0.5), cloth()), 1.36);                    // loose buba
    add(new THREE.Mesh(new THREE.BoxGeometry(1.36 * wide, 0.26, 0.42), cloth()), 1.6);                   // wide sleeves
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), mat(skin)), 1.15, 0.6 * wide); add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), mat(skin)), 1.15, -0.6 * wide);
  } else if (out === 'Agbada') {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42 * wide, 0.5 * wide, 1.5, 12), mat(tint?.top || fab.accent)), 1.3);   // inner tunic
    const flow = add(new THREE.Mesh(new THREE.CylinderGeometry(0.55 * wide, 1.15 * wide, 1.25, 16, 1, true), cloth()), 1.45); flow.material.side = THREE.DoubleSide;   // flowing outer gown
    add(new THREE.Mesh(new THREE.BoxGeometry(1.9 * wide, 0.18, 0.5), cloth()), 1.78);                    // wide shoulders
  }
  // head, hair, accessories
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 10), mat(skin)), 2.12);
  const hm = mat(hairC), hairs = {};
  hairs.Short = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); hairs.Short.position.y = 2.2;
  hairs.Fade = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), hm); hairs.Fade.position.y = 2.22;
  hairs.Afro = new THREE.Mesh(new THREE.SphereGeometry(0.54, 16, 12), hm); hairs.Afro.position.y = 2.3;
  hairs.Braids = new THREE.Group();
  { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); cap.position.y = 2.2; hairs.Braids.add(cap);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), hm); const a = i / 6 * Math.PI * 2; b.position.set(Math.cos(a) * 0.36, 2.0, Math.sin(a) * 0.36); hairs.Braids.add(b); } }
  for (const k in hairs) { hairs[k].castShadow = true; hairs[k].visible = L.hair[look.hair ?? 0] === k; g.add(hairs[k]); }
  const acc = L.accessory[look.accessory ?? 0];
  if (acc === 'Fila') { const f = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.26, 14), tint?.cap ? mat(tint.cap) : cloth()), 2.42); f.rotation.z = 0.18; f.position.x = 0.04; }
  if (acc === 'Face cap') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.16, 12), mat(tint?.cap || '#d62828')), 2.44); add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.34), mat(tint?.cap || '#d62828')), 2.38, 0, 0.42); }
  if (acc === 'Glasses') add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.05), mat(0x111111)), 2.16, 0, 0.36);
  if (acc === 'Chain') add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 6, 16), mat(0xffc52f, { metalness: 0.9, roughness: 0.2 })), 1.74).rotation.x = Math.PI / 2.6;
  const fh = L.facialHair[look.facialHair ?? 0];
  if (fh !== 'None') add(new THREE.Mesh(new THREE.BoxGeometry(fh === 'Moustache' ? 0.2 : 0.34, fh === 'Beard' ? 0.18 : 0.06, 0.08), hm), fh === 'Moustache' ? 2.02 : 1.92, 0, 0.34);
  g.scale.setScalar(scale);
  g.userData = { head, hairs };
  return g;
}
