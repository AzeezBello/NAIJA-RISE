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
  onBridge,
} from '../data/locations.js';

// ============================================================
// WorldAssetManager
//
// Manages non-vehicle GLBs:
//   - Ambient animals: dogs and cats
//   - Vegetation: tropical trees, maple trees and pine trees
//   - Landmarks: National Stadium and Teslim Balogun Stadium
//
// Stadiums are streamed by distance. Compressed assets are attempted first,
// with original GLBs as fallbacks.
//
// buildWorldAssets() initializes the manager.
// updateWorldAssets(dt) updates ambient AI and landmark streaming.
// ============================================================

const MB = 1024 * 1024;

// Per-tier asset size budgets.
const SIZE_BUDGET = {
  low: 2 * MB,
  medium: 8 * MB,
  high: 40 * MB,
};

export const ASSETS = {
  // Ambient animals
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

  // Vegetation
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

  // Stadiums: try compressed assets first, then original files.
  nationalStadium: {
    url: 'assets/landmarks/stadiums/national_stadium-compressed.glb',
    fallbackUrl: 'assets/landmarks/stadiums/national_stadium.glb',
    size: 20.2 * MB,
    category: 'landmark',
    scale: 0.65,
  },

  teslimStadium: {
    url: 'assets/landmarks/stadiums/teslim_balogun_stadium-compressed.glb',
    fallbackUrl: 'assets/landmarks/stadiums/teslim_balogun_stadium.glb',
    size: 34.4 * MB,
    category: 'landmark',
    scale: 0.6,
  },
};

// ============================================================
// Cached GLTF loader
// IMPORTANT: Declare the loader, cache and loadGLTF only once.
// ============================================================

const loader = new GLTFLoader();

// URL -> Promise<GLTF>. Concurrent requests for the same URL share a load.
const cache = new Map();

function loadGLTF(url) {
  if (!cache.has(url)) {
    const promise = new Promise((resolve, reject) => {
      loader.load(
        url,
        resolve,
        undefined,
        (error) => reject(error),
      );
    });

    cache.set(url, promise);
  }

  return cache.get(url);
}

/**
 * Load an asset, trying its primary URL before its fallback URL.
 *
 * Failed promises are removed from the cache so later attempts can retry.
 */
async function loadAsset(key) {
  const asset = ASSETS[key];

  if (!asset) {
    throw new Error(`[assets] Unknown asset key: ${key}`);
  }

  const paths = [
    ...new Set(
      [asset.url, asset.fallbackUrl].filter(Boolean),
    ),
  ];

  let lastError;

  for (const url of paths) {
    try {
      const gltf = await loadGLTF(url);

      if (url !== asset.url) {
        console.warn(
          `[assets] Using original fallback for ${key}: ${url}`,
        );
      }

      return { gltf, url };
    } catch (error) {
      lastError = error;

      // A rejected promise must not remain cached.
      cache.delete(url);

      console.warn(
        `[assets] Failed to load ${key} from ${url}`,
        error,
      );
    }
  }

  throw (
    lastError ||
    new Error(`[assets] No GLB asset available for ${key}`)
  );
}

/**
 * Clone a loaded GLTF scene without modifying the cached source scene.
 */
async function instantiate(key) {
  const { gltf, url } = await loadAsset(key);
  const obj = skClone(gltf.scene);

  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    obj,
    animations: gltf.animations,
    url,
  };
}

/**
 * Deep-dispose a scene graph.
 *
 * Only use this when the associated cached resources are no longer needed
 * by any scene objects. Ordinary distance-based unloading must NOT dispose
 * shared cached geometry or materials.
 */
