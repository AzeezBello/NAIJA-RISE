import * as THREE from 'three';
import { G } from '../core/context.js';
import { pick } from '../core/utils.js';
import { box, cyl, building, compound, sign, mat, occluders, colliders, lamps, glows, staticBox, staticCyl, flushStatic, solidBox, solidCyl, solidAt } from './builders.js';
import { PERF } from '../data/config.js';
import { buildTrafficLights } from '../systems/trafficlights.js';
import { asphaltTexture, groundTexture, concreteTexture, cloudTexture, glowTexture } from './textures.js';
import { ROADS, ROAD_NAMES, ROAD_WIDTHS, ROAD_EXTENT, roadExtent, LANDMARKS, BUSSTOPS, PROPERTIES, KIOSKS, RESERVED, WATER, WATERS, inWater, onBridge, VENDORS, ISLAND_CELLS, VI_CELLS, LEKKI_CELLS, YABA_CELLS, EBUTE_CELLS, TOLLS, FOOTBRIDGES, JUNCTIONS, roadRules, roadClass } from '../data/locations.js';
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
  const nearCross = (coord, cross) => cross.some(k => Math.abs(coord - k) < 14);
  for (const z of ROADS.h) { if (roadClass('h', z) === 'expressway' || roadClass('h', z) === 'highway') continue; const hw = ROAD_W[z] / 2 + 1, [a, b] = roadExtent('h', z); for (let x = a + 18; x <= b - 18; x += 36) { if (nearCross(x, ROADS.v) || onBridge('h', z, x) || inWater(x, z)) continue; streetLight(x, z - hw, { x: 0, z: 1 }); streetLight(x + 18, z + hw, { x: 0, z: -1 }); } }
  for (const x of ROADS.v) { if (roadClass('v', x) === 'expressway' || roadClass('v', x) === 'highway') continue; const hw = VROAD_W[x] / 2 + 1, [a, b] = roadExtent('v', x); for (let z = a + 18; z <= b - 18; z += 36) { if (nearCross(z, ROADS.h) || onBridge('v', x, z) || inWater(x, z)) continue; streetLight(x - hw, z, { x: 1, z: 0 }); streetLight(x + hw, z + 18, { x: -1, z: 0 }); } }
}

