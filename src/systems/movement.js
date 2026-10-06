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
  if (st && st.active && (Math.abs(st.x) > 0.12 || Math.abs(st.y) > 0.12)) return new THREE.Vector3(st.x, 0, st.y);
  return new THREE.Vector3((k.d ? 1 : 0) - (k.a ? 1 : 0), 0, (k.s ? 1 : 0) - (k.w ? 1 : 0));
}

// On foot: camera-relative movement with instant turning.
export function moveFoot(dt) {
  const k = G.keys, pl = G.player;
  const input = inputVector();
  const mag = Math.min(1, input.length());
  const has = mag > 0 && !frozen();
  const sprint = k.shift || G.pad?.sprint;
  const max = (sprint && G.state.stamina > 0 ? 9 : 5) * (G.stick?.active ? mag : 1);
  if (has) { input.normalize().applyAxisAngle(UP, G.camYaw); lastDir.copy(input); G.curSpeed = Math.min(max, G.curSpeed + 60 * dt); }
  else G.curSpeed = Math.max(0, G.curSpeed - 60 * dt);
  if (G.curSpeed < 0.05) return;
  const old = pl.position.clone();
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
  const old = car.position.clone();
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
  const target = t.position.clone().add(new THREE.Vector3(0, 1.25, 0));
  const offset = new THREE.Vector3(0, Math.sin(G.camPitch) * G.camDistance, Math.cos(G.camPitch) * G.camDistance).applyAxisAngle(UP, G.camYaw);
  let desired = target.clone().add(offset);
  const dir = desired.clone().sub(target).normalize();
  const ray = new THREE.Raycaster(target, dir, 0, G.camDistance); ray.camera = cam;
  const hits = ray.intersectObjects(occluders, false);
  if (hits.length) desired = target.clone().add(dir.multiplyScalar(Math.max(3.2, hits[0].distance - 0.5)));
  if (firstFrame) { cam.position.copy(desired); firstFrame = false; } else cam.position.lerp(desired, 1 - Math.pow(0.001, dt));
  cam.lookAt(target);
  if (G.sky) G.sky.position.copy(cam.position);
}

export function updateMovement(dt) {
  if (G.inCar) { driveCar(dt); clampWorld(G.car); G.player.position.copy(G.car.position); }
  else { moveFoot(dt); clampWorld(G.player); }
}

export function setupMovement() {
  on('key', k => { if (k === 'r') { G.camYaw = G.inCar ? G.car.rotation.y : 0; G.camPitch = 0.38; G.camDistance = 10.5; } });
}
