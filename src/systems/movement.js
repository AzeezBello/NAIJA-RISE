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

const UP = new THREE.Vector3(0, 1, 0);

const lastDir = new THREE.Vector3(0, 0, -1);

// Scratch vectors: no per-frame allocations in the hot path.
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

// Animation-ready controller states:
// idle · walk · run · turn · stop · jump
const setState = s => {
  if (G.moveState !== s) {
    G.moveState = s;
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

// movement.js
const jumpPressed = !!k.jumpPressed || !!G.pad?.jump;

// -----------------------------------------------------------------------------
// COLLISION
// -----------------------------------------------------------------------------

// Buildings, traffic and other parked vehicles block movement.
//
// p.y is important here. A bridge can occupy the same X/Z space as a road
// underneath it, so collision level must be evaluated using the object's
// current elevation.
//
// The test is square-vs-AABB on purpose. With the axis-separated resolution
// in moveFoot/driveCar it slides cleanly along walls.
export function blockedAt(p, r, self) {
  const y = p.y ?? 0;

  for (const c of colliders) {
    if (c.minY !== undefined && y < c.minY) continue;
    if (c.maxY !== undefined && y > c.maxY) continue;

    if (
      Math.abs(p.x - c.x) < c.w / 2 + r &&
      Math.abs(p.z - c.z) < c.d / 2 + r
    ) {
      return true;
    }
  }

  for (const t of G.traffic) {
    if (
      Math.hypot(
        p.x - t.g.position.x,
        p.z - t.g.position.z
      ) <
      r + VEH[t.type].wid * 0.6 + 0.6
    ) {
      return true;
    }
  }

  for (const c of G.parked) {
    if (
      c !== self &&
      c !== G.car &&
      Math.hypot(
        p.x - c.position.x,
        p.z - c.position.z
      ) <
      r + 1.4
    ) {
      return true;
    }
  }

  return false;
}

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

// Keyboard or joystick → movement vector in camera space.
// x = right
// y = forward/back
function inputVector() {
  const k = G.keys;
  const st = G.stick;

  if (
    st &&
    st.active &&
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

  const input = inputVector();

  const mag = Math.min(1, input.length());

  const has =
    mag > 0 &&
    !frozen();

  const sprint =
    (k.shift || G.pad?.sprint) &&
    G.state.stamina > 0;

  const max =
    (sprint ? 8.5 : 4.6) *
    (G.stick?.active ? mag : 1);

  G.stateT =
    (G.stateT || 0) + dt;

  // ---------------------------------------------------------------------------
  // JUMP
  // ---------------------------------------------------------------------------
  //
  // Spacebar triggers a jump when the player is on foot and grounded.
  //
  // jumpPressed should be set by the keyboard handler on keydown.
  // This prevents holding Space from repeatedly jumping.
  //
  // G.pad?.jump is also supported if you later map a controller button to jump.
  //

  const jumpPressed =
    !!k.jumpPressed ||
    !!G.pad?.jump;

  if (
    jumpPressed &&
    grounded &&
    !frozen()
  ) {
    jumpVelocity = JUMP_FORCE;
    grounded = false;

    setState('jump');

    // Consume keyboard jump input.
    k.jumpPressed = false;

    // Consume controller jump input if the controller implementation
    // exposes it as an edge-triggered value.
    if (G.pad) {
      G.pad.jump = false;
    }
  }

  // ---------------------------------------------------------------------------
  // VERTICAL JUMP PHYSICS
  // ---------------------------------------------------------------------------

  if (!grounded) {
    jumpVelocity -= GRAVITY * dt;

    pl.position.y +=
      jumpVelocity * dt;

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
        setState(
          sprint
            ? 'run'
            : 'walk'
        );
      } else {
        setState('idle');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HORIZONTAL MOVEMENT
  // ---------------------------------------------------------------------------

  if (has) {
    input
      .normalize()
      .applyAxisAngle(
        UP,
        G.camYaw
      );

    const turn =
      lastDir.angleTo(input);

    // Sharp turn: pivot first, then move.
    if (
      turn > 1.9 &&
      G.curSpeed > 2
    ) {
      setState('turn');

      G.curSpeed =
        Math.max(
          1.5,
          G.curSpeed - 30 * dt
        );
    } else if (grounded) {
      setState(
        sprint
          ? 'run'
          : 'walk'
      );
    }

    lastDir
      .lerp(
        input,
        Math.min(
          1,
          dt *
            (
              G.moveState === 'turn'
                ? 16
                : 9
            )
        )
      )
      .normalize();

    G.curSpeed =
      Math.min(
        max,
        G.curSpeed +
          (
            G.curSpeed < 2
              ? 14
              : 22
          ) * dt
      );
  } else {
    G.curSpeed =
      Math.max(
        0,
        G.curSpeed - 16 * dt
      );

    if (grounded) {
      setState(
        G.curSpeed > 0.4
          ? 'stop'
          : 'idle'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // WALK / RUN BOB
  // ---------------------------------------------------------------------------

  bob +=
    dt *
    G.curSpeed *
    (
      G.moveState === 'run'
        ? 2.6
        : 2.1
    );

  const amp =
    G.moveState === 'run'
      ? 0.085
      : 0.055;

  const rig =
    !!G.playerChar?.rig;

  // Do not overwrite the vertical jump arc.
  // Ground height is only applied while grounded.
  if (grounded) {
    const footHeight =
      heightAt(
        pl.position.x,
        pl.position.z,
        pl.position.y
      );

    pl.position.y =
      footHeight +
      (
        !rig &&
        G.curSpeed > 0.3
          ? Math.abs(
              Math.sin(bob)
            ) * amp
          : 0
      );
  }

  // Sprint lean.
  pl.rotation.x =
    THREE.MathUtils.lerp(
      pl.rotation.x,
      !rig &&
      G.moveState === 'run'
        ? -0.1
        : 0,
      Math.min(
        1,
        dt * 6
      )
    );

  // ---------------------------------------------------------------------------
  // HORIZONTAL COLLISION
  // ---------------------------------------------------------------------------

  if (G.curSpeed < 0.05) {
    return;
  }

  const old =
    _old.copy(pl.position);

  pl.position.addScaledVector(
    lastDir,
    G.curSpeed * dt
  );

  if (
    blockedAt(
      pl.position,
      0.65
    )
  ) {
    // Try sliding along Z.
    const nx = pl.position.x;
    const nz = pl.position.z;

    pl.position.set(
      old.x,
      pl.position.y,
      nz
    );

    if (
      blockedAt(
        pl.position,
        0.65
      )
    ) {
      // Try sliding along X.
      pl.position.set(
        nx,
        pl.position.y,
        old.z
      );

      if (
        blockedAt(
          pl.position,
          0.65
        )
      ) {
        pl.position.copy(old);
      }
    }
  }

  pl.rotation.y =
    Math.atan2(
      lastDir.x,
      lastDir.z
    );
}

// -----------------------------------------------------------------------------
// DRIVING
// -----------------------------------------------------------------------------

export function driveCar(dt) {
  const car = G.car;
  const S = VEH[car.userData.type];

  const k = G.keys;
  const st = G.stick || {};
  const pad = G.pad || {};
  const th = G.touchHold || {};

  const gas =
    k.w ||
    th.gas ||
    pad.gas > 0.1 ||
    (
      st.active &&
      !th.gas &&
      !th.brake &&
      st.y < -0.35
    );

  const brake =
    k.s ||
    th.brake ||
    pad.brake > 0.1 ||
    (
      st.active &&
      !th.gas &&
      !th.brake &&
      st.y > 0.35
    );

  const boost =
    k.shift ||
    pad.sprint;

  // Space remains vehicle handbrake.
  const hand =
    k[' '] ||
    pad.hand;

  if (frozen()) {
    G.carSpeed =
      approach(
        G.carSpeed,
        0,
        20 * dt
      );
  } else {
    const jam = G.jam;

    const flooded =
      jam?.flood &&
      Math.abs(
        car.position.z - jam.k
      ) < 9 &&
      car.position.x > jam.from &&
      car.position.x < jam.to;

    const cond =
      car.userData.cond ?? 100;

    const wet =
      (G.rain ? 0.7 : 1) *
      (
        flooded
          ? 0.45
          : 1
      );

    const maxF =
      (
        boost
          ? S.boost
          : S.max
      ) *
      (
        G.state.fuel > 0
          ? 1
          : 0.2
      ) *
      (
        cond < 30
          ? 0.5
          : 1
      ) *
      wet;

    if (hand) {
      G.carSpeed =
        approach(
          G.carSpeed,
          0,
          45 * dt
        );
    } else if (gas) {
      G.carSpeed =
        Math.min(
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
              G.carSpeed -
                28 * wet * dt
            )
          : Math.max(
              -7,
              G.carSpeed -
                10 * dt
            );
    } else {
      G.carSpeed =
        approach(
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

    if (
      Math.abs(G.carSpeed) > 0.3
    ) {
      car.rotation.y +=
        steer *
        2.3 *
        wet *
        (
          0.6 +
          0.4 * cond / 100
        ) *
        Math.min(
          1,
          Math.abs(
            G.carSpeed
          ) / 9
        ) *
        dt *
        Math.sign(
          G.carSpeed
        );
    }
  }

  // Vehicle is stationary.
  if (
    Math.abs(G.carSpeed) < 0.05
  ) {
    car.position.y =
      heightAt(
        car.position.x,
        car.position.z,
        car.position.y
      );

    return;
  }

  const old =
    _old.copy(
      car.position
    );

  car.position.addScaledVector(
    vForward(car),
    G.carSpeed * dt
  );

  car.position.y =
    heightAt(
      car.position.x,
      car.position.z,
      car.position.y
    );

  // Vehicle collision.
  if (
    blockedAt(
      car.position,
      S.wid * 0.75,
      car
    )
  ) {
    car.position.copy(old);

    if (
      Math.abs(
        G.carSpeed
      ) > 18
    ) {
      G.state.health =
        Math.max(
          0,
          G.state.health - 8
        );

      car.userData.cond =
        Math.max(
          0,
          (
            car.userData.cond ?? 100
          ) -
          (
            G.state.vehicles.find(
              o =>
                o.id ===
                car.userData.ownedId
            )?.insured
              ? 6
              : 12
          )
        );

      emit('crash');

      toast(
        `Crash! −8 HP · vehicle condition ${Math.round(
          car.userData.cond
        )}%`
      );
    }

    G.carSpeed =
      -G.carSpeed * 0.2;
  }
}

// -----------------------------------------------------------------------------
// WORLD BOUNDS
// -----------------------------------------------------------------------------

export function clampWorld(o) {
  const b = WORLD.bounds;

  o.position.x =
    THREE.MathUtils.clamp(
      o.position.x,
      b.x[0],
      b.x[1]
    );

  o.position.z =
    THREE.MathUtils.clamp(
      o.position.z,
      b.z[0],
      b.z[1]
    );
}

// -----------------------------------------------------------------------------
// THIRD-PERSON CAMERA
// -----------------------------------------------------------------------------

// Third-person chase camera with occlusion.
// Auto-follows the car heading when not dragging.

let firstFrame = true;

export function updateCamera(dt) {
  const t =
    G.inCar
      ? G.car
      : G.player;

  const cam = G.camera;

  if (G.camBlend > 0) {
    G.camBlend =
      Math.max(
        0,
        G.camBlend -
          dt * 0.8
      );
  }

  if (
    G.inCar &&
    !G.dragging
  ) {
    G.camYaw =
      lerpAngle(
        G.camYaw,
        G.car.rotation.y,
        1 -
          Math.pow(
            G.camBlend > 0
              ? 0.02
              : 0.08,
            dt
          )
      );
  }

  const wantDist =
    G.inCar
      ? Math.max(
          G.camDistance,
          11.5
        )
      : G.camDistance;

  const sprinting =
    !G.inCar &&
    G.moveState === 'run';

  const fast =
    G.inCar &&
    Math.abs(
      G.carSpeed
    ) > 20;

  const fovTarget =
    sprinting
      ? 66
      : fast
        ? 64
        : 58;

  if (
    Math.abs(
      fovNow - fovTarget
    ) > 0.05
  ) {
    fovNow =
      THREE.MathUtils.lerp(
        fovNow,
        fovTarget,
        Math.min(
          1,
          dt * 3
        )
      );

    cam.fov =
      fovNow;

    cam.updateProjectionMatrix();
  }

  const target =
    _target.copy(
      t.position
    );

  // Slightly higher camera target while jumping.
  target.y +=
    G.moveState === 'jump'
      ? 1.45
      : 1.25;

  const offset =
    _offset
      .set(
        0,
        Math.sin(
          G.camPitch
        ) * wantDist,
        Math.cos(
          G.camPitch
        ) * wantDist
      )
      .applyAxisAngle(
        UP,
        G.camYaw
      );

  const desired =
    _desired
      .copy(target)
      .add(offset);

  const dir =
    _dir
      .copy(desired)
      .sub(target)
      .normalize();

  _ray.set(
    target,
    dir
  );

  _ray.far =
    wantDist;

  _ray.camera =
    cam;

  const hits =
    _ray.intersectObjects(
      occluders,
      false
    );

  const hitDist =
    hits.length
      ? Math.max(
          3.2,
          hits[0].distance - 0.5
        )
      : wantDist;

  camHit =
    camHit === 0
      ? hitDist
      : THREE.MathUtils.lerp(
          camHit,
          hitDist,
          Math.min(
            1,
            dt *
              (
                hitDist < camHit
                  ? 10
                  : 3
              )
          )
        );

  if (
    camHit <
    wantDist - 0.05
  ) {
    desired.copy(target)
      .addScaledVector(
        dir,
        camHit
      );
  }

  // Position: subtle lag on foot,
  // tighter when driving.
  const follow =
    G.inCar
      ? 1 -
        Math.pow(
          0.0005,
          dt
        )
      : 1 -
        Math.pow(
          0.004,
          dt
        );

  if (firstFrame) {
    cam.position.copy(
      desired
    );

    _look.copy(
      target
    );

    firstFrame = false;
  } else {
    cam.position.lerp(
      desired,
      follow
    );

    _look.lerp(
      target,
      1 -
        Math.pow(
          0.0008,
          dt
        )
    );
  }

  cam.lookAt(
    _look
  );

  if (G.sky) {
    G.sky.position.copy(
      cam.position
    );
  }

  // Shadow frustum follows the player.
  if (
    G.sun &&
    G.sunDir
  ) {
    G.sun.target.position.set(
      t.position.x,
      0,
      t.position.z
    );

    G.sun.position.copy(
      G.sunDir
    ).add(
      G.sun.target.position
    );
  }
}

// -----------------------------------------------------------------------------
// MOVEMENT UPDATE
// -----------------------------------------------------------------------------

export function updateMovement(dt) {
  if (G.inCar) {
    // Make sure the player cannot retain jump state after entering a vehicle.
    grounded = true;
    jumpVelocity = 0;

    driveCar(dt);

    clampWorld(
      G.car
    );

    G.player.position.copy(
      G.car.position
    );

    spinWheels(
      G.car,
      G.carSpeed,
      dt
    );
  } else {
    moveFoot(dt);

    clampWorld(
      G.player
    );
  }
}

// -----------------------------------------------------------------------------
// SETUP
// -----------------------------------------------------------------------------

export function setupMovement() {
  on('key', k => {
    // Reset camera.
    if (k === 'r') {
      G.camYaw =
        G.inCar
          ? G.car.rotation.y
          : 0;

      G.camPitch = 0.38;
      G.camDistance = 10.5;
    }
  });
}