function buildGround() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 880), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.material.map.repeat.set(90, 88);
  ground.rotation.x = -Math.PI / 2; ground.position.set(235, 0, -35); ground.receiveShadow = true;
  G.scene.add(ground);
  const asphalt = asphaltTexture();
  // every road from the data: tarmac along its extent, a concrete median and tall posts on expressways and highways
  // Alpha 1.1: medians are solid — no more walking through the expressway divider.
  for (const z of ROADS.h) { const [a, b] = roadExtent('h', z), w = ROAD_W[z]; road((a + b) / 2, z, b - a, w, asphalt); const r = roadRules('h', z); if (r.median) { solidBox('medians', (a + b) / 2, z, b - a, 1.2, 0.9); for (let x = a + 12; x <= b - 12; x += 24) { if (onBridge('h', z, x)) continue; staticBox('poles', x, z, 0.3, 0.3, 9); staticBox('heads', x, z, 2.6, 0.5, 0.3, 9); } } }
  for (const x of ROADS.v) { const [a, b] = roadExtent('v', x), w = VROAD_W[x]; road(x, (a + b) / 2, w, b - a, asphalt); const r = roadRules('v', x); if (r.median) { solidBox('medians', x, (a + b) / 2, 1, b - a, 0.9); for (let z = a + 12; z <= b - 12; z += 24) { if (onBridge('v', x, z)) continue; staticBox('poles', x, z, 0.3, 0.3, 9); staticBox('heads', x, z, 0.5, 2.6, 0.3, 9); } } }
  road(152, 0, 30, 22, asphalt);                                     // Costain approach apron
  sidewalks(concreteTexture());
  // water bodies share one material so the night tint applies to all of them
  const wm = new THREE.MeshStandardMaterial({ color: 0x14758e, roughness: 0.22, metalness: 0.45 });
  G.waters = WATERS.map(w => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w.x[1] - w.x[0], w.z[1] - w.z[0]), wm); m.rotation.x = -Math.PI / 2; m.position.set((w.x[0] + w.x[1]) / 2, 0.03, (w.z[0] + w.z[1]) / 2); G.scene.add(m); return m; });
  G.water = G.waters[0];
  for (const sx of [WATER.x - WATER.w / 2 - 3, WATER.x + WATER.w / 2 + 3]) { const sand = box(sx, 40, 6, 580, 0.08, 0xcbb98a, 'prop'); sand.receiveShadow = true; }
  { const beach = box(480, 328, 280, 8, 0.1, 0xe3d3a6, 'prop'); beach.receiveShadow = true; }   // Bar Beach / Eko Atlantic shore
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
  solidAt(l.x, l.z, 32.4, 32.4);                                   // Alpha 1.1: inner bowl wall
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
  for (const ox of [-6, -3, 0, 3, 6]) {
    cyl(72 + ox, l.z, 0.25, 0.7, 0xff6a1a, 'prop', 0, 8, 0.08);
    solidAt(72 + ox, l.z, 0.6, 0.6);          // P0: cones block
  }
  cyl(l.x, l.z, 0.08, 3.2, 0xc9ced3);
  sign(l.short, l.x, 3.6, l.z, '#07100e', 4.2, 1.05, 'rgba(228,209,75,.98)');
}
function buildPost(l) {
  // LASTMA: a small kiosk-style post by Ojuelegba.
  box(l.x, l.z + 2.5, 2.4, 2, 2.4, 0x8b1e2d, 'prop');
  solidAt(l.x, l.z + 2.5, 2.4, 2);                                 // Alpha 1.1: the post is solid
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
    solidAt(b.x, b.z + 0.6, 6, 0.5);                             // Alpha 1.1: the bench is solid
    cyl(b.x + 4.6, b.z - 1, 0.08, 3.6, 0xc9ced3);
    sign(b.short, b.x + 4.6, 4.1, b.z - 1, '#07100e', 4.6, 1.15, 'rgba(245,197,24,.98)');
  }
  for (const [x, z] of KIOSKS) { box(x, z, 3, 2.2, 1.6, 0x925f3d, 'kiosk'); sign('POS · KIOSK', x, 2.3, z - 1.2, '#ffffff', 3.6, 0.85, 'rgba(20,60,120,.95)'); }
  // filling station: canopy on pillars with pumps; church cross and mosque dome/minaret
  { const f = LANDMARKS.find(l => l.id === 'fuel'); for (const ox of [-6, 6]) for (const oz of [-4, 4]) cyl(f.x + ox, f.z + 12 + oz, 0.25, 5, 0xd0d0d0, 'pole'); box(f.x, f.z + 12, 16, 11, 0.5, 0xb32020, 'prop', 5); for (const ox of [-3, 0, 3]) { box(f.x + ox, f.z + 12, 0.8, 0.5, 1.6, 0xe8e8e8, 'prop'); solidAt(f.x + ox, f.z + 12, 0.8, 0.5); } sign('FUEL · ₦', f.x, 6.4, f.z + 17.6, '#ffffff', 5, 1.2, 'rgba(179,32,32,.95)'); }
  
  { // church
  const c = LANDMARKS.find(l => l.id === 'church');
  box(c.x, c.z, 3, 3, 6, 0xd9d2c2, 'prop', c.h);
  solidAt(c.x, c.z, 3, 3);                     // tower base solid
  box(c.x, c.z, 0.5, 0.5, 3, 0xffc52f, 'prop', c.h + 6);
  box(c.x, c.z, 2, 0.5, 0.5, 0xffc52f, 'prop', c.h + 7.6);
}

{ // mosque
  const m = LANDMARKS.find(l => l.id === 'mosque');
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3dd39a));
  dome.position.set(m.x, m.h, m.z); dome.castShadow = true; G.scene.add(dome);
  cyl(m.x + 10, m.z - 5, 1, 18, 0xe8e8e8, 'pole', 0, 10);   // already gets collider via 'pole'
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 10), mat(0x3dd39a));
  cap.position.set(m.x + 10, 19.2, m.z - 5); G.scene.add(cap);
}
  { const n = LANDMARKS.find(l => l.id === 'nepa'); for (const ox of [-6, 6]) { cyl(n.x + ox, n.z + 10, 0.2, 10, 0x6c7378, 'pole'); box(n.x + ox, n.z + 10, 2.4, 0.3, 0.3, 0x6c7378, 'prop', 9.6); } }
  // Shitta roundabout island at the -72/0 junction
  cyl(-72, 0, 2.6, 0.5, 0x8d9a8a, 'prop', 0, 24); cyl(-72, 0, 0.3, 4, 0x5d402b, 'prop', 0.5);
  solidAt(-72, 0, 5.5, 5.5);                                       // Alpha 1.1: roundabout island
  sign('SHITTA', -72, 5.2, 0, '#ffc52f', 4.6, 1.15);
}

