import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VEH, MODEL_BASE } from '../data/vehicles.js';
import { lamps } from '../world/builders.js';

// ============================================================
// NAIJA RISE — Vehicle GLB Loader
// ============================================================
//
// Runtime asset locations:
//   /assets/vehicles/<file>.glb
//   /assets/vehicles/<folder>/<file>.glb
//
// sync-engine copies: ../assets → web/public/assets
// ============================================================

const CUSTOM_ASSETS = {
  danfo: [
    '/assets/vehicles/danfo/danfo_vanagon.glb',
    '/assets/vehicles/danfo/danfo.glb',
    '/assets/vehicles/danfo/lagos_danfo.glb',
    '/assets/vehicles/danfo/danfo-bus.glb',
    '/vehicles/danfo_vanagon.glb',
  ],
  keke: [
    '/assets/vehicles/keke/keke_bajaj_re.glb',
    '/assets/vehicles/keke/keke.glb',
    '/assets/vehicles/keke/keke_napep.glb',
    '/vehicles/keke_bajaj_re.glb',
  ],
  korope: [
    '/assets/vehicles/korope/suzuki_carry_minivan.glb',
    '/assets/vehicles/suzuki_carry_minivan.glb',
    '/vehicles/suzuki_carry_minivan.glb',
  ],
  okada: [
    '/assets/vehicles/okada/suzuki_gsx-r750.glb',
    '/assets/vehicles/suzuki_gsx-r750.glb',
    '/vehicles/suzuki_gsx-r750.glb',
  ],
};

const loader = new GLTFLoader();
const models = {};
const paints = {};

// ============================================================
// Helpers
// ============================================================

function assetPathsFor(name) {
  if (name === 'danfo_vanagon') return CUSTOM_ASSETS.danfo;
  if (name === 'keke_bajaj_re') return CUSTOM_ASSETS.keke;
  if (name === 'suzuki_carry_minivan') return CUSTOM_ASSETS.korope;
  if (name === 'suzuki_gsx-r750') return CUSTOM_ASSETS.okada;

  return [
    `/assets/vehicles/${name}.glb`,
    `/assets/vehicles/kenney/${name}.glb`,
    `${MODEL_BASE}${name}.glb`,
    `/vehicles/${name}.glb`,
  ];
}

function cloneMaterial(material) {
  if (!material) return material;
  if (Array.isArray(material)) {
    return material.map(item => (item?.clone ? item.clone() : item));
  }
  return material.clone ? material.clone() : material;
}

function materialName(material) {
  return String(material?.name || '').toLowerCase();
}

function isSkipPaintName(n) {
  return /wheel|tyre|tire|rubber|tread|glass|window|windshield|windscreen|light|lamp|head|indicator|brake|chrome|interior|seat|mirror/.test(
    n
  );
}

// ============================================================
// Load first available GLB
// ============================================================

export function loadVehicleModel(name) {
  if (models[name]) return models[name];

  const paths = assetPathsFor(name);

  const promise = (async () => {
    let lastError = null;

    for (const path of paths) {
      try {
        const gltf = await loader.loadAsync(path);
        console.info(`[vehicles] ✓ Loaded ${name} from ${path}`);
        return { gltf, path };
      } catch (error) {
        lastError = error;
        console.warn(`[vehicles] Asset miss: ${path}`);
      }
    }

    throw lastError || new Error(`No vehicle asset found for ${name}`);
  })();

  models[name] = promise.catch(error => {
    delete models[name];
    console.warn(
      `[vehicles] ✗ Could not load ${name}. Tried:\n${paths.join('\n')}`
    );
    throw error;
  });

  return models[name];
}

// ============================================================
// Texture / material analysis (optional repaint path)
// ============================================================

function hsl(r, g, b) {
  const c = new THREE.Color(r / 255, g / 255, b / 255);
  const result = {};
  c.getHSL(result);
  return result;
}

function analyseTexture(body) {
  if (
    !body ||
    !body.material ||
    Array.isArray(body.material) ||
    !body.material.map ||
    !body.material.map.image
  ) {
    return {
      tex: null,
      data: null,
      W: 0,
      H: 0,
      paintTexels: [],
      flipY: true,
      colorSpace: null,
    };
  }

  const tex = body.material.map;
  const img = tex.image;
  const W = img.width || 0;
  const H = img.height || 0;

  if (!W || !H) {
    return {
      tex,
      data: null,
      W,
      H,
      paintTexels: [],
      flipY: tex.flipY ?? true,
      colorSpace: tex.colorSpace,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      tex,
      data: null,
      W,
      H,
      paintTexels: [],
      flipY: tex.flipY ?? true,
      colorSpace: tex.colorSpace,
    };
  }

  try {
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, W, H);
    return {
      tex,
      data,
      W,
      H,
      paintTexels: [],
      flipY: tex.flipY ?? true,
      colorSpace: tex.colorSpace,
    };
  } catch (error) {
    console.warn('[vehicles] Texture analysis unavailable:', error);
    return {
      tex,
      data: null,
      W,
      H,
      paintTexels: [],
      flipY: tex.flipY ?? true,
      colorSpace: tex.colorSpace,
    };
  }
}

