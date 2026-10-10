import * as THREE from 'three';
import { G } from '../core/context.js';
import { pick } from '../core/utils.js';
import {
  box,
  cyl,
  building,
  compound,
  sign,
  mat,
  occluders,
  colliders,
  lamps,
  glows,
  staticBox,
  staticCyl,
  flushStatic,
  solidBox,
  solidCyl,
  solidAt,
  staticLeaf,
} from './builders.js';
import { PERF } from '../data/config.js';
import { buildTrafficLights } from '../systems/trafficlights.js';
import {
  asphaltTexture,
  groundTexture,
  concreteTexture,
  cloudTexture,
  glowTexture,
  waterTexture,
  waterNormalTexture,
} from './textures.js';
import {
  META,
  DISTRICT_AREAS,
  ROADS,
  ROAD_NAMES,
  ROAD_WIDTHS,
  ROAD_EXTENT,
  U_TURNS,
  roadExtent,
  LANDMARKS,
  BUSSTOPS,
  PROPERTIES,
  KIOSKS,
  RESERVED,
  WATER,
  WATERS,
  inWater,
  onBridge,
  VENDORS,
  ISLAND_CELLS,
  VI_CELLS,
  LEKKI_CELLS,
  YABA_CELLS,
  EBUTE_CELLS,
  TOLLS,
  FOOTBRIDGES,
  JUNCTIONS,
  roadRules,
  roadClass,
} from '../data/locations.js';
import { addDeck, deckHeightAt } from './terrain.js';
import { buildWorldAssets } from './assets.js';
import { registerSidewalks } from './walkables.js';

const PALETTE = [
  0x6f7d84, 0x8a7d6a, 0x9c8f7a, 0x7a8ba0, 0x8f6b63, 0x6e8a8a, 0xa08866,
  0xb9a98f,
];
const SHOP_SIGNS = [
  'SHOP',
  'PHONE',
  'BUKA',
  'FASHION',
  'MART',
  'AUTO',
  'POS',
  'BET9JA',
  'PHARMACY',
  'BARBER',
];
const reserved = (x, z, pad = 0) =>
  RESERVED.some(r => Math.hypot(x - r.x, z - r.z) < r.r - pad);
const ROAD_W = ROAD_WIDTHS.h;
const VROAD_W = ROAD_WIDTHS.v;
const waterMaterials = [];

function createExteriorDoor(x, z, depth) {
  const hinge = new THREE.Group();
  hinge.position.set(x - 0.75, 0, z - depth / 2 - 0.08);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.14), mat(0x493120));
  panel.position.set(0.75, 1.1, 0);
  panel.castShadow = true;
  hinge.add(panel);
  G.scene.add(hinge);
  return hinge;
}

function waterShoreline() {
  const points = [];
  const steps = 5;
  for (const water of WATERS) {
    const [x0, x1] = water.x, [z0, z1] = water.z;
    const edges = [
      { axis: 'x', fixed: x0, start: z0, end: z1, nx: -0.7, nz: 0 },
      { axis: 'x', fixed: x1, start: z0, end: z1, nx: 0.7, nz: 0 },
      { axis: 'z', fixed: z0, start: x0, end: x1, nx: 0, nz: -0.7 },
      { axis: 'z', fixed: z1, start: x0, end: x1, nx: 0, nz: 0.7 },
    ];
    for (const edge of edges) {
      const count = Math.ceil((edge.end - edge.start) / steps);
      for (let i = 0; i < count; i++) {
        const a = edge.start + (edge.end - edge.start) * i / count;
        const b = edge.start + (edge.end - edge.start) * (i + 1) / count;
        const mid = (a + b) / 2;
        const x = edge.axis === 'x' ? edge.fixed + edge.nx : mid;
        const z = edge.axis === 'z' ? edge.fixed + edge.nz : mid;
        if (WATERS.some(other =>
          other !== water &&
          x >= other.x[0] && x <= other.x[1] &&
          z >= other.z[0] && z <= other.z[1]
        )) continue;
        if (edge.axis === 'x') points.push(edge.fixed, 0.055, a, edge.fixed, 0.055, b);
        else points.push(a, 0.055, edge.fixed, b, 0.055, edge.fixed);
      }
    }
  }
  if (!points.length) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const foam = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xb9e6df, transparent: true, opacity: 0.28 })
  );
  foam.userData.name = 'water-shoreline';
  G.scene.add(foam);
}

function roadMedian(axis, k, start, end) {
  const openings = U_TURNS
    .filter(u => u.axis === axis && u.k === k && u.at > start + 8 && u.at < end - 8)
    .map(u => u.at)
    .sort((a, b) => a - b);
  let cursor = start;
  for (const at of openings) {
    const openingStart = Math.max(cursor, at - 8);
    if (openingStart > cursor) {
      const length = openingStart - cursor;
      if (axis === 'h') solidBox('medians', (cursor + openingStart) / 2, k, length, 1.2, 0.9);
      else solidBox('medians', k, (cursor + openingStart) / 2, 1.2, length, 0.9);
    }

    cursor = at + 8;
  }
  if (cursor < end) {
    const length = end - cursor;
    if (axis === 'h') solidBox('medians', (cursor + end) / 2, k, length, 1.2, 0.9);
    else solidBox('medians', k, (cursor + end) / 2, 1.2, length, 0.9);
  }
}

function road(x, z, w, d, asphalt, rules = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: asphalt.clone(),
    roughness: 0.95,
    metalness: 0.02,
  });
  m.map.repeat.set(w / 8, d / 8);
  m.map.needsUpdate = true;
  (G.roadMats = G.roadMats || []).push(m);
  box(x, z, w, d, 0.1, 0, 'road', 0, m);
  if (w > d) {
    if (rules.median) {
      const laneCount = d >= 36 ? 4 : d >= 28 ? 3 : 2;
      const laneWidth = (d - 1.2) / (laneCount * 2);
      for (const direction of [-1, 1]) {
        for (let lane = 1; lane < laneCount; lane++) {
          const laneZ = z + direction * (0.6 + laneWidth * lane);
          for (let p = x - w / 2 + 8; p < x + w / 2 - 8; p += 14) {
            staticBox('laneWhite', p, laneZ, 3.2, 0.16, 0.02, 0.11);
          }
        }
      }
    } else {
      for (let p = x - w / 2 + 8; p < x + w / 2 - 8; p += 14) {
        staticBox('lanes', p, z, 0.5, 3.2, 0.11);
      }
    }
  } else {
    if (rules.median) {
      const laneCount = w >= 36 ? 4 : w >= 28 ? 3 : 2;
      const laneWidth = (w - 1.2) / (laneCount * 2);
      for (const direction of [-1, 1]) {
        for (let lane = 1; lane < laneCount; lane++) {
          const laneX = x + direction * (0.6 + laneWidth * lane);
          for (let p = z - d / 2 + 8; p < z + d / 2 - 8; p += 14) {
            staticBox('laneWhite', laneX, p, 0.16, 3.2, 0.02, 0.11);
          }
        }
      }
    } else {
      for (let p = z - d / 2 + 8; p < z + d / 2 - 8; p += 14) {
        staticBox('lanes', x, p, 4, 0.65, 0.11);
      }
    }
  }
}

function sidewalks(concrete) {
  const walk = (x, z, w, d) => {
    const m = new THREE.MeshStandardMaterial({
      map: concrete.clone(),
      roughness: 0.9,
    });
    m.map.repeat.set(w / 4, d / 4);
    m.map.needsUpdate = true;
    box(x, z, w, d, 0.16, 0, 'walk', 0, m);
  };
  const walkSide = (axis, roadCoordinate, fixed, start, end) => {
    const cuts = JUNCTIONS
      .filter(j => (axis === 'h' ? j.z === roadCoordinate : j.x === roadCoordinate))
      .map(j => {
        const center = axis === 'h' ? j.x : j.z;
        const width = axis === 'h' ? VROAD_W[j.x] : ROAD_W[j.z];
        return [center - width / 2, center + width / 2];
      })
      .filter(([cutStart, cutEnd]) => cutEnd > start && cutStart < end)
      .sort((a, b) => a[0] - b[0]);
    let cursor = start;
    for (const [cutStart, cutEnd] of cuts) {
      if (cutStart > cursor) {
        const segmentEnd = Math.min(cutStart, end);
        if (axis === 'h') walk((cursor + segmentEnd) / 2, fixed, segmentEnd - cursor, 4);
        else walk(fixed, (cursor + segmentEnd) / 2, 4, segmentEnd - cursor);
      }
      cursor = Math.max(cursor, cutEnd);
      if (cursor >= end) return;
    }
    if (cursor < end) {
      if (axis === 'h') walk((cursor + end) / 2, fixed, end - cursor, 4);
      else walk(fixed, (cursor + end) / 2, 4, end - cursor);
    }
  };
  for (const z of ROADS.h) {
    if (z === 142) continue;
    const hw = ROAD_W[z] / 2;
    const [a, b] = roadExtent('h', z);
    walkSide('h', z, z - hw - 2, a, b);
    walkSide('h', z, z + hw + 2, a, b);
  }
  for (const x of ROADS.v) {
    const hw = VROAD_W[x] / 2;
    const [a, b] = roadExtent('v', x);
    walkSide('v', x, x - hw - 2, a, b);
    walkSide('v', x, x + hw + 2, a, b);
  }
}

