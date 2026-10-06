import * as THREE from 'three';
import { G } from '../core/context.js';
import { pick } from '../core/utils.js';
import { box, cyl, building, sign, mat, occluders, colliders, lamps, glows } from './builders.js';
import { asphaltTexture, groundTexture, concreteTexture, cloudTexture, glowTexture } from './textures.js';
import { ROADS, LANDMARKS, BUSSTOPS, PROPERTIES, KIOSKS, RESERVED, WATER } from '../data/locations.js';

const PALETTE = [0x6f7d84, 0x8a7d6a, 0x9c8f7a, 0x7a8ba0, 0x8f6b63, 0x6e8a8a, 0xa08866, 0xb9a98f];
const SHOP_SIGNS = ['SHOP', 'PHONE', 'BUKA', 'FASHION', 'MART', 'AUTO', 'POS', 'BET9JA', 'PHARMACY', 'BARBER'];
const reserved = (x, z, pad = 0) => RESERVED.some(r => Math.hypot(x - r.x, z - r.z) < r.r - pad);
const ROAD_W = { 0: 22, '-66': 18 };            // horizontal road widths by z
const VROAD_W = { 0: 22, 72: 18, '-72': 18 };   // vertical road widths by x

function road(x, z, w, d, asphalt) {
  const m = new THREE.MeshStandardMaterial({ map: asphalt.clone(), roughness: 0.95 });
  m.map.repeat.set(w / 8, d / 8); m.map.needsUpdate = true;
  box(x, z, w, d, 0.1, 0, 'road', 0, m);
  if (w > d) for (let p = x - w / 2 + 8; p < x + w / 2 - 8; p += 14) box(p, z, 0.65, 4, 0.11, 0xe6d58a, 'lane');
  else for (let p = z - d / 2 + 8; p < z + d / 2 - 8; p += 14) box(x, p, 4, 0.65, 0.11, 0xe6d58a, 'lane');
}

function sidewalks(concrete) {
  const walk = (x, z, w, d) => { const m = new THREE.MeshStandardMaterial({ map: concrete.clone(), roughness: 0.9 }); m.map.repeat.set(w / 4, d / 4); m.map.needsUpdate = true; box(x, z, w, d, 0.16, 0, 'walk', 0, m); };
  for (const z of ROADS.h) { const hw = ROAD_W[z] / 2; walk(0, z - hw - 2, 300, 4); walk(0, z + hw + 2, 300, 4); }
  for (const x of ROADS.v) { const hw = VROAD_W[x] / 2; walk(x - hw - 2, 0, 4, 300); walk(x + hw + 2, 0, 4, 300); }
}

function streetLight(x, z, armDir) {
  cyl(x, z, 0.12, 7, 0x6c7378, 'prop', 0, 8, 0.09);
  const arm = box(x + armDir.x * 1.1, z + armDir.z * 1.1, Math.abs(armDir.x) * 2.2 + 0.18, Math.abs(armDir.z) * 2.2 + 0.18, 0.14, 0x6c7378, 'prop', 6.9);
  const head = box(x + armDir.x * 2.1, z + armDir.z * 2.1, 0.7, 0.7, 0.22, 0xfff1c9, 'prop', 6.75); lamps.push(head.material);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: streetLight.glow, transparent: true, depthWrite: false, opacity: 0.85 }));
  halo.position.set(x + armDir.x * 2.1, 6.6, z + armDir.z * 2.1); halo.scale.set(9, 9, 1); halo.visible = false;
  G.scene.add(halo); glows.push(halo);
  void arm;
}
function streetLights() {
  streetLight.glow = glowTexture();
  for (const z of ROADS.h) { const hw = ROAD_W[z] / 2 + 1; for (let x = -132; x <= 132; x += 36) { if (Math.abs(x) < 14 || Math.abs(Math.abs(x) - 72) < 12) continue; streetLight(x, z - hw, { x: 0, z: 1 }); streetLight(x + 18, z + hw, { x: 0, z: -1 }); } }
  for (const x of ROADS.v) { const hw = VROAD_W[x] / 2 + 1; for (let z = -132; z <= 132; z += 36) { if (Math.abs(z) < 14 || Math.abs(z + 66) < 12) continue; streetLight(x - hw, z, { x: 1, z: 0 }); streetLight(x + hw, z + 18, { x: -1, z: 0 }); } }
}

function buildGround() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.material.map.repeat.set(40, 40);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  G.scene.add(ground);
  const asphalt = asphaltTexture();
  road(0, 0, 300, 22, asphalt); road(0, 0, 22, 300, asphalt); road(0, -66, 300, 18, asphalt); road(72, 0, 18, 300, asphalt); road(-72, 0, 18, 300, asphalt);
  sidewalks(concreteTexture());
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WATER.w, 400), new THREE.MeshStandardMaterial({ color: 0x14758e, roughness: 0.22, metalness: 0.45 }));
  water.rotation.x = -Math.PI / 2; water.position.set(WATER.x, 0.03, 0);
  G.scene.add(water); G.water = water;
  const sand = box(WATER.x + WATER.w / 2 + 3, 0, 6, 400, 0.08, 0xcbb98a, 'prop'); sand.receiveShadow = true;
}

