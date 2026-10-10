import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

import { G } from '../core/context.js';
import { PERF } from '../data/config.js';

import { colliders, solidAt } from './builders.js';
import { heightAt } from './terrain.js';

import {
  ROADS,
  ROAD_WIDTHS,
  roadExtent,
  LANDMARKS,
  RESERVED,
  inWater,
} from '../data/locations.js';

// ============================================================
// WorldAssetManager
//
// - Ambient animals (dogs / cats)
// - Vegetation (tropical, maple, pine) — kept off carriageways
// - Stadium streaming (National / Teslim)
// ============================================================

const MB = 1024 * 1024;

const SIZE_BUDGET = {
  low: 2 * MB,
  medium: 16 * MB,
  high: 40 * MB,
};

export const ASSETS = {
  dog: {
    url: 'assets/animals/dogs/dog.glb',
    size: 1.6 * MB,
    category: 'ambient',
  },

  cat: {
    url: 'assets/animals/cats/cat.glb',
    size: 5.0 * MB,
    category: 'ambient',
  },

  treeTropical: {
    url: 'assets/vegetation/jabami_anime_tree-grass_v1.glb',
    size: 2.7 * MB,
    category: 'vegetation',
    scale: 0.55,
  },

  treeMaple: {
    url: 'assets/vegetation/maple_tree.glb',
    size: 5.8 * MB,
    category: 'vegetation',
    scale: 0.5,
  },

  treePine: {
    url: 'assets/vegetation/tree_spruce_pine.glb',
    size: 4.8 * MB,
    category: 'vegetation',
    scale: 0.5,
  },

  nationalStadium: {
    url: 'assets/landmarks/stadiums/national_stadium-compressed.glb',
    fallbackUrl: 'assets/landmarks/stadiums/national_stadium.glb',
    size: 3.3 * MB,
    fallbackSize: 20.2 * MB,
    category: 'landmark',
    targetFootprint: { x: 54, z: 50, maxHeight: 25 },
  },

  teslimStadium: {
    url: 'assets/landmarks/stadiums/teslim_balogun_stadium-compressed.glb',
    fallbackUrl: 'assets/landmarks/stadiums/teslim_balogun_stadium.glb',
    size: 12.4 * MB,
    fallbackSize: 34.4 * MB,
    category: 'landmark',
    targetFootprint: { x: 50, z: 46, maxHeight: 23 },
  },
};

// ============================================================
// Cached GLTF loader
// ============================================================

const loader = new GLTFLoader();
const cache = new Map();

function loadGLTF(url) {
  if (!cache.has(url)) {
    const promise = new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, error => reject(error));
    });
    cache.set(url, promise);
  }
  return cache.get(url);
}

// ============================================================
// Quality budgets
// ============================================================

function getQualityTier() {
  const tier = G.quality || 'medium';
  return Object.hasOwn(SIZE_BUDGET, tier) ? tier : 'medium';
}

function getBudget() {
  return SIZE_BUDGET[getQualityTier()];
}

function withinBudget(key) {
  const asset = ASSETS[key];
  if (!asset) {
    console.warn(`[assets] Unknown asset key: ${key}`);
    return false;
  }

  const tier = getQualityTier();
  const budget = SIZE_BUDGET[tier];

  if (asset.size > budget) {
    console.info(
      `[assets] Skipping ${key} (` +
        `${(asset.size / MB).toFixed(1)} MB > ` +
        `${tier} tier budget ${(budget / MB).toFixed(0)} MB)`
    );
    return false;
  }

  return true;
}

// ============================================================
// Load with fallbacks
// ============================================================

async function loadAsset(key) {
  const asset = ASSETS[key];
  if (!asset) {
    throw new Error(`[assets] Unknown asset key: ${key}`);
  }

  const budget = getBudget();
  const paths = [
    asset.url,
    ...(asset.fallbackUrl &&
    (asset.fallbackSize ?? asset.size) <= budget
      ? [asset.fallbackUrl]
      : []),
  ].filter((url, index, all) => all.indexOf(url) === index);

  let lastError;

  for (const url of paths) {
    try {
      const gltf = await loadGLTF(url);
      if (url !== asset.url) {
        console.warn(
          `[assets] Using original fallback for ${key}: ${url}`
        );
      }
      return { gltf, url };
    } catch (error) {
      lastError = error;
      cache.delete(url);
      console.warn(
        `[assets] Failed to load ${key} from ${url}`,
        error
      );
    }
  }

  throw (
    lastError ||
    new Error(`[assets] No permitted GLB asset available for ${key}`)
  );
}

