import * as THREE from 'three';
import { G } from '../core/context.js';
import { pick } from '../core/utils.js';
import { box, cyl, building, compound, sign, mat, occluders, colliders, lamps, glows, staticBox, staticCyl, flushStatic } from './builders.js';
import { PERF } from '../data/config.js';
import { buildTrafficLights } from '../systems/trafficlights.js';
import { asphaltTexture, groundTexture, concreteTexture, cloudTexture, glowTexture } from './textures.js';
import { ROADS, ROAD_NAMES, ROAD_WIDTHS, ROAD_EXTENT, roadExtent, LANDMARKS, BUSSTOPS, PROPERTIES, KIOSKS, RESERVED, WATER, VENDORS, ISLAND_CELLS, JUNCTIONS } from '../data/locations.js';
import { addDeck, heightAt } from './terrain.js';

const PALETTE = [0x6f7d84, 0x8a7d6a, 0x9c8f7a, 0x7a8ba0, 0x8f6b63, 0x6e8a8a, 0xa08866, 0xb9a98f];
const SHOP_SIGNS = ['SHOP', 'PHONE', 'BUKA', 'FASHION', 'MART', 'AUTO', 'POS', 'BET9JA', 'PHARMACY', 'BARBER'];
const reserved = (x, z, pad = 0) => RESERVED.some(r => Math.hypot(x - r.x, z - r.z) < r.r - pad);
const ROAD_W = ROAD_WIDTHS.h, VROAD_W = ROAD_WIDTHS.v;

function road(x, z, w, d, asphalt) {
  const m = new THREE.MeshStandardMaterial({ map: asphalt.clone(), roughness: 0.95, metalness: 0.02 });
  m.map.repeat.set(w / 8, d / 8); m.map.needsUpdate = true;
  (G.roadMats = G.roadMats || []).push(m);
  box(x, z, w, d, 0.1, 0, 'road', 0, m);
  if (w > d) for (let p = x - w / 2 + 8; p < x + w / 2 - 8; p += 14) staticBox('lanes', p, z, 0.65, 4, 0.11);
  else for (let p = z - d / 2 + 8; p < z + d / 2 - 8; p += 14) staticBox('lanes', x, p, 4, 0.65, 0.11);
}

function sidewalks(concrete) {
  const walk = (x, z, w, d) => { const m = new THREE.MeshStandardMaterial({ map: concrete.clone(), roughness: 0.9 }); m.map.repeat.set(w / 4, d / 4); m.map.needsUpdate = true; box(x, z, w, d, 0.16, 0, 'walk', 0, m); };
  for (const z of ROADS.h) { if (z === 142) continue; const hw = ROAD_W[z] / 2, [a, b] = roadExtent('h', z); walk((a + b) / 2, z - hw - 2, b - a, 4); walk((a + b) / 2, z + hw + 2, b - a, 4); }
  for (const x of ROADS.v) { const hw = VROAD_W[x] / 2, [a, b] = roadExtent('v', x); walk(x - hw - 2, (a + b) / 2, 4, b - a); walk(x + hw + 2, (a + b) / 2, 4, b - a); }
}

function streetLight(x, z, armDir) {
  staticCyl('poles', x, z, 0.12, 7, 0, 8, 0.09); colliders.push({ x, z, w: 0.55, d: 0.55 });
  staticBox('poles', x + armDir.x * 1.1, z + armDir.z * 1.1, Math.abs(armDir.x) * 2.2 + 0.18, Math.abs(armDir.z) * 2.2 + 0.18, 0.14, 6.9);
  staticBox('heads', x + armDir.x * 2.1, z + armDir.z * 2.1, 0.7, 0.7, 0.22, 6.75);
  staticBox('panels', x - armDir.x * 0.5, z - armDir.z * 0.5, 1.1, 0.7, 0.06, 7.2);   // solar panel
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: streetLight.glow, transparent: true, depthWrite: false, opacity: 0.85 }));
  halo.position.set(x + armDir.x * 2.1, 6.6, z + armDir.z * 2.1); halo.scale.set(9, 9, 1); halo.visible = false;
  G.scene.add(halo); glows.push(halo);
}
function streetLights() {
  streetLight.glow = glowTexture();
  for (const z of ROADS.h) { if (z === 142) continue; const hw = ROAD_W[z] / 2 + 1; for (let x = -132; x <= 132; x += 36) { if (Math.abs(x) < 14 || Math.abs(Math.abs(x) - 72) < 12) continue; streetLight(x, z - hw, { x: 0, z: 1 }); streetLight(x + 18, z + hw, { x: 0, z: -1 }); } }
  for (let x = 360; x <= 460; x += 36) { streetLight(x, -12, { x: 0, z: 1 }); streetLight(x + 18, 12, { x: 0, z: -1 }); }
  for (const x of ROADS.v) { const hw = VROAD_W[x] / 2 + 1, [a, b] = roadExtent('v', x); for (let z = a + 18; z <= b - 18; z += 36) { if (Math.abs(z) < 14 || Math.abs(z + 66) < 12) continue; streetLight(x - hw, z, { x: 1, z: 0 }); streetLight(x + hw, z + 18, { x: -1, z: 0 }); } }
}

