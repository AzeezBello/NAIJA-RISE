import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { G } from '../core/context.js';
import { CHARACTER } from '../data/config.js';
import { LOOK, FABRIC_OUTFITS } from '../data/characters.js';
import { mat } from '../world/builders.js';
import { fabricTexture, fabricMaterial, fabricOf } from './wardrobe.js';
import { current } from '../core/quality.js';

// NAIJA RISE Character Pipeline v1.
// One rigged GLB (Mixamo-compatible skeleton, Idle/Walk/Run clips) is loaded once and cloned per character.
// A character starts as a primitive placeholder so the game runs immediately and offline; when the base rig
// arrives the visuals swap in place. Customisation (G.state.look) tints materials by slot and attaches accessories
// to the head bone. The player and NPCs share this module; swapping the asset means changing CHARACTER in config.

const bases = [], loading = [], failed = [];
const instances = new Set();

// Loads rig `i` once (first reachable URL wins) and swaps it into every instance waiting for it.
const gltfCache = {};
const loadGltf = (loader, url) => gltfCache[url] || (gltfCache[url] = loader.loadAsync(url));
// Loads rig `i` once (first reachable URL wins) plus its external animation clips, then swaps it into every waiting instance.
export function loadRig(i = 0) {
  if (loading[i]) return loading[i];
  const rig = CHARACTER.rigs[i];
  loading[i] = (async () => {
    const loader = new GLTFLoader();
    for (const url of rig.urls) {
      try {
        const gltf = await loadGltf(loader, url);
        const clips = [...gltf.animations];
        if (rig.anims && !clipFor(clips, rig.clips.idle)) {   // a shipped rig with its own clips skips the external ones
          const extra = await Promise.all(rig.anims.map(a => loadGltf(loader, a.url)));
          rig.anims.forEach((a, k) => {
            const src = a.clip ? extra[k].animations.find(c => c.name === a.clip) : extra[k].animations[0]; if (!src) return;
            const clip = src.clone(); clip.name = a.key;
            if (rig.stripPosition) clip.tracks = clip.tracks.filter(t => !t.name.endsWith('.position'));
            if (rig.trackPrefix) for (const t of clip.tracks) t.name = rig.trackPrefix + t.name;
            clips.push(clip);
          });
        }
        const box = new THREE.Box3().setFromObject(gltf.scene), h = box.max.y - box.min.y;
        gltf.scene.traverse(o => { if (o.isMesh) o.castShadow = true; });
        bases[i] = { rig, scene: gltf.scene, clips, scale: CHARACTER.height / h, url };
        console.info(`[character] rig ${rig.id} loaded: ${url} (${clips.map(c => c.name).join(', ')})`);
        for (const inst of instances) if (inst.rigIdx === i) { try { inst._swap(); } catch (e) { console.warn(`[character] swap failed: ${e.message}`); } }
        return bases[i];
      } catch (e) { console.warn(`[character] could not load ${url}: ${e.message}`); }
    }
    failed[i] = true; return null;
  })();
  return loading[i];
}
// Called from the title screen so the player's rig is ready before the city shows; street rigs follow.
export function preloadCharacters(lowEnd = false) {
  CHARACTER.rigs.forEach((r, i) => { if (i === 0 || (r.street && (!lowEnd || r.lowEnd !== false))) loadRig(i); });
}
export const loadCharacterBase = () => loadRig(0);
export const characterRigReady = (i = 0) => !!bases[i];
// Street rigs available on this device (for pedestrians to pick from).
export const streetRigs = lowEnd => CHARACTER.rigs.map((r, i) => i).filter(i => i === 0 || (CHARACTER.rigs[i].street && (!lowEnd || CHARACTER.rigs[i].lowEnd !== false)));
// Weighted pick among the street rigs.
export function pickStreetRig(lowEnd) { const ids = streetRigs(lowEnd); let r = Math.random() * ids.reduce((a, i) => a + (CHARACTER.rigs[i].weight || 1), 0); for (const i of ids) { r -= CHARACTER.rigs[i].weight || 1; if (r <= 0) return i; } return ids[0]; }

