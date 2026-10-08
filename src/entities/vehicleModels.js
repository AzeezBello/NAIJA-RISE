import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VEH, MODEL_BASE } from '../data/vehicles.js';
import { lamps } from '../world/builders.js';

// -----------------------------------------------------------------------------
// Vehicle asset paths
// -----------------------------------------------------------------------------
//
// The loader supports BOTH:
//
//   1. New public vehicle assets:
//      web/public/vehicles/<model>.glb
//      Runtime URL: /vehicles/<model>.glb
//
//   2. Existing Kenney assets:
//      web/public/assets/vehicles/kenney/<model>.glb
//      Runtime URL: /assets/vehicles/kenney/<model>.glb
//
// It also keeps support for the existing custom Danfo/Keke folders:
//
//   /assets/vehicles/danfo/...
//   /assets/vehicles/keke/...
//
// IMPORTANT:
// Models should face +Z in the GLB.
// The game uses -Z as vehicle forward, so attachModel() rotates
// the model by PI unless a model has a custom rotation.
// -----------------------------------------------------------------------------

const CUSTOM_ASSETS = {
  danfo: [
    // New public/vehicles location
    '/vehicles/danfo_vanagon.glb',

    // Existing custom location
    'assets/vehicles/danfo/danfo_vanagon.glb',
    'assets/vehicles/danfo/danfo.glb',
    'assets/vehicles/danfo/lagos_danfo.glb',
    'assets/vehicles/danfo/danfo-bus.glb',
  ],

  keke: [
    // New public/vehicles location
    '/vehicles/keke_bajaj_re.glb',

    // Existing custom location
    'assets/vehicles/keke/keke_bajaj_re.glb',
    'assets/vehicles/keke/keke.glb',
    'assets/vehicles/keke/keke_napep.glb',
  ],
};

const loader = new GLTFLoader();

const models = {};
const paints = {};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const hsl = (r, g, b) => {
  const c = new THREE.Color(
    r / 255,
    g / 255,
    b / 255
  );

  const o = {};
  c.getHSL(o);

  return o;
};

// -----------------------------------------------------------------------------
// Asset path resolver
// -----------------------------------------------------------------------------

const assetPathsFor = name => {
  if (name === 'danfo_vanagon') {
    return CUSTOM_ASSETS.danfo;
  }

  if (name === 'keke_bajaj_re') {
    return CUSTOM_ASSETS.keke;
  }

  // New public/vehicles path FIRST.
  //
  // Example:
  //   web/public/vehicles/suzuki_carry_minivan.glb
  // becomes:
  //   /vehicles/suzuki_carry_minivan.glb
  //
  // Existing Kenney path remains as the fallback.
  return [
    `/vehicles/${name}.glb`,
    `${MODEL_BASE}${name}.glb`,
  ];
};

// -----------------------------------------------------------------------------
// Load vehicle GLB
// -----------------------------------------------------------------------------