function buildGround() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(760, 400), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.material.map.repeat.set(76, 40);
  ground.rotation.x = -Math.PI / 2; ground.position.x = 160; ground.receiveShadow = true;
  G.scene.add(ground);
  const asphalt = asphaltTexture();
  road(0, 0, 300, 22, asphalt); road(0, 0, 22, 300, asphalt); road(0, -66, 300, 18, asphalt); road(72, 0, 24, 300, asphalt); road(-72, 0, 16, 300, asphalt);
  road(407, 0, 130, 22, asphalt);                                    // Nnamdi Azikiwe Street · CMS (island end of Bode Thomas)
  road(360, 0, 18, 160, asphalt); road(440, 0, 22, 160, asphalt);    // Broad Street, Marina
  road(152, 0, 30, 22, asphalt);                                     // Costain approach
  road(0, 142, 300, 24, asphalt);                                   // Apapa–Oworonshoki Expressway
  staticBox('medians', 0, 142, 300, 1.2, 0.9); staticBox('medians', 72, 0, 1, 300, 0.9);   // concrete medians on the expressway and Funsho Williams
  for (let x = -132; x <= 132; x += 24) staticBox('poles', x, 142, 0.3, 0.3, 9);           // tall expressway lamp posts
  for (let x = -126; x <= 126; x += 24) staticBox('heads', x, 142, 2.6, 0.5, 0.3, 9);
  sidewalks(concreteTexture());
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WATER.w, 400), new THREE.MeshStandardMaterial({ color: 0x14758e, roughness: 0.22, metalness: 0.45 }));
  water.rotation.x = -Math.PI / 2; water.position.set(WATER.x, 0.03, 0);
  G.scene.add(water); G.water = water;
  for (const sx of [WATER.x - WATER.w / 2 - 3, WATER.x + WATER.w / 2 + 3]) { const sand = box(sx, 0, 6, 400, 0.08, 0xcbb98a, 'prop'); sand.receiveShadow = true; }
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
    if (Math.abs(x) < 16 || Math.abs(z) < 16 || Math.abs(z + 66) < 11 || Math.abs(x - 72) < 14 || Math.abs(x + 72) < 11 || z > 124) continue;
    if (reserved(x, z)) continue;
    // Surulere mix: mostly bungalows and 2–3 storey houses in fenced compounds; a few high-rises by the main roads.
    const nearMain = Math.abs(z) < 30 || Math.abs(x - 72) < 30;
    const r = Math.random();
    const style = r < (nearMain ? 0.22 : 0.06) ? 'highrise' : r < 0.55 ? 'storey' : 'bungalow';
    const b = compound(x, z, 20, 18, style, pick(PALETTE));
    if (style !== 'bungalow' && Math.random() < 0.5) sign(pick(SHOP_SIGNS), b.position.x, 2.6, b.position.z - 7.2, Math.random() < 0.5 ? '#3dff79' : '#ffc52f', 5, 1.25);
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
    cyl(l.x + ox, l.z + oz, 0.35, 18, 0x9aa0a6, 'pole');
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
    if (l.kind === 'pitch') continue;
    const big = l.kind === 'hotel' || l.kind === 'bank' || l.big;
    building(l.x, l.z, l.big ? 26 : big ? 20 : 18, l.big ? 20 : big ? 16 : 14, l.h, parseInt(l.c.slice(1), 16), 'landmark');
    sign(l.name.toUpperCase(), l.x, l.h + 1.6, l.z - 7.2 - (big ? 1 : 0), l.sign, 8, 1.9);
    if (l.kind === 'venue') { const neon = box(l.x, l.z - 7.3, 6, 0.2, 0.5, parseInt(l.sign.slice(1), 16), 'prop', 3.2); lamps.push(neon.material); }
  }
  for (const p of PROPERTIES) {
    const house = compound(p.x, p.z, 20, 18, p.style, parseInt(p.c.slice(1), 16), 'property', p.h);
    p.door = house.userData.door;                                    // street gate; agent waits here
    sign(p.sign, p.x, p.h + 1.6, p.z - 9.4, '#ffffff', 7, 1.7, 'rgba(120,60,20,.95)');
  }
  for (const b of BUSSTOPS) {
    for (const ox of [-3, 3]) cyl(b.x + ox, b.z, 0.12, 3.1, 0xc9ced3, 'pole');
    box(b.x, b.z, 7.4, 2.6, 0.18, 0xf5c518, 'prop', 3.1);        // roof
    box(b.x, b.z + 0.6, 6, 0.5, 0.5, 0x6b5a3a, 'prop', 0.5);     // bench
    cyl(b.x + 4.6, b.z - 1, 0.08, 3.6, 0xc9ced3);
    sign(b.short, b.x + 4.6, 4.1, b.z - 1, '#07100e', 4.6, 1.15, 'rgba(245,197,24,.98)');
  }
  for (const [x, z] of KIOSKS) { box(x, z, 3, 2.2, 1.6, 0x925f3d, 'kiosk'); sign('POS · KIOSK', x, 2.3, z - 1.2, '#ffffff', 3.6, 0.85, 'rgba(20,60,120,.95)'); }
  // filling station: canopy on pillars with pumps; church cross and mosque dome/minaret
  { const f = LANDMARKS.find(l => l.id === 'fuel'); for (const ox of [-6, 6]) for (const oz of [-4, 4]) cyl(f.x + ox, f.z + 12 + oz, 0.25, 5, 0xd0d0d0); box(f.x, f.z + 12, 16, 11, 0.5, 0xb32020, 'prop', 5); for (const ox of [-3, 0, 3]) { box(f.x + ox, f.z + 12, 0.8, 0.5, 1.6, 0xe8e8e8, 'prop'); } sign('FUEL · ₦', f.x, 6.4, f.z + 17.6, '#ffffff', 5, 1.2, 'rgba(179,32,32,.95)'); }
  { const c = LANDMARKS.find(l => l.id === 'church'); box(c.x, c.z, 3, 3, 6, 0xd9d2c2, 'prop', c.h); box(c.x, c.z, 0.5, 0.5, 3, 0xffc52f, 'prop', c.h + 6); box(c.x, c.z, 2, 0.5, 0.5, 0xffc52f, 'prop', c.h + 7.6); }
  { const m = LANDMARKS.find(l => l.id === 'mosque'); const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3dd39a)); dome.position.set(m.x, m.h, m.z); dome.castShadow = true; G.scene.add(dome); cyl(m.x + 10, m.z - 5, 1, 18, 0xe8e8e8, 'pole', 0, 10); const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 10), mat(0x3dd39a)); cap.position.set(m.x + 10, 19.2, m.z - 5); G.scene.add(cap); }
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
    staticCyl('trunks', x, z, 0.22, h, 0, 8, 0.14); colliders.push({ x, z, w: 0.75, d: 0.75 });
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + Math.random() * 0.3;
      const leaf = new THREE.BoxGeometry(0.16, 2.6, 0.5); leaf.rotateZ(0.95); leaf.rotateY(-ang); leaf.translate(x + Math.cos(ang) * 0.9, h + 0.3, z + Math.sin(ang) * 0.9);
      leaf.computeBoundingBox(); (staticLeaf(leaf));
    }
  }
}