function disposeGroupDeep(root) {
  if (!root) return;

  root.traverse((o) => {
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

/**
 * Evict a cached GLTF URL.
 */
function evictCachedUrl(url) {
  if (url) cache.delete(url);
}

// ============================================================
// Quality-tier asset budget
// ============================================================

function withinBudget(key) {
  const asset = ASSETS[key];

  if (!asset) return false;

  const tier = G.quality || 'medium';
  const budget = SIZE_BUDGET[tier] ?? SIZE_BUDGET.medium;

  if (asset.size > budget) {
    console.info(
      `[assets] Skipping ${key} (` +
        `${(asset.size / MB).toFixed(1)} MB > ` +
        `${tier} tier budget ${(budget / MB).toFixed(0)} MB)`,
    );

    return false;
  }

  return true;
}

// ============================================================
// Placement validation
// ============================================================

function clearOfRoads(x, z, shoulder = 2) {
  for (const k of ROADS.h) {
    const [a, b] = roadExtent('h', k);

    if (x < a - 4 || x > b + 4) continue;

    if (
      Math.abs(z - k) <
      ROAD_WIDTHS.h[k] / 2 + shoulder
    ) {
      return false;
    }
  }

  for (const k of ROADS.v) {
    const [a, b] = roadExtent('v', k);

    if (z < a - 4 || z > b + 4) continue;

    if (
      Math.abs(x - k) <
      ROAD_WIDTHS.v[k] / 2 + shoulder
    ) {
      return false;
    }
  }

  return true;
}

const inReserved = (x, z, pad = 0) =>
  (RESERVED || []).some(
    (r) => Math.hypot(x - r.x, z - r.z) < r.r - pad,
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

export function isBuildable(
  x,
  z,
  { shoulder = 2, pad = 1 } = {},
) {
  return (
    clearOfRoads(x, z, shoulder) &&
    !inWater(x, z) &&
    !onBridge(x, z) &&
    !inReserved(x, z) &&
    clearOfColliders(x, z, pad)
  );
}

/**
 * Randomly sample a valid placement inside a rectangle.
 */
function sampleSpot(x0, x1, z0, z1, tries = 24) {
  for (let i = 0; i < tries; i++) {
    const x = x0 + Math.random() * (x1 - x0);
    const z = z0 + Math.random() * (z1 - z0);

    if (isBuildable(x, z)) {
      return { x, z };
    }
  }

  return null;
}

// ============================================================
// Vegetation
// ============================================================

const vegetation = [];

async function spawnVegetation() {
  const low = PERF.lowEnd || G.quality === 'low';

  const plan = [
    ['treeTropical', low ? 8 : 18],
    ['treeMaple', low ? 3 : 8],
    ['treePine', low ? 2 : 5],
  ];

  // Surulere core and the existing coastal planting strip.
  const zones = [
    [-120, 120, -120, 120],
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
      const zone =
        zones[Math.floor(Math.random() * zones.length)];

      const spot = sampleSpot(
        zone[0],
        zone[1],
        zone[2],
        zone[3],
      );

      if (!spot) continue;

      const tree = skClone(inst.obj);

      // Apply the asset-specific scale, then vary individual tree sizes.
      const baseScale = ASSETS[key].scale ?? 1;
      const scale = baseScale * (0.8 + Math.random() * 0.35);

      tree.scale.setScalar(scale);
      
      tree.position.set(
        spot.x,
        heightAt(spot.x, spot.z),
        spot.z,
      );
      tree.rotation.y = Math.random() * Math.PI * 2;

      G.scene.add(tree);

      // Approximate trunk collider.
      solidAt(
        spot.x,
        spot.z,
        0.8 * scale,
        0.8 * scale,
      );

      vegetation.push(tree);
    }
  }

  if (vegetation.length) {
    console.info(
      `[assets] Vegetation: ${vegetation.length} GLB trees placed`,
    );
  }
}

// ============================================================
// Ambient animals: street dogs and cats
// ============================================================

const ambient = [];
const SLEEP2 = 100 * 100;

async function spawnAmbientAnimals() {
  const low = PERF.lowEnd || G.quality === 'low';

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
        sampleSpot(-110, 110, -110, 110) ||
        sampleSpot(340, 600, 300, 330);

      if (!spot) continue;

      // Each animal needs its own scene object.
      const obj = skClone(inst.obj);

      obj.position.set(
        spot.x,
        heightAt(spot.x, spot.z),
        spot.z,
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
        record.mixer
          .clipAction(inst.animations[0])
          .play();
      }

      ambient.push(record);
    }
  }

  if (ambient.length) {
    console.info(
      `[assets] Ambient animals: ${ambient.length} dogs/cats`,
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

    // Freeze animal AI and animation beyond 100 metres.
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

      // Find a nearby walkable target.
      for (let i = 0; i < 8 && !animal.target; i++) {
        const x =
          position.x + (Math.random() - 0.5) * 24;
        const z =
          position.z + (Math.random() - 0.5) * 24;

        if (isBuildable(x, z, { shoulder: 1.5 })) {
          animal.target = new THREE.Vector3(
            x,
            heightAt(x, z),
            z,
          );
        }
      }
    }

    if (!animal.target) continue;

    const direction = animal.target
      .clone()
      .sub(position);

    direction.y = 0;

    const length = direction.length();

    if (length <= 0.05) continue;

    direction.normalize();

    position.addScaledVector(
      direction,
      Math.min(animal.speed * dt, length),
    );

    position.y = heightAt(position.x, position.z);
    animal.g.rotation.y = Math.atan2(
      direction.x,
      direction.z,
    );
  }
}

// ============================================================
// Stadium landmark streaming
// ============================================================

// Procedural stadiums remain visible until their detailed GLBs load.
// Detailed GLBs are loaded within LOAD_R and unloaded beyond UNLOAD_R.

const LOAD_R = 260;
const UNLOAD_R = 380;

const landmarkSlots = [];

async function initLandmarks() {
  const stadiums = (LANDMARKS || []).filter(
    (landmark) => landmark.stadium,
  );

  if (!stadiums.length) {
    console.info(
      '[assets] No stadium landmarks found; streaming disabled',
    );
    return;
  }

  for (const landmark of stadiums) {
    const key = /teslim/i.test(
      landmark.id || landmark.name || '',
    )
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
    `[assets] Landmark streaming: ${landmarkSlots.length} stadium slot(s) registered`,
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
      playerPosition.z - slot.z,
    );

    if (
      distance < LOAD_R &&
      !slot.group &&
      !slot.loading
    ) {
      slot.loading = true;

      if (!withinBudget(slot.key)) {
        slot.loading = false;
        continue;
      }

      try {
        const inst = await instantiate(slot.key);

        inst.obj.scale.setScalar(
          ASSETS[slot.key].scale || 1,
        );

        inst.obj.position.set(
          slot.x,
          heightAt(slot.x, slot.z),
          slot.z,
        );

        G.scene.add(inst.obj);

        slot.group = inst.obj;
        slot.loadedUrl = inst.url;

        // Hide the procedural stand-in only after the GLB loads.
        setProceduralVisible(slot, false);

        console.info(
          `[assets] Streamed in ${slot.key} using ${inst.url}`,
        );
      } catch (error) {
        // Keep the procedural stadium visible if both files fail.
        console.warn(
          `[assets] Failed to stream ${slot.key}`,
          error,
        );
      } finally {
        slot.loading = false;
      }
    } else if (
      distance > UNLOAD_R &&
      slot.group
    ) {
      // Do not dispose shared geometry during routine distance unloading.
      G.scene.remove(slot.group);

      slot.group = null;
      slot.loadedUrl = null;

      setProceduralVisible(slot, true);

      console.info(
        `[assets] Streamed out ${slot.key}`,
      );
    }
  }
}

// ============================================================
// Explicit landmark purge
// ============================================================

/**
 * Remove currently streamed stadiums.
 *
 * freeGpu=false:
 *   Remove the scene objects but preserve shared cached GLTF resources.
 *
 * freeGpu=true:
 *   Evict the loaded GLTF cache entry and dispose the scene resources.
 *
 * Only use freeGpu when no other scene objects depend on the same cached
 * geometry/materials.
 */
export function purgeStreamedLandmarks({
  freeGpu = false,
} = {}) {
  for (const slot of landmarkSlots) {
    if (!slot.group) continue;

    G.scene.remove(slot.group);

    if (freeGpu) {
      // Use the actual URL loaded, including the original fallback if used.
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

  // Spawn these asynchronously; the world remains playable while loading.
  void spawnVegetation();
  void spawnAmbientAnimals();
}

export function updateWorldAssets(dt) {
  updateAmbient(dt);

  // Distance streaming is asynchronous and guarded against duplicate loads.
  void streamLandmarks();
}
