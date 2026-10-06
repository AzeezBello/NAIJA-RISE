import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { G } from '../core/context.js';
import { CHARACTER } from '../data/config.js';
import { LOOK } from '../data/characters.js';
import { mat } from '../world/builders.js';

// NAIJA RISE Character Pipeline v1.
// One rigged GLB (Mixamo-compatible skeleton, Idle/Walk/Run clips) is loaded once and cloned per character.
// A character starts as a primitive placeholder so the game runs immediately and offline; when the base rig
// arrives the visuals swap in place. Customisation (G.state.look) tints materials by slot and attaches accessories
// to the head bone. The player and NPCs share this module; swapping the asset means changing CHARACTER in config.

let base = null, loading = null, failed = false;
const instances = new Set();

export function loadCharacterBase() {
  if (loading) return loading;
  loading = (async () => {
    const loader = new GLTFLoader();
    for (const url of CHARACTER.urls) {
      try {
        const gltf = await loader.loadAsync(url);
        const box = new THREE.Box3().setFromObject(gltf.scene), h = box.max.y - box.min.y;
        gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
        base = { scene: gltf.scene, clips: gltf.animations, scale: CHARACTER.height / h, url };
        console.info(`[character] rig loaded: ${url} (${gltf.animations.map(a => a.name).join(', ')})`);
        for (const inst of instances) inst._swap();
        return base;
      } catch (e) { console.warn(`[character] could not load ${url}: ${e.message}`); }
    }
    failed = true; return null;
  })();
  return loading;
}
export const characterRigReady = () => !!base;

const clipFor = (clips, names) => { for (const n of names) { const c = clips.find(c => c.name.toLowerCase() === n.toLowerCase()); if (c) return c; } return null; };
const SLOT_RULES = [
  ['skin', /skin|face|head|body|arm|leg/i], ['hairColor', /hair/i], ['top', /top|shirt|torso|jacket|upper/i], ['bottom', /pant|trouser|bottom|lower|short/i], ['shoes', /shoe|boot|foot/i],
];
const slotColor = (look, slot) => {
  const L = LOOK, v = look[slot] ?? 0;
  return slot === 'skin' ? L.skin[v] : slot === 'hairColor' ? L.hairColor[v] : slot === 'top' ? L.shirt[look.shirt ?? 0] : slot === 'bottom' ? L.pants[look.pants ?? 0] : L.shoes[v];
};

// placeholder: a THREE.Object3D built from primitives (shown until the rig loads, or forever on low-end devices)
export function createCharacter({ look = G.state?.look || {}, placeholder, scale = 1, useRig = true, tint = null } = {}) {
  const group = new THREE.Group();
  const inst = { group, look: { ...look }, tint, scale, mixer: null, actions: {}, current: null, model: null, rig: false, _placeholder: placeholder, accessories: [] };
  if (placeholder) group.add(placeholder);
  inst.setLook = l => { Object.assign(inst.look, l); applyLookTo(inst); };
  inst.setState = (state, speed = 0) => {
    if (!inst.rig) return;
    const want = state === 'run' ? 'run' : (state === 'walk' || state === 'turn' || (state === 'stop' && speed > 1.5)) ? 'walk' : 'idle';
    const a = inst.actions[want]; if (!a) return;
    if (inst.current !== a) { a.reset().setEffectiveWeight(1).play(); if (inst.current) inst.current.crossFadeTo(a, CHARACTER.blend, false); inst.current = a; }
    if (want === 'walk') a.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 4.6, 0.6, 1.6)); else if (want === 'run') a.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 8.5, 0.7, 1.4));
  };
  inst.update = dt => { if (inst.mixer) inst.mixer.update(dt); };
  inst.dispose = () => { instances.delete(inst); };
  inst._swap = () => {
    if (!base || inst.rig || !useRig) return;
    const model = SkeletonUtils.clone(base.scene);
    model.rotation.y = CHARACTER.facing; model.scale.setScalar(base.scale * scale);
    model.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; } });
    if (inst._placeholder) group.remove(inst._placeholder);
    group.add(model); inst.model = model; inst.rig = true;
    inst.mixer = new THREE.AnimationMixer(model);
    for (const [key, names] of Object.entries(CHARACTER.clips)) { const c = clipFor(base.clips, names); if (c) inst.actions[key] = inst.mixer.clipAction(c); }
    inst.current = null; inst.setState('idle', 0);
    applyLookTo(inst);
  };
  instances.add(inst);
  if (useRig) { if (base) inst._swap(); else if (!failed) loadCharacterBase(); }
  return inst;
}

// Tint materials by slot name, scale for body type, attach cap / glasses / chain / facial hair to the head bone.
function applyLookTo(inst) {
  const look = inst.look, m = inst.model;
  if (!m) return;
  m.traverse(o => {
    if (!o.isMesh) return;
    const name = (o.material.name || o.name || '').toLowerCase();
    for (const [slot, re] of SLOT_RULES) { if (re.test(name)) { o.material.color.set(inst.tint?.[slot] || slotColor(look, slot)); break; } }
  });
  const bt = LOOK.bodyType[look.bodyType ?? 1] || 'Average';
  m.scale.set(base.scale * inst.scale * (bt === 'Slim' ? 0.92 : bt === 'Big' ? 1.1 : 1), base.scale * inst.scale, base.scale * inst.scale * (bt === 'Slim' ? 0.94 : bt === 'Big' ? 1.08 : 1));
  for (const a of inst.accessories) a.parent?.remove(a); inst.accessories = [];
  const head = m.getObjectByName(CHARACTER.headBone) || null;
  if (!head) return;
  const add = (mesh, y, z = 0) => { mesh.position.set(0, y, z); head.add(mesh); inst.accessories.push(mesh); };
  const k = 1 / (base.scale * inst.scale);   // accessories are authored in world units; the head bone is scaled
  const acc = LOOK.accessory[look.accessory ?? 0];
  if (acc === 'Cap') add(new THREE.Mesh(new THREE.CylinderGeometry(0.14 * k, 0.14 * k, 0.07 * k, 12), mat(inst.tint?.cap || LOOK.hairColor[4])), 0.16 * k);
  if (acc === 'Glasses') add(new THREE.Mesh(new THREE.BoxGeometry(0.2 * k, 0.03 * k, 0.02 * k), mat(0x111111)), 0.06 * k, 0.11 * k);
  if (acc === 'Chain') add(new THREE.Mesh(new THREE.TorusGeometry(0.1 * k, 0.012 * k, 6, 16), mat(0xffc52f, { metalness: 0.9, roughness: 0.2 })), -0.16 * k, 0.04 * k);
  const fh = LOOK.facialHair[look.facialHair ?? 0];
  if (fh !== 'None') add(new THREE.Mesh(new THREE.BoxGeometry((fh === 'Moustache' ? 0.08 : 0.14) * k, (fh === 'Beard' ? 0.07 : 0.025) * k, 0.03 * k), mat(LOOK.hairColor[look.hairColor ?? 0])), (fh === 'Moustache' ? 0.02 : -0.03) * k, 0.11 * k);
}

// Per-frame: advance mixers for characters near the camera; distant ones hold their pose.
export function updateCharacters(dt) {
  const cam = G.camera?.position; if (!cam) return;
  for (const inst of instances) {
    if (!inst.mixer) continue;
    const p = inst.group.getWorldPosition(_tmp);
    if (p.distanceToSquared(cam) < CHARACTER.animRange * CHARACTER.animRange) inst.mixer.update(dt);
  }
}
const _tmp = new THREE.Vector3();