function paintTexture(name, model, color) {
  if (!model.data || !model.W || !model.H || !model.paintTexels?.length) {
    return null;
  }

  const key = `${name}:${color}`;
  if (paints[key]) return paints[key];

  const canvas = document.createElement('canvas');
  canvas.width = model.W;
  canvas.height = model.H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const image = new ImageData(
    new Uint8ClampedArray(model.data.data),
    model.W,
    model.H
  );

  const target = new THREE.Color(color);
  const base = {};
  target.getHSL(base);

  for (const texel of model.paintTexels) {
    const shade = new THREE.Color().setHSL(
      base.h,
      base.s,
      THREE.MathUtils.clamp(base.l * texel.l, 0.03, 0.97)
    );
    const offset = (texel.y * model.W + texel.x) * 4;
    image.data[offset] = shade.r * 255;
    image.data[offset + 1] = shade.g * 255;
    image.data[offset + 2] = shade.b * 255;
  }

  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = model.flipY;
  if (model.colorSpace) texture.colorSpace = model.colorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  paints[key] = texture;
  return texture;
}

function applyKekeMaterial(material) {
  if (!material) return;
  const name = materialName(material);

  if (/wheel|tyre|tire|rubber|tread|black/.test(name)) {
    material.color.set(0x171918);
    material.roughness = 0.6;
    material.metalness = 0.05;
    return;
  }
  if (/glass|window|windshield|windscreen/.test(name)) {
    material.color.set(0x243437);
    material.roughness = 0.2;
    material.metalness = 0.15;
    return;
  }
  if (/light|lamp|head|indicator|brake/.test(name)) return;

  material.color.set(0xf5c518);
  material.roughness = 0.48;
  material.metalness = 0.08;
}

/** Solid body tint (BRT blue, army green, etc.). Skips wheels/glass/lights. */
function applyBodyColor(model, bodyHex) {
  model.traverse(object => {
    if (!object.isMesh) return;
    const mats = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const m of mats) {
      if (!m?.color) continue;
      const n = `${object.name || ''} ${m.name || ''}`.toLowerCase();
      if (isSkipPaintName(n)) continue;
      m.color.setHex(bodyHex);
      m.needsUpdate = true;
    }
  });
}

// ============================================================
// Danfo black Lagos waist stripe
// Uses live mesh bbox — never modelData.size / modelData.box
// ============================================================

function addDanfoStripe(g, model) {
  try {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    if (!(size.x > 0) || !(size.y > 0) || !(size.z > 0)) {
      console.warn('[vehicles] danfo stripe skipped — empty bounds');
      return;
    }

    if (g.userData.danfoStripe) {
      g.remove(g.userData.danfoStripe);
      g.userData.danfoStripe = null;
    }

    const stripeGroup = new THREE.Group();
    stripeGroup.name = 'LagosDanfoBlackStripe';

    const black = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.42,
      metalness: 0.08,
    });

    const width = Math.max(1.6, Math.min(size.x * 1.02, 2.6));
    const length = Math.max(3.4, Math.min(size.z * 1.0, 5.6));
    const height = Math.max(0.22, Math.min(size.y * 0.11, 0.4));
    const stripeY = box.min.y + size.y * 0.4;

    const pieces = [
      { geo: [0.04, height, length], pos: [-width / 2, stripeY, 0] },
      { geo: [0.04, height, length], pos: [width / 2, stripeY, 0] },
      { geo: [width, height, 0.04], pos: [0, stripeY, -length / 2] },
      { geo: [width, height, 0.04], pos: [0, stripeY, length / 2] },
    ];

    for (const p of pieces) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...p.geo),
        black.clone()
      );
      mesh.position.set(...p.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.keep = true;
      stripeGroup.add(mesh);
    }

    g.add(stripeGroup);
    g.userData.danfoStripe = stripeGroup;
  } catch (err) {
    console.warn(
      '[vehicles] danfo stripe failed (non-fatal):',
      err?.message || err
    );
  }
}

// ============================================================
// Attach model
// ============================================================