function buildSky() {
  const geo = new THREE.SphereGeometry(460, 24, 12);
  const sky = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x4f8fc9) }, horizon: { value: new THREE.Color(0xbcd8e6) }, bottom: { value: new THREE.Color(0x55684f) } },
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'uniform vec3 top,horizon,bottom;varying vec3 vW;void main(){float h=normalize(vW).y;vec3 c=h>0.?mix(horizon,top,pow(h,.55)):mix(horizon,bottom,pow(-h,.5));gl_FragColor=vec4(c,1.);}',
  }));
  sky.renderOrder = -10; G.scene.add(sky); G.sky = sky;
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, color: 0xffe6b0 }));
  sunDisc.scale.set(90, 90, 1); G.scene.add(sunDisc); G.sunDisc = sunDisc;
  const ct = cloudTexture(); G.clouds = [];
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0.9 }));
    c.position.set((Math.random() - 0.5) * 520, 95 + Math.random() * 45, (Math.random() - 0.5) * 520);
    const s = 50 + Math.random() * 60; c.scale.set(s, s * 0.45, 1);
    G.scene.add(c); G.clouds.push(c);
  }
}

function buildBlocks() {
  for (let x = -120; x <= 120; x += 24) for (let z = -120; z <= 120; z += 24) {
    if (Math.abs(x) < 16 || Math.abs(z) < 16 || Math.abs(z + 66) < 11 || Math.abs(x - 72) < 11 || Math.abs(x + 72) < 11) continue;
    if (reserved(x, z)) continue;
    const h = 7 + Math.random() * 25, w = 15 + Math.random() * 5, d = 14 + Math.random() * 5;
    const b = building(x + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 3, w, d, h, pick(PALETTE));
    if (Math.random() < 0.6) sign(pick(SHOP_SIGNS), b.position.x, 2.6, b.position.z - d / 2 - 0.1, Math.random() < 0.5 ? '#3dff79' : '#ffc52f', 5, 1.25);
  }
}

function buildStadium(l) {
  const outer = cyl(l.x, l.z, 22, 9, 0x8a8f93, 'landmark', 0, 40);
  occluders.push(outer); colliders.push({ x: l.x, z: l.z, w: 44, d: 44 });
  cyl(l.x, l.z, 16, 11, 0x4a5055, 'prop', 0, 40);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 1.4, 8, 40), mat(0xd8dde0));
  ring.rotation.x = Math.PI / 2; ring.position.set(l.x, 9.6, l.z); ring.castShadow = true;
  G.scene.add(ring);
  for (const [ox, oz] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) {
    cyl(l.x + ox, l.z + oz, 0.35, 18, 0x9aa0a6);
    lamps.push(box(l.x + ox, l.z + oz, 2.4, 0.6, 1.2, 0xfff2c8, 'prop', 18).material);
  }
  sign(l.name.toUpperCase(), l.x, 13, l.z + 23, l.sign, 16, 4, 'rgba(10,40,30,.95)');
}

function buildCheckpoint(l) {
  // FRSC: cones across the x=72 road and a yellow sign on the kerb.
  for (const ox of [-6, -3, 0, 3, 6]) cyl(72 + ox, l.z, 0.25, 0.7, 0xff6a1a, 'prop', 0, 8, 0.08);
  cyl(l.x, l.z, 0.08, 3.2, 0xc9ced3);
  sign(l.short, l.x, 3.6, l.z, '#07100e', 4.2, 1.05, 'rgba(228,209,75,.98)');
}
function buildPost(l) {
  // LASTMA: a small kiosk-style post by Ojuelegba.
  box(l.x, l.z + 2.5, 2.4, 2, 2.4, 0x8b1e2d, 'prop');
  sign(l.short, l.x, 3.1, l.z + 1.4, '#ffffff', 3.2, 0.8, 'rgba(120,20,40,.95)');
}