function streetLight(x, z, armDir) {
  staticCyl('poles', x, z, 0.12, 7, 0, 8, 0.09);
  colliders.push({ x, z, w: 0.55, d: 0.55, bottomY: 0, topY: 7 });
  staticBox(
    'poles',
    x + armDir.x * 1.1,
    z + armDir.z * 1.1,
    Math.abs(armDir.x) * 2.2 + 0.18,
    Math.abs(armDir.z) * 2.2 + 0.18,
    0.14,
    6.9
  );
  staticBox(
    'heads',
    x + armDir.x * 2.1,
    z + armDir.z * 2.1,
    0.7,
    0.7,
    0.22,
    6.75
  );
  staticBox(
    'panels',
    x - armDir.x * 0.5,
    z - armDir.z * 0.5,
    1.1,
    0.7,
    0.06,
    7.2
  );
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: streetLight.glow,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
  );
  halo.position.set(x + armDir.x * 2.1, 6.6, z + armDir.z * 2.1);
  halo.scale.set(9, 9, 1);
  halo.visible = false;
  G.scene.add(halo);
  glows.push(halo);
}

function streetLights() {
  streetLight.glow = glowTexture();
  const nearCross = (coord, cross) =>
    cross.some(k => Math.abs(coord - k) < 14);
  for (const z of ROADS.h) {
    const hw = ROAD_W[z] / 2 + 1;
    const [a, b] = roadExtent('h', z);
    const spacing = ['expressway', 'highway'].includes(roadClass('h', z)) ? 60 : 36;
    for (let x = a + 18; x <= b - 18; x += spacing) {
      if (nearCross(x, ROADS.v) || onBridge('h', z, x) || inWater(x, z)) {
        continue;
      }
      streetLight(x, z - hw, { x: 0, z: 1 });
      streetLight(x + spacing / 2, z + hw, { x: 0, z: -1 });
    }
  }
  for (const x of ROADS.v) {
    const hw = VROAD_W[x] / 2 + 1;
    const [a, b] = roadExtent('v', x);
    const spacing = ['expressway', 'highway'].includes(roadClass('v', x)) ? 60 : 36;
    for (let z = a + 18; z <= b - 18; z += spacing) {
      if (nearCross(z, ROADS.h) || onBridge('v', x, z) || inWater(x, z)) {
        continue;
      }
      streetLight(x - hw, z, { x: 1, z: 0 });
      streetLight(x + hw, z + spacing / 2, { x: -1, z: 0 });
    }
  }
}

function buildGround() {
  const bounds = META.bounds;
  const worldWidth = bounds.x[1] - bounds.x[0] + 140;
  const worldDepth = bounds.z[1] - bounds.z[0] + 140;
  const worldCenterX = (bounds.x[0] + bounds.x[1]) / 2;
  const worldCenterZ = (bounds.z[0] + bounds.z[1]) / 2;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(worldWidth, worldDepth),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 })
  );
  ground.material.map.repeat.set(worldWidth / 10, worldDepth / 10);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(worldCenterX, 0, worldCenterZ);
  ground.receiveShadow = true;
  G.scene.add(ground);

  const asphalt = asphaltTexture();
  for (const z of ROADS.h) {
    const [a, b] = roadExtent('h', z);
    const w = ROAD_W[z];
    const r = roadRules('h', z);
    road((a + b) / 2, z, b - a, w, asphalt, r);
    if (r.median) roadMedian('h', z, a, b);
  }
  for (const x of ROADS.v) {
    const [a, b] = roadExtent('v', x);
    const w = VROAD_W[x];
    const r = roadRules('v', x);
    road(x, (a + b) / 2, w, b - a, asphalt, r);
    if (r.median) roadMedian('v', x, a, b);
  }
  if (ROADS.h.includes(-330) && roadRules('h', -330).median) {
    const [start, end] = roadExtent('h', -330);
    for (const direction of [-1, 1]) {
      const laneZ = -330 + direction * 8.5;
      staticBox('buslanes', (start + end) / 2, laneZ, end - start, 5, 0.05, 0.1);
      for (let x = start + 15; x < end - 5; x += 28) {
        staticBox('lanes', x, laneZ, 4, 0.22, 0.02, 0.15);
      }
    }
  }
  road(152, 0, 30, 22, asphalt);
  sidewalks(concreteTexture());

  waterMaterials.length = 0;
  G.waters = WATERS.map(w => {
    const width = w.x[1] - w.x[0], depth = w.z[1] - w.z[0];
    const map = waterTexture();
    map.repeat.set(width / 38, depth / 38);
    const normalMap = waterNormalTexture();
    normalMap.repeat.set(width / 38, depth / 38);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xc9e7e4,
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.38, 0.38),
      roughness: 0.24,
      metalness: 0.04,
      clearcoat: 0.62,
      clearcoatRoughness: 0.24,
      envMapIntensity: 0.65,
    });
    waterMaterials.push({ map, normalMap });
    const geometry = new THREE.PlaneGeometry(
      width,
      depth,
      Math.max(2, Math.ceil(width / 20)),
      Math.max(2, Math.ceil(depth / 20))
    );
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getY(i);
      vertices.setZ(i, 0.025 * Math.sin(x * 0.16 + z * 0.09));
    }
    geometry.computeVertexNormals();
    const m = new THREE.Mesh(geometry, material);
    m.rotation.x = -Math.PI / 2;
    m.position.set((w.x[0] + w.x[1]) / 2, 0.03, (w.z[0] + w.z[1]) / 2);
    G.scene.add(m);
    return m;
  });
  G.water = G.waters[0];
  waterShoreline();
  if (META.id === 'lagos' || META.id === 'surulere') {
    for (const sx of [WATER.x - WATER.w / 2 - 3, WATER.x + WATER.w / 2 + 3]) {
      const sand = box(sx, 40, 6, 580, 0.08, 0xcbb98a, 'prop');
      sand.receiveShadow = true;
    }
  }
}

function buildSky() {
  const bounds = META.bounds;
  const radius = Math.hypot(bounds.x[1] - bounds.x[0], bounds.z[1] - bounds.z[0]) * 0.9;
  const geo = new THREE.SphereGeometry(Math.max(460, radius), 32, 16);
  const sky = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x4f8fc9) },
        horizon: { value: new THREE.Color(0xbcd8e6) },
        bottom: { value: new THREE.Color(0x55684f) },
      },
      vertexShader:
        'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader:
        'uniform vec3 top,horizon,bottom;varying vec3 vW;void main(){float h=normalize(vW).y;vec3 c=h>0.?mix(horizon,top,pow(h,.55)):mix(horizon,bottom,pow(-h,.5));gl_FragColor=vec4(c,1.);}',
    })
  );
  sky.renderOrder = -10;
  G.scene.add(sky);
  G.sky = sky;

  const sunDisc = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      transparent: true,
      depthWrite: false,
      color: 0xffe6b0,
    })
  );
  sunDisc.scale.set(90, 90, 1);
  G.scene.add(sunDisc);
  G.sunDisc = sunDisc;

  const ct = cloudTexture();
  G.clouds = [];
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: ct,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      })
    );
    c.position.set(
      bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]),
      95 + Math.random() * 45,
      bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0])
    );
    const s = 50 + Math.random() * 60;
    c.scale.set(s, s * 0.45, 1);
    G.scene.add(c);
    G.clouds.push(c);
  }
}

function buildBlocks() {
  for (let x = -120; x <= 120; x += 24) {
    for (let z = -120; z <= 120; z += 24) {
      if (
        Math.abs(x) < 16 ||
        Math.abs(z) < 16 ||
        Math.abs(z + 66) < 11 ||
        Math.abs(x - 72) < 14 ||
        Math.abs(x + 72) < 11 ||
        z > 124
      ) {
        continue;
      }
      if (reserved(x, z)) continue;
      const nearMain = Math.abs(z) < 30 || Math.abs(x - 72) < 30;
      const r = Math.random();
      const style =
        r < (nearMain ? 0.22 : 0.06)
          ? 'highrise'
          : r < 0.55
            ? 'storey'
            : 'bungalow';
      const b = compound(x, z, 20, 18, style, pick(PALETTE));
      if (style !== 'bungalow' && Math.random() < 0.5) {
        sign(
          pick(SHOP_SIGNS),
          b.position.x,
          2.6,
          b.position.z - 7.2,
          Math.random() < 0.5 ? '#3dff79' : '#ffc52f',
          5,
          1.25
        );
      }
    }
  }
}