export function attachModel(
  g,
  type,
  name,
  color,
  { lightbar = null } = {}
) {
  loadVehicleModel(name)
    .then(modelData => {
      try {
        const spec = VEH[type];
        if (!spec) {
          console.warn(`[vehicles] Unknown type: ${type}`);
          return;
        }

        const sourceScene = modelData.gltf?.scene;
        if (!sourceScene) {
          console.warn(`[vehicles] No scene in GLB ${name}`);
          return;
        }

        // ---- Original bounds (pre-scale) ----
        const originalBox = new THREE.Box3().setFromObject(sourceScene);
        const originalSize = new THREE.Vector3();
        originalBox.getSize(originalSize);

        if (
          !(originalSize.x > 0) ||
          !(originalSize.y > 0) ||
          !(originalSize.z > 0)
        ) {
          console.warn(`[vehicles] Invalid dimensions for ${name}`);
          return;
        }

        // Longest horizontal axis ≈ vehicle length (axis-safe)
        const lengthGuess = Math.max(originalSize.x, originalSize.z);

        const MODEL_SCALE = {
          danfo_vanagon: 1.0,
          keke_bajaj_re: 0.95,
          'suzuki_gsx-r750': 1.15,
          suzuki_carry_minivan: 0.94,
          volkswagen_crafter: 0.95,
          '2003-gmc-topkick-c6500': 0.92,
          heavy_commercial_vehicle_hcv: 0.9,
        };

        const scale =
          (spec.len / lengthGuess) * (MODEL_SCALE[name] ?? 1);

        // ---- Strip procedural placeholder ----
        for (const child of [...g.children]) {
          if (!child.userData.keep) g.remove(child);
        }

        // ---- Clone + orient ----
        const model = sourceScene.clone(true);
        model.scale.setScalar(scale);

        const MODEL_ROTATION = {
          keke_bajaj_re: Math.PI / 2,
          danfo_vanagon: Math.PI,
          suzuki_carry_minivan: Math.PI,
          'suzuki_gsx-r750': Math.PI,
          volkswagen_crafter: Math.PI,
          '2003-gmc-topkick-c6500': Math.PI,
          heavy_commercial_vehicle_hcv: Math.PI,
          '2008_kawasaki_ninja_zx-10r-em': Math.PI,
          'suzuki_hayabusa_gsx-1300r-k8': Math.PI,
          'lightbody_90_md_pickup_-_low_poly_model': Math.PI,
          'volkswagen_id._buzz': Math.PI,
        };

        model.rotation.y = MODEL_ROTATION[name] ?? Math.PI;

        // ---- Materials / wheels ----
        const isKeke = name === 'keke_bajaj_re';
        const wheels = [];

        model.traverse(object => {
          if (!object.isMesh) return;

          object.material = cloneMaterial(object.material);

          if (isKeke) {
            if (Array.isArray(object.material)) {
              object.material.forEach(applyKekeMaterial);
            } else {
              applyKekeMaterial(object.material);
            }
          }

          const objectName = String(object.name || '').toLowerCase();
          const matNames = Array.isArray(object.material)
            ? object.material.map(materialName).join(' ')
            : materialName(object.material);

          if (/wheel|tyre|tire|rim|whl/.test(`${objectName} ${matNames}`)) {
            wheels.push(object);
          }

          object.castShadow = true;
          object.receiveShadow = true;
        });

        // ---- Attach ----
        g.add(model);
        g.userData.model = model;
        g.userData.realModel = true;
        g.userData.modelName = name;
        g.userData.modelPath = modelData.path;
        g.userData.wheels = wheels;
        g.userData.wheelR = Math.max(0.22, 0.3 * scale);

        // ---- Ground snap (after scale + rotation) ----
        {
          const grounded = new THREE.Box3().setFromObject(model);
          if (Number.isFinite(grounded.min.y)) {
            model.position.y -= grounded.min.y;
          }
        }

        // ---- Danfo stripe (live bbox only) ----
        if (type === 'danfo') {
          addDanfoStripe(g, model);
        }

        // ---- Body paint (BRT blue, etc.) — not keke/danfo ----
        if (color != null && type !== 'keke' && type !== 'danfo') {
          const bodyHex =
            typeof color === 'number' ? color : 0x1c4fa0;
          applyBodyColor(model, bodyHex);
        }

        // ---- Headlights ----
        const finalBox = new THREE.Box3().setFromObject(model);
        const finalSize = new THREE.Vector3();
        finalBox.getSize(finalSize);
        const finalMin = finalBox.min;

        for (const sx of [-0.3, 0.3]) {
          const light = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.16, 0.06),
            new THREE.MeshStandardMaterial({
              color: 0xffe7ad,
              emissive: 0xffe7ad,
              emissiveIntensity: 0.15,
            })
          );
          light.position.set(
            sx * Math.min(finalSize.x * 0.4, 0.8),
            finalMin.y + finalSize.y * 0.42,
            -spec.len / 2 - 0.02
          );
          light.userData.keep = true;
          g.add(light);
          lamps.push(light.material);
        }

        // ---- Emergency lightbar ----
        if (lightbar) {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.18, 0.4),
            new THREE.MeshStandardMaterial({
              color: lightbar,
              emissive: lightbar,
              emissiveIntensity: 0.4,
            })
          );
          bar.position.set(
            0,
            finalMin.y + finalSize.y + 0.08,
            0
          );
          bar.userData.keep = true;
          g.add(bar);
          g.userData.lightbar = bar.material;
        }

        // ---- Optional texture repaint API ----
        g.userData.repaint = nextColor => {
          const texture = paintTexture(name, modelData, nextColor);
          if (!texture) return;
          model.traverse(object => {
            if (!object.isMesh || !object.userData.paintable) return;
            if (Array.isArray(object.material)) {
              for (const material of object.material) {
                material.map = texture;
                material.needsUpdate = true;
              }
            } else if (object.material) {
              object.material.map = texture;
              object.material.needsUpdate = true;
            }
          });
        };

        console.info(
          `[vehicles] ✓ ${type} using GLB ${name} (${modelData.path})`
        );
      } catch (err) {
        // Calibration failed — do not kill traffic. Procedural may already
        // have been stripped; next spawn retries. Log clearly.
        console.warn(
          `[vehicles] Calibration failed for ${type}/${name} (non-fatal):`,
          err?.message || err
        );
      }
    })
    .catch(error => {
      // GLB missing / network — keep procedural mesh already on `g`
      console.warn(
        `[vehicles] Keeping procedural ${type}; GLB ${name} failed:`,
        error?.message || error
      );
    });
}