async function instantiate(key) {
  const { gltf, url } = await loadAsset(key);
  const obj = skClone(gltf.scene);

  obj.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { obj, animations: gltf.animations, url };
}

// ============================================================
// Disposal
// ============================================================

function disposeGroupDeep(root) {
  if (!root) return;

  root.traverse(o => {
    if (o.geometry) {
      o.geometry.dispose();
      o.geometry = undefined;
    }

    const materials = o.material
      ? Array.isArray(o.material)
        ? o.material
        : [o.material]
      : [];

    for (const material of materials) {
      if (!material) continue;
      material.map?.dispose?.();
      material.normalMap?.dispose?.();
      material.roughnessMap?.dispose?.();
      material.metalnessMap?.dispose?.();
      material.emissiveMap?.dispose?.();
      material.aoMap?.dispose?.();
      material.alphaMap?.dispose?.();
      material.dispose?.();
    }
  });
}

function evictCachedUrl(url) {
  if (url) cache.delete(url);
}

// ============================================================
// Placement validation
// ============================================================

function clearOfRoads(x, z, shoulder = 2) {
  for (const k of ROADS.h) {
    const [a, b] = roadExtent('h', k);
    if (x < a - 4 || x > b + 4) continue;
    const half = (ROAD_WIDTHS.h[k] ?? 18) / 2 + shoulder;
    if (Math.abs(z - k) < half) return false;
  }
  for (const k of ROADS.v) {
    const [a, b] = roadExtent('v', k);
    if (z < a - 4 || z > b + 4) continue;
    const half = (ROAD_WIDTHS.v[k] ?? 18) / 2 + shoulder;
    if (Math.abs(x - k) < half) return false;
  }
  return true;
}

const inReserved = (x, z, pad = 0) =>
  (RESERVED || []).some(
    r => Math.hypot(x - r.x, z - r.z) < r.r - pad
  );

function clearOfColliders(x, z, pad = 1) {
  for (const c of colliders) {
    if (
      Math.abs(x - c.x) < c.w / 2 + pad &&
      Math.abs(z - c.z) < c.d / 2 + pad
    ) {
      return false;
    }
  }
  return true;
}

/**
 * @param {number} shoulder  metres beyond road half-width
 *   Vegetation should use ~7 (Adeniran halfW 11 → clear ~18 m from centre).
 */
export function isBuildable(x, z, { shoulder = 2, pad = 1 } = {}) {
  return (
    clearOfRoads(x, z, shoulder) &&
    !inWater(x, z) &&
    !inReserved(x, z) &&
    clearOfColliders(x, z, pad)
  );
}

/**
 * Sample a placement inside a rectangle.
 * ONE definition only — do not redefine this later in the file.
 */
function sampleSpot(
  x0,
  x1,
  z0,
  z1,
  tries = 40,
  opts = { shoulder: 7, pad: 2 }
) {
  for (let i = 0; i < tries; i++) {
    const x = x0 + Math.random() * (x1 - x0);
    const z = z0 + Math.random() * (z1 - z0);
    if (isBuildable(x, z, opts)) return { x, z };
  }
  return null;
}

// ============================================================
// Vegetation
// ============================================================

const vegetation = [];

async function spawnVegetation() {
  const low = PERF.lowEnd || getQualityTier() === 'low';

  const plan = [
    ['treeTropical', low ? 8 : 18],
    ['treeMaple', low ? 3 : 8],
    ['treePine', low ? 2 : 5],
  ];

  // Prefer plot interiors (avoid the main road grid).
  // Adeniran is v road at x=0; Bode Thomas-style h roads at z≈0, -66, …
  const zones = [
    [-120, -22, -120, -22],
    [22, 120, -120, -22],
    [-120, -22, 22, 120],
    [22, 120, 22, 120],
    // coastal strip
    [346, 614, 315, 330],
  ];

  for (const [key, count] of plan) {
    if (!withinBudget(key)) continue;

    let inst;
    try {
      inst = await instantiate(key);
    } catch (error) {
      console.warn(`[assets] Failed to load ${key}`, error);
      continue;
    }

    for (let i = 0; i < count; i++) {
      const zone = zones[(Math.random() * zones.length) | 0];

      // Strict road shoulder so large canopies stay off asphalt
      const spot = sampleSpot(
        zone[0],
        zone[1],
        zone[2],
        zone[3],
        48,
        { shoulder: 7, pad: 2 }
      );

      if (!spot) continue;

      const tree = skClone(inst.obj);
      const baseScale = ASSETS[key].scale ?? 1;
      const scale = baseScale * (0.8 + Math.random() * 0.35);

      tree.scale.setScalar(scale);
      tree.position.set(
        spot.x,
        heightAt(spot.x, spot.z),
        spot.z
      );
      tree.rotation.y = Math.random() * Math.PI * 2;

      G.scene.add(tree);
      solidAt(spot.x, spot.z, 0.8 * scale, 0.8 * scale);
      vegetation.push(tree);
    }
  }

  if (vegetation.length) {
    console.info(
      `[assets] Vegetation: ${vegetation.length} GLB trees placed`
    );
  }
}