const clipFor = (clips, names) => { for (const n of names) { const c = clips.find(c => c.name.toLowerCase() === n.toLowerCase()); if (c) return c; } return null; };
const slotColor = (look, slot) => {
  const L = LOOK, v = look[slot] ?? 0, out = L.outfit[look.outfit ?? 0];
  return slot === 'skin' ? L.skin[v] : slot === 'hairColor' ? L.hairColor[v] : slot === 'bottom' ? (out === 'Senator' ? fabricOf(look).base : out === 'Super Eagles' ? '#f0f0f0' : L.pants[look.pants ?? 0]) : L.shoes[v];
};

// build(look, tint): returns the primitive THREE.Object3D shown until the rig loads (or forever on low-end devices);
// it is rebuilt on every look change so outfit, hair and accessories update without the rig.
export function createCharacter({ look = G.state?.look || {}, build, placeholder, scale = 1, useRig = true, tint = null, rig = 0 } = {}) {
  const group = new THREE.Group();
  const inst = { group, look: { ...look }, tint, scale, rigIdx: rig, mixer: null, actions: {}, current: null, model: null, rig: false, _placeholder: null, _build: build, accessories: [] };
  inst._rebuild = () => { if (inst._placeholder) group.remove(inst._placeholder); inst._placeholder = build ? build(inst.look, tint) : placeholder || null; if (inst._placeholder) group.add(inst._placeholder); };
  inst._rebuild();
  inst.setLook = l => { Object.assign(inst.look, l); if (inst.rig) applyLookTo(inst); else inst._rebuild(); };
  inst.setState = (state, speed = 0) => {
    if (!inst.rig) return;
    const want = state === 'run' ? 'run' : (state === 'walk' || state === 'turn' || (state === 'stop' && speed > 1.5)) ? 'walk' : 'idle';
    const a = inst.actions[want]; if (!a) return;
    if (inst.current !== a) { a.reset().setEffectiveWeight(1).play(); if (inst.current) inst.current.crossFadeTo(a, CHARACTER.blend, false); inst.current = a; }
    if (inst.base.rig.idleFreeze && want === 'idle') { a.setEffectiveTimeScale(0); return; }
    if (want === 'walk') a.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 4.6, 0.6, 1.6)); else if (want === 'run') a.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 8.5, 0.7, 1.4));
  };
  inst.update = dt => { if (inst.mixer) inst.mixer.update(dt); };
  inst.dispose = () => { instances.delete(inst); };
  inst._swap = () => {
    const base = bases[inst.rigIdx];
    if (!base || inst.rig || !useRig) return;
    inst.base = base;
    const model = SkeletonUtils.clone(base.scene);
    model.rotation.y = base.rig.facing; model.scale.setScalar(base.scale * scale);
    inst.meshes = []; model.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; inst.meshes.push(o); } });
    if (inst._placeholder) { group.remove(inst._placeholder); inst._placeholder = null; }
    group.add(model); inst.model = model; inst.rig = true;
    inst.mixer = new THREE.AnimationMixer(model);
    for (const [key, names] of Object.entries(base.rig.clips)) { const c = clipFor(base.clips, names); if (c) inst.actions[key] = inst.mixer.clipAction(c); }
    inst.current = null; inst.setState('idle', 0);
    applyLookTo(inst);
  };
  instances.add(inst);
  if (useRig) { if (bases[inst.rigIdx]) inst._swap(); else if (!failed[inst.rigIdx]) loadRig(inst.rigIdx); }
  return inst;
}