// Street-name signs at every intersection: a pole with the two road names.
function streetSigns() {
  for (const { x, z } of JUNCTIONS) {
    if (z === 142) continue;
    const sx = x + VROAD_W[x] / 2 + 2.5, sz = z - ROAD_W[z] / 2 - 2.5;
    cyl(sx, sz, 0.08, 3.4, 0x3a8a4a, 'pole');
    sign(ROAD_NAMES.h[z].toUpperCase(), sx, 3.2, sz, '#ffffff', 6.5, 0.8, 'rgba(20,90,50,.96)');
    sign(ROAD_NAMES.v[x].toUpperCase(), sx, 2.4, sz, '#ffffff', 6.5, 0.8, 'rgba(20,90,50,.96)');
  }
}

import { staticLeaf } from './builders.js';
const STATIC_MATS = () => ({
  lanes: mat(0xe6d58a), fences: mat(0xbfb8a6, { roughness: 0.9 }), poles: mat(0x6c7378, { metalness: 0.4, roughness: 0.5 }),
  heads: (() => { const m = mat(0xfff1c9); lamps.push(m); return m; })(), panels: mat(0x1a2a4a, { metalness: 0.6, roughness: 0.3 }),
  trunks: mat(0x6b4a2e), leaves: mat(0x2f7d49), medians: mat(0xb9b9b4, { roughness: 0.95 }), umbrellas: mat(0xd62828),
  deck: mat(0x2a2d30, { roughness: 0.95 }), pillars: mat(0x8c8f93, { roughness: 0.9 }),
  ledges: mat(0xd9d4c7, { roughness: 0.9 }), rails: mat(0x2b2b2b, { metalness: 0.5, roughness: 0.5 }), ac: mat(0xe8e8e4, { roughness: 0.7 }), tanks: mat(0x151515, { roughness: 0.6 }),
  awnings: mat(0xc62828, { roughness: 0.8 }), gens: mat(0x2f5a3a, { metalness: 0.3, roughness: 0.6 }),
});
// ---------- Bridges & corridors: Shitta flyover, Costain interchange, Eko Bridge, Lagos Island ----------
function deckMesh(deck, color = 0x2a2d30) {
  // staircase of short slabs following the height profile, with side barriers and pillars
  const step = 5, w = deck.halfW * 2;
  for (let a = deck.from; a < deck.to; a += step) {
    const mid = a + step / 2, h = deck.axis === 'h' ? heightAt(mid, deck.k) : heightAt(deck.k, mid);
    if (deck.axis === 'h') { staticBox('deck', mid, deck.k, step + 0.1, w, 0.8, h - 0.8); staticBox('medians', mid, deck.k - deck.halfW + 0.3, step + 0.1, 0.5, 1.1, h); staticBox('medians', mid, deck.k + deck.halfW - 0.3, step + 0.1, 0.5, 1.1, h); }
    else { staticBox('deck', deck.k, mid, w, step + 0.1, 0.8, h - 0.8); staticBox('medians', deck.k - deck.halfW + 0.3, mid, 0.5, step + 0.1, 1.1, h); staticBox('medians', deck.k + deck.halfW - 0.3, mid, 0.5, step + 0.1, 1.1, h); }
    if (h > 2 && Math.round(a / step) % 5 === 0) { const px = deck.axis === 'h' ? mid : deck.k, pz = deck.axis === 'h' ? deck.k : mid; staticCyl('pillars', px, pz, 1.1, h - 0.8, 0, 10); colliders.push({ x: px, z: pz, w: 2.4, d: 2.4, maxY: 2.5 }); }
  }
  // deck-level barriers block only things on the deck
  const [a, b] = [deck.from, deck.to], len = b - a, mid = (a + b) / 2;
  if (deck.axis === 'h') { colliders.push({ x: mid, z: deck.k - deck.halfW, w: len, d: 0.6, minY: 2.5 }, { x: mid, z: deck.k + deck.halfW, w: len, d: 0.6, minY: 2.5 }); }
  else { colliders.push({ x: deck.k - deck.halfW, z: mid, w: 0.6, d: len, minY: 2.5 }, { x: deck.k + deck.halfW, z: mid, w: 0.6, d: len, minY: 2.5 }); }
}
function buildCorridors() {
  // Shitta Bridge: a flyover carrying Ogunlana Drive over Bode Thomas
  addDeck({ id: 'shitta', name: 'Shitta Bridge', axis: 'v', k: -72, halfW: 7, profile: [[-50, 0], [-16, 6.5], [16, 6.5], [50, 0]] });
  // Eko Bridge: Bode Thomas climbs at Costain and crosses the lagoon to Lagos Island
  addDeck({ id: 'eko', name: 'Eko Bridge', axis: 'h', k: 0, halfW: 10, profile: [[155, 0], [192, 9], [310, 9], [345, 0]] });
  for (const d of [{ axis: 'v', k: -72, halfW: 7, from: -50, to: 50 }, { axis: 'h', k: 0, halfW: 10, from: 155, to: 345 }]) deckMesh(d);
  // Costain interchange: roundabout island and signage
  cyl(152, 0, 4, 0.5, 0x8d9a8a, 'prop', 0, 24); cyl(152, 0, 0.3, 5, 0x5d402b, 'prop', 0.5);
  sign('COSTAIN', 152, 6.2, 0, '#ffffff', 5, 1.2, 'rgba(20,90,50,.96)');
  sign('EKO BRIDGE → LAGOS ISLAND', 185, 13.5, -14, '#ffffff', 11, 1.6, 'rgba(20,90,50,.96)');
  sign('SHITTA BRIDGE', -72, 10, -52, '#ffffff', 7, 1.4, 'rgba(20,90,50,.96)');
  // National Theatre at Iganmu: the hat-shaped landmark
  const t = LANDMARKS.find(l => l.id === 'theatre');
  const base = cyl(t.x, t.z, 15, 9, 0x8a8f93, 'landmark', 0, 36); occluders.push(base); colliders.push({ x: t.x, z: t.z, w: 30, d: 30 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(21, 19, 2.2, 36), mat(0x6f767c)); brim.position.set(t.x, 10, t.z); brim.castShadow = true; G.scene.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(9, 13, 5, 36), mat(0x9aa0a6)); crown.position.set(t.x, 13.5, t.z); crown.castShadow = true; G.scene.add(crown);
  sign(t.name.toUpperCase(), t.x, 18, t.z, '#ffffff', 12, 2.6, 'rgba(10,40,30,.95)');
}
function buildIsland() {
  // Lagos Island: dense business blocks east of Eko Bridge, between Broad Street and Marina and beyond
  for (const [x, z] of ISLAND_CELLS) {
    if (reserved(x, z)) continue;
    const style = Math.random() < 0.6 ? 'highrise' : 'storey';
    const b = compound(x, z, 20, 18, style, pick([0x6f7d84, 0x7a8ba0, 0x8f9aa6, 0x5a6e8a, 0xb9a98f]));
    if (Math.random() < 0.5) sign(pick(['BANK', 'BUREAU DE CHANGE', 'LAW CHAMBERS', 'INSURANCE', 'BOOKSHOP', 'PHARMACY']), b.position.x, 2.6, b.position.z - 7.2, Math.random() < 0.5 ? '#3dff79' : '#ffc52f', 5, 1.25);
  }
  sign('WELCOME TO LAGOS ISLAND', 352, 9, -14, '#ffc52f', 12, 1.8, 'rgba(10,40,30,.95)');
}
// Living City places: gym, fast food, mall with car park, cyber café, football pitch; roadside vendor stalls.
function buildPlaces() {
  const pitch = LANDMARKS.find(l => l.id === 'pitch');
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), mat(0x2f7d49)); grass.rotation.x = -Math.PI / 2; grass.position.set(pitch.x, 0.12, pitch.z); grass.receiveShadow = true; G.scene.add(grass);
  staticBox('lanes', pitch.x, pitch.z, 0.3, 20, 0.02, 0.12); staticBox('lanes', pitch.x, pitch.z - 10, 30, 0.3, 0.02, 0.12); staticBox('lanes', pitch.x, pitch.z + 10, 30, 0.3, 0.02, 0.12);
  for (const gx of [-14, 14]) { staticBox('poles', pitch.x + gx, pitch.z - 3, 0.15, 0.15, 2.4); staticBox('poles', pitch.x + gx, pitch.z + 3, 0.15, 0.15, 2.4); staticBox('poles', pitch.x + gx, pitch.z, 0.15, 6, 0.15, 2.3); }
  for (const [ox, oz] of [[-16, -11], [16, -11], [-16, 11], [16, 11]]) { staticCyl('poles', pitch.x + ox, pitch.z + oz, 0.3, 14, 0, 8); staticBox('heads', pitch.x + ox, pitch.z + oz, 2, 0.5, 1, 14); }
  sign(pitch.name.toUpperCase(), pitch.x, 6, pitch.z - 13, '#ffffff', 10, 2.2, 'rgba(10,60,30,.95)');
  const mall = LANDMARKS.find(l => l.id === 'mall');
  for (let i = 0; i < 6; i++) staticBox('lanes', mall.x - 10 + i * 4, mall.z - 16, 0.2, 5, 0.02, 0.17);   // car park bays
  sign('CINEMA · SHOPS · FOOD COURT', mall.x, 4.2, mall.z - 10.6, '#ffffff', 9, 1.6, 'rgba(40,40,60,.95)');
  for (const [x, z] of VENDORS) { staticBox('fences', x, z, 1.8, 1, 0.9); staticCyl('umbrellas', x, z, 1.4, 0.5, 2.2, 8, 0.05); staticCyl('poles', x, z, 0.05, 2.2, 0, 6); }
}
export function buildDistrict() {
  buildSky(); buildGround(); buildCorridors(); streetLights(); streetSigns(); buildBlocks(); buildIsland(); buildLandmarks(); buildPlaces(); buildPalms();
  buildTrafficLights();
  const merged = flushStatic(STATIC_MATS());
  if (merged.fences) occluders.push(merged.fences);
  if (merged.deck) { merged.deck.receiveShadow = true; }
  console.info(`[district] scene objects: ${G.scene.children.length}`);
}
export function updateClouds(dt) { for (const c of G.clouds || []) { c.position.x += dt * 1.2; if (c.position.x > 280) c.position.x = -280; } }
export { ROADS };