function buildRegionalBlocks() {
  const areas = DISTRICT_AREAS.length
    ? DISTRICT_AREAS
    : [{ META, RESERVED, WATER, WATERS }];
  for (const area of areas) {
    const { x: xb, z: zb } = area.META.bounds;
    for (let x = Math.ceil((xb[0] + 10) / 24) * 24; x < xb[1] - 10; x += 24) {
      for (let z = Math.ceil((zb[0] + 10) / 24) * 24; z < zb[1] - 10; z += 24) {
        if (reserved(x, z) || inWater(x, z) || onAnyRoad(x, z, 8)) continue;
        if (Math.random() > 0.3) continue;
        const styleRoll = Math.random();
        const style = styleRoll < 0.12 ? 'highrise' : styleRoll < 0.72 ? 'storey' : 'bungalow';
        const b = compound(x, z, 20, 18, style, pick(PALETTE));
        if (style !== 'bungalow' && Math.random() < 0.48) {
          sign(
            pick(SHOP_SIGNS),
            b.position.x,
            2.6,
            b.position.z - 7.2,
            Math.random() < 0.5 ? '#3dff79' : '#ffc52f',
            5,
            1.25
          );
        }
      }
    }
  }
}

function buildStadium(l) {
  const proceduralMeshes = [];

  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(25, 25, 9, 40, 1, true),
    mat(0x8a8f93)
  );
  outer.position.set(l.x, 4.5, l.z);
  outer.castShadow = true;
  outer.receiveShadow = true;
  outer.userData.name = 'landmark';
  G.scene.add(outer);
  occluders.push(outer);
  proceduralMeshes.push(outer);

  colliders.push(
    { x: l.x, z: l.z - 24, w: 48, d: 3, bottomY: 0, topY: 9 },
    { x: l.x - 24, z: l.z, w: 3, d: 44, bottomY: 0, topY: 9 },
    { x: l.x + 24, z: l.z, w: 3, d: 44, bottomY: 0, topY: 9 },
    { x: l.x - 16, z: l.z + 24, w: 14, d: 3, bottomY: 0, topY: 9 },
    { x: l.x + 16, z: l.z + 24, w: 14, d: 3, bottomY: 0, topY: 9 }
  );

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 11, 40, 1, true),
    mat(0x4a5055)
  );
  inner.position.set(l.x, 5.5, l.z);
  inner.castShadow = true;
  inner.receiveShadow = true;
  inner.userData.name = 'prop';
  G.scene.add(inner);
  proceduralMeshes.push(inner);

  colliders.push(
    { x: l.x, z: l.z - 15.5, w: 29, d: 2.5, bottomY: 0, topY: 11 },
    { x: l.x - 15.5, z: l.z, w: 2.5, d: 28, bottomY: 0, topY: 11 },
    { x: l.x + 15.5, z: l.z, w: 2.5, d: 28, bottomY: 0, topY: 11 },
    { x: l.x - 10, z: l.z + 15.5, w: 9, d: 2.5, bottomY: 0, topY: 11 },
    { x: l.x + 10, z: l.z + 15.5, w: 9, d: 2.5, bottomY: 0, topY: 11 }
  );

  const field = new THREE.Mesh(
    new THREE.CircleGeometry(13.7, 40),
    mat(0x397b3d)
  );
  field.rotation.x = -Math.PI / 2;
  field.position.set(l.x, 0.08, l.z);
  field.receiveShadow = true;
  G.scene.add(field);
  proceduralMeshes.push(field);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(23, 1.4, 8, 40),
    mat(0xd8dde0)
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(l.x, 9.6, l.z);
  ring.castShadow = true;
  G.scene.add(ring);
  proceduralMeshes.push(ring);

  for (const [ox, oz] of [
    [-27, -24],
    [27, -24],
    [-27, 24],
    [27, 24],
  ]) {
    const pole = cyl(l.x + ox, l.z + oz, 0.35, 18, 0x9aa0a6, 'pole');
    proceduralMeshes.push(pole);
    const lampMesh = box(
      l.x + ox,
      l.z + oz,
      2.4,
      0.6,
      1.2,
      0xfff2c8,
      'prop',
      18
    );
    lamps.push(lampMesh.material);
    proceduralMeshes.push(lampMesh);
  }

  const nameSign = sign(
    l.name.toUpperCase(),
    l.x,
    13,
    l.z + 26,
    l.sign,
    16,
    4,
    'rgba(10,40,30,.95)'
  );
  proceduralMeshes.push(nameSign);
  (G.landmarkMeshes ??= {})[l.id] = proceduralMeshes;
}

function buildCheckpoint(l) {
  for (const ox of [-6, -3, 0, 3, 6]) {
    cyl(72 + ox, l.z, 0.25, 0.7, 0xff6a1a, 'prop', 0, 8, 0.08);
  }
  cyl(l.x, l.z, 0.08, 3.2, 0xc9ced3);
  sign(l.short, l.x, 3.6, l.z, '#07100e', 4.2, 1.05, 'rgba(228,209,75,.98)');
}

function buildPost(l) {
  box(l.x, l.z + 2.5, 2.4, 2, 2.4, 0x8b1e2d, 'prop');
  solidAt(l.x, l.z + 2.5, 2.4, 2, { bottomY: 0, topY: 2.4 });
  sign(
    l.short,
    l.x,
    3.1,
    l.z + 1.4,
    '#ffffff',
    3.2,
    0.8,
    'rgba(120,20,40,.95)'
  );
}

// ---------- Makoko ----------
const MAKOKO_BRIDGE_X = 360;
const MAKOKO_BRIDGE_CLEAR = 14;

function makokoInLagoon(x, z) {
  return inWater(x, z) && Math.abs(x - MAKOKO_BRIDGE_X) > MAKOKO_BRIDGE_CLEAR;
}

function makokoChannel(x, z, cx, cz) {
  const lx = x - cx;
  const lz = z - cz;
  if (Math.abs(lx % 14) < 2.2) return true;
  if (Math.abs(lz % 16) < 2.0) return true;
  return false;
}

function buildMakoko(l) {
  const cx = l.x;
  const cz = l.z;
  const WOOD = 0x6b5344;
  const WOOD_DK = 0x3e2f26;
  const TIN = 0x7a8288;
  const TIN_RUST = 0x8a6a4a;
  const procedural = [];
  const halfX = 48;
  const halfZ = 42;
  let placed = 0;
  const maxHouses = 52;

  for (let i = 0; i < 120 && placed < maxHouses; i++) {
    const x = cx + (Math.random() - 0.5) * halfX * 2;
    const z = cz + (Math.random() - 0.5) * halfZ * 2;
    if (!makokoInLagoon(x, z)) continue;
    if (makokoChannel(x, z, cx, cz)) continue;
    if (x > MAKOKO_BRIDGE_X - MAKOKO_BRIDGE_CLEAR - 2) continue;

    const stiltH = 1.15 + Math.random() * 0.95;
    const shackH = 1.3 + Math.random() * 1.1;
    const w = 2.0 + Math.random() * 1.1;
    const d = 1.9 + Math.random() * 1.0;
    const roofC = Math.random() < 0.55 ? TIN : TIN_RUST;

    for (const [ox, oz] of [
      [-0.45, -0.45],
      [0.45, -0.45],
      [-0.45, 0.45],
      [0.45, 0.45],
    ]) {
      const pole = cyl(
        x + ox * w,
        z + oz * d,
        0.07,
        stiltH + 0.15,
        WOOD_DK,
        'prop',
        0,
        6
      );
      procedural.push(pole);
    }

    procedural.push(box(x, z, w, d, 0.12, WOOD, 'prop', stiltH));
    procedural.push(
      box(x, z, w * 0.92, d * 0.92, shackH, WOOD, 'prop', stiltH + 0.55)
    );
    procedural.push(
      box(
        x,
        z,
        w * 1.08,
        d * 1.08,
        0.08,
        roofC,
        'prop',
        stiltH + 0.55 + shackH * 0.5
      )
    );
    placed++;
  }

  for (let i = 0; i < 8; i++) {
    const x = cx + (Math.random() - 0.5) * 70;
    const z = cz + (Math.random() - 0.5) * 55;
    if (!makokoInLagoon(x, z)) continue;
    const canoe = box(x, z, 0.55, 2.4, 0.28, 0x2a221c, 'prop', 0.12);
    canoe.rotation.y = Math.random() * Math.PI;
    procedural.push(canoe);
  }

  const landingX = cx - 6;
  const landingZ = cz + 95;
  procedural.push(box(landingX, landingZ + 2, 4.2, 0.3, 0.22, WOOD, 'prop', 0.18));
  procedural.push(box(landingX, landingZ - 10, 2.8, 22, 0.2, WOOD, 'prop', 0.2));
  for (const x of [landingX - 1.15, landingX + 1.15]) {
    for (const z of [landingZ - 3, landingZ - 9, landingZ - 15]) {
      procedural.push(cyl(x, z, 0.11, 1.8, WOOD_DK, 'prop', -0.55, 6));
    }
  }
  const landingCanoe = box(landingX + 3.5, landingZ - 14, 0.65, 4.4, 0.3, 0x2a221c, 'prop', 0.12);
  landingCanoe.rotation.y = 0.2;
  sign('CANOE LANDING', landingX, 3.1, landingZ + 4, '#f5c518', 5.5, 0.9, 'rgba(12,40,48,.94)');
  procedural.push(landingCanoe);
  procedural.push(box(cx, cz + 48, 2.8, 78, 0.18, WOOD, 'prop', 0.2));
  for (const x of [cx - 1, cx + 1]) {
    for (let z = cz + 14; z <= cz + 84; z += 10) {
      procedural.push(cyl(x, z, 0.1, 1.5, WOOD_DK, 'prop', -0.65, 6));
    }
  }

  sign('MAKOKO', cx + 8, 7.2, cz - 36, '#f5c518', 11, 1.8, 'rgba(12,40,48,.94)');
  sign(
    'LAGOON SETTLEMENT',
    cx + 8,
    5.4,
    cz - 36,
    '#e8efe9',
    7,
    1.1,
    'rgba(12,40,48,.9)'
  );

  (G.landmarkMeshes ??= {})[l.id] = procedural;
  console.info(`[district] Makoko: ${placed} stilt houses at (${cx}, ${cz})`);
}