// ============================================================
// Ambient animals
// ============================================================

const ambient = [];
const SLEEP2 = 100 * 100;

async function spawnAmbientAnimals() {
  const low = PERF.lowEnd || getQualityTier() === 'low';

  const plan = [
    ['dog', low ? 3 : 6, 1.35],
    ['cat', low ? 2 : 4, 0.9],
  ];

  for (const [key, count, speed] of plan) {
    if (!withinBudget(key)) continue;

    let inst;
    try {
      inst = await instantiate(key);
    } catch (error) {
      console.warn(`[assets] Failed to load ${key}`, error);
      continue;
    }

    for (let i = 0; i < count; i++) {
      const spot =
        sampleSpot(-110, 110, -110, 110, 40, {
          shoulder: 4,
          pad: 1.5,
        }) ||
        sampleSpot(340, 600, 300, 330, 24, {
          shoulder: 3,
          pad: 1,
        });

      if (!spot) continue;

      const obj = skClone(inst.obj);
      obj.position.set(
        spot.x,
        heightAt(spot.x, spot.z),
        spot.z
      );
      obj.rotation.y = Math.random() * Math.PI * 2;
      G.scene.add(obj);

      const record = {
        g: obj,
        target: null,
        t: Math.random() * 4,
        speed,
        key,
      };

      if (inst.animations?.length) {
        record.mixer = new THREE.AnimationMixer(obj);
        record.mixer.clipAction(inst.animations[0]).play();
      }

      ambient.push(record);
    }
  }

  if (ambient.length) {
    console.info(
      `[assets] Ambient animals: ${ambient.length} dogs/cats`
    );
  }
}

function updateAmbient(dt) {
  const playerPosition = G.player?.position;

  for (const animal of ambient) {
    let distanceSquared = 0;

    if (playerPosition) {
      const dx = animal.g.position.x - playerPosition.x;
      const dz = animal.g.position.z - playerPosition.z;
      distanceSquared = dx * dx + dz * dz;
    }

    if (distanceSquared > SLEEP2) continue;

    animal.mixer?.update(dt);
    animal.t -= dt;

    const position = animal.g.position;

    if (
      !animal.target ||
      animal.t <= 0 ||
      position.distanceTo(animal.target) < 0.6
    ) {
      animal.t = 2 + Math.random() * 5;
      animal.target = null;

      for (let i = 0; i < 8 && !animal.target; i++) {
        const x = position.x + (Math.random() - 0.5) * 24;
        const z = position.z + (Math.random() - 0.5) * 24;
        if (isBuildable(x, z, { shoulder: 4, pad: 1.5 })) {
          animal.target = new THREE.Vector3(
            x,
            heightAt(x, z),
            z
          );
        }
      }
    }

    if (!animal.target) continue;

    const direction = animal.target.clone().sub(position);
    direction.y = 0;
    const length = direction.length();
    if (length <= 0.05) continue;

    direction.normalize();
    position.addScaledVector(
      direction,
      Math.min(animal.speed * dt, length)
    );
    position.y = heightAt(position.x, position.z);
    animal.g.rotation.y = Math.atan2(direction.x, direction.z);
  }
}

// ============================================================
// Stadium normalization + ground snap
// ============================================================

