import * as THREE from 'three';

import { spinWheels } from '../entities/vehicleModels.js';
import { G, frozen } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { approach, lerpAngle } from '../core/utils.js';
import { colliders, occluders } from '../world/builders.js';
import { VEH } from '../data/vehicles.js';
import { WORLD } from '../data/config.js';
import { vForward } from '../entities/vehicles.js';
import { toast } from '../ui/feedback.js';
import { heightAt } from '../world/terrain.js';

// -----------------------------------------------------------------------------
// SHARED SCRATCH VALUES
// -----------------------------------------------------------------------------

const UP = new THREE.Vector3(0, 1, 0);
const lastDir = new THREE.Vector3(0, 0, -1);

const _in = new THREE.Vector3();
const _old = new THREE.Vector3();
const _target = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _look = new THREE.Vector3();

let bob = 0;
let camHit = 0;
let fovNow = 58;
let firstFrame = true;

// -----------------------------------------------------------------------------
// MOVEMENT STATE
// -----------------------------------------------------------------------------

// Supported states: idle, walk, run, turn, stop, jump.

const setState = (state) => {
  if (G.moveState !== state) {
    G.moveState = state;
    G.stateT = 0;
  }
};

// -----------------------------------------------------------------------------
// JUMP SYSTEM
// -----------------------------------------------------------------------------

let jumpVelocity = 0;
let grounded = true;

const JUMP_FORCE = 7.5;
const GRAVITY = 20;
const PLAYER_HEIGHT = 1.7;

// -----------------------------------------------------------------------------
// COLLISION
// -----------------------------------------------------------------------------

/**
 * Checks whether a position overlaps a world collider, traffic vehicle,
 * or parked vehicle.
 *
 * The Y coordinate allows vertically separated roads and bridges to coexist.
 *
 * @param {THREE.Vector3} p Candidate position.
 * @param {number} r Collision radius.
 * @param {THREE.Object3D|null} self Object excluded from parked-vehicle tests.
 * @returns {boolean} Whether the position is blocked.
 */
function collisionDepthAt(p, r, self = null) {
  const y = p.y ?? 0;
  let depth = 0;

  // Buildings and static world objects.
  for (const c of colliders) {
    if (!c) continue;

    if (c.minY !== undefined && y < c.minY) continue;
    if (c.maxY !== undefined && y > c.maxY) continue;
    if (c.bottomY !== undefined && y + PLAYER_HEIGHT <= c.bottomY) continue;
    if (c.topY !== undefined && y >= c.topY) continue;

    const halfW = Math.max(0, c.w ?? 0) / 2;
    const halfD = Math.max(0, c.d ?? 0) / 2;

    const overlapX = halfW + r - Math.abs(p.x - c.x);
    const overlapZ = halfD + r - Math.abs(p.z - c.z);
    if (overlapX > 0 && overlapZ > 0) depth += Math.min(overlapX, overlapZ);
  }

  // Moving traffic.
  for (const t of G.traffic ?? []) {
    if (!t?.g || t.hidden || !t.g.visible) continue;

    const vehicleWidth = VEH[t.type]?.wid ?? 2;
    const trafficRadius = r + vehicleWidth * 0.6 + 0.6;

    depth += Math.max(0, trafficRadius - Math.hypot(p.x - t.g.position.x, p.z - t.g.position.z));
  }

  // Parked vehicles, including the player's vehicle when walking.
  for (const c of G.parked ?? []) {
    if (!c?.visible || c === self) continue;

    depth += Math.max(0, r + 1.4 - Math.hypot(p.x - c.position.x, p.z - c.position.z));
  }

  return depth;
}