// ---------- Ajegunle ----------
function onMajorRoad(x, z, shoulder = 4) {
  for (const k of ROADS.h) {
    const [a, b] = roadExtent('h', k);
    if (x < a - 2 || x > b + 2) continue;
    if (Math.abs(z - k) < (ROAD_WIDTHS.h[k] || 18) / 2 + shoulder) return true;
  }
  for (const k of ROADS.v) {
    const [a, b] = roadExtent('v', k);
    if (z < a - 2 || z > b + 2) continue;
    if (Math.abs(x - k) < (ROAD_WIDTHS.v[k] || 18) / 2 + shoulder) return true;
  }
  return false;
}

function buildAjegunle(l) {
  const cx = l.x;
  const cz = l.z;
  const COLORS = [0x6b5344, 0x5a4a3a, 0x7a6a55, 0x4a5550, 0x8a7355, 0x556070];
  const ROOF = [0x3a3a3a, 0x5a4030, 0x6a6a6a, 0x2a2a2a];
  const procedural = [];
  let placed = 0;
  const maxHouses = 70;

  for (let i = 0; i < 160 && placed < maxHouses; i++) {
    const x = cx + (Math.random() - 0.5) * 88;
    const z = cz + (Math.random() - 0.5) * 80;
    if (inWater(x, z)) continue;
    if (onMajorRoad(x, z, 5)) continue;
    if (Math.abs((x - cx) % 11) < 1.6) continue;
    if (Math.abs((z - cz) % 10) < 1.5) continue;

    const w = 3.2 + Math.random() * 2.4;
    const d = 3.0 + Math.random() * 2.2;
    const floors = Math.random() < 0.35 ? 2 : 1;
    const h = (2.6 + Math.random() * 1.2) * floors;
    const bodyC = COLORS[(Math.random() * COLORS.length) | 0];
    const roofC = ROOF[(Math.random() * ROOF.length) | 0];

    procedural.push(box(x, z, w, d, h, bodyC, 'prop', h * 0.5));
    procedural.push(
      box(x, z, w * 1.05, d * 1.05, 0.15, roofC, 'prop', h + 0.08)
    );
    colliders.push({ x, z, w: w * 0.9, d: d * 0.9, bottomY: h * 0.5, topY: h * 1.5 });

    if (Math.random() < 0.22) {
      procedural.push(
        box(x, z + d * 0.48, w * 0.9, 0.12, 0.9, 0xf5c518, 'prop', 1.1)
      );
    }
    placed++;
  }

  procedural.push(box(cx + 6, cz - 4, 8, 6, 0.06, 0x4a5a3a, 'prop', 0.04));
  sign('AJEGUNLE', cx, 6.5, cz - 22, '#f5c518', 12, 1.9, 'rgba(20,30,28,.94)');
  sign('AJ CITY', cx, 4.6, cz - 22, '#e8efe9', 7, 1.2, 'rgba(20,30,28,.9)');

  (G.landmarkMeshes ??= {})[l.id] = procedural;
  console.info(`[district] Ajegunle: ${placed} houses at (${cx}, ${cz})`);
}

function buildAjPitch() {
  const pitch = LANDMARKS.find(l => l.id === 'ajpitch');
  if (!pitch) return;

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    mat(0x2f7d49)
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(pitch.x, 0.11, pitch.z);
  grass.receiveShadow = true;
  G.scene.add(grass);

  staticBox('lanes', pitch.x, pitch.z, 0.2, 10, 0.02, 0.12);
  staticBox('lanes', pitch.x, pitch.z - 5, 14, 0.2, 0.02, 0.12);
  staticBox('lanes', pitch.x, pitch.z + 5, 14, 0.2, 0.02, 0.12);

  for (const gx of [-6.5, 6.5]) {
    staticBox('poles', pitch.x + gx, pitch.z - 2, 0.12, 0.12, 1.8);
    staticBox('poles', pitch.x + gx, pitch.z + 2, 0.12, 0.12, 1.8);
    staticBox('poles', pitch.x + gx, pitch.z, 0.12, 4, 0.12, 1.7);
  }

  sign(
    'AJ STREET FOOTBALL',
    pitch.x,
    4.2,
    pitch.z - 7,
    '#ffffff',
    7,
    1.3,
    'rgba(10,50,30,.94)'
  );
}

function buildBeach(l) {
  const sand = box(l.x, l.z + 1, 42, 30, 0.08, 0xd8c596, 'prop', 0.04);
  sand.receiveShadow = true;
  for (let i = 0; i < 4; i++) {
    const x = l.x - 14 + i * 9;
    const z = l.z - 4;
    staticCyl('umbrellas', x, z, 1.5, 0.12, 2.1, 10, 0.2);
    staticCyl('poles', x, z, 0.05, 2.1, 0, 8);
    box(x + 2, z + 5, 2.8, 1.2, 0.16, i % 2 ? 0xffe2b1 : 0x8db7c8, 'prop', 0.2);
  }
  sign(l.name.toUpperCase(), l.x, 3.4, l.z - 13, '#ffffff', 8, 1.5, 'rgba(26,91,112,.94)');
}

function buildArtisanWorkshop(l) {
  const width = 16, depth = 13;
  building(l.x, l.z, width, depth, l.h, parseInt(l.c.slice(1), 16), 'landmark');
  l.doorMesh = createExteriorDoor(l.x, l.z, depth);
  sign(l.profession.toUpperCase(), l.x, l.h + 1.6, l.z - 7.2, l.sign, 7, 1.7, 'rgba(68,43,24,.94)');
  box(l.x, l.z + 8, 8, 3.2, 0.14, 0x6e4d30, 'prop', 0.1);
  if (l.profession === 'Carpenter') {
    for (let i = 0; i < 4; i++) box(l.x - 4 + i * 2.5, l.z + 6, 5.2, 0.3, 0.25, i % 2 ? 0xc39155 : 0x9b6f3d, 'prop', 0.25 + i * 0.04);
    box(l.x + 4, l.z + 8, 0.35, 1.7, 0.8, 0xb4a17a, 'prop', 0.2);
  } else if (l.profession === 'Tailor') {
    box(l.x - 3, l.z + 6, 2.4, 1.6, 1.2, 0x34414a, 'prop', 0.4);
    cyl(l.x - 3, l.z + 6, 0.65, 0.12, 0xc7b19b, 'prop', 1.62, 16, 0.65);
    box(l.x + 3, l.z + 7, 1.2, 2, 2.6, 0x926e87, 'prop', 0.15);
    for (let i = 0; i < 3; i++) box(l.x + 3, l.z + 5.7 + i * 0.8, 1.35, 0.1, 0.12, [0xcc6474, 0x5b8b88, 0xe2b644][i], 'prop', 0.2);
  } else if (l.profession === 'Shoemaker') {
    box(l.x - 2, l.z + 6, 5, 1.6, 1.1, 0x5d4635, 'prop', 0.35);
    for (let i = 0; i < 4; i++) box(l.x + 3, l.z + 5 + i * 0.8, 2.4, 0.35, 0.25, i % 2 ? 0x4e3426 : 0x9e6b3d, 'prop', 0.45);
    for (let i = 0; i < 3; i++) box(l.x - 4 + i * 1.2, l.z + 8, 0.75, 0.32, 0.18, 0x342b26, 'prop', 0.2);
  } else if (l.profession === 'Welder') {
    box(l.x - 2, l.z + 6, 4.4, 1.8, 1.25, 0x515a60, 'prop', 0.4);
    for (let i = 0; i < 3; i++) cyl(l.x + 3 + i * 1.2, l.z + 7, 0.35, 1.2, 0x59646a, 'prop', 0.12, 10);
    const sparks = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb52e }));
    sparks.position.set(l.x, 1.8, l.z + 5.4);
    G.scene.add(sparks);
  } else if (l.profession === 'Painter') {
    const easel = new THREE.Group();
    for (const [x, z] of [[-1.2, 0], [1.2, 0], [0, -0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), mat(0x795b3d));
      leg.position.set(l.x + x, 1.5, l.z + 6 + z);
      easel.add(leg);
    }
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2, 0.12), mat(0xd5c7a0));
    canvas.position.set(l.x, 1.8, l.z + 5.7);
    easel.add(canvas);
    G.scene.add(easel);
    for (let i = 0; i < 3; i++) cyl(l.x + 4 + i * 0.8, l.z + 7, 0.28, 0.8, [0xc94639, 0x4686a2, 0xd6ae40][i], 'prop', 0.1, 10);
  }
}

