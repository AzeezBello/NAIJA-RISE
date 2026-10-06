import * as THREE from 'three';
import { G, frozen } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { approach, lerpAngle } from '../core/utils.js';
import { colliders, occluders } from '../world/builders.js';
import { VEH } from '../data/vehicles.js';
import { WORLD } from '../data/config.js';
import { vForward } from '../entities/vehicles.js';
import { toast } from '../ui/feedback.js';

const UP = new THREE.Vector3(0, 1, 0);
const lastDir = new THREE.Vector3(0, 0, -1);
// Scratch vectors: no per-frame allocations in the hot path.
const _in = new THREE.Vector3(), _old = new THREE.Vector3(), _target = new THREE.Vector3(), _offset = new THREE.Vector3(), _desired = new THREE.Vector3(), _dir = new THREE.Vector3();
const _ray = new THREE.Raycaster();
let bob = 0;

// Buildings, traffic and other parked vehicles block movement.
export function blockedAt(p, r, self) {
  for (const c of colliders) if (Math.abs(p.x - c.x) < c.w / 2 + r && Math.abs(p.z - c.z) < c.d / 2 + r) return true;
  for (const t of G.traffic) if (Math.hypot(p.x - t.g.position.x, p.z - t.g.position.z) < r + VEH[t.type].wid * 0.6 + 0.6) return true;
  for (const c of G.parked) if (c !== self && c !== G.car && Math.hypot(p.x - c.position.x, p.z - c.position.z) < r + 1.4) return true;
  return false;
}

// Keyboard or joystick → movement vector in camera space (x right, y forward-negative).
function inputVector() {
  const k = G.keys, st = G.stick;
  if (st && st.active && (Math.abs(st.x) > 0.12 || Math.abs(st.y) > 0.12)) return _in.set(st.x, 0, st.y);
  return _in.set((k.d ? 1 : 0) - (k.a ? 1 : 0), 0, (k.s ? 1 : 0) - (k.w ? 1 : 0));
}

// On foot: camera-relative movement with instant turning.
export function moveFoot(dt) {
  const k = G.keys, pl = G.player;
  const input = inputVector();
  const mag = Math.min(1, input.length());
  const has = mag > 0 && !frozen();
  const sprint = k.shift || G.pad?.sprint;
  const max = (sprint && G.state.stamina > 0 ? 9 : 5) * (G.stick?.active ? mag : 1);
  if (has) { input.normalize().applyAxisAngle(UP, G.camYaw); lastDir.lerp(input, Math.min(1, dt * 14)).normalize(); G.curSpeed = Math.min(max, G.curSpeed + 28 * dt); }
  else G.curSpeed = Math.max(0, G.curSpeed - 40 * dt);
  bob += dt * G.curSpeed * 2.2; pl.position.y = G.curSpeed > 0.3 ? Math.abs(Math.sin(bob)) * 0.06 : 0;   // walk bob
  if (G.curSpeed < 0.05) return;
  const old = _old.copy(pl.position);
  pl.position.addScaledVector(lastDir, G.curSpeed * dt);
  if (blockedAt(pl.position, 0.65)) {
    pl.position.x = old.x;
    if (blockedAt(pl.position, 0.65)) pl.position.z = old.z;
    if (blockedAt(pl.position, 0.65)) pl.position.copy(old);
  }
  pl.rotation.y = Math.atan2(lastDir.x, lastDir.z);
}

