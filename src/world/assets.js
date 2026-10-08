import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { G } from '../core/context.js';
import { PERF } from '../data/config.js';
import { colliders, solidAt } from './builders.js';
import { heightAt } from './terrain.js';
import { ROADS, ROAD_WIDTHS, roadExtent, roadClass, LANDMARKS, RESERVED, inWater, onBridge } from '../data/locations.js';

// ============================================================
// WorldAssetManager v1 — one registry for every non-vehicle GLB in the world.
//
// The vehicle pipeline (vehicleModels.js) already loads its own GLBs; this module covers
// the three categories that were sitting unused in the repo:
//
//   ambient     dogs, cats (street life; simple wander AI, distance-banded)
//   vegetation  Lagos trees (placement-validated: never on roads/sidewalks/water/buildings)
//   landmarks   National Stadium, Teslim Balogun Stadium (distance-streamed: load near, unload far)
//
// Size gating: every manifest entry carries its byte size, and each quality tier has a
// budget. Models over budget on the current tier are skipped at init (with an info log)
// instead of melting low-end devices — this is what keeps the 34 MB keke and the 20–34 MB
// stadiums off phones until they are decimated or Draco-compressed.
//
// Wiring: buildDistrict() calls buildWorldAssets() once; CityScene.update() calls
// updateWorldAssets(dt) each frame. Nothing else changes.
// ============================================================

const MB = 1024 * 1024;
// Per-tier byte budget for a single GLB. Anything bigger is skipped on that tier.
const SIZE_BUDGET = { low: 2 * MB, medium: 8 * MB, high: 40 * MB };

export const ASSETS = {
  // ambient
  dog:  { url: 'assets/animals/dogs/dog.glb',  size: 1.6 * MB, category: 'ambient' },
  cat:  { url: 'assets/animals/cats/cat.glb',  size: 5.0 * MB, category: 'ambient' },
  // vegetation
  treeTropical: { url: 'assets/vegetation/jabami_anime_tree-grass_v1.glb', size: 2.7 * MB, category: 'vegetation' },
  treeMaple:    { url: 'assets/vegetation/maple_tree.glb',                 size: 5.8 * MB, category: 'vegetation' },
  treePine:     { url: 'assets/vegetation/tree_spruce_pine.glb',           size: 4.8 * MB, category: 'vegetation' },
  // landmarks — streamed by distance, never loaded at boot
  nationalStadium:    { url: 'assets/landmarks/stadiums/national_stadium.glb',     size: 20.2 * MB, category: 'landmark', scale: 1 },
  teslimStadium:      { url: 'assets/landmarks/stadiums/teslim_balogun_stadium.glb', size: 34.4 * MB, category: 'landmark', scale: 1 },
};

// ---- cached loader ----
const loader = new GLTFLoader();
const cache = new Map();   // url → Promise<gltf>
function loadGLTF(url) {
  if (!cache.has(url)) cache.set(url, new Promise((res, rej) => loader.load(url, res, undefined, rej)));
  return cache.get(url);
}
// Instantiate a cached GLB. SkeletonUtils.clone handles skinned meshes (dog/cat); it is safe for static ones too.
async function instantiate(key) {
  const gltf = await loadGLTF(ASSETS[key].url);
  const obj = skClone(gltf.scene);
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { obj, animations: gltf.animations };
}

// Skip models the current tier can't afford. Returns true if the asset may load.
function withinBudget(key) {
  const tier = G.quality || 'medium';
  const budget = SIZE_BUDGET[tier] ?? SIZE_BUDGET.medium;
  if (ASSETS[key].size > budget) {
    console.info(`[assets] skipping ${key} (${(ASSETS[key].size / MB).toFixed(1)} MB > ${tier} tier budget ${(budget / MB).toFixed(0)} MB)`);
    return false;
  }
  return true;
}

// ============================================================
// Placement validation — the road-exclusion layer
// ============================================================
// A point is buildable only if it clears: roads (+ shoulder), water, bridge decks,
// reserved landmark plots, and every registered building/fence collider footprint.

function clearOfRoads(x, z, shoulder = 2) {
  for (const k of ROADS.h) {
    const [a, b] = roadExtent('h', k);
    if (x < a - 4 || x > b + 4) continue;
    if (Math.abs(z - k) < ROAD_WIDTHS.h[k] / 2 + shoulder) return false;
  }
  for (const k of ROADS.v) {
    const [a, b] = roadExtent('v', k);
    if (z < a - 4 || z > b + 4) continue;
    if (Math.abs(x - k) < ROAD_WIDTHS.v[k] / 2 + shoulder) return false;
  }
  return true;
}