function createAirplane(color = 0xf4f3e9) {
  const group = new THREE.Group();
  const bodyMat = mat(color, { roughness: 0.42, metalness: 0.12 });
  const trimMat = mat(0x226b8e, { roughness: 0.4, metalness: 0.15 });
  const glassMat = mat(0x23485b, { roughness: 0.22, metalness: 0.18 });
  const addBox = (w, h, d, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 11.5, 4, 10), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 0.72;
  fuselage.castShadow = true;
  group.add(fuselage);
  addBox(23, 0.28, 3.3, bodyMat, 0, 0.35, 0.3);
  addBox(8.2, 0.2, 2, trimMat, 0, 0.68, 6.1);
  addBox(0.24, 3.2, 1.8, bodyMat, 0, 1.45, 6.7);
  addBox(1.4, 0.28, 5, trimMat, 0, 0.18, 0.4);
  const engineGeo = new THREE.CylinderGeometry(0.48, 0.56, 2.7, 10);
  for (const x of [-5.6, 5.6]) {
    const engine = new THREE.Mesh(engineGeo, trimMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, -0.12, 0.5);
    group.add(engine);
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat(0x202225));
    wheel.position.set(x * 0.55, -0.82, 1.2);
    group.add(wheel);
  }
  addBox(1.45, 0.55, 1.4, glassMat, 0, 1.26, -5.7);
  for (const side of [-1, 1]) {
    for (let z = -3.8; z <= 4.2; z += 1.6) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.25, 0.75), glassMat);
      window.position.set(side * 0.79, 0.92, z);
      group.add(window);
    }
  }
  return group;
}

function buildAirport(l) {
  const runwayZ = l.z - 66;
  const runway = box(l.x + 20, runwayZ, 260, 38, 0.16, 0x353a3d, 'prop', 0.04);
  runway.receiveShadow = true;
  box(l.x + 20, runwayZ + 20, 22, 48, 0.12, 0x55585a, 'prop', 0.04);
  const terminal = building(l.x, l.z + 13, 58, 22, 8, 0x83959a, 'landmark');
  l.doorMesh = createExteriorDoor(l.x, l.z + 13, 22);
  box(l.x, l.z + 1.6, 46, 0.35, 3.2, 0x367b8d, 'prop', 2.4);
  const tower = building(l.x + 31, l.z + 9, 9, 10, 17, 0x70868b, 'landmark');
  box(l.x + 31, l.z + 9, 8.2, 8.5, 0.4, 0x24495b, 'prop', 14);
  box(l.x + 20, l.z - 42, 78, 26, 0.1, 0x777a78, 'prop', 0.04);
  for (let x = l.x - 100; x <= l.x + 140; x += 24) {
    box(x, runwayZ, 12, 0.32, 0.025, 0xe5e5d6, 'prop', 0.13);
  }
  for (const x of [l.x - 128, l.x + 148]) {
    for (const z of [runwayZ - 15, runwayZ + 15]) {
      const lamp = box(x, z, 0.2, 0.2, 0.85, 0xf7edd0, 'prop', 0.13);
      lamps.push(lamp.material);
    }
  }
  const parkedA = createAirplane(0xf4f3e9);
  parkedA.rotation.y = Math.PI / 2;
  parkedA.position.set(l.x - 21, 1.1, l.z - 41);
  G.scene.add(parkedA);
  const parkedB = createAirplane(0xe8ecea);
  parkedB.rotation.y = Math.PI / 2;
  parkedB.position.set(l.x + 23, 1.1, l.z - 41);
  G.scene.add(parkedB);
  const flying = createAirplane(0xf4f3e9);
  flying.rotation.y = Math.PI / 2;
  flying.position.set(l.x - 145, 76, runwayZ - 4);
  G.scene.add(flying);
  G.airplanes = [{ mesh: flying, start: l.x - 145, end: l.x + 145, speed: 13, baseY: 76 }];
  sign('MURTALA MUHAMMED AIRPORT', l.x, 10, l.z + 1, '#ffffff', 17, 2.1, 'rgba(28,65,78,.96)');
  (G.landmarkMeshes ??= {})[l.id] = [runway, terminal, tower, parkedA, parkedB, flying];
}

function marketStallFits(stall, l) {
  const w = 4.2, d = 3.4;
  if (inWater(stall.x, stall.z)) return false;
  for (const z of ROADS.h) {
    const [start, end] = roadExtent('h', z);
    if (stall.x + w / 2 <= start || stall.x - w / 2 >= end) continue;
    if (Math.abs(stall.z - z) < ROAD_W[z] / 2 + d / 2 + 1.2) return false;
  }
  for (const x of ROADS.v) {
    const [start, end] = roadExtent('v', x);
    if (stall.z + d / 2 <= start || stall.z - d / 2 >= end) continue;
    if (Math.abs(stall.x - x) < VROAD_W[x] / 2 + w / 2 + 1.2) return false;
  }
  if (BUSSTOPS.some(stop => Math.hypot(stall.x - stop.x, stall.z - stop.z) < 8)) return false;
  return !LANDMARKS.some(other => {
    if (other === l || other.kind === 'waypoint' || other.kind === 'pitch') return false;
    const otherW = other.big ? 26 : 18, otherD = other.big ? 20 : 14;
    return Math.abs(stall.x - other.x) < (w + otherW) / 2 + 2 &&
      Math.abs(stall.z - other.z) < (d + otherD) / 2 + 2;
  });
}

function buildMarketStreetDetail(l, width, depth) {
  const candidates = [
    { x: l.x - width / 2 - 4.5, z: l.z + depth / 4 },
    { x: l.x + width / 2 + 4.5, z: l.z + depth / 4 },
    { x: l.x, z: l.z + depth / 2 + 4.5 },
    { x: l.x, z: l.z - depth / 2 - 4.5 },
  ];
  let built = 0;
  for (const stall of candidates) {
    if (!marketStallFits(stall, l)) continue;
    staticBox('marketTables', stall.x, stall.z, 3.4, 1.25, 0.88, 0.12);
    staticBox('awnings', stall.x, stall.z, 4.8, 3.9, 0.16, 2.7);
    for (const ox of [-1.85, 1.85]) {
      for (const oz of [-1.45, 1.45]) {
        staticBox('marketPoles', stall.x + ox, stall.z + oz, 0.12, 0.12, 2.65);
      }
    }
    staticBox('marketGoods', stall.x - 0.9, stall.z, 0.8, 0.8, 0.55, 1.08);
    staticBox('marketGoods', stall.x + 0.25, stall.z, 0.8, 0.8, 0.55, 1.08);
    staticBox('marketGoods', stall.x + 1.15, stall.z, 0.65, 0.7, 0.45, 1.08);
    colliders.push({ x: stall.x, z: stall.z, w: 3.4, d: 1.25, bottomY: 0.12, topY: 1 });
    built++;
    if (built === 2) break;
  }
}