// ============================================================
// Wheel animation
// ============================================================

export function spinWheels(g, speed, dt) {
  const wheels = g.userData.wheels;
  if (!wheels?.length) return;

  const radius = g.userData.wheelR || 0.4;
  const rotation = (speed * dt) / radius;

  for (const wheel of wheels) {
    wheel.rotation.x -= rotation;
  }
}



/** Clamp PBR so bodies stay visible with weak/no environment map. */
function makeReadable(material) {
  if (!material) return;
  if (material.metalness != null) {
    material.metalness = Math.min(material.metalness ?? 0.2, 0.25);
  }
  if (material.roughness != null) {
    material.roughness = Math.max(material.roughness ?? 0.5, 0.45);
  }
  // Unlit / too-dark maps still multiply with color
  if (material.color && material.color.getHex() < 0x222222) {
    // leave pure black rubber alone if caller set it
  }
  material.needsUpdate = true;
}

function applyKekeMaterial(material) {
  if (!material) return;
  const name = materialName(material);

  // Do NOT match bare "black" — too many generic mat names hit this
  if (/wheel|tyre|tire|rubber|tread|rim/.test(name)) {
    material.color.set(0x1a1a1a);
    material.roughness = 0.85;
    material.metalness = 0.05;
    material.needsUpdate = true;
    return;
  }
  if (/glass|window|windshield|windscreen/.test(name)) {
    material.color.set(0x243437);
    material.roughness = 0.25;
    material.metalness = 0.1;
    material.needsUpdate = true;
    return;
  }
  if (/light|lamp|head|indicator|brake/.test(name)) return;

  material.color.set(0xf5c518);
  material.roughness = 0.55;
  material.metalness = 0.08;
  material.needsUpdate = true;
}

function applyBodyColor(model, bodyHex) {
  model.traverse(object => {
    if (!object.isMesh) return;
    const mats = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const m of mats) {
      if (!m?.color) continue;
      const n = `${object.name || ''} ${m.name || ''}`.toLowerCase();
      if (isSkipPaintName(n)) {
        makeReadable(m);
        continue;
      }
      m.color.setHex(bodyHex);
      makeReadable(m);
    }
  });
}

/** Okada / generic bike: force yellow-orange commercial look. */
function applyOkadaMaterial(material) {
  if (!material) return;
  const name = materialName(material);
  if (/wheel|tyre|tire|rubber|tread|rim|chain|exhaust/.test(name)) {
    material.color.set(0x1a1a1a);
    material.roughness = 0.85;
    material.metalness = 0.1;
    material.needsUpdate = true;
    return;
  }
  if (/glass|visor|wind/.test(name)) return;
  material.color.set(0xf5c518);
  material.roughness = 0.5;
  material.metalness = 0.12;
  material.needsUpdate = true;
}