// Tint or map materials by slot name (clothing wears the fabric print), scale for body type, and attach fila / cap /
// glasses / chain / facial hair to the head bone. A rig with no clothing material (the Soldier placeholder) wears
// the print on its body material so the outfit still reads.
function applyLookTo(inst) {
  const look = inst.look, m = inst.model, base = inst.base, rig = base.rig;
  if (!m) return;
  const outfit = LOOK.outfit[look.outfit ?? 0], acc = LOOK.accessory[look.accessory ?? 0], fab = fabricOf(look);
  const slotOf = mt => { const name = mt.name || ''; for (const [slot, re] of Object.entries(rig.slots || {})) if (re.test(name)) return slot; return null; };
  m.traverse(o => {
    if (!o.isMesh) return;
    const mt = o.material, slot = slotOf(mt); if (!slot) return;
    if (slot === 'top') {
      if (inst.tint?.top) { if (!rig.tintOnly) mt.map = null; mt.color.set(inst.tint.top); }
      else if (rig.tintOnly || !FABRIC_OUTFITS.has(outfit)) mt.color.set(fab.base);                // garment keeps its texture, tinted
      else { if (!mt.userData.origMap) mt.userData.origMap = mt.map; mt.map = fabricTexture(look.shirt ?? 0); mt.color.set(0xffffff); }   // wears the print
      mt.needsUpdate = true;
    } else if (slot === 'beard') o.visible = LOOK.facialHair[look.facialHair ?? 0] !== 'None', mt.color.set(LOOK.hairColor[look.hairColor ?? 0]);
    else if (slot === 'cap') { o.visible = acc === 'Face cap'; mt.color.set(inst.tint?.cap || LOOK.hairColor[4]); }
    else mt.color.set(inst.tint?.[slot] || slotColor(look, slot));
  });
  const bt = LOOK.bodyType[look.bodyType ?? 1] || 'Average';
  m.scale.set(base.scale * inst.scale * (bt === 'Slim' ? 0.92 : bt === 'Big' ? 1.1 : 1), base.scale * inst.scale, base.scale * inst.scale * (bt === 'Slim' ? 0.94 : bt === 'Big' ? 1.08 : 1));
  for (const a of inst.accessories) a.parent?.remove(a); inst.accessories = [];
  const head = m.getObjectByName(rig.headBone) || null;
  if (!head) return;
  const add = (mesh, y, z = 0) => { mesh.position.set(0, y, z); head.add(mesh); inst.accessories.push(mesh); return mesh; };
  const k = 1 / (base.scale * inst.scale);   // accessories are authored in world units; the head bone is scaled
  if (acc === 'Fila') { const f = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11 * k, 0.13 * k, 0.1 * k, 14), inst.tint?.cap ? mat(inst.tint.cap) : fabricMaterial(look)), 0.17 * k); f.rotation.z = 0.18; }
  if (acc === 'Face cap') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.15 * k, 0.15 * k, 0.06 * k, 12), mat(inst.tint?.cap || LOOK.hairColor[4])), 0.17 * k); add(new THREE.Mesh(new THREE.BoxGeometry(0.19 * k, 0.015 * k, 0.13 * k), mat(inst.tint?.cap || LOOK.hairColor[4])), 0.15 * k, 0.15 * k); }
  if (acc === 'Glasses') add(new THREE.Mesh(new THREE.BoxGeometry(0.2 * k, 0.03 * k, 0.02 * k), mat(0x111111)), 0.06 * k, 0.11 * k);
  if (acc === 'Chain') add(new THREE.Mesh(new THREE.TorusGeometry(0.1 * k, 0.012 * k, 6, 16), mat(0xffc52f, { metalness: 0.9, roughness: 0.2 })), -0.16 * k, 0.04 * k);
  const fh = rig.slots?.beard ? 'None' : LOOK.facialHair[look.facialHair ?? 0];
  if (fh !== 'None') add(new THREE.Mesh(new THREE.BoxGeometry((fh === 'Moustache' ? 0.08 : 0.14) * k, (fh === 'Beard' ? 0.07 : 0.025) * k, 0.03 * k), mat(LOOK.hairColor[look.hairColor ?? 0])), (fh === 'Moustache' ? 0.02 : -0.03) * k, 0.11 * k);
}

// Per-frame: advance mixers for characters near the camera; distant ones hold their pose.
export function updateCharacters(dt) {
  const cam = G.camera?.position; if (!cam) return;
  const q = current(), ar = q.animRange * q.animRange, sr = q.shadowRange * q.shadowRange;
  for (const inst of instances) {
    if (!inst.mixer) continue;
    const p = inst.group.getWorldPosition(_tmp), d2 = p.distanceToSquared(cam);
    if (d2 < ar) inst.mixer.update(dt);
    const near = d2 < sr; if (inst.near !== near) { inst.near = near; for (const m of inst.meshes || []) m.castShadow = near; }
  }
}
const _tmp = new THREE.Vector3();