function buildLandmarks() {
  for (const l of LANDMARKS) {
    if (l.stadium) {
      buildStadium(l);
      continue;
    }
    // AJ before generic settlement — dense land, not lagoon stilts
    if (l.id === 'ajegunle' || (l.kind === 'settlement' && l.dense)) {
      buildAjegunle(l);
      continue;
    }
    if (l.id === 'makoko' || (l.kind === 'settlement' && l.waterfront)) {
      buildMakoko(l);
      continue;
    }
    if (l.kind === 'checkpoint') {
      buildCheckpoint(l);
      continue;
    }
    if (l.kind === 'post') {
      buildPost(l);
      continue;
    }
    if (l.kind === 'pitch') continue;
    if (l.kind === 'waypoint') continue;
    if (l.kind === 'airport') {
      buildAirport(l);
      continue;
    }
    if (l.kind === 'beach' || (l.waterfront && l.kind === 'landmark')) {
      buildBeach(l);
      continue;
    }
    if (l.kind === 'artisan') {
      buildArtisanWorkshop(l);
      continue;
    }

    const big = l.kind === 'hotel' || l.kind === 'bank' || l.big;
    const width = l.big ? 26 : big ? 20 : 18;
    const depth = l.big ? 20 : big ? 16 : 14;
    building(
      l.x,
      l.z,
      width,
      depth,
      l.h,
      parseInt(l.c.slice(1), 16),
      'landmark'
    );
    l.doorMesh = createExteriorDoor(l.x, l.z, depth);
    sign(
      l.name.toUpperCase(),
      l.x,
      l.h + 1.6,
      l.z - 7.2 - (big ? 1 : 0),
      l.sign,
      8,
      1.9
    );
    if (l.kind === 'market') buildMarketStreetDetail(l, width, depth);
    if (l.kind === 'venue') {
      const neon = box(
        l.x,
        l.z - 7.3,
        6,
        0.2,
        0.5,
        parseInt(l.sign.slice(1), 16),
        'prop',
        3.2
      );
      lamps.push(neon.material);
    }
  }

  for (const p of PROPERTIES) {
    const house = compound(
      p.x,
      p.z,
      20,
      18,
      p.style,
      parseInt(p.c.slice(1), 16),
      'property',
      p.h
    );
    p.door = house.userData.door;
    p.doorMesh = house.userData.doorMesh;
    sign(p.sign, p.x, p.h + 1.6, p.z - 9.4, '#ffffff', 7, 1.7, 'rgba(120,60,20,.95)');
  }

  for (const b of BUSSTOPS) {
    for (const ox of [-3, 3]) cyl(b.x + ox, b.z, 0.12, 3.1, 0xc9ced3, 'pole');
    box(b.x, b.z, 7.4, 2.6, 0.18, 0xf5c518, 'prop', 3.1);
    box(b.x, b.z + 0.6, 6, 0.5, 0.5, 0x6b5a3a, 'prop', 0.5);
    solidAt(b.x, b.z + 0.6, 6, 0.5, { bottomY: 0.5, topY: 1 });
    cyl(b.x + 4.6, b.z - 1, 0.08, 3.6, 0xc9ced3);
    sign(
      b.short,
      b.x + 4.6,
      4.1,
      b.z - 1,
      '#07100e',
      4.6,
      1.15,
      'rgba(245,197,24,.98)'
    );
  }

  for (const [x, z] of KIOSKS) {
    box(x, z, 3, 2.2, 1.6, 0x925f3d, 'kiosk');
    sign('POS · KIOSK', x, 2.3, z - 1.2, '#ffffff', 3.6, 0.85, 'rgba(20,60,120,.95)');
  }

  {
    const f = LANDMARKS.find(l => l.id === 'fuel');
    if (f) {
      for (const ox of [-6, 6]) {
        for (const oz of [-4, 4]) {
          cyl(f.x + ox, f.z + 12 + oz, 0.25, 5, 0xd0d0d0, 'pole');
        }
      }
      box(f.x, f.z + 12, 16, 11, 0.5, 0xb32020, 'prop', 5);
      for (const ox of [-3, 0, 3]) {
        box(f.x + ox, f.z + 12, 0.8, 0.5, 1.6, 0xe8e8e8, 'prop');
        solidAt(f.x + ox, f.z + 12, 0.8, 0.5, { bottomY: 0, topY: 1.6 });
      }
      sign(
        'FUEL · ₦',
        f.x,
        6.4,
        f.z + 17.6,
        '#ffffff',
        5,
        1.2,
        'rgba(179,32,32,.95)'
      );
    }
  }
  {
    const c = LANDMARKS.find(l => l.id === 'church');
    if (c) {
      box(c.x, c.z, 3, 3, 6, 0xd9d2c2, 'prop', c.h);
      box(c.x, c.z, 0.5, 0.5, 3, 0xffc52f, 'prop', c.h + 6);
      box(c.x, c.z, 2, 0.5, 0.5, 0xffc52f, 'prop', c.h + 7.6);
    }
  }
  {
    const m = LANDMARKS.find(l => l.id === 'mosque');
    if (m) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(0x3dd39a)
      );
      dome.position.set(m.x, m.h, m.z);
      dome.castShadow = true;
      G.scene.add(dome);
      cyl(m.x + 10, m.z - 5, 1, 18, 0xe8e8e8, 'pole', 0, 10);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(1.4, 2.4, 10),
        mat(0x3dd39a)
      );
      cap.position.set(m.x + 10, 19.2, m.z - 5);
      G.scene.add(cap);
    }
  }
  {
    const n = LANDMARKS.find(l => l.id === 'nepa');
    if (n) {
      for (const ox of [-6, 6]) {
        cyl(n.x + ox, n.z + 10, 0.2, 10, 0x6c7378, 'pole');
        box(n.x + ox, n.z + 10, 2.4, 0.3, 0.3, 0x6c7378, 'prop', 9.6);
      }
    }
  }

  sign('SHITTA', -72, 5.1, 1.25, '#ffc52f', 4.6, 1.15);
}

// ---------- Palms (off carriageway) ----------
function onAnyRoad(x, z, shoulder = 5) {
  for (const k of ROADS.h) {
    const [a, b] = roadExtent('h', k);
    if (x < a - 2 || x > b + 2) continue;
    if (Math.abs(z - k) < (ROAD_WIDTHS.h[k] ?? 18) / 2 + shoulder) return true;
  }
  for (const k of ROADS.v) {
    const [a, b] = roadExtent('v', k);
    if (z < a - 2 || z > b + 2) continue;
    if (Math.abs(x - k) < (ROAD_WIDTHS.v[k] ?? 18) / 2 + shoulder) return true;
  }
  return false;
}

function palm(x, z, h) {
  if (onAnyRoad(x, z, 5) || reserved(x, z, 4) || inWater(x, z)) return;

  staticCyl('trunks', x, z, 0.22, h, 0, 8, 0.14);
  colliders.push({ x, z, w: 0.75, d: 0.75, bottomY: 0, topY: h });

  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4 + Math.random() * 0.3;
    const leaf = new THREE.BoxGeometry(0.16, 2.6, 0.5);
    leaf.rotateZ(0.95);
    leaf.rotateY(-ang);
    leaf.translate(
      x + Math.cos(ang) * 0.9,
      h + 0.3,
      z + Math.sin(ang) * 0.9
    );
    leaf.computeBoundingBox();
    staticLeaf(leaf);
  }
}

function buildPalms() {
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 280;
    const z = (Math.random() - 0.5) * 280;
    palm(x, z, 3 + Math.random() * 2.5);
  }
  for (let x = 346; x <= 614; x += 14) {
    palm(x + Math.random() * 4, 323 + Math.random() * 2, 4 + Math.random() * 2.5);
  }
  for (let z = 190; z <= 320; z += 26) {
    if (Math.abs(z - 240) < 14 || Math.abs(z - 300) < 13) continue;
    palm(452, z, 4 + Math.random());
    palm(428, z + 8, 4 + Math.random());
  }
  for (let z = -260; z >= -395; z -= 26) {
    if (Math.abs(z + 300) < 11 || Math.abs(z + 330) < 14) continue;
    palm(348, z, 3.5 + Math.random());
  }
}

function streetSigns() {
  for (const { x, z } of JUNCTIONS) {
    if (roadClass('h', z) === 'expressway' || inWater(x, z)) continue;
    const sx = x + VROAD_W[x] / 2 + 2.5;
    const sz = z - ROAD_W[z] / 2 - 2.5;
    cyl(sx, sz, 0.08, 3.4, 0x3a8a4a, 'pole');
    sign(
      ROAD_NAMES.h[z].toUpperCase(),
      sx,
      3.2,
      sz,
      '#ffffff',
      6.5,
      0.8,
      'rgba(20,90,50,.96)'
    );
    sign(
      ROAD_NAMES.v[x].toUpperCase(),
      sx,
      2.4,
      sz,
      '#ffffff',
      6.5,
      0.8,
      'rgba(20,90,50,.96)'
    );
  }
  for (const u of U_TURNS) {
    const width = u.axis === 'h' ? ROAD_W[u.k] : VROAD_W[u.k];
    const x = u.axis === 'h' ? u.at : u.k - width / 2 - 3;
    const z = u.axis === 'h' ? u.k - width / 2 - 3 : u.at;
    if (inWater(x, z)) continue;
    cyl(x, z, 0.08, 3.4, 0x3a8a4a, 'pole');
    sign('U-TURN', x, 3.2, z, '#ffffff', 4.4, 0.9, 'rgba(20,90,50,.96)');
  }
}

const STATIC_MATS = () => ({
  lanes: mat(0xc4b87a, { roughness: 0.95 }),  // was 0xe6d58a — less neon at night
  laneWhite: mat(0xe6e8df, { roughness: 0.95 }),
  buslanes: mat(0x226b8e, { roughness: 0.9 }),
  fences: mat(0xbfb8a6, { roughness: 0.9 }),
  poles: mat(0x6c7378, { metalness: 0.4, roughness: 0.5 }),
  heads: (() => {
    const m = mat(0xfff1c9);
    lamps.push(m);
    return m;
  })(),
  panels: mat(0x1a2a4a, { metalness: 0.6, roughness: 0.3 }),
  marketTables: mat(0x76553c),
  marketPoles: mat(0x5a4030),
  marketGoods: mat(0xd69c42),
  trunks: mat(0x6b4a2e),
  leaves: mat(0x2f7d49),
  medians: mat(0xb9b9b4, { roughness: 0.95 }),
  umbrellas: mat(0xd62828),
  deck: mat(0x2a2d30, { roughness: 0.95 }),
  pillars: mat(0x8c8f93, { roughness: 0.9 }),
  ledges: mat(0xd9d4c7, { roughness: 0.9 }),
  rails: mat(0x2b2b2b, { metalness: 0.5, roughness: 0.5 }),
  ac: mat(0xe8e8e4, { roughness: 0.7 }),
  tanks: mat(0x151515, { roughness: 0.6 }),
  awnings: mat(0xc62828, { roughness: 0.8 }),
  gens: mat(0x2f5a3a, { metalness: 0.3, roughness: 0.6 }),
});