// Driving: throttle/brake/reverse, speed-scaled steering, handbrake, crash damage.
export function driveCar(dt) {
  const car = G.car, S = VEH[car.userData.type], k = G.keys, st = G.stick || {}, pad = G.pad || {}, th = G.touchHold || {};
  const gas = k.w || th.gas || pad.gas > 0.1 || (st.active && !th.gas && !th.brake && st.y < -0.35);
  const brake = k.s || th.brake || pad.brake > 0.1 || (st.active && !th.gas && !th.brake && st.y > 0.35);
  const boost = k.shift || pad.sprint, hand = k[' '] || pad.hand;
  if (frozen()) G.carSpeed = approach(G.carSpeed, 0, 20 * dt);
  else {
    const jam = G.jam, flooded = jam?.flood && Math.abs(car.position.z - jam.k) < 9 && car.position.x > jam.from && car.position.x < jam.to;
    const cond = car.userData.cond ?? 100, wet = (G.rain ? 0.7 : 1) * (flooded ? 0.45 : 1);
    const maxF = (boost ? S.boost : S.max) * (G.state.fuel > 0 ? 1 : 0.2) * (cond < 30 ? 0.5 : 1) * wet;
    if (hand) G.carSpeed = approach(G.carSpeed, 0, 45 * dt);
    else if (gas) G.carSpeed = Math.min(maxF, G.carSpeed + (G.carSpeed < 0 ? 30 : boost ? S.accel * 1.3 : S.accel) * dt);
    else if (brake) G.carSpeed = G.carSpeed > 0.5 ? Math.max(0, G.carSpeed - 28 * wet * dt) : Math.max(-7, G.carSpeed - 10 * dt);
    else G.carSpeed = approach(G.carSpeed, 0, 6 * dt);
    let steer = (k.a ? 1 : 0) - (k.d ? 1 : 0);
    if (st.active && Math.abs(st.x) > 0.12) steer = -st.x;
    if (Math.abs(G.carSpeed) > 0.3) car.rotation.y += steer * 2.3 * wet * (0.6 + 0.4 * cond / 100) * Math.min(1, Math.abs(G.carSpeed) / 9) * dt * Math.sign(G.carSpeed);
  }
  if (Math.abs(G.carSpeed) < 0.05) return;
  const old = _old.copy(car.position);
  car.position.addScaledVector(vForward(car), G.carSpeed * dt);
  if (blockedAt(car.position, S.wid * 0.75, car)) {
    car.position.copy(old);
    if (Math.abs(G.carSpeed) > 18) { G.state.health = Math.max(0, G.state.health - 8); car.userData.cond = Math.max(0, (car.userData.cond ?? 100) - (G.state.vehicles.find(o => o.id === car.userData.ownedId)?.insured ? 6 : 12)); emit('crash'); toast(`Crash! −8 HP · vehicle condition ${Math.round(car.userData.cond)}%`); }
    G.carSpeed = -G.carSpeed * 0.2;
  }
}

export function clampWorld(o) {
  const b = WORLD.bounds;
  o.position.x = THREE.MathUtils.clamp(o.position.x, -b, b);
  o.position.z = THREE.MathUtils.clamp(o.position.z, -b, b);
}

// Third-person chase camera with occlusion. Auto-follows the car heading when not dragging.
let firstFrame = true;
export function updateCamera(dt) {
  const t = G.inCar ? G.car : G.player, cam = G.camera;
  if (G.inCar && !G.dragging) G.camYaw = lerpAngle(G.camYaw, G.car.rotation.y, 1 - Math.pow(0.08, dt));
  const target = _target.copy(t.position); target.y += 1.25;
  const offset = _offset.set(0, Math.sin(G.camPitch) * G.camDistance, Math.cos(G.camPitch) * G.camDistance).applyAxisAngle(UP, G.camYaw);
  const desired = _desired.copy(target).add(offset);
  const dir = _dir.copy(desired).sub(target).normalize();
  _ray.set(target, dir); _ray.far = G.camDistance; _ray.camera = cam;
  const hits = _ray.intersectObjects(occluders, false);
  if (hits.length) desired.copy(target).addScaledVector(dir, Math.max(3.2, hits[0].distance - 0.5));
  if (firstFrame) { cam.position.copy(desired); firstFrame = false; } else cam.position.lerp(desired, 1 - Math.pow(0.001, dt));
  cam.lookAt(target);
  if (G.sky) G.sky.position.copy(cam.position);
  // shadow frustum follows the player
  if (G.sun && G.sunDir) { G.sun.target.position.set(t.position.x, 0, t.position.z); G.sun.position.copy(G.sunDir).add(G.sun.target.position); }
}

export function updateMovement(dt) {
  if (G.inCar) { driveCar(dt); clampWorld(G.car); G.player.position.copy(G.car.position); }
  else { moveFoot(dt); clampWorld(G.player); }
}

export function setupMovement() {
  on('key', k => { if (k === 'r') { G.camYaw = G.inCar ? G.car.rotation.y : 0; G.camPitch = 0.38; G.camDistance = 10.5; } });
}