const inReserved = (x, z, pad = 0) => (RESERVED || []).some(r => Math.hypot(x - r.x, z - r.z) < r.r - pad);

// Building/fence footprints come straight from the collision registry — the same boxes
// the player collides with, so vegetation can never intersect what the player can't.
function clearOfColliders(x, z, pad = 1) {
  for (const c of colliders) {
    if (Math.abs(x - c.x) < c.w / 2 + pad && Math.abs(z - c.z) < c.d / 2 + pad) return false;
  }
  return true;
}

export function isBuildable(x, z, { shoulder = 2, pad = 1 } = {}) {
  return clearOfRoads(x, z, shoulder) && !inWater(x, z) && !onBridge(x, z) && !inReserved(x, z) && clearOfColliders(x, z, pad);
}

// Rejection-sample a valid point inside a rect. Returns null after `tries` failures.
function sampleSpot(x0, x1, z0, z1, tries = 24) {
  for (let i = 0; i < tries; i++) {
    const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0);
    if (isBuildable(x, z)) return { x, z };
  }
  return null;
}

// ============================================================
// Vegetation
// ============================================================
// GLB trees layered on top of the existing procedural palms. Tropical tree gets the
// highest share; counts halve on low-end devices.

const vegetation = [];   // spawned instances (kept for later culling/LOD work)

async function spawnVegetation() {
  const low = PERF.lowEnd || G.quality === 'low';
  const plan = [
    ['treeTropical', low ? 8 : 18],
    ['treeMaple',    low ? 3 : 8],
    ['treePine',     low ? 2 : 5],
  ];
  // Planting zones: Surulere core + Bar Beach strip. Same idea as buildPalms().
  const zones = [[-120, 120, -120, 120], [346, 614, 315, 330]];
  for (const [key, count] of plan) {
    if (!withinBudget(key)) continue;
    let inst;
    try { inst = await instantiate(key); } catch (e) { console.warn(`[assets] failed to load ${key}`, e); continue; }
    for (let i = 0; i < count; i++) {
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const s = sampleSpot(zone[0], zone[1], zone[2], zone[3]);
      if (!s) continue;
      const t = inst.obj.clone();
      const sc = 0.8 + Math.random() * 0.5;
      t.scale.setScalar(sc);
      t.position.set(s.x, heightAt(s.x, s.z), s.z);
      t.rotation.y = Math.random() * Math.PI * 2;
      G.scene.add(t);
      solidAt(s.x, s.z, 0.8 * sc, 0.8 * sc);   // trunk collider, scaled with the tree
      vegetation.push(t);
    }
  }
  if (vegetation.length) console.info(`[assets] vegetation: ${vegetation.length} GLB trees placed`);
}

// ============================================================
// Ambient animals — street dogs and cats
// ============================================================
// Simple wander: pick a nearby valid spot every few seconds and walk to it. Beyond
// 100 m they sleep entirely (no AI, no animation tick). If the GLB ships clips, the
// first one plays on loop (SkeletonUtils.clone keeps the skeleton binding).

const ambient = [];   // { g, mixer, target, t, speed }

async function spawnAmbientAnimals() {
  const low = PERF.lowEnd || G.quality === 'low';
  const plan = [['dog', low ? 3 : 6, 1.35], ['cat', low ? 2 : 4, 0.9]];
  for (const [key, count, speed] of plan) {
    if (!withinBudget(key)) continue;
    let inst;
    try { inst = await instantiate(key); } catch (e) { console.warn(`[assets] failed to load ${key}`, e); continue; }
    for (let i = 0; i < count; i++) {
      const s = sampleSpot(-110, 110, -110, 110) || sampleSpot(340, 600, 300, 330);
      if (!s) continue;
      const g = inst.obj;
      // only the first spawn can reuse the master clone directly; afterwards clone fresh
      const obj = i === 0 ? g : skClone(g);
      obj.position.set(s.x, heightAt(s.x, s.z), s.z);
      obj.rotation.y = Math.random() * Math.PI * 2;
      G.scene.add(obj);
      const rec = { g: obj, target: null, t: Math.random() * 4, speed, key };
      if (inst.animations?.length) {
        rec.mixer = new THREE.AnimationMixer(obj);
        rec.mixer.clipAction(inst.animations[0]).play();
      }
      ambient.push(rec);
    }
  }
  if (ambient.length) console.info(`[assets] ambient: ${ambient.length} dogs/cats on the street`);
}