function fitStadiumToFootprint(object, key) {
  const target = ASSETS[key]?.targetFootprint;
  if (!target) return;

  object.updateMatrixWorld(true);

  const initial = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  initial.getSize(size);

  if (
    !Number.isFinite(size.x) ||
    !Number.isFinite(size.y) ||
    !Number.isFinite(size.z) ||
    size.x <= 0 ||
    size.y <= 0 ||
    size.z <= 0
  ) {
    console.warn(
      `[assets] Invalid stadium bounds for ${key}; using unnormalized model`
    );
    return;
  }

  const fit = Math.min(
    target.x / size.x,
    target.z / size.z,
    target.maxHeight / size.y
  );

  object.scale.multiplyScalar(fit);
  object.updateMatrixWorld(true);

  // Scale only — vertical placement is placeStadiumOnGround
  const fitted = new THREE.Box3().setFromObject(object);
  const finalSize = new THREE.Vector3();
  fitted.getSize(finalSize);

  console.info(
    `[assets] Stadium ${key} normalized: ` +
      `${finalSize.x.toFixed(1)}w × ` +
      `${finalSize.y.toFixed(1)}h × ` +
      `${finalSize.z.toFixed(1)}d`
  );
}

function placeStadiumOnGround(object, x, z) {
  object.position.x = x;
  object.position.z = z;
  object.position.y = 0;
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(box.min.y)) {
    object.position.y = heightAt(x, z, 0);
    return;
  }

  const groundY = heightAt(x, z, 0);
  const SINK = 0.15;
  object.position.y = groundY - box.min.y - SINK;
  object.updateMatrixWorld(true);
}

// ============================================================
// Stadium streaming
// ============================================================

const LOAD_R = 260;
const UNLOAD_R = 380;
const landmarkSlots = [];

async function initLandmarks() {
  const stadiums = (LANDMARKS || []).filter(l => l.stadium);

  if (!stadiums.length) {
    console.info(
      '[assets] No stadium landmarks found; streaming disabled'
    );
    return;
  }

  for (const landmark of stadiums) {
    const key = /teslim/i.test(landmark.id || landmark.name || '')
      ? 'teslimStadium'
      : 'nationalStadium';

    landmarkSlots.push({
      id: landmark.id,
      x: landmark.x,
      z: landmark.z,
      key,
      group: null,
      loadedUrl: null,
      loading: false,
      procedural: G.landmarkMeshes?.[landmark.id] || [],
    });
  }

  console.info(
    `[assets] Landmark streaming: ${landmarkSlots.length} stadium slot(s) registered`
  );
}

function setProceduralVisible(slot, visible) {
  for (const mesh of slot.procedural) {
    mesh.visible = visible;
  }
}

async function streamLandmarks() {
  const playerPosition = G.player?.position;
  if (!playerPosition) return;

  for (const slot of landmarkSlots) {
    const distance = Math.hypot(
      playerPosition.x - slot.x,
      playerPosition.z - slot.z
    );

    if (distance < LOAD_R && !slot.group && !slot.loading) {
      slot.loading = true;

      if (!withinBudget(slot.key)) {
        slot.loading = false;
        continue;
      }

      try {
        const inst = await instantiate(slot.key);
        fitStadiumToFootprint(inst.obj, slot.key);
        placeStadiumOnGround(inst.obj, slot.x, slot.z);

        G.scene.add(inst.obj);
        slot.group = inst.obj;
        slot.loadedUrl = inst.url;
        setProceduralVisible(slot, false);

        console.info(
          `[assets] Streamed in ${slot.key} using ${inst.url}`
        );
      } catch (error) {
        console.warn(
          `[assets] Failed to stream ${slot.key}; keeping procedural fallback`,
          error
        );
      } finally {
        slot.loading = false;
      }
    } else if (distance > UNLOAD_R && slot.group) {
      G.scene.remove(slot.group);
      slot.group = null;
      slot.loadedUrl = null;
      setProceduralVisible(slot, true);

      console.info(
        `[assets] Streamed out ${slot.key}; restored procedural fallback`
      );
    }
  }
}

export function purgeStreamedLandmarks({ freeGpu = false } = {}) {
  for (const slot of landmarkSlots) {
    if (!slot.group) continue;

    G.scene.remove(slot.group);

    if (freeGpu) {
      evictCachedUrl(slot.loadedUrl);
      disposeGroupDeep(slot.group);
    }

    slot.group = null;
    slot.loadedUrl = null;
    slot.loading = false;
    setProceduralVisible(slot, true);
  }
}

// ============================================================
// Public API
// ============================================================

let built = false;

export async function buildWorldAssets() {
  if (built) return;
  built = true;

  await initLandmarks();
  void spawnVegetation();
  void spawnAmbientAnimals();
}

export function updateWorldAssets(dt) {
  updateAmbient(dt);
  void streamLandmarks();
}