export function loadVehicleModel(name) {
  if (models[name]) {
    return models[name];
  }

  const paths = assetPathsFor(name);

  const loadFirstAvailable = async () => {
    let lastError = null;

    for (const path of paths) {
      try {
        const gltf = await loader.loadAsync(path);

        console.info(
          `[vehicles] Loaded ${name} from ${path}`
        );

        return {
          gltf,
          path,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ||
      new Error(`No asset found for ${name}`);
  };

  models[name] = loadFirstAvailable()
    .then(({ gltf, path }) => {
      // -----------------------------------------------------------------------
      // IMPORTANT:
      // The loaded GLTF scene is the actual model root.
      // -----------------------------------------------------------------------

      const scene = gltf.scene;

      // Try to find a sensible body mesh.
      // Custom GLBs may not have a mesh literally named "body".
      let body = scene.getObjectByName('body');

      if (!body || !body.isMesh) {
        scene.traverse(object => {
          if (
            !body &&
            object.isMesh &&
            object.geometry
          ) {
            body = object;
          }
        });
      }

      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());

      // -----------------------------------------------------------------------
      // Find paint texture information.
      //
      // Custom Danfo/Keke models do not need recolouring because they already
      // have their correct Lagos livery. Therefore texture analysis is optional.
      // -----------------------------------------------------------------------

      let tex = null;
      let data = null;
      let W = 0;
      let H = 0;
      let paintTexels = [];

      if (
        body &&
        body.material &&
        !Array.isArray(body.material) &&
        body.material.map &&
        body.material.map.image
      ) {
        tex = body.material.map;

        const img = tex.image;

        W = img.width;
        H = img.height;

        if (W > 0 && H > 0) {
          const cv = document.createElement('canvas');

          cv.width = W;
          cv.height = H;

          const cx = cv.getContext('2d');

          if (cx) {
            cx.drawImage(img, 0, 0);

            try {
              data = cx.getImageData(
                0,
                0,
                W,
                H
              );

              const geo = body.geometry;
              const uv = geo.attributes?.uv;
              const position = geo.attributes?.position;
              const index = geo.index;

              if (uv && position) {
                const hist = {};

                const A = new THREE.Vector3();
                const B = new THREE.Vector3();
                const C = new THREE.Vector3();

                const count = index
                  ? index.count
                  : position.count;

                for (let i = 0; i < count; i += 3) {
                  const a = index
                    ? index.getX(i)
                    : i;

                  const b = index
                    ? index.getX(i + 1)
                    : i + 1;

                  const c = index
                    ? index.getX(i + 2)
                    : i + 2;

                  if (
                    a >= position.count ||
                    b >= position.count ||
                    c >= position.count
                  ) {
                    continue;
                  }

                  A.fromBufferAttribute(position, a);
                  B.fromBufferAttribute(position, b);
                  C.fromBufferAttribute(position, c);

                  const area = B
                    .clone()
                    .sub(A)
                    .cross(
                      C.clone().sub(A)
                    )
                    .length();

                  const u =
                    (
                      uv.getX(a) +
                      uv.getX(b) +
                      uv.getX(c)
                    ) / 3;

                  const v =
                    (
                      uv.getY(a) +
                      uv.getY(b) +
                      uv.getY(c)
                    ) / 3;

                  const x = THREE.MathUtils.clamp(
                    Math.floor(u * W),
                    0,
                    W - 1
                  );

                  const y = THREE.MathUtils.clamp(
                    Math.floor(
                      (tex.flipY ? 1 - v : v) * H
                    ),
                    0,
                    H - 1
                  );

                  const key = `${x},${y}`;

                  hist[key] =
                    (hist[key] || 0) + area;
                }

                const dominant = Object.entries(
                  hist
                ).sort(
                  (a, b) => b[1] - a[1]
                )[0];

                if (dominant) {
                  const [dx, dy] =
                    dominant[0]
                      .split(',')
                      .map(Number);

                  const offset =
                    (dy * W + dx) * 4;

                  const dom = hsl(
                    data.data[offset],
                    data.data[offset + 1],
                    data.data[offset + 2]
                  );

                  paintTexels = Object.keys(hist)
                    .map(key =>
                      key.split(',').map(Number)
                    )
                    .filter(([x, y]) => {
                      const offset =
                        (y * W + x) * 4;

                      const h = hsl(
                        data.data[offset],
                        data.data[offset + 1],
                        data.data[offset + 2]
                      );

                      const hueDistance = Math.min(
                        Math.abs(h.h - dom.h),
                        1 -
                          Math.abs(h.h - dom.h)
                      );

                      return (
                        h.s > 0.18 &&
                        hueDistance < 0.07
                      );
                    })
                    .map(([x, y]) => {
                      const offset =
                        (y * W + x) * 4;

                      const h = hsl(
                        data.data[offset],
                        data.data[offset + 1],
                        data.data[offset + 2]
                      );

                      return {
                        x,
                        y,
                        l:
                          h.l /
                          Math.max(
                            0.05,
                            dom.l
                          ),
                      };
                    });
                }
              }
            } catch (error) {
              console.warn(
                `[vehicles] Failed texture analysis for ${name}`,
                error.message
              );
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // Shadows
      // -----------------------------------------------------------------------

      scene.traverse(object => {
        if (!object.isMesh) return;

        object.castShadow = true;
        object.receiveShadow = true;
      });

      return {
        scene,
        size,
        tex,
        data,
        W,
        H,
        paintTexels,
        flipY: tex?.flipY ?? true,
        colorSpace: tex?.colorSpace,
        path,
      };
    })
    .catch(error => {
      delete models[name];

      console.warn(
        `[vehicles] Failed to load ${name}. Tried: ${paths.join(', ')}`,
        error.message
      );

      throw error;
    });

  return models[name];
}

// -----------------------------------------------------------------------------
// Paint texture
// -----------------------------------------------------------------------------

function paintTexture(name, model, color) {
  if (
    !model.data ||
    !model.W ||
    !model.H ||
    !model.paintTexels?.length
  ) {
    return null;
  }

  const key = `${name}:${color}`;

  if (paints[key]) {
    return paints[key];
  }

  const canvas =
    document.createElement('canvas');

  canvas.width = model.W;
  canvas.height = model.H;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const image = new ImageData(
    new Uint8ClampedArray(
      model.data.data
    ),
    model.W,
    model.H
  );

  const target = new THREE.Color(color);
  const base = {};

  target.getHSL(base);

  for (const texel of model.paintTexels) {
    const shade =
      new THREE.Color().setHSL(
        base.h,
        base.s,
        THREE.MathUtils.clamp(
          base.l * texel.l,
          0.03,
          0.97
        )
      );

    const offset =
      (texel.y * model.W + texel.x) * 4;

    image.data[offset] =
      shade.r * 255;

    image.data[offset + 1] =
      shade.g * 255;

    image.data[offset + 2] =
      shade.b * 255;
  }

  ctx.putImageData(image, 0, 0);

  const texture =
    new THREE.CanvasTexture(canvas);

  texture.flipY = model.flipY;

  if (model.colorSpace) {
    texture.colorSpace =
      model.colorSpace;
  }

  texture.magFilter =
    THREE.NearestFilter;

  texture.minFilter =
    THREE.LinearMipmapLinearFilter;

  paints[key] = texture;

  return texture;
}

// -----------------------------------------------------------------------------
// Attach real model
// -----------------------------------------------------------------------------

export function attachModel(
  g,
  type,
  name,
  color,
  { lightbar = null } = {}
) {
  loadVehicleModel(name)
    .then(modelData => {
      const spec = VEH[type];

      if (!spec) {
        console.warn(
          `[vehicles] Unknown vehicle type: ${type}`
        );

        return;
      }

      if (!modelData.size.z) {
        console.warn(
          `[vehicles] Invalid model depth for ${name}`
        );

        return;
      }

      // -----------------------------------------------------------------------
      // Scale the GLB to the runtime vehicle length.
      // -----------------------------------------------------------------------

      const scale =
        spec.len / modelData.size.z;

      // Remove procedural placeholder geometry.
      for (const child of [...g.children]) {
        if (!child.userData.keep) {
          g.remove(child);
        }
      }

      const model =
        modelData.scene.clone(true);

      // -----------------------------------------------------------------------
      // Model orientation
      //
      // Default:
      //   +Z GLB forward -> -Z game forward
      //
      // Keke:
      //   supplied GLB is oriented sideways, so rotate it 90 degrees.
      // -----------------------------------------------------------------------

      const MODEL_ROTATION = {
        keke_bajaj_re: Math.PI / 2,

        // Danfo GLB uses the normal +Z orientation.
        danfo_vanagon: Math.PI,

        // Newly added models.
        'suzuki_carry_minivan': Math.PI,
        'suzuki_gsx-r750': Math.PI,
        'volkswagen_crafter': Math.PI,
        '2003-gmc-topkick-c6500': Math.PI,
        'heavy_commercial_vehicle_hcv': Math.PI,

        // Future motorcycle variants.
        '2008_kawasaki_ninja_zx-10r-em': Math.PI,
        'suzuki_hayabusa_gsx-1300r-k8': Math.PI,

        // Future pickup.
        'lightbody_90_md_pickup_-_low_poly_model': Math.PI,

        // Future van.
        'volkswagen_id._buzz': Math.PI,
      };

      model.rotation.y =
        MODEL_ROTATION[name] ?? Math.PI;

      model.scale.setScalar(scale);

      const wheels = [];

      // -----------------------------------------------------------------------
      // Paint setup
      // -----------------------------------------------------------------------

      const shouldPaint =
        color !== null &&
        color !== undefined;

      let paintMap = null;

      if (shouldPaint) {
        paintMap = paintTexture(
          name,
          modelData,
          color
        );
      }

      model.traverse(object => {
        if (!object.isMesh) {
          return;
        }

        if (Array.isArray(object.material)) {
          object.material =
            object.material.map(material =>
              material.clone()
            );
        } else if (object.material) {
          object.material =
            object.material.clone();
        }

        // Do NOT overwrite glass/chrome/light materials.
        //
        // Only use the paint map when the source model explicitly marks
        // the mesh as paintable.
        if (
          paintMap &&
          modelData.paintTexels?.length &&
          object.userData.paintable
        ) {
          if (
            Array.isArray(object.material)
          ) {
            for (const material of object.material) {
              material.map = paintMap;
            }
          } else if (object.material) {
            object.material.map =
              paintMap;
          }
        }

        if (
          /wheel/i.test(object.name)
        ) {
          wheels.push(object);
        }

        object.castShadow = true;
        object.receiveShadow = true;
      });

      // -----------------------------------------------------------------------
      // Wheel setup
      // -----------------------------------------------------------------------

      g.userData.wheels = wheels;

      g.userData.wheelR =
        Math.max(
          0.22,
          0.3 * scale
        );

      // -----------------------------------------------------------------------
      // Model reference
      // -----------------------------------------------------------------------

      g.add(model);

      g.userData.model = model;

      // -----------------------------------------------------------------------
      // Repaint API
      // -----------------------------------------------------------------------

      g.userData.repaint = nextColor => {
        const texture =
          paintTexture(
            name,
            modelData,
            nextColor
          );

        if (!texture) {
          return;
        }

        model.traverse(object => {
          if (
            !object.isMesh ||
            !object.userData.paintable
          ) {
            return;
          }

          if (
            Array.isArray(object.material)
          ) {
            for (const material of object.material) {
              material.map = texture;
              material.needsUpdate = true;
            }
          } else if (object.material) {
            object.material.map =
              texture;

            object.material.needsUpdate =
              true;
          }
        });
      };

      // -----------------------------------------------------------------------
      // Dimensions
      // -----------------------------------------------------------------------

      const width =
        modelData.size.x * scale;

      const height =
        modelData.size.y * scale;

      // -----------------------------------------------------------------------
      // Headlights
      // -----------------------------------------------------------------------

      for (const sx of [-0.3, 0.3]) {
        const light =
          new THREE.Mesh(
            new THREE.BoxGeometry(
              0.34,
              0.16,
              0.06
            ),
            new THREE.MeshStandardMaterial({
              color: 0xffe7ad,
              emissive: 0xffe7ad,
              emissiveIntensity: 0.15,
            })
          );

        light.position.set(
          sx * width,
          height * 0.42,
          -spec.len / 2 - 0.02
        );

        light.userData.keep = true;

        g.add(light);

        lamps.push(light.material);
      }

      // -----------------------------------------------------------------------
      // Emergency lightbar
      // -----------------------------------------------------------------------

      if (lightbar) {
        const bar =
          new THREE.Mesh(
            new THREE.BoxGeometry(
              1.1,
              0.18,
              0.4
            ),
            new THREE.MeshStandardMaterial({
              color: lightbar,
              emissive: lightbar,
              emissiveIntensity: 0.4,
            })
          );

        bar.position.set(
          0,
          height + 0.08,
          0
        );

        bar.userData.keep = true;

        g.add(bar);

        g.userData.lightbar =
          bar.material;
      }

      // -----------------------------------------------------------------------
      // Flag successful custom model load.
      // -----------------------------------------------------------------------

      g.userData.realModel = true;
      g.userData.modelName = name;
      g.userData.modelPath = modelData.path;

      console.info(
        `[vehicles] Loaded ${name} for ${type} from ${modelData.path}`
      );
    })
    .catch(error => {
      // Procedural vehicle remains in place.
      // This means a missing GLB will NOT break traffic.
      console.warn(
        `[vehicles] Keeping procedural ${type}; ${name} failed to load.`,
        error.message
      );
    });
}

// -----------------------------------------------------------------------------
// Wheel animation
// -----------------------------------------------------------------------------

export function spinWheels(
  g,
  speed,
  dt
) {
  const wheels =
    g.userData.wheels;

  if (!wheels?.length) {
    return;
  }

  const radius =
    g.userData.wheelR || 0.4;

  const rotation =
    (speed * dt) / radius;

  for (const wheel of wheels) {
    wheel.rotation.x -= rotation;
  }
}