function deckMesh(deck) {
  const step = 5;
  const w = deck.halfW * 2;
  for (let a = deck.from; a < deck.to; a += step) {
    const mid = a + step / 2;
    const h =
      deck.axis === 'h'
        ? deckHeightAt(mid, deck.k).height
        : deckHeightAt(deck.k, mid).height;
    if (deck.axis === 'h') {
      staticBox('deck', mid, deck.k, step + 0.1, w, 0.8, h - 0.8);
      staticBox(
        'medians',
        mid,
        deck.k - deck.halfW + 0.3,
        step + 0.1,
        0.5,
        1.1,
        h
      );
      staticBox(
        'medians',
        mid,
        deck.k + deck.halfW - 0.3,
        step + 0.1,
        0.5,
        1.1,
        h
      );
    } else {
      staticBox('deck', deck.k, mid, w, step + 0.1, 0.8, h - 0.8);
      staticBox(
        'medians',
        deck.k - deck.halfW + 0.3,
        mid,
        0.5,
        step + 0.1,
        1.1,
        h
      );
      staticBox(
        'medians',
        deck.k + deck.halfW - 0.3,
        mid,
        0.5,
        step + 0.1,
        1.1,
        h
      );
    }
    if (h > 2 && Math.round(a / step) % 5 === 0) {
      const px = deck.axis === 'h' ? mid : deck.k;
      const pz = deck.axis === 'h' ? deck.k : mid;
      staticCyl('pillars', px, pz, 1.1, h - 0.8, 0, 10);
      colliders.push({ x: px, z: pz, w: 2.4, d: 2.4, maxY: 2.5 });
    }
  }
  const [a, b] = [deck.from, deck.to];
  const len = b - a;
  const mid = (a + b) / 2;
  if (deck.axis === 'h') {
    colliders.push(
      { x: mid, z: deck.k - deck.halfW, w: len, d: 0.6, minY: 2.5 },
      { x: mid, z: deck.k + deck.halfW, w: len, d: 0.6, minY: 2.5 }
    );
  } else {
    colliders.push(
      { x: deck.k - deck.halfW, z: mid, w: 0.6, d: len, minY: 2.5 },
      { x: deck.k + deck.halfW, z: mid, w: 0.6, d: len, minY: 2.5 }
    );
  }
}

function interchangeRamp(coords, width = 5.5) {
  const path = new THREE.CatmullRomCurve3(
    coords.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  );
  const steps = Math.max(12, Math.ceil(path.getLength() / 3));
  const samples = path.getPoints(steps);
  const vertices = [];
  const indices = [];
  const edgeA = [];
  const edgeB = [];
  for (let i = 0; i < samples.length; i++) {
    const tangent = path.getTangentAt(i / (samples.length - 1));
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize().multiplyScalar(width / 2);
    const point = samples[i];
    vertices.push(
      point.x + side.x, point.y, point.z + side.z,
      point.x - side.x, point.y, point.z - side.z
    );
    edgeA.push(new THREE.Vector3(point.x + side.x, point.y + 0.5, point.z + side.z));
    edgeB.push(new THREE.Vector3(point.x - side.x, point.y + 0.5, point.z - side.z));
    if (i < samples.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const asphalt = new THREE.Mesh(geometry, mat(0x34383c, { roughness: 0.95, side: THREE.DoubleSide }));
  asphalt.receiveShadow = true;
  G.scene.add(asphalt);
  for (const edge of [edgeA, edgeB]) {
    const rail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(edge),
      new THREE.LineBasicMaterial({ color: 0xb9b9b4 })
    );
    G.scene.add(rail);
  }
}

function buildCorridors() {
  addDeck({
    id: 'shitta',
    name: 'Shitta Bridge',
    axis: 'v',
    k: -72,
    halfW: 7,
    profile: [
      [-50, 0],
      [-16, 6.5],
      [16, 6.5],
      [50, 0],
    ],
  });
  addDeck({
    id: 'eko',
    name: 'Eko Bridge',
    axis: 'h',
    k: 0,
    halfW: 10,
    profile: [
      [155, 0],
      [192, 9],
      [310, 9],
      [345, 0],
    ],
  });
  addDeck({
    id: 'falomo',
    name: 'Falomo Bridge',
    axis: 'v',
    k: 440,
    halfW: 10,
    profile: [
      [82, 0],
      [108, 8],
      [156, 8],
      [180, 0],
    ],
  });
  addDeck({
    id: 'thirdmainland',
    name: 'Third Mainland Bridge',
    axis: 'v',
    k: 360,
    halfW: 10,
    profile: [
      [-248, 0],
      [-218, 9],
      [-115, 9],
      [-86, 0],
    ],
  });

  for (const d of [
    { axis: 'v', k: -72, halfW: 7, from: -50, to: 50 },
    { axis: 'h', k: 0, halfW: 10, from: 155, to: 345 },
    { axis: 'v', k: 440, halfW: 10, from: 82, to: 180 },
    { axis: 'v', k: 360, halfW: 10, from: -248, to: -86 },
  ]) {
    deckMesh(d);
  }
  if (META.id === 'lagos') {
    interchangeRamp([[116, 0, -26], [142, 3.5, -26], [170, 7.5, -18], [190, 9, -12]]);
    interchangeRamp([[116, 0, 26], [142, 3.5, 26], [170, 7.5, 18], [190, 9, 12]]);
    interchangeRamp([[440, 8, 110], [450, 5, 108], [466, 1, 98]], 5);
    interchangeRamp([[440, 8, 155], [450, 5, 169], [464, 1, 205]], 5);
    sign('COSTAIN INTERCHANGE · APAPA / ISLAND', 154, 12, -26, '#ffffff', 13, 1.6, 'rgba(20,90,50,.96)');
    sign('FALOMO RAMPS · IKOYI / V.I.', 458, 9.5, 145, '#ffffff', 10, 1.4, 'rgba(20,90,50,.96)');
  }

  sign(
    'FALOMO BRIDGE → VICTORIA ISLAND',
    426,
    12.5,
    100,
    '#ffffff',
    11,
    1.6,
    'rgba(20,90,50,.96)'
  );
  sign(
    'THIRD MAINLAND BRIDGE → YABA',
    374,
    13.5,
    -100,
    '#ffffff',
    11,
    1.6,
    'rgba(20,90,50,.96)'
  );
  sign(
    'WELCOME TO VICTORIA ISLAND',
    440,
    9,
    186,
    '#ffc52f',
    12,
    1.8,
    'rgba(10,40,30,.95)'
  );
  sign(
    'YABA · HERBERT MACAULAY WAY',
    360,
    9,
    -256,
    '#ffc52f',
    12,
    1.8,
    'rgba(10,40,30,.95)'
  );
  sign(
    'IKORODU ROAD → IKORODU',
    72,
    9,
    -316,
    '#ffffff',
    11,
    1.6,
    'rgba(20,90,50,.96)'
  );
  sign(
    'LEKKI PHASE 1 · ADMIRALTY WAY',
    560,
    9,
    186,
    '#ffc52f',
    12,
    1.8,
    'rgba(10,40,30,.95)'
  );

  for (const t of TOLLS) {
    const w = ROAD_W[t.k];
    for (const sz of [-w / 2 - 1, w / 2 + 1]) {
      cyl(t.at, t.k + sz, 0.35, 6.5, 0xd0d0d0, 'pole');
    }
    box(t.at, t.k, 8, w + 4, 0.6, 0xe4d14b, 'prop', 6.5);
    for (const lane of [-7.5, -2.5, 2.5, 7.5]) {
      box(t.at - 2.2, t.k + lane, 1.6, 1.4, 2.6, 0x2b2b2b, 'prop');
      solidAt(t.at - 2.2, t.k + lane, 1.6, 1.4, { bottomY: 0, topY: 2.6 });
      box(t.at + 1.2, t.k + lane + 1.2, 3.2, 0.12, 0.12, 0xd62828, 'prop', 1.1);
    }
    sign(
      'LEKKI TOLL GATE · ₦1,200',
      t.at,
      8.2,
      t.k - w / 2 - 1.5,
      '#07100e',
      8,
      1.4,
      'rgba(228,209,75,.98)'
    );
  }

  for (const f of FOOTBRIDGES) {
    const w = ROAD_W[f.k];
    const x = f.axis === 'h' ? f.at : f.k;
    const z = f.axis === 'h' ? f.k : f.at;
    staticBox('ledges', x, z, 2.4, w + 10, 0.3, 5.2);
    staticBox('rails', x - 1.2, z, 0.08, w + 10, 1.1, 5.5);
    staticBox('rails', x + 1.2, z, 0.08, w + 10, 1.1, 5.5);
    for (const side of [-1, 1]) {
      const tz = z + side * (w / 2 + 6.5);
      box(x, tz, 3, 3, 5.2, 0x8c8f93, 'prop');
      staticBox('rails', x, tz + side * 1.6, 3, 0.08, 1.1, 5.5);
      colliders.push({ x, z: tz, w: 3, d: 3, bottomY: 0, topY: 5.2 });
    }
  }

  cyl(152, -22, 4, 0.5, 0x8d9a8a, 'prop', 0, 24);
  cyl(152, -22, 0.3, 5, 0x5d402b, 'prop', 0.5);
  solidAt(152, -22, 8.3, 8.3, { bottomY: 0, topY: 5.5 });
  sign('COSTAIN', 152, 6.2, -22, '#ffffff', 5, 1.2, 'rgba(20,90,50,.96)');
  sign(
    'EKO BRIDGE → LAGOS ISLAND',
    185,
    13.5,
    -14,
    '#ffffff',
    11,
    1.6,
    'rgba(20,90,50,.96)'
  );
  sign('SHITTA BRIDGE', -72, 10, -52, '#ffffff', 7, 1.4, 'rgba(20,90,50,.96)');

  const t = LANDMARKS.find(l => l.id === 'theatre');
  if (t) {
    const base = cyl(t.x, t.z, 15, 9, 0x8a8f93, 'landmark', 0, 36);
    occluders.push(base);
    colliders.push({ x: t.x, z: t.z, w: 30, d: 30, bottomY: 0, topY: 9 });
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(21, 19, 2.2, 36),
      mat(0x6f767c)
    );
    brim.position.set(t.x, 10, t.z);
    brim.castShadow = true;
    G.scene.add(brim);
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 13, 5, 36),
      mat(0x9aa0a6)
    );
    crown.position.set(t.x, 13.5, t.z);
    crown.castShadow = true;
    G.scene.add(crown);
    sign(
      t.name.toUpperCase(),
      t.x,
      18,
      t.z,
      '#ffffff',
      12,
      2.6,
      'rgba(10,40,30,.95)'
    );
  }
}