const SLEEP2 = 100 * 100;
function updateAmbient(dt) {
  const pp = G.player?.position;
  for (const a of ambient) {
    let d2 = 0;
    if (pp) { const dx = a.g.position.x - pp.x, dz = a.g.position.z - pp.z; d2 = dx * dx + dz * dz; }
    if (d2 > SLEEP2) continue;                       // too far to matter: freeze
    a.mixer?.update(dt);
    a.t -= dt;
    const pos = a.g.position;
    if (!a.target || a.t <= 0 || pos.distanceTo(a.target) < 0.6) {
      // new wander target within 12 m, road-aware
      a.t = 2 + Math.random() * 5;
      a.target = null;
      for (let i = 0; i < 8 && !a.target; i++) {
        const x = pos.x + (Math.random() - 0.5) * 24, z = pos.z + (Math.random() - 0.5) * 24;
        if (isBuildable(x, z, { shoulder: 1.5 })) a.target = new THREE.Vector3(x, heightAt(x, z), z);
      }
    }
    if (a.target) {
      const dir = a.target.clone().sub(pos); dir.y = 0;
      const len = dir.length();
      if (len > 0.05) {
        dir.normalize();
        pos.addScaledVector(dir, Math.min(a.speed * dt, len));
        pos.y = heightAt(pos.x, pos.z);
        a.g.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
  }
}

// ============================================================
// Landmark streaming — stadiums
// ============================================================
// Procedural stand-ins (district.js buildStadium) are always present. When the player
// closes inside LOAD_R, the real GLB loads in and the stand-in hides; past UNLOAD_R the
// GLB is dropped and the stand-in returns. Positions come from LANDMARKS at runtime, so
// this needs no hardcoded coordinates.

const LOAD_R = 260, UNLOAD_R = 380;
const landmarkSlots = [];   // { id, x, z, group|null, loading, procedural[] }

async function initLandmarks() {
  const stadiums = (LANDMARKS || []).filter(l => l.stadium);
  if (!stadiums.length) { console.info('[assets] no stadium landmarks found in LANDMARKS; streaming disabled'); return; }
  for (const l of stadiums) {
    // Budget check against the BIGGER of the two stadiums for this slot's tier.
    const key = /teslim/i.test(l.id || l.name || '') ? 'teslimStadium' : 'nationalStadium';
    landmarkSlots.push({ id: l.id, x: l.x, z: l.z, key, group: null, loading: false, procedural: G.landmarkMeshes?.[l.id] || [] });
  }
  console.info(`[assets] landmark streaming: ${landmarkSlots.length} stadium slot(s) registered`);
}

async function streamLandmarks() {
  const pp = G.player?.position;
  if (!pp) return;
  for (const s of landmarkSlots) {
    const d = Math.hypot(pp.x - s.x, pp.z - s.z);
    if (d < LOAD_R && !s.group && !s.loading) {
      s.loading = true;
      if (!withinBudget(s.key)) { s.group = null; s.loading = false; continue; }
      try {
        const inst = await instantiate(s.key);
        inst.obj.scale.setScalar(ASSETS[s.key].scale || 1);
        inst.obj.position.set(s.x, heightAt(s.x, s.z), s.z);
        G.scene.add(inst.obj);
        s.group = inst.obj;
        setProceduralVisible(s, false);
        console.info(`[assets] streamed in ${s.key}`);
      } catch (e) { console.warn(`[assets] failed to stream ${s.key}`, e); }
      s.loading = false;
    } else if (d > UNLOAD_R && s.group) {
      G.scene.remove(s.group);
      s.group.traverse?.(o => { o.geometry?.dispose?.(); });
      s.group = null;
      setProceduralVisible(s, true);
      console.info(`[assets] streamed out ${s.key}`);
    }
  }
}

function setProceduralVisible(slot, visible) {
  for (const m of slot.procedural) m.visible = visible;
}

// ============================================================
// Public API
// ============================================================

let built = false;
export async function buildWorldAssets() {
  if (built) return; built = true;
  await initLandmarks();          // register slots first — streaming is driven per-frame
  spawnVegetation();              // async, non-blocking; world is already walkable meanwhile
  spawnAmbientAnimals();          // async, non-blocking
}

export function updateWorldAssets(dt) {
  updateAmbient(dt);
  streamLandmarks();
}