function palm(x, z, h) {
  staticCyl('trunks', x, z, 0.22, h, 0, 8, 0.14); colliders.push({ x, z, w: 0.75, d: 0.75 });
  for (let a = 0; a < 8; a++) {
    const ang = a * Math.PI / 4 + Math.random() * 0.3;
    const leaf = new THREE.BoxGeometry(0.16, 2.6, 0.5); leaf.rotateZ(0.95); leaf.rotateY(-ang); leaf.translate(x + Math.cos(ang) * 0.9, h + 0.3, z + Math.sin(ang) * 0.9);
    leaf.computeBoundingBox(); staticLeaf(leaf);
  }
}
function buildPalms() {
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 280, z = (Math.random() - 0.5) * 280;
    if (Math.abs(x) < 18 || Math.abs(z) < 18 || reserved(x, z, 4) || inWater(x, z)) continue;
    palm(x, z, 3 + Math.random() * 2.5);
  }
  for (let x = 346; x <= 614; x += 14) palm(x + Math.random() * 4, 323 + Math.random() * 2, 4 + Math.random() * 2.5);     // Bar Beach / Eko Atlantic palms
  for (let z = 190; z <= 320; z += 26) { if (Math.abs(z - 240) < 14 || Math.abs(z - 300) < 13) continue; palm(452, z, 4 + Math.random()); palm(428, z + 8, 4 + Math.random()); }   // Ahmadu Bello / Akin Adesola boulevard
  for (let z = -260; z >= -395; z -= 26) { if (Math.abs(z + 300) < 11 || Math.abs(z + 330) < 14) continue; palm(348, z, 3.5 + Math.random()); }   // Murtala Muhammed Way, Yaba
}