function buildLandmarks() {
  for (const l of LANDMARKS) {
    if (l.stadium) { buildStadium(l); continue; }
    if (l.kind === 'checkpoint') { buildCheckpoint(l); continue; }
    if (l.kind === 'post') { buildPost(l); continue; }
    const big = l.kind === 'hotel' || l.kind === 'bank';
    building(l.x, l.z, big ? 20 : 18, big ? 16 : 14, l.h, parseInt(l.c.slice(1), 16), 'landmark');
    sign(l.name.toUpperCase(), l.x, l.h + 1.6, l.z - 7.2 - (big ? 1 : 0), l.sign, 8, 1.9);
    if (l.kind === 'venue') { const neon = box(l.x, l.z - 7.3, 6, 0.2, 0.5, parseInt(l.sign.slice(1), 16), 'prop', 3.2); lamps.push(neon.material); }
  }
  for (const p of PROPERTIES) {
    building(p.x, p.z, 16, 12, p.h, parseInt(p.c.slice(1), 16), 'property');
    sign(p.sign, p.x, p.h + 1.4, p.z + 6.2, '#ffffff', 7, 1.7);
    box(p.x, p.z + 6.05, 2.2, 0.15, 2.6, 0x1f2a24, 'prop');   // door
  }
  for (const b of BUSSTOPS) {
    for (const ox of [-3, 3]) cyl(b.x + ox, b.z, 0.12, 3.1, 0xc9ced3);
    box(b.x, b.z, 7.4, 2.6, 0.18, 0xf5c518, 'prop', 3.1);        // roof
    box(b.x, b.z + 0.6, 6, 0.5, 0.5, 0x6b5a3a, 'prop', 0.5);     // bench
    cyl(b.x + 4.6, b.z - 1, 0.08, 3.6, 0xc9ced3);
    sign(b.short, b.x + 4.6, 4.1, b.z - 1, '#07100e', 4.6, 1.15, 'rgba(245,197,24,.98)');
  }
  for (const [x, z] of KIOSKS) { box(x, z, 3, 2.2, 1.6, 0x925f3d, 'kiosk'); sign('POS · KIOSK', x, 2.3, z - 1.2, '#ffffff', 3.6, 0.85, 'rgba(20,60,120,.95)'); }
  // filling station: canopy on pillars with pumps; church cross and mosque dome/minaret
  { const f = LANDMARKS.find(l => l.id === 'fuel'); for (const ox of [-6, 6]) for (const oz of [-4, 4]) cyl(f.x + ox, f.z + 12 + oz, 0.25, 5, 0xd0d0d0); box(f.x, f.z + 12, 16, 11, 0.5, 0xb32020, 'prop', 5); for (const ox of [-3, 0, 3]) { box(f.x + ox, f.z + 12, 0.8, 0.5, 1.6, 0xe8e8e8, 'prop'); } sign('FUEL · ₦', f.x, 6.4, f.z + 17.6, '#ffffff', 5, 1.2, 'rgba(179,32,32,.95)'); }
  { const c = LANDMARKS.find(l => l.id === 'church'); box(c.x, c.z, 3, 3, 6, 0xd9d2c2, 'prop', c.h); box(c.x, c.z, 0.5, 0.5, 3, 0xffc52f, 'prop', c.h + 6); box(c.x, c.z, 2, 0.5, 0.5, 0xffc52f, 'prop', c.h + 7.6); }
  { const m = LANDMARKS.find(l => l.id === 'mosque'); const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3dd39a)); dome.position.set(m.x, m.h, m.z); dome.castShadow = true; G.scene.add(dome); cyl(m.x + 10, m.z - 5, 1, 18, 0xe8e8e8, 'prop', 0, 10); const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 10), mat(0x3dd39a)); cap.position.set(m.x + 10, 19.2, m.z - 5); G.scene.add(cap); }
  { const n = LANDMARKS.find(l => l.id === 'nepa'); for (const ox of [-6, 6]) { cyl(n.x + ox, n.z + 10, 0.2, 10, 0x6c7378); box(n.x + ox, n.z + 10, 2.4, 0.3, 0.3, 0x6c7378, 'prop', 9.6); } }
  // Shitta roundabout island at the -72/0 junction
  cyl(-72, 0, 2.6, 0.5, 0x8d9a8a, 'prop', 0, 24); cyl(-72, 0, 0.3, 4, 0x5d402b, 'prop', 0.5);
  sign('SHITTA', -72, 5.2, 0, '#ffc52f', 4.6, 1.15);
}

function buildPalms() {
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 280, z = (Math.random() - 0.5) * 280;
    if (Math.abs(x) < 18 || Math.abs(z) < 18 || reserved(x, z, 4) || x < WATER.x + WATER.w / 2 + 8) continue;
    const h = 3 + Math.random() * 2.5;
    const trunk = cyl(x, z, 0.22, h, 0x6b4a2e, 'palm', 0, 8, 0.14); trunk.rotation.z = (Math.random() - 0.5) * 0.12;
    for (let a = 0; a < 8; a++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.5), mat(0x2f7d49));
      const ang = a * Math.PI / 4 + Math.random() * 0.3;
      leaf.position.set(x + Math.cos(ang) * 0.9, h + 0.3, z + Math.sin(ang) * 0.9);
      leaf.rotation.y = -ang; leaf.rotation.z = 0.95; leaf.castShadow = true;
      G.scene.add(leaf);
    }
  }
}

export function buildDistrict() { buildSky(); buildGround(); streetLights(); buildBlocks(); buildLandmarks(); buildPalms(); }
export function updateClouds(dt) { for (const c of G.clouds || []) { c.position.x += dt * 1.2; if (c.position.x > 280) c.position.x = -280; } }
export { ROADS };