export function blockedAt(p, r, self = null) {
  return collisionDepthAt(p, r, self) > 0;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

/**
 * Returns keyboard or joystick input.
 *
 * X = left/right
 * Z = forward/backward
 */
function inputVector() {
  const k = G.keys;
  const st = G.stick;

  if (
    st?.active &&
    (
      Math.abs(st.x) > 0.12 ||
      Math.abs(st.y) > 0.12
    )
  ) {
    return _in.set(st.x, 0, st.y);
  }

  return _in.set(
    (k.d ? 1 : 0) - (k.a ? 1 : 0),
    0,
    (k.s ? 1 : 0) - (k.w ? 1 : 0)
  );
}

// -----------------------------------------------------------------------------
// ON-FOOT MOVEMENT
// -----------------------------------------------------------------------------

export function moveFoot(dt) {
  const k = G.keys;
  const pl = G.player;

  if (!pl) return;

  const input = inputVector();
  const mag = Math.min(1, input.length());

  const has = mag > 0 && !frozen();

  const sprint =
    !!(k.shift || G.pad?.sprint) &&
    (G.state.stamina ?? 0) > 0;

  const maxSpeed =
    (sprint ? 8.5 : 4.6) *
    (G.stick?.active ? mag : 1);

  G.stateT = (G.stateT || 0) + dt;

  // ---------------------------------------------------------------------------
  // JUMP INPUT
  // ---------------------------------------------------------------------------

  const jumpPressed =
    !!k.jumpPressed ||
    !!G.pad?.jump;

  if (jumpPressed && grounded && !frozen()) {
    jumpVelocity = JUMP_FORCE;
    grounded = false;

    setState('jump');

    // Consume edge-triggered jump input.
    k.jumpPressed = false;

    if (G.pad) {
      G.pad.jump = false;
    }
  }

  // ---------------------------------------------------------------------------
  // VERTICAL JUMP PHYSICS
  // ---------------------------------------------------------------------------

  if (!grounded) {
    jumpVelocity -= GRAVITY * dt;
    pl.position.y += jumpVelocity * dt;

    const groundY = heightAt(
      pl.position.x,
      pl.position.z,
      pl.position.y
    );

    if (pl.position.y <= groundY) {
      pl.position.y = groundY;
      jumpVelocity = 0;
      grounded = true;

      if (has) {
        setState(sprint ? 'run' : 'walk');
      } else {
        setState('idle');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HORIZONTAL DIRECTION AND SPEED
  // ---------------------------------------------------------------------------

  if (has) {
    input
      .normalize()
      .applyAxisAngle(UP, G.camYaw);

    const turn = lastDir.angleTo(input);

    // Slow down before making a sharp turn.
    if (turn > 1.9 && G.curSpeed > 2) {
      setState('turn');

      G.curSpeed = Math.max(
        1.5,
        G.curSpeed - 30 * dt
      );
    } else if (grounded) {
      setState(sprint ? 'run' : 'walk');
    }

    lastDir
      .lerp(
        input,
        Math.min(
          1,
          dt * (G.moveState === 'turn' ? 16 : 9)
        )
      )
      .normalize();

    G.curSpeed = Math.min(
      maxSpeed,
      G.curSpeed +
        (G.curSpeed < 2 ? 14 : 22) * dt
    );
  } else {
    G.curSpeed = Math.max(
      0,
      G.curSpeed - 16 * dt
    );

    if (grounded) {
      setState(
        G.curSpeed > 0.4 ? 'stop' : 'idle'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // WALK / RUN ANIMATION BOB
  // ---------------------------------------------------------------------------

  bob +=
    dt *
    G.curSpeed *
    (G.moveState === 'run' ? 2.6 : 2.1);

  const amp =
    G.moveState === 'run' ? 0.085 : 0.055;

  const rig = !!G.playerChar?.rig;

  // Apply ground height only when grounded.
  // Never overwrite the vertical jump arc.
  if (grounded) {
    const footHeight = heightAt(
      pl.position.x,
      pl.position.z,
      pl.position.y
    );

    pl.position.y =
      footHeight +
      (
        !rig && G.curSpeed > 0.3
          ? Math.abs(Math.sin(bob)) * amp
          : 0
      );
  }

  // Sprint lean.
  pl.rotation.x = THREE.MathUtils.lerp(
    pl.rotation.x,
    !rig && G.moveState === 'run' ? -0.1 : 0,
    Math.min(1, dt * 6)
  );

  // ---------------------------------------------------------------------------
  // COLLISION-SAFE HORIZONTAL MOVEMENT
  // ---------------------------------------------------------------------------

  if (G.curSpeed < 0.05 || dt <= 0) {
    pl.rotation.y = Math.atan2(
      lastDir.x,
      lastDir.z
    );
    return;
  }

  // Divide movement into small increments to reduce tunnelling through
  // thin colliders during fast movement or frame-rate drops.
  const distance = G.curSpeed * dt;
  const steps = Math.max(
    1,
    Math.ceil(distance / 0.2)
  );

  const stepX = lastDir.x * distance / steps;
  const stepZ = lastDir.z * distance / steps;

  for (let i = 0; i < steps; i++) {
    const fromX = pl.position.x;
    const fromZ = pl.position.z;

    // Resolve X independently.
    const oldXDepth = collisionDepthAt(pl.position, 0.65);
    pl.position.x = fromX + stepX;

    const newXDepth = collisionDepthAt(pl.position, 0.65);
    if (newXDepth > 0 && (oldXDepth === 0 || newXDepth >= oldXDepth)) {
      pl.position.x = fromX;
    }

    // Resolve Z independently.
    // If one axis is blocked, the player can still slide along the other.
    const oldZDepth = collisionDepthAt(pl.position, 0.65);
    pl.position.z = fromZ + stepZ;

    const newZDepth = collisionDepthAt(pl.position, 0.65);
    if (newZDepth > 0 && (oldZDepth === 0 || newZDepth >= oldZDepth)) {
      pl.position.z = fromZ;
    }

    const movedX =
      Math.abs(pl.position.x - fromX) > 1e-6;

    const movedZ =
      Math.abs(pl.position.z - fromZ) > 1e-6;

    // Stop trying if neither axis can advance.
    if (!movedX && !movedZ) {
      break;
    }
  }

  // Face the direction of travel.
  pl.rotation.y = Math.atan2(
    lastDir.x,
    lastDir.z
  );
}

// -----------------------------------------------------------------------------
// DRIVING
// -----------------------------------------------------------------------------

export function driveCar(dt) {
  const car = G.car;

  if (!car) return;

  const S = VEH[car.userData.type];

  if (!S) {
    G.carSpeed = 0;
    return;
  }

  const k = G.keys;
  const st = G.stick || {};
  const pad = G.pad || {};
  const th = G.touchHold || {};

  const gas =
    !!k.w ||
    !!th.gas ||
    (pad.gas ?? 0) > 0.1 ||
    (
      st.active &&
      !th.gas &&
      !th.brake &&
      st.y < -0.35
    );

  const brake =
    !!k.s ||
    !!th.brake ||
    (pad.brake ?? 0) > 0.1 ||
    (
      st.active &&
      !th.gas &&
      !th.brake &&
      st.y > 0.35
    );

  const boost = !!(k.shift || pad.sprint);

  // Spacebar remains the vehicle handbrake.
  const hand = !!(k[' '] || pad.hand);

  if (frozen()) {
    G.carSpeed = approach(
      G.carSpeed,
      0,
      20 * dt
    );
  } else {
    const jam = G.jam;

    const flooded =
      !!jam?.flood &&
      Math.abs(car.position.z - jam.k) < 9 &&
      car.position.x > jam.from &&
      car.position.x < jam.to;

    const cond = car.userData.cond ?? 100;

    const wet =
      (G.rain ? 0.7 : 1) *
      (flooded ? 0.45 : 1);

    const maxF =
      (boost ? S.boost : S.max) *
      (G.state.fuel > 0 ? 1 : 0.2) *
      (cond < 30 ? 0.5 : 1) *
      wet;

    if (hand) {
      G.carSpeed = approach(
        G.carSpeed,
        0,
        45 * dt
      );
    } else if (gas) {
      G.carSpeed = Math.min(
        maxF,
        G.carSpeed +
          (
            G.carSpeed < 0
              ? 30
              : boost
                ? S.accel * 1.3
                : S.accel
          ) * dt
      );
    } else if (brake) {
      G.carSpeed =
        G.carSpeed > 0.5
          ? Math.max(
              0,
              G.carSpeed - 28 * wet * dt
            )
          : Math.max(
              -7,
              G.carSpeed - 10 * dt
            );
    } else {
      G.carSpeed = approach(
        G.carSpeed,
        0,
        6 * dt
      );
    }

    let steer =
      (k.a ? 1 : 0) -
      (k.d ? 1 : 0);

    if (
      st.active &&
      Math.abs(st.x) > 0.12
    ) {
      steer = -st.x;
    }

    if (Math.abs(G.carSpeed) > 0.3) {
      car.rotation.y +=
        steer *
        2.3 *
        wet *
        (0.6 + 0.4 * cond / 100) *
        Math.min(
          1,
          Math.abs(G.carSpeed) / 9
        ) *
        dt *
        Math.sign(G.carSpeed);
    }
  }

  // ---------------------------------------------------------------------------
  // STATIONARY VEHICLE
  // ---------------------------------------------------------------------------

  if (Math.abs(G.carSpeed) < 0.05) {
    car.position.y = heightAt(
      car.position.x,
      car.position.z,
      car.position.y
    );

    return;
  }

  if (dt <= 0) return;

  // Preserve the last safe vehicle position.
  _old.copy(car.position);

  const distance = G.carSpeed * dt;
  const steps = Math.max(
    1,
    Math.ceil(Math.abs(distance) / 0.3)
  );

  const stepDistance = distance / steps;
  const forward = vForward(car);

  let collided = false;

  // Substep vehicle movement to reduce tunnelling through obstacles.
  for (let i = 0; i < steps; i++) {
    const fromX = car.position.x;
    const fromZ = car.position.z;
    const fromY = car.position.y;

    car.position.x += forward.x * stepDistance;
    car.position.z += forward.z * stepDistance;

    car.position.y = heightAt(
      car.position.x,
      car.position.z,
      fromY
    );

    if (
      blockedAt(
        car.position,
        S.wid * 0.75,
        car
      )
    ) {
      // Restore the last safe position.
      car.position.set(fromX, fromY, fromZ);

      collided = true;
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // COLLISION RESPONSE
  // ---------------------------------------------------------------------------

  if (collided) {
    // Keep the vehicle grounded at its restored position.
    car.position.y = heightAt(
      car.position.x,
      car.position.z,
      car.position.y
    );

    if (Math.abs(G.carSpeed) > 18) {
      G.state.health = Math.max(
        0,
        G.state.health - 8
      );

      const ownedVehicle = G.state.vehicles?.find(
        (o) => o.id === car.userData.ownedId
      );

      const damage = ownedVehicle?.insured ? 6 : 12;

      car.userData.cond = Math.max(
        0,
        (car.userData.cond ?? 100) - damage
      );

      emit('crash');

      toast(
        `Crash! −8 HP · vehicle condition ${Math.round(
          car.userData.cond
        )}%`
      );
    }

    // Small rebound away from the obstacle.
    G.carSpeed = -G.carSpeed * 0.2;
  }
}

// -----------------------------------------------------------------------------
// WORLD BOUNDS
// -----------------------------------------------------------------------------

export function clampWorld(o) {
  if (!o?.position || !WORLD?.bounds) return;

  const b = WORLD.bounds;

  o.position.x = THREE.MathUtils.clamp(
    o.position.x,
    b.x[0],
    b.x[1]
  );

  o.position.z = THREE.MathUtils.clamp(
    o.position.z,
    b.z[0],
    b.z[1]
  );
}

// -----------------------------------------------------------------------------
// THIRD-PERSON CAMERA
// -----------------------------------------------------------------------------

export function updateCamera(dt) {
  const t = G.inCar ? G.car : G.player;
  const cam = G.camera;

  if (!t || !cam) return;

  if (G.camBlend > 0) {
    G.camBlend = Math.max(
      0,
      G.camBlend - dt * 0.8
    );
  }

  // Follow the vehicle heading unless the player is rotating the camera.
  if (G.inCar && !G.dragging) {
    G.camYaw = lerpAngle(
      G.camYaw,
      G.car.rotation.y,
      1 - Math.pow(
        G.camBlend > 0 ? 0.02 : 0.08,
        dt
      )
    );
  }

  const wantDist = G.inCar
    ? Math.max(G.camDistance, 11.5)
    : G.camDistance;

  const sprinting =
    !G.inCar &&
    G.moveState === 'run';

  const fast =
    G.inCar &&
    Math.abs(G.carSpeed) > 20;

  const fovTarget =
    sprinting ? 66 : fast ? 64 : 58;

  if (Math.abs(fovNow - fovTarget) > 0.05) {
    fovNow = THREE.MathUtils.lerp(
      fovNow,
      fovTarget,
      Math.min(1, dt * 3)
    );

    cam.fov = fovNow;
    cam.updateProjectionMatrix();
  }

  const target = _target.copy(t.position);

  // Raise the camera target slightly while jumping.
  target.y += G.moveState === 'jump' ? 1.45 : 1.25;

  const offset = _offset
    .set(
      0,
      Math.sin(G.camPitch) * wantDist,
      Math.cos(G.camPitch) * wantDist
    )
    .applyAxisAngle(UP, G.camYaw);

  const desired = _desired
    .copy(target)
    .add(offset);

  const dir = _dir
    .copy(desired)
    .sub(target)
    .normalize();

  _ray.set(target, dir);
  _ray.far = wantDist;

  const hits = _ray.intersectObjects(
    occluders,
    false
  );

  const hitDist = hits.length
    ? Math.max(3.2, hits[0].distance - 0.5)
    : wantDist;

  camHit = camHit === 0
    ? hitDist
    : THREE.MathUtils.lerp(
        camHit,
        hitDist,
        Math.min(
          1,
          dt * (hitDist < camHit ? 10 : 3)
        )
      );

  if (camHit < wantDist - 0.05) {
    desired
      .copy(target)
      .addScaledVector(dir, camHit);
  }

  // Tighter follow while driving, smoother follow on foot.
  const follow = G.inCar
    ? 1 - Math.pow(0.0005, dt)
    : 1 - Math.pow(0.004, dt);

  if (firstFrame) {
    cam.position.copy(desired);
    _look.copy(target);
    firstFrame = false;
  } else {
    cam.position.lerp(desired, follow);

    _look.lerp(
      target,
      1 - Math.pow(0.0008, dt)
    );
  }

  cam.lookAt(_look);

  if (G.sky) {
    G.sky.position.copy(cam.position);
  }

  // Keep the directional-light shadow target near the active character.
  if (G.sun && G.sunDir && G.sun.target) {
    G.sun.target.position.set(
      t.position.x,
      0,
      t.position.z
    );

    G.sun.position
      .copy(G.sunDir)
      .add(G.sun.target.position);
  }
}

// -----------------------------------------------------------------------------
// MOVEMENT UPDATE
// -----------------------------------------------------------------------------

export function updateMovement(dt) {
  // Enter/exit blend owns the player this frame — do not drive or walk over it.
  if (G.vehicleMode === 'enter' || G.vehicleMode === 'exit') {
    return;
  }

  if (G.transitRide) {
    G.player.position.copy(G.transitRide.vehicle.g.position);
    return;
  }

  if (G.inCar) {
    grounded = true;
    jumpVelocity = 0;
    driveCar(dt);
    clampWorld(G.car);
    if (G.player && G.car) {
      G.player.position.copy(G.car.position);
    }
    spinWheels(G.car, G.carSpeed, dt);
  } else {
    moveFoot(dt);
    clampWorld(G.player);
  }
}

// -----------------------------------------------------------------------------
// SETUP
// -----------------------------------------------------------------------------

export function setupMovement() {
  on('key', (k) => {
    // Reset the camera behind the player or vehicle.
    if (k === 'r') {
      G.camYaw = G.inCar
        ? G.car.rotation.y
        : 0;

      G.camPitch = 0.38;
      G.camDistance = 10.5;
    }
  });
}