// Street-name signs at every intersection: a pole with the two road names.
function streetSigns() {
  for (const { x, z } of JUNCTIONS) {
    if (roadClass('h', z) === 'expressway' || inWater(x, z)) continue;
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
function deckMesh(deck) {
  const step = 5, w = deck.halfW * 2;
  for (let a = deck.from; a < deck.to; a += step) {
    const mid = a + step / 2, h = deck.axis === 'h' ? heightAt(mid, deck.k) : heightAt(deck.k, mid);
    if (deck.axis === 'h') {
      staticBox('deck', mid, deck.k, step + 0.1, w, 0.8, h - 0.8);
      staticBox('medians', mid, deck.k - deck.halfW + 0.3, step + 0.1, 0.5, 1.1, h);
      staticBox('medians', mid, deck.k + deck.halfW - 0.3, step + 0.1, 0.5, 1.1, h);
      // centre median on deck (P1)
      staticBox('medians', mid, deck.k, step + 0.1, 0.6, 0.9, h);
      colliders.push({ x: mid, z: deck.k, w: step + 0.1, d: 0.6, minY: h - 0.2, maxY: h + 1.2 });
    } else {
      staticBox('deck', deck.k, mid, w, step + 0.1, 0.8, h - 0.8);
      staticBox('medians', deck.k - deck.halfW + 0.3, mid, 0.5, step + 0.1, 1.1, h);
      staticBox('medians', deck.k + deck.halfW - 0.3, mid, 0.5, step + 0.1, 1.1, h);
      staticBox('medians', deck.k, mid, 0.6, step + 0.1, 0.9, h);
      colliders.push({ x: deck.k, z: mid, w: 0.6, d: step + 0.1, minY: h - 0.2, maxY: h + 1.2 });
    }
    if (h > 2 && Math.round(a / step) % 5 === 0) {
      const px = deck.axis === 'h' ? mid : deck.k, pz = deck.axis === 'h' ? deck.k : mid;
      staticCyl('pillars', px, pz, 1.1, h - 0.8, 0, 10);
      colliders.push({ x: px, z: pz, w: 2.4, d: 2.4, maxY: 2.5 });
    }
  }
  // existing side barriers …
  const [a, b] = [deck.from, deck.to], len = b - a, mid = (a + b) / 2;
  if (deck.axis === 'h') {
    colliders.push({ x: mid, z: deck.k - deck.halfW, w: len, d: 0.6, minY: 2.5 },
                   { x: mid, z: deck.k + deck.halfW, w: len, d: 0.6, minY: 2.5 });
  } else {
    colliders.push({ x: deck.k - deck.halfW, z: mid, w: 0.6, d: len, minY: 2.5 },
                   { x: deck.k + deck.halfW, z: mid, w: 0.6, d: len, minY: 2.5 });
  }
}


function buildCorridors() {
  // Shitta Bridge: a flyover carrying Ogunlana Drive over Bode Thomas
  addDeck({ id: 'shitta', name: 'Shitta Bridge', axis: 'v', k: -72, halfW: 7, profile: [[-50, 0], [-16, 6.5], [16, 6.5], [50, 0]] });
  // Eko Bridge: Bode Thomas climbs at Costain and crosses the lagoon to Lagos Island
  addDeck({ id: 'eko', name: 'Eko Bridge', axis: 'h', k: 0, halfW: 10, profile: [[155, 0], [192, 9], [310, 9], [345, 0]] });
  // Falomo Bridge: Marina climbs over Five Cowrie Creek into Victoria Island
  addDeck({ id: 'falomo', name: 'Falomo Bridge', axis: 'v', k: 440, halfW: 10, profile: [[82, 0], [108, 8], [156, 8], [180, 0]] });
  // Third Mainland Bridge: Broad Street climbs north over the lagoon to Yaba
  addDeck({ id: 'thirdmainland', name: 'Third Mainland Bridge', axis: 'v', k: 360, halfW: 10, profile: [[-248, 0], [-218, 9], [-115, 9], [-86, 0]] });
  for (const d of [{ axis: 'v', k: -72, halfW: 7, from: -50, to: 50 }, { axis: 'h', k: 0, halfW: 10, from: 155, to: 345 }, { axis: 'v', k: 440, halfW: 10, from: 82, to: 180 }, { axis: 'v', k: 360, halfW: 10, from: -248, to: -86 }]) deckMesh(d);
  sign('FALOMO BRIDGE → VICTORIA ISLAND', 426, 12.5, 100, '#ffffff', 11, 1.6, 'rgba(20,90,50,.96)');
  sign('THIRD MAINLAND BRIDGE → YABA', 374, 13.5, -100, '#ffffff', 11, 1.6, 'rgba(20,90,50,.96)');
  sign('WELCOME TO VICTORIA ISLAND', 440, 9, 186, '#ffc52f', 12, 1.8, 'rgba(10,40,30,.95)');
  sign('YABA · HERBERT MACAULAY WAY', 360, 9, -256, '#ffc52f', 12, 1.8, 'rgba(10,40,30,.95)');
  sign('IKORODU ROAD → IKORODU', 72, 9, -316, '#ffffff', 11, 1.6, 'rgba(20,90,50,.96)');
  sign('LEKKI PHASE 1 · ADMIRALTY WAY', 560, 9, 186, '#ffc52f', 12, 1.8, 'rgba(10,40,30,.95)');
  // Lekki toll plaza: canopy on pillars, booths and barrier arms across each lane
  for (const t of TOLLS) {
    const w = ROAD_W[t.k];
    for (const sz of [-w / 2 - 1, w / 2 + 1]) cyl(t.at, t.k + sz, 0.35, 6.5, 0xd0d0d0, 'pole');
    box(t.at, t.k, 8, w + 4, 0.6, 0xe4d14b, 'prop', 6.5);
    for (const lane of [-7.5, -2.5, 2.5, 7.5]) { box(t.at - 2.2, t.k + lane, 1.6, 1.4, 2.6, 0x2b2b2b, 'prop'); solidAt(t.at - 2.2, t.k + lane, 1.6, 1.4); box(t.at + 1.2, t.k + lane + 1.2, 3.2, 0.12, 0.12, 0xd62828, 'prop', 1.1); }
    sign('LEKKI TOLL GATE · ₦1,200', t.at, 8.2, t.k - w / 2 - 1.5, '#07100e', 8, 1.4, 'rgba(228,209,75,.98)');
  }
  // pedestrian bridges: two stair towers and a deck over the carriageway
  for (const f of FOOTBRIDGES) {
  const w = ROAD_W[f.k], x = f.axis === 'h' ? f.at : f.k, z = f.axis === 'h' ? f.k : f.at;
  // deck slab
  staticBox('ledges', x, z, 2.4, w + 10, 0.3, 5.2);
  // rails (visual + collider)
  staticBox('rails', x - 1.2, z, 0.08, w + 10, 1.1, 5.5);
  staticBox('rails', x + 1.2, z, 0.08, w + 10, 1.1, 5.5);
  colliders.push({ x: x - 1.2, z, w: 0.25, d: w + 10, minY: 5.0, maxY: 7.0 });
  colliders.push({ x: x + 1.2, z, w: 0.25, d: w + 10, minY: 5.0, maxY: 7.0 });

  // stair towers
  for (const side of [-1, 1]) {
    const tz = z + side * (w / 2 + 6.5);
    box(x, tz, 3, 3, 5.2, 0x8c8f93, 'prop');
    staticBox('rails', x, tz + side * 1.6, 3, 0.08, 1.1, 5.5);
    colliders.push({ x, z: tz, w: 3, d: 3 });
  }
}

  // Costain interchange: roundabout island and signage
  cyl(152, 0, 4, 0.5, 0x8d9a8a, 'prop', 0, 24); cyl(152, 0, 0.3, 5, 0x5d402b, 'prop', 0.5);
  solidAt(152, 0, 8.3, 8.3);                                       // Alpha 1.1: Costain roundabout island
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
const CELL_SETS = [
  { cells: ISLAND_CELLS, pick: () => (Math.random() < 0.6 ? 'highrise' : 'storey'), palette: [0x6f7d84, 0x7a8ba0, 0x8f9aa6, 0x5a6e8a, 0xb9a98f], signs: ['BANK', 'BUREAU DE CHANGE', 'LAW CHAMBERS', 'INSURANCE', 'BOOKSHOP', 'PHARMACY'] },
  { cells: VI_CELLS, pick: () => (Math.random() < 0.7 ? 'highrise' : 'storey'), palette: [0x5a6e8a, 0x7a8ba0, 0x9aa6b4, 0x4a5a7a, 0xd9d2c2], signs: ['BANK HQ', 'OIL & GAS', 'TELECOMS', 'EMBASSY', 'LOUNGE', 'SUSHI', 'HOTEL'] },
  { cells: LEKKI_CELLS, pick: () => (Math.random() < 0.8 ? 'storey' : 'highrise'), palette: [0xd9d2c2, 0xb9a98f, 0xc9c0b0, 0x8f9aa6], signs: ['ESTATE', 'CAFÉ', 'GYM', 'PHARMACY', 'SUPERMART'] },
  { cells: YABA_CELLS, pick: () => (Math.random() < 0.75 ? 'storey' : 'highrise'), palette: [0x8a7d6a, 0x9c8f7a, 0x7a8ba0, 0x8f6b63, 0xa08866], signs: ['TECH HUB', 'PRINTING', 'PHONE', 'BUKA', 'LAUNDRY', 'HOSTEL'] },
  { cells: EBUTE_CELLS, pick: () => (Math.random() < 0.55 ? 'bungalow' : 'storey'), palette: [0x8a7d6a, 0x9c8f7a, 0x8f6b63, 0xa08866, 0xb9a98f], signs: ['MECHANIC', 'BUKA', 'PROVISIONS', 'TYRES', 'CHURCH'] },
];
function buildIsland() {
  // Lagos Island towers, Victoria Island business blocks, Lekki estates, Yaba storey buildings, Ebute Metta compounds
  for (const set of CELL_SETS) for (const [x, z] of set.cells) {
    if (reserved(x, z) || inWater(x, z)) continue;
    const style = set.pick();
    const b = compound(x, z, 20, 18, style, pick(set.palette));
    if (style !== 'bungalow' && Math.random() < 0.5) sign(pick(set.signs), b.position.x, 2.6, b.position.z - 7.2, Math.random() < 0.5 ? '#3dff79' : '#ffc52f', 5, 1.25);
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
  for (const [x, z] of VENDORS) { solidBox('fences', x, z, 1.8, 1, 0.9); staticCyl('umbrellas', x, z, 1.4, 0.5, 2.2, 8, 0.05); staticCyl('poles', x, z, 0.05, 2.2, 0, 6); }
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