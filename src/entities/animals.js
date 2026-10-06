import * as THREE from 'three';
import { G } from '../core/context.js';
import { pick, rnd } from '../core/utils.js';
import { mat } from '../world/builders.js';
import { ANIMALS } from '../data/locations.js';

// Low-poly goats, chickens and dogs that wander near a home point; plus the player's pet dog.
function animal(kind) {
  const g = new THREE.Group(); g.userData.kind = kind;
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  if (kind === 'goat') {
    const c = pick([0xe8e2d6, 0x8a6a4a, 0x3a2e26]);
    add(B(0.5, 0.42, 0.95), mat(c), 0, 0.62, 0); add(B(0.26, 0.3, 0.38), mat(c), 0, 0.92, -0.58);
    add(B(0.06, 0.18, 0.06), mat(0x2b2b2b), 0.08, 1.12, -0.6); add(B(0.06, 0.18, 0.06), mat(0x2b2b2b), -0.08, 1.12, -0.6);
    for (const sx of [-0.17, 0.17]) for (const sz of [-0.32, 0.32]) add(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6), mat(0x4a3a2e), sx, 0.21, sz);
  } else if (kind === 'chicken') {
    const c = pick([0xf2f2f2, 0xb5641e, 0x2b2b2b]);
    add(new THREE.SphereGeometry(0.2, 10, 8), mat(c), 0, 0.3, 0); add(new THREE.SphereGeometry(0.1, 8, 6), mat(c), 0, 0.48, -0.18);
    add(B(0.06, 0.08, 0.04), mat(0xd62828), 0, 0.58, -0.18); add(B(0.05, 0.04, 0.1), mat(0xf5a623), 0, 0.46, -0.28);
    for (const sx of [-0.06, 0.06]) add(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5), mat(0xf5a623), sx, 0.07, 0);
  } else {
    const c = pick([0xb08a5a, 0x6a4a2a, 0xd9d2c2, 0x2b2b2b]);
    add(B(0.36, 0.34, 0.9), mat(c), 0, 0.5, 0); add(B(0.26, 0.26, 0.34), mat(c), 0, 0.68, -0.56);
    add(B(0.06, 0.4, 0.06), mat(c), 0, 0.72, 0.5).rotation.x = -0.6;
    for (const sx of [-0.12, 0.12]) for (const sz of [-0.3, 0.3]) add(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 6), mat(c), sx, 0.18, sz);
  }
  G.scene.add(g);
  return g;
}

export function spawnAnimals() {
  G.animals = ANIMALS.map(a => ({ g: animal(a.kind), kind: a.kind, home: { x: a.x, z: a.z }, v: new THREE.Vector3(), turn: rnd(0, 2), speed: a.kind === 'chicken' ? 0.8 : a.kind === 'dog' ? 2.2 : 1.2 }));
  for (const a of G.animals) a.g.position.set(a.home.x, 0, a.home.z);
  G.pet = null;
}

export function applyPet() {
  if (G.state.pet && !G.pet) { G.pet = animal('dog'); G.pet.position.copy(G.player.position).add(new THREE.Vector3(1.5, 0, 1)); }
  if (!G.state.pet && G.pet) { G.scene.remove(G.pet); G.pet = null; }
}

export function updateAnimals(dt) {
  const t = performance.now() / 1000;
  for (const a of G.animals) {
    a.turn -= dt;
    if (a.turn <= 0) {
      a.turn = rnd(1.5, 4);
      const back = new THREE.Vector3(a.home.x - a.g.position.x, 0, a.home.z - a.g.position.z);
      if (back.length() > 10) a.v.copy(back.normalize().multiplyScalar(a.speed));
      else if (Math.random() < 0.35) a.v.set(0, 0, 0);
      else a.v.set(rnd(-1, 1), 0, rnd(-1, 1)).normalize().multiplyScalar(a.speed);
    }
    if (a.v.lengthSq() > 0) { a.g.position.addScaledVector(a.v, dt); a.g.rotation.y = Math.atan2(-a.v.x, -a.v.z); }
    if (a.kind === 'chicken') a.g.position.y = Math.abs(Math.sin(t * 8 + a.home.x)) * 0.08;
  }
  if (G.pet) {
    const target = G.player.position.clone();
    if (G.inCar) { G.pet.visible = false; G.pet.position.copy(target); return; }
    G.pet.visible = true;
    const d = G.pet.position.distanceTo(target);
    if (d > 2.2) {
      const dir = target.clone().sub(G.pet.position).setY(0).normalize();
      G.pet.position.addScaledVector(dir, Math.min(d - 1.8, 7 * dt));
      G.pet.rotation.y = Math.atan2(-dir.x, -dir.z);
    }
  }
}
