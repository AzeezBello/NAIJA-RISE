import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VEH, MODELS, MODEL_BASE } from '../data/vehicles.js';
import { lamps } from '../world/builders.js';

// Real vehicle models (Kenney Car Kit, CC0, assets/vehicles/kenney). Each model is loaded once; its paint is found as the
// body's dominant palette texel (by triangle area) and every texel of the same hue is repainted per colour on a cloned
// palette, so danfos are yellow, LAWMA trucks orange, army trucks olive and traffic cars take their livery while glass,
// lights and chrome keep their colours. Models face +z and are turned to the game's -z forward; wheels spin.
const loader = new GLTFLoader();
const models = {}, paints = {};

const hsl = (r, g, b) => { const c = new THREE.Color(r / 255, g / 255, b / 255), o = {}; c.getHSL(o); return o; };
export function loadVehicleModel(name) {
  return models[name] || (models[name] = loader.loadAsync(MODEL_BASE + name + '.glb').then(gltf => {
    const scene = gltf.scene, body = scene.getObjectByName('body') || scene.children[0];
    const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3());
    const tex = body.material.map, img = tex.image, W = img.width, H = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, W, H);
    // dominant texel of the body by area → the paint hue
    const geo = body.geometry, uv = geo.attributes.uv, pos = geo.attributes.position, idx = geo.index, hist = {};
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      A.fromBufferAttribute(pos, a); B.fromBufferAttribute(pos, b); C.fromBufferAttribute(pos, c);
      const area = B.sub(A).cross(C.sub(A)).length(), u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
      const k = Math.floor(u * W) + ',' + Math.floor((tex.flipY ? 1 - v : v) * H); hist[k] = (hist[k] || 0) + area;
    }
    const [dx, dy] = Object.entries(hist).sort((p, q) => q[1] - p[1])[0][0].split(',').map(Number);
    const px = (x, y) => { const o = (y * W + x) * 4; return [data.data[o], data.data[o + 1], data.data[o + 2]]; };
    const dom = hsl(...px(dx, dy));
    // every texel the body uses whose hue sits with the paint (and is not grey glass / chrome) gets repainted
    const paintTexels = Object.keys(hist).map(k => k.split(',').map(Number)).filter(([x, y]) => { const h = hsl(...px(x, y)); return h.s > 0.18 && Math.min(Math.abs(h.h - dom.h), 1 - Math.abs(h.h - dom.h)) < 0.07; }).map(([x, y]) => ({ x, y, l: hsl(...px(x, y)).l / Math.max(0.05, dom.l) }));
    scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { scene, size, tex, data, W, H, paintTexels, flipY: tex.flipY, colorSpace: tex.colorSpace };
  }));
}

// A palette clone with the paint texels set to `color`, shaded like the original.
function paintTexture(name, m, color) {
  const key = name + ':' + color;
  if (paints[key]) return paints[key];
  const cv = document.createElement('canvas'); cv.width = m.W; cv.height = m.H; const cx = cv.getContext('2d');
  const d = new ImageData(new Uint8ClampedArray(m.data.data), m.W, m.H), c = new THREE.Color(color), base = {}; c.getHSL(base);
  for (const t of m.paintTexels) { const cc = new THREE.Color().setHSL(base.h, base.s, THREE.MathUtils.clamp(base.l * t.l, 0.03, 0.97)); const o = (t.y * m.W + t.x) * 4; d.data[o] = cc.r * 255; d.data[o + 1] = cc.g * 255; d.data[o + 2] = cc.b * 255; }
  cx.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.flipY = m.flipY; tex.colorSpace = m.colorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return paints[key] = tex;
}

// Swaps the primitive parts of `g` for the model when it arrives. `color` is the paint (null keeps the model's own).
export function attachModel(g, type, name, color, { lightbar = null } = {}) {
  loadVehicleModel(name).then(m => {
    const spec = VEH[type], s = spec.len / m.size.z;
    for (const c of [...g.children]) if (!c.userData.keep) g.remove(c);
    const model = m.scene.clone();
    model.rotation.y = Math.PI; model.scale.setScalar(s);
    const wheels = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      if (color !== null && color !== undefined) o.material.map = paintTexture(name, m, color);
      o.material.metalness = 0.15; o.material.roughness = 0.55;
      if (/wheel/i.test(o.name)) wheels.push(o);
    });
    g.add(model); g.userData.model = model; g.userData.wheels = wheels; g.userData.wheelR = 0.3 * s;
    g.userData.repaint = c => model.traverse(o => { if (o.isMesh) o.material.map = paintTexture(name, m, c); });
    // headlights for the night + the roof light bar on emergency vehicles
    const w = m.size.x * s, h = m.size.y * s;
    for (const sx of [-0.3, 0.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), new THREE.MeshStandardMaterial({ color: 0xffe7ad })); l.position.set(sx * w, h * 0.42, -spec.len / 2 - 0.02); l.userData.keep = true; g.add(l); lamps.push(l.material); }
    if (lightbar) { const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: lightbar, emissive: lightbar, emissiveIntensity: 0.4 })); bar.position.set(0, h + 0.08, 0); bar.userData.keep = true; g.add(bar); g.userData.lightbar = bar.material; }
  }).catch(e => console.warn(`[vehicles] ${name}: ${e.message}`));
}

// Rolls the wheels of a model vehicle by the distance it travelled this frame.
export function spinWheels(g, speed, dt) {
  const ws = g.userData.wheels; if (!ws) return;
  const a = speed * dt / (g.userData.wheelR || 0.4);
  for (const w of ws) w.rotation.x -= a;
}