const CELL_SETS = [
  {
    cells: ISLAND_CELLS,
    pick: () => (Math.random() < 0.6 ? 'highrise' : 'storey'),
    palette: [0x6f7d84, 0x7a8ba0, 0x8f9aa6, 0x5a6e8a, 0xb9a98f],
    signs: [
      'BANK',
      'BUREAU DE CHANGE',
      'LAW CHAMBERS',
      'INSURANCE',
      'BOOKSHOP',
      'PHARMACY',
    ],
  },
  {
    cells: VI_CELLS,
    pick: () => (Math.random() < 0.7 ? 'highrise' : 'storey'),
    palette: [0x5a6e8a, 0x7a8ba0, 0x9aa6b4, 0x4a5a7a, 0xd9d2c2],
    signs: [
      'BANK HQ',
      'OIL & GAS',
      'TELECOMS',
      'EMBASSY',
      'LOUNGE',
      'SUSHI',
      'HOTEL',
    ],
  },
  {
    cells: LEKKI_CELLS,
    pick: () => (Math.random() < 0.8 ? 'storey' : 'highrise'),
    palette: [0xd9d2c2, 0xb9a98f, 0xc9c0b0, 0x8f9aa6],
    signs: ['ESTATE', 'CAFÉ', 'GYM', 'PHARMACY', 'SUPERMART'],
  },
  {
    cells: YABA_CELLS,
    pick: () => (Math.random() < 0.75 ? 'storey' : 'highrise'),
    palette: [0x8a7d6a, 0x9c8f7a, 0x7a8ba0, 0x8f6b63, 0xa08866],
    signs: ['TECH HUB', 'PRINTING', 'PHONE', 'BUKA', 'LAUNDRY', 'HOSTEL'],
  },
  {
    cells: EBUTE_CELLS,
    pick: () => (Math.random() < 0.55 ? 'bungalow' : 'storey'),
    palette: [0x8a7d6a, 0x9c8f7a, 0x8f6b63, 0xa08866, 0xb9a98f],
    signs: ['MECHANIC', 'BUKA', 'PROVISIONS', 'TYRES', 'CHURCH'],
  },
];

function buildIsland() {
  for (const set of CELL_SETS) {
    for (const [x, z] of set.cells) {
      if (reserved(x, z) || inWater(x, z)) continue;
      const style = set.pick();
      const b = compound(x, z, 20, 18, style, pick(set.palette));
      if (style !== 'bungalow' && Math.random() < 0.5) {
        sign(
          pick(set.signs),
          b.position.x,
          2.6,
          b.position.z - 7.2,
          Math.random() < 0.5 ? '#3dff79' : '#ffc52f',
          5,
          1.25
        );
      }
    }
  }
  sign(
    'WELCOME TO LAGOS ISLAND',
    352,
    9,
    -14,
    '#ffc52f',
    12,
    1.8,
    'rgba(10,40,30,.95)'
  );
}

function buildPlaces() {
  const pitch = LANDMARKS.find(l => l.id === 'pitch');
  if (pitch) {
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 20),
      mat(0x2f7d49)
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(pitch.x, 0.12, pitch.z);
    grass.receiveShadow = true;
    G.scene.add(grass);
    staticBox('lanes', pitch.x, pitch.z, 0.3, 20, 0.02, 0.12);
    staticBox('lanes', pitch.x, pitch.z - 10, 30, 0.3, 0.02, 0.12);
    staticBox('lanes', pitch.x, pitch.z + 10, 30, 0.3, 0.02, 0.12);
    for (const gx of [-14, 14]) {
      staticBox('poles', pitch.x + gx, pitch.z - 3, 0.15, 0.15, 2.4);
      staticBox('poles', pitch.x + gx, pitch.z + 3, 0.15, 0.15, 2.4);
      staticBox('poles', pitch.x + gx, pitch.z, 0.15, 6, 0.15, 2.3);
    }
    for (const [ox, oz] of [
      [-16, -11],
      [16, -11],
      [-16, 11],
      [16, 11],
    ]) {
      staticCyl('poles', pitch.x + ox, pitch.z + oz, 0.3, 14, 0, 8);
      staticBox('heads', pitch.x + ox, pitch.z + oz, 2, 0.5, 1, 14);
    }
    sign(
      pitch.name.toUpperCase(),
      pitch.x,
      6,
      pitch.z - 13,
      '#ffffff',
      10,
      2.2,
      'rgba(10,60,30,.95)'
    );
  }

  buildAjPitch();

  const mall = LANDMARKS.find(l => l.id === 'mall');
  if (mall) {
    for (let i = 0; i < 6; i++) {
      staticBox('lanes', mall.x - 10 + i * 4, mall.z - 16, 0.2, 5, 0.02, 0.17);
    }
    sign(
      'CINEMA · SHOPS · FOOD COURT',
      mall.x,
      4.2,
      mall.z - 10.6,
      '#ffffff',
      9,
      1.6,
      'rgba(40,40,60,.95)'
    );
  }

  for (const [x, z] of VENDORS) {
    solidBox('fences', x, z, 1.8, 1, 0.9);
    staticCyl('umbrellas', x, z, 1.4, 0.5, 2.2, 8, 0.05);
    staticCyl('poles', x, z, 0.05, 2.2, 0, 6);
  }
}

export function buildDistrict() {
  buildSky();
  buildGround();
  if (META.id === 'surulere' || META.id === 'lagos') buildCorridors();
  registerSidewalks();
  streetLights();
  streetSigns();
  if (META.id === 'surulere' || META.id === 'lagos') {
    buildBlocks();
    buildIsland();
  }
  if (META.id !== 'surulere') buildRegionalBlocks();
  buildLandmarks();
  buildPlaces();
  buildPalms();
  buildWorldAssets();
  buildTrafficLights();
  const merged = flushStatic(STATIC_MATS());
  if (merged.fences) occluders.push(merged.fences);
  if (merged.deck) merged.deck.receiveShadow = true;
  console.info(`[district] scene objects: ${G.scene.children.length}`);
}

export function updateClouds(dt) {
  const [west, east] = META.bounds.x;
  for (const c of G.clouds || []) {
    c.position.x += dt * 1.2;
    if (c.position.x > east + 80) c.position.x = west - 80;
  }
}

export function updateWorldVisuals(dt) {
  updateClouds(dt);
  for (const textures of waterMaterials) {
    textures.map.offset.x = (textures.map.offset.x + dt * 0.006) % 1;
    textures.normalMap.offset.y = (textures.normalMap.offset.y + dt * 0.012) % 1;
  }
  for (const plane of G.airplanes || []) {
    plane.mesh.position.x += plane.speed * dt;
    plane.mesh.position.y = plane.baseY + Math.sin(performance.now() * 0.0012) * 1.2;
    if (plane.mesh.position.x > plane.end) plane.mesh.position.x = plane.start;
  }
}

export { ROADS };