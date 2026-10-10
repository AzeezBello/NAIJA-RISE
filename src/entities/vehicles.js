import * as THREE from 'three';
import { G, pos } from '../core/context.js';
import { approach, pick, rnd } from '../core/utils.js';
import { mat, lamps, colliders } from '../world/builders.js';
import {
  VEH,
  PARKED,
  TRAFFIC_MIX,
  TRAFFIC_COLORS,
  LANE_OFFSET,
  MODELS,
  MODEL_PAINT,
  USE_MODELS,
} from '../data/vehicles.js';
import { attachModel, spinWheels } from './vehicleModels.js';
import {
  ROADS,
  BUSSTOPS,
  ROAD_WIDTHS,
  roadRules,
  JUNCTIONS,
  roadExtent,
  BRIDGE_RUSH,
  onBridge,
  inWater,
} from '../data/locations.js';
import {
  heightAt,
  deckHeightAt,
  deckAt,
} from '../world/terrain.js';
import { lightFor } from '../systems/trafficlights.js';
import { PERF } from '../data/config.js';

/**
 * Resolve a vehicle's vertical road surface.
 *
 * Elevated bridge height is applied only when the vehicle is verified
 * to be on the deck, or its existing elevation confirms deck occupancy.
 * A vehicle beneath an elevated deck remains at ground level.
 */
function vehicleSurfaceHeight(x, z, currentY = 0, forceDeck = false) {
  const result = deckHeightAt(x, z);

  if (!result?.deck || !Number.isFinite(result.height)) {
    return 0;
  }

  const deckY = result.height;

  // Ground-level road and low ramp.
  if (deckY <= 2.25) {
    return deckY;
  }

  // Caller has verified this is a vehicle spawning on the bridge.
  if (forceDeck) {
    return deckY;
  }

  // Preserve elevation only when the vehicle was already on the deck.
  if (Math.abs(currentY - deckY) <= 2.0) {
    return deckY;
  }

  // Do not pull ground traffic up onto an overhead bridge.
  return 0;
}


// ============================================================
// Vehicle forward
// ============================================================

export const vForward = o =>
  new THREE.Vector3(-Math.sin(o.rotation.y), 0, -Math.cos(o.rotation.y));

// ============================================================
// Occupants (drivers) — local meshes, no npcs.js import
// ============================================================

const DRIVER_SEAT = {
  keke: { x: 0, y: 0.95, z: -0.4 },
  danfo: { x: 0.55, y: 1.2, z: -1.85 },
  korope: { x: 0.4, y: 1.1, z: -1.15 },
  car: { x: 0.4, y: 1.0, z: -0.25 },
  police: { x: 0.4, y: 1.0, z: -0.25 },
  brt: { x: 0.55, y: 1.5, z: -4.8 },
  tanker: { x: 0.55, y: 1.2, z: -3.2 },
  lawma: { x: 0.55, y: 1.2, z: -2.5 },
  fire: { x: 0.55, y: 1.2, z: -3.2 },
  army: { x: 0.55, y: 1.2, z: -2.5 },
  // okada already has a procedural rider in makeVehicle
};
const PASSENGER_SEATS = {
  danfo: [
    { x: -0.48, y: 1.05, z: -0.8 }, { x: 0.48, y: 1.05, z: -0.1 },
    { x: -0.48, y: 1.05, z: 0.65 }, { x: 0.48, y: 1.05, z: 1.15 },
    { x: -0.48, y: 1.05, z: 1.8 },
  ],
  korope: [
    { x: -0.42, y: 0.95, z: -0.35 }, { x: -0.4, y: 0.95, z: 0.45 },
    { x: 0.4, y: 0.95, z: 0.45 }, { x: -0.4, y: 0.95, z: 1.15 },
  ],
  keke: [
    { x: -0.35, y: 0.62, z: 0.45 }, { x: 0.35, y: 0.62, z: 0.45 },
  ],
  brt: [
    { x: -0.62, y: 1.15, z: -3.1 }, { x: 0.62, y: 1.15, z: -2.1 },
    { x: -0.62, y: 1.15, z: -0.9 }, { x: 0.62, y: 1.15, z: 0.3 },
    { x: -0.62, y: 1.15, z: 1.5 }, { x: 0.62, y: 1.15, z: 2.8 },
  ],
};

const SKINS = [0x5a3a28, 0x6a4a3a, 0x4a2e20, 0x7a5a40];
const TOPS = [0x2bb34a, 0xc8d400, 0x1c4fa0, 0xf5c518, 0xd62828, 0x356a50];

/** Simple seated figure parented to the vehicle. */
function makeDriverMesh() {
  const g = new THREE.Group();
  g.name = 'driver';
  g.userData.isOccupant = true;

  const skin = pick(SKINS);
  const top = pick(TOPS);

  // Torso
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.4, 4, 8),
    new THREE.MeshStandardMaterial({ color: top, roughness: 0.75 })
  );
  body.position.y = 0.45;
  body.castShadow = true;
  g.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 })
  );
  head.position.y = 0.95;
  head.castShadow = true;
  g.add(head);

  // Cap (common for commercial drivers)
  if (Math.random() < 0.55) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.7 })
    );
    cap.position.y = 1.08;
    g.add(cap);
  }

  return g;
}

/**
 * Seat a driver in commercial / traffic vehicles.
 * Skip if already seated or type has no seat map (okada uses built-in rider).
 */
export function seatDriver(vehicle, { force = false } = {}) {
  if (!vehicle?.userData) return null;
  if (vehicle.userData.driver && !force) return vehicle.userData.driver;

  const type = vehicle.userData.type;
  const seat = DRIVER_SEAT[type];
  if (!seat) return null;

  // Remove previous if force-replace
  if (vehicle.userData.driver) {
    vehicle.remove(vehicle.userData.driver);
    vehicle.userData.driver = null;
  }

  const d = makeDriverMesh();
  d.position.set(seat.x, seat.y, seat.z);
  // Face vehicle forward (local -Z in our vehicle convention)
  d.rotation.y = Math.PI;
  vehicle.add(d);
  vehicle.userData.driver = d;
  vehicle.userData.hasDriver = true;
  return d;
}

function fillTrafficPassengers(vehicle, type, passengerCount = null) {
  const seats = PASSENGER_SEATS[type];
  if (!seats) return;
  for (const child of [...vehicle.children]) {
    if (!child.userData?.isPassenger) continue;
    vehicle.remove(child);
    child.traverse(mesh => {
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material?.dispose();
      }
    });
  }
  const count = passengerCount ?? ((type === 'danfo' || type === 'brt')
    ? 3 + Math.floor(Math.random() * (seats.length - 2))
    : type === 'korope'
      ? 2 + Math.floor(Math.random() * (seats.length - 1))
      : 1 + Math.floor(Math.random() * seats.length));
  const passengers = [];
  for (const seat of seats.slice(0, Math.min(count, seats.length))) {
    const passenger = makeDriverMesh();
    passenger.name = 'passenger';
    passenger.userData.isPassenger = true;
    passenger.userData.role = 'passenger';
    passenger.position.set(seat.x, seat.y, seat.z);
    passenger.rotation.y = Math.PI;
    vehicle.add(passenger);
    passengers.push(passenger);
  }
  vehicle.userData.passengers = passengers;
}

const TRANSIT_TYPES = new Set(['danfo', 'korope', 'keke', 'brt']);
let transitLines = null;

function getTransitLines() {
  if (transitLines) return transitLines;
  const byRoad = new Map();
  for (const stop of BUSSTOPS) {
    let nearest = null;
    for (const axis of ['h', 'v']) {
      for (const k of ROADS[axis]) {
        const [start, end] = roadExtent(axis, k);
        const along = axis === 'h' ? stop.x : stop.z;
        if (along < start - 2 || along > end + 2) continue;
        const across = Math.abs((axis === 'h' ? stop.z : stop.x) - k);
        const key = `${axis}:${k}`;
        const width = ROAD_WIDTHS[axis][k] || 18;
        if (across > width / 2 + 18) continue;
        if (!nearest || across < nearest.across) {
          nearest = { key, axis, k, along, across, stop };
        }
      }
    }
    if (!nearest) continue;
    if (!byRoad.has(nearest.key)) {
      byRoad.set(nearest.key, {
        axis: nearest.axis,
        k: nearest.k,
        stops: [],
      });
    }
    byRoad.get(nearest.key).stops.push({
      id: nearest.stop.id,
      name: nearest.stop.name,
      x: nearest.stop.x,
      z: nearest.stop.z,
      along: nearest.along,
    });
  }
  transitLines = [...byRoad.values()]
    .filter(line => line.stops.length > 1)
    .map(line => ({
      ...line,
      stops: line.stops.sort((a, b) => a.along - b.along),
    }));
  return transitLines;
}

function pickTransitLine(type) {
  const lines = getTransitLines();
  const candidates = type === 'brt'
    ? lines.filter(line => line.axis === 'h' && line.k === -330)
    : lines;
  return pick(candidates.length ? candidates : lines);
}

function serviceTransitStop(t) {
  const stop = t.transitStops[t.stopIndex];
  t.stoppedAtStop = stop;
  t.stopTimer = 3.5 + Math.random() * 1.5;

  const passengers = t.g.userData.passengers?.length || 0;
  const capacity = PASSENGER_SEATS[t.type]?.length || passengers;
  const alighting = Math.floor(Math.random() * (passengers + 1));
  const remaining = passengers - alighting;
  const boarding = Math.floor(Math.random() * (capacity - remaining + 1));
  t.passengerCount = Math.min(capacity, remaining + boarding);
  fillTrafficPassengers(t.g, t.type, t.passengerCount);
}

function departTransitStop(t) {
  const stopIndex = t.stopIndex + t.dir;
  if (stopIndex < 0 || stopIndex >= t.transitStops.length) {
    t.dir *= -1;
    t.g.rotation.y = poseFor(t);
    t.stopIndex += t.dir;
  } else {
    t.stopIndex = stopIndex;
  }
  t.stoppedAtStop = null;
  t.stopTimer = 0;
}

/** Hide / show driver (enter vehicle / exit). */
export function setDriverVisible(vehicle, visible) {
  const d = vehicle?.userData?.driver;
  if (d) d.visible = !!visible;
}

/**
 * Eject a driver into the world beside a vehicle.
 * Keeps the ejected character on the vehicle's current surface.
 */
export function ejectDriver(vehicle, side = 1) {
  const driver = vehicle?.userData?.driver;
  const scene = G.scene;

  if (!driver || !vehicle || !scene) {
    return null;
  }

  vehicle.updateWorldMatrix(true, true);

  const worldPosition = new THREE.Vector3();
  driver.getWorldPosition(worldPosition);

  // Calculate the vehicle's world-space right direction.
  const worldQuaternion = new THREE.Quaternion();
  vehicle.getWorldQuaternion(worldQuaternion);

  const sideVector = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(worldQuaternion)
    .normalize();

  worldPosition.addScaledVector(sideVector, 1.4 * side);

  // Resolve surface using the vehicle's world-space elevation.
  const vehicleWorldPosition = new THREE.Vector3();
  vehicle.getWorldPosition(vehicleWorldPosition);

  worldPosition.y = vehicleSurfaceHeight(
    worldPosition.x,
    worldPosition.z,
    vehicleWorldPosition.y,
    false
  );

  // Convert world coordinates to the destination scene's local space.
  scene.updateWorldMatrix(true, false);
  const localPosition = scene.worldToLocal(worldPosition.clone());

  vehicle.remove(driver);
  scene.add(driver);

  driver.position.copy(localPosition);

  // Face away from the vehicle in world space.
  const away = worldPosition
    .clone()
    .sub(vehicleWorldPosition);

  away.y = 0;

  if (away.lengthSq() > 0.001) {
    const yaw = Math.atan2(-away.x, -away.z);
    const worldEuler = new THREE.Euler(0, yaw, 0);
    const targetWorldQuaternion =
      new THREE.Quaternion().setFromEuler(worldEuler);

    if (driver.parent) {
      const parentWorldQuaternion = new THREE.Quaternion();
      driver.parent.getWorldQuaternion(parentWorldQuaternion);
      targetWorldQuaternion.premultiply(
        parentWorldQuaternion.invert()
      );
    }

    driver.quaternion.copy(targetWorldQuaternion);
  }

  driver.visible = true;
  driver.updateMatrixWorld(true);

  vehicle.userData.driver = null;
  vehicle.userData.hasDriver = false;

  G._ejected = G._ejected || [];
  G._ejected.push({ g: driver, t: 8 });

  return worldPosition;
}

/** Tick ejected drivers (fade-out cleanup). Call from city update if desired. */
export function updateEjected(dt) {
  if (!G._ejected?.length) return;
  for (let i = G._ejected.length - 1; i >= 0; i--) {
    const e = G._ejected[i];
    e.t -= dt;
    if (e.t <= 0) {
      G.scene.remove(e.g);
      G._ejected.splice(i, 1);
    }
  }
}

// ============================================================
// Procedural vehicle helpers
// ============================================================

function wheel(g, x, y, z, r = 0.38, width = 0.28) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, width, 16),
    new THREE.MeshStandardMaterial({
      color: 0x0d0e10,
      roughness: 0.92,
      metalness: 0.05,
    })
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  tire.receiveShadow = true;
  group.add(tire);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.55, r * 0.55, width * 1.08, 12),
    new THREE.MeshStandardMaterial({
      color: 0xc5c8cc,
      roughness: 0.35,
      metalness: 0.65,
    })
  );
  rim.rotation.z = Math.PI / 2;
  group.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.18, r * 0.18, width * 1.12, 8),
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.4,
    })
  );
  hub.rotation.z = Math.PI / 2;
  group.add(hub);

  group.userData.isWheel = true;
  group.userData.proceduralVisual = true;
  g.add(group);

  if (!g.userData.wheels) g.userData.wheels = [];
  g.userData.wheels.push(group);
  g.userData.wheelR = r;

  return group;
}

function lamp(g, x, y, z) {
  const l = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.18, 0.05),
    mat(0xffe7ad)
  );
  l.position.set(x, y, z);
  g.add(l);
  lamps.push(l.material);
}

const body = c =>
  new THREE.MeshStandardMaterial({
    color: c,
    metalness: 0.35,
    roughness: 0.38,
  });
const GLASS = () =>
  new THREE.MeshStandardMaterial({
    color: 0x152022,
    roughness: 0.15,
    metalness: 0.3,
  });
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function truck(g, add, len, cabColor, bedColor, extra) {
  const glass = GLASS();
  add(B(2.4, 2.3, 2.4), body(cabColor), 0, 1.55, -len / 2 + 1.2);
  add(B(2.44, 0.7, 0.1), glass, 0, 1.9, -len / 2 - 0.02);
  add(B(2.5, 1.9, len - 2.8), body(bedColor), 0, 1.5, 1.5);
  for (const sx of [-1, 1]) {
    for (const sz of [-len / 2 + 1.1, len / 2 - 2.6, len / 2 - 1]) {
      wheel(g, sx * 1.15, 0.5, sz, 0.48);
    }
  }
  lamp(g, -0.8, 0.9, -len / 2 - 0.03);
  lamp(g, 0.8, 0.9, -len / 2 - 0.03);
  if (extra) extra();
}

// ============================================================
// Make vehicle
// ============================================================

export function makeVehicle(type, color = 0x172e35, opts = {}) {
  const g = new THREE.Group();
  g.userData.type = type;
  g.userData.enterable = true;
  g.userData.wheels = [];

  const glass = GLASS();

  const add = (geo, material, x, y, z) => {
    const o = new THREE.Mesh(geo, material);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    o.userData.body = !!(
      material?.isMeshStandardMaterial &&
      material !== glass &&
      material.color &&
      material.color.getHex() !== 0x111111 &&
      material.color.getHex() !== 0x101111
    );
    o.userData.proceduralVisual = true;
    g.add(o);
    return o;
  };

  switch (type) {
    case 'car':
    case 'police': {
      const c = type === 'police' ? 0x14213d : color;
      add(B(2.55, 0.56, 4.75), body(c), 0, 0.65, 0);
      add(B(2.08, 0.72, 2.15), glass, 0, 1.1, 0.15);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) wheel(g, sx * 1.16, 0.42, sz * 1.55);
      }
      lamp(g, -0.7, 0.72, -2.39);
      lamp(g, 0.7, 0.72, -2.39);
      if (type === 'police') {
        add(B(2.58, 0.2, 4.75), body(0xf0f0f0), 0, 0.78, 0);
        const bar = add(
          B(1, 0.18, 0.4),
          new THREE.MeshStandardMaterial({
            color: 0x2244ff,
            emissive: 0x2244ff,
            emissiveIntensity: 0.4,
          }),
          0,
          1.55,
          0.1
        );
        g.userData.lightbar = bar.material;
      }
      break;
    }

    case 'danfo': {
      const Y = 0xf5c518;
      const BLK = 0x111111;
      add(B(2.35, 2.15, 5.4), body(Y), 0, 1.4, 0);
      add(B(2.38, 0.55, 3.6), glass, 0, 1.95, 0.15);
      add(B(2.38, 0.7, 0.08), glass, 0, 1.9, -2.68);
      add(B(2.38, 0.5, 0.08), glass, 0, 1.85, 2.68);
      for (const sx of [-1, 1]) {
        add(B(0.05, 0.32, 5.4), body(BLK), sx * 1.19, 1.05, 0);
      }
      add(B(2.36, 0.32, 5.42), body(BLK), 0, 1.05, 0);
      add(B(2.1, 0.7, 0.9), body(Y), 0, 0.95, 2.35);
      add(B(2.2, 0.25, 0.15), body(0x333333), 0, 0.55, -2.72);
      for (const sx of [-1, 1]) {
        for (const sz of [-1.6, 1.6]) wheel(g, sx * 1.05, 0.42, sz, 0.4);
      }
      lamp(g, -0.75, 0.95, -2.72);
      lamp(g, 0.75, 0.95, -2.72);
      g.userData.commercial = true;
      break;
    }

    case 'keke': {
      const Y = 0xf5c518;
      const GRN = 0x2bb34a;
      add(B(1.35, 0.9, 1.5), body(Y), 0, 0.85, -0.35);
      add(B(1.28, 0.75, 1.0), glass, 0, 1.45, -0.35);
      add(B(1.45, 0.08, 1.4), body(Y), 0, 1.9, -0.3);
      add(B(1.4, 0.55, 1.15), body(Y), 0, 0.7, 0.85);
      add(B(1.42, 0.5, 0.06), body(GRN), 0, 0.95, 1.4);
      for (const sx of [-0.6, 0.6]) {
        add(B(0.06, 0.7, 0.06), body(0x333333), sx, 1.35, 0.7);
      }
      add(B(1.3, 0.06, 0.06), body(0x333333), 0, 1.7, 0.7);
      wheel(g, 0, 0.32, -1.0, 0.28);
      wheel(g, -0.55, 0.32, 0.85, 0.28);
      wheel(g, 0.55, 0.32, 0.85, 0.28);
      lamp(g, 0, 0.95, -1.15);
      g.userData.commercial = true;
      break;
    }

    case 'brt': {
      const BLU = 0x1c4fa0;
      const WHT = 0xf0f0f0;
      add(B(2.7, 3.1, 12), body(BLU), 0, 1.85, 0);
      add(B(2.74, 0.55, 12), body(WHT), 0, 1.35, 0);
      add(B(2.74, 0.95, 11.2), glass, 0, 2.55, 0);
      add(B(2.74, 1.0, 0.1), glass, 0, 2.5, -5.95);
      add(B(2.74, 0.8, 0.1), glass, 0, 2.4, 5.95);
      add(B(1.6, 0.35, 0.8), body(0x111111), 0, 3.5, -4.2);
      add(B(1.5, 0.25, 0.08), body(0xffc52f), 0, 3.5, -4.62);
      add(B(0.08, 1.8, 1.4), body(WHT), -1.36, 1.5, -2.5);
      for (const sx of [-1, 1]) {
        for (const sz of [-4.2, 0, 4.2]) wheel(g, sx * 1.2, 0.5, sz, 0.5);
      }
      lamp(g, -0.95, 1.05, -6.0);
      lamp(g, 0.95, 1.05, -6.0);
      g.userData.commercial = true;
      break;
    }

    case 'korope': {
      const Y = 0xf5c518;
      const BLK = 0x1a1a1a;
      add(B(1.7, 1.35, 1.5), body(Y), 0, 1.15, -1.05);
      add(B(1.65, 0.55, 0.08), glass, 0, 1.55, -1.82);
      add(B(0.08, 0.45, 0.9), glass, 0.86, 1.5, -1.05);
      add(B(0.08, 0.45, 0.9), glass, -0.86, 1.5, -1.05);
      add(B(1.85, 1.55, 2.4), body(Y), 0, 1.25, 0.55);
      add(B(0.06, 0.5, 1.8), glass, 0.94, 1.55, 0.55);
      add(B(0.06, 0.5, 1.8), glass, -0.94, 1.55, 0.55);
      add(B(1.88, 0.18, 2.42), body(BLK), 0, 0.95, 0.55);
      add(B(1.9, 0.08, 2.5), body(0xe0a800), 0, 2.05, 0.5);
      add(B(1.6, 0.35, 0.15), body(0x333333), 0, 0.55, -1.85);
      lamp(g, -0.55, 0.7, -1.9);
      lamp(g, 0.55, 0.7, -1.9);
      for (const sx of [-1, 1]) {
        for (const sz of [-1.15, 1.15]) {
          wheel(g, sx * 0.92, 0.34, sz, 0.34, 0.26);
        }
      }
      add(B(1.2, 0.28, 0.06), body(0x111111), 0, 2.15, -1.7);
      g.userData.commercial = true;
      break;
    }

    case 'okada':
      add(B(0.3, 0.5, 1.8), body(color), 0, 0.65, 0);
      add(B(0.5, 0.12, 0.6), body(0x222222), 0, 0.95, 0.2);
      wheel(g, 0, 0.35, -0.85, 0.35);
      wheel(g, 0, 0.35, 0.85, 0.35);
      add(
        new THREE.CapsuleGeometry(0.24, 0.55, 4, 8),
        mat(pick([0x356a50, 0x8b5a31, 0x4c5178])),
        0,
        1.3,
        0.15
      );
      add(new THREE.SphereGeometry(0.22, 10, 8), mat(0x1b1b1b), 0, 1.85, 0.05);
      lamp(g, 0, 0.85, -0.95);
      g.userData.commercial = true;
      g.userData.hasDriver = true; // procedural rider is the driver
      break;

    case 'fire':
      truck(g, add, 8, 0xc62828, 0xb71c1c, () => {
        add(B(0.5, 0.3, 4.5), body(0xdddddd), 0.6, 2.6, 1.6);
        add(B(0.5, 0.3, 4.5), body(0xdddddd), -0.6, 2.6, 1.6);
        const bar = add(
          B(1.2, 0.18, 0.4),
          new THREE.MeshStandardMaterial({
            color: 0xff2222,
            emissive: 0xff2222,
            emissiveIntensity: 0.5,
          }),
          0,
          2.8,
          -2.8
        );
        g.userData.lightbar = bar.material;
      });
      break;

    case 'lawma':
      truck(g, add, 7, 0xf07a1e, 0xd96a12, () => {
        add(B(2.2, 0.3, 3.4), body(0x4a4a4a), 0, 2.6, 1.5);
      });
      break;

    case 'army':
      truck(g, add, 7, 0x3f5a2a, 0x4e6b36, () => {
        add(B(2.5, 1.2, 4.2), body(0x5f7a45), 0, 3.0, 1.5);
      });
      break;

    case 'tanker': {
      truck(g, add, 10, 0xe0e0e0, 0x3a3a3a, () => {
        const tank = add(
          new THREE.CylinderGeometry(1.25, 1.25, 6.8, 18),
          body(0xd9d9d9),
          0,
          2.1,
          1.6
        );
        tank.rotation.x = Math.PI / 2;
        add(B(0.2, 0.9, 5.5), body(0xc62828), 1.26, 2.1, 1.6);
        add(B(0.2, 0.9, 5.5), body(0xc62828), -1.26, 2.1, 1.6);
      });
      break;
    }

    default: {
      add(B(2.4, 0.5, 4.5), body(color), 0, 0.65, 0);
      add(B(2.0, 0.7, 2.0), glass, 0, 1.1, 0.1);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) wheel(g, sx * 1.1, 0.4, sz * 1.5);
      }
      break;
    }
  }

  if (!g.userData.wheels) g.userData.wheels = [];
  g.userData.wheelR = g.userData.wheelR || 0.38;

  const names = USE_MODELS && MODELS[type];
  if (names?.length) {
    const modelName = pick(names);
    const modelColor =
      type === 'danfo' || type === 'keke'
        ? null
        : type === 'okada'
          ? (MODEL_PAINT.okada ?? 0xf5c518)
          : type in MODEL_PAINT
            ? MODEL_PAINT[type]
            : color;
    attachModel(g, type, modelName, modelColor, {
      lightbar:
        type === 'police' ? 0x2244ff : type === 'fire' ? 0xff2222 : null,
    });
  }

  if (VEH[type]?.commercial) g.userData.commercial = true;

  // Default: put a driver in traffic / commercial seats (opt out with opts.noDriver)
  if (!opts.noDriver && DRIVER_SEAT[type]) {
    seatDriver(g);
  }
  if (!opts.noDriver) fillTrafficPassengers(g, type);

  G.scene.add(g);
  return g;
}

// ============================================================
// Park placement
// ============================================================

function parkClear(x, z, wid, len, pad = 1.25) {
  if (inWater(x, z)) return false;

  const hw = wid * 0.5 + pad;
  const hd = len * 0.5 + pad;

  for (const c of colliders) {
    // Ignore elevated-only colliders when checking a ground-level
    // parking position. Ground-level colliders remain active.
    if (c.minY !== undefined && c.minY > 0.5) {
      continue;
    }

    const overlapX =
      Math.abs(x - c.x) < c.w / 2 + hw;

    const overlapZ =
      Math.abs(z - c.z) < c.d / 2 + hd;

    if (overlapX && overlapZ) {
      return false;
    }
  }

  return true;
}

function findParkSpot(x, z, wid, len, attempts = 24) {
  if (parkClear(x, z, wid, len)) {
    return { x, z };
  }

  for (let i = 1; i <= attempts; i++) {
    const step = 1.5 * i;

    const candidates = [
      [x + step, z],
      [x - step, z],
      [x, z + step],
      [x, z - step],
      [x + step, z + step],
      [x - step, z - step],
      [x + step, z - step],
      [x - step, z + step],
    ];

    for (const [nx, nz] of candidates) {
      if (parkClear(nx, nz, wid, len)) {
        return { x: nx, z: nz };
      }
    }
  }

  // Better to omit a blocked parked vehicle than to spawn it
  // on a kerb, island, building footprint, or in water.
  return null;
}

export function spawnParked() {
  G.parked = [];
  for (const p of PARKED) {
    const spec = VEH[p.type] || { wid: 2.2, len: 4.5 };
    const spot = findParkSpot(p.x, p.z, spec.wid, spec.len);
    if (!spot) {
      console.warn('[parked] skip (blocked)', p.type, p.x, p.z);
      continue;
    }
    const v = makeVehicle(p.type, p.color);
    // Never force deck for kerbside parking — ground only
    const y = vehicleSurfaceHeight(spot.x, spot.z, 0, false);
    v.position.set(spot.x, y, spot.z);
    v.rotation.y = p.rot || 0;
    v.userData.cond = 100;
    v.userData.enterable = true;
    v.userData.type = p.type;
    G.parked.push(v);
  }
}

export function spawnOwned(home) {
  for (const o of G.state.vehicles || []) {
    if (G.parked.some(v => v.userData.ownedId === o.id)) continue;
    // Player-owned: no AI driver
    const v = makeVehicle(o.type, 0x1f3a5a, { noDriver: true });
    v.userData.ownedId = o.id;
    v.userData.owned = true;
    v.userData.cond = o.cond ?? 100;
    const base = home ? home.door : { x: -42, z: 62 };
    const i = G.parked.filter(v => v.userData.owned).length;
    if (o.pos) {
      v.position.set(
        o.pos.x,
        vehicleSurfaceHeight(o.pos.x, o.pos.z, 0),
        o.pos.z
      );

      v.rotation.y = o.pos.rot;
    } else {
      const x = base.x + 6 + i * 4;
      const z = base.z - 3;
      v.position.set(
        x,
        vehicleSurfaceHeight(x, z, 0),
        z
      );
      
      v.rotation.y = Math.PI / 2;
    }
    G.parked.push(v);
    import('../systems/interaction.js').then(m => {
      if (o.livery !== undefined) m.applyLivery(v, o);
      if (o.slogan !== undefined) m.applySlogan(v, o);
    });
  }
}

// ============================================================
// Traffic AI
// ============================================================

const poseFor = t =>
  t.axis === 'h'
    ? t.dir > 0
      ? -Math.PI / 2
      : Math.PI / 2
    : t.dir > 0
      ? Math.PI
      : 0;

const snapLane = t => {
  const offset = t.dedicatedLane ? 8.5 : LANE_OFFSET;
  if (t.axis === 'h') t.g.position.z = t.k + t.dir * offset;
  else t.g.position.x = t.k - t.dir * offset;
};

export function spawnTraffic() {
  const trafficTypes = TRAFFIC_MIX.slice(
    0,
    PERF.lowEnd
      ? PERF.trafficCap.low
      : PERF.trafficCap.full
  );

  G.traffic = trafficTypes.map(type => {
    // Choose the final route before calculating its coordinates.
    const transitLine = TRANSIT_TYPES.has(type) ? pickTransitLine(type) : null;
    let axis = transitLine?.axis || (
      type === 'brt' || type === 'tanker' ? 'h' : pick(['h', 'v'])
    );
    let k = transitLine?.k ?? pick(axis === 'h' ? ROADS.h : ROADS.v);
    let dir = pick([1, -1]);

    const [start, end] = roadExtent(axis, k);
    let along = rnd(start + 10, end - 10);
    if (transitLine) {
      const firstStop = transitLine.stops[0].along;
      const lastStop = transitLine.stops.at(-1).along;
      along = rnd(firstStop + 2, lastStop - 2);
    }

    if (Math.abs(along) < 25 && Math.abs(k) < 1) {
      along += 40;
    }

    const g = makeVehicle(type, pick(TRAFFIC_COLORS));

    const t = {
      g,
      type,
      axis,
      dir,
      k,
      speed: 0,
      cruise: (VEH[type]?.max ?? 8) * rnd(0.5, 0.7),
      cool: rnd(0, 2),
      pursuit: false,
      acc: 0,
      far: false,
      dedicatedLane: type === 'brt' && axis === 'h' && k === -330,
      transitStops: transitLine?.stops || null,
      stopIndex: null,
      stoppedAtStop: null,
      stopTimer: 0,
    };
    if (t.transitStops) {
      t.stopIndex = t.transitStops.findIndex(stop =>
        dir > 0 ? stop.along > along + 2 : stop.along < along - 2
      );
      if (t.stopIndex < 0) {
        dir *= -1;
        t.dir = dir;
        t.stopIndex = t.transitStops.findIndex(stop =>
          dir > 0 ? stop.along > along + 2 : stop.along < along - 2
        );
      }
    }

    // Establish horizontal position first.
    if (axis === 'h') {
      g.position.set(along, 0, k + dir * LANE_OFFSET);
    } else {
      g.position.set(k - dir * LANE_OFFSET, 0, along);
    }
    snapLane(t);

    // FIX: declare and resolve the deck before reading its properties.
    const deck = deckAt(g.position.x, g.position.z);
    const deckResult = deckHeightAt(g.position.x, g.position.z);
    const deckY =
      deckResult?.deck && Number.isFinite(deckResult.height)
        ? deckResult.height
        : 0;

    const roadAlong = axis === 'h'
      ? g.position.x
      : g.position.z;

    // A deck must match the road axis, lane and along-road extent.
    const deckMatchesRoad =
      !!deck &&
      deck.axis === axis &&
      Math.abs(deck.k - k) <= deck.halfW + LANE_OFFSET + 0.5 &&
      roadAlong >= deck.from &&
      roadAlong <= deck.to;

    // Do not elevate a ground road simply because a bridge is nearby.
    const isBridgeRoad =
      deckMatchesRoad &&
      deckY > 2.25 &&
      onBridge(axis, k, roadAlong);

    g.position.y = vehicleSurfaceHeight(
      g.position.x,
      g.position.z,
      0,
      isBridgeRoad
    );

    g.rotation.y = poseFor(t);

    return t;
  });
}

export function rejoinTraffic(t) {
  if (!t?.g?.position) return;

  const p = t.g.position;
  const previousY = p.y;
  let best = null;

  for (const z of ROADS.h) {
    const [a, b] = roadExtent('h', z);
    if (p.x < a || p.x > b) continue;

    const d = Math.abs(p.z - z);
    if (!best || d < best.d) {
      best = { d, axis: 'h', k: z };
    }
  }

  for (const x of ROADS.v) {
    const [a, b] = roadExtent('v', x);
    if (p.z < a || p.z > b) continue;

    const d = Math.abs(p.x - x);
    if (!best || d < best.d) {
      best = { d, axis: 'v', k: x };
    }
  }

  if (!best) return;

  t.axis = best.axis;
  t.k = best.k;
  t.dir = pick([1, -1]);
  t.pursuit = false;
  t.far = false;
  t.acc = 0;

  snapLane(t);

  // Resolve elevation at the new lane position.
  p.y = vehicleSurfaceHeight(p.x, p.z, previousY, false);

  t.g.rotation.y = poseFor(t);
}

export function updateTraffic(dt) {
  const q = G.quality || 'medium';
  const activeR = q === 'low' ? 80 : q === 'high' ? 120 : 100;
  const softR = q === 'low' ? 120 : q === 'high' ? 180 : 160;
  const cullR = q === 'low' ? 160 : q === 'high' ? 260 : 220;
  const active2 = activeR * activeR;
  const soft2 = softR * softR;
  const cull2 = cullR * cullR;
  const pp = pos();
  if (!pp) return;

  for (const t of G.traffic) {
    if (!t?.g) continue;
    if (t.hidden) {
      t.g.visible = false;
      continue;
    }

    if (t.pursuit) {
      t.far = false;
      t.g.visible = true;
      t.acc = 0;
      stepTraffic(t, dt, pp);
      spinWheels(t.g, t.speed, dt);
      continue;
    }

    const p = t.g.position;
    const dx = p.x - pp.x;
    const dz = p.z - pp.z;
    const d2 = dx * dx + dz * dz;

    if (d2 > cull2) {
      t.far = true;
      t.g.visible = false;
      t.acc = 0;
      continue;
    }

    t.far = false;
    t.g.visible = true;

    if (d2 <= active2) {
      t.acc = 0;
      stepTraffic(t, dt, pp);
      spinWheels(t.g, t.speed, dt);
      continue;
    }

    t.acc = (t.acc || 0) + dt;
    const interval = d2 > soft2 ? 0.2 : 1 / 15;
    if (t.acc < interval) continue;
    const simDt = t.acc;
    t.acc = 0;
    stepTraffic(t, simDt, pp);
  }
}

export function updateParkedVisibility() {
  const pp = pos();
  if (!pp || !G.parked?.length) return;

  const q = G.quality || 'medium';
  const cullR = q === 'low' ? 160 : q === 'high' ? 260 : 220;
  const cull2 = cullR * cullR;

  for (const g of G.parked) {
    if (!g?.position) continue;
    if (g.userData?.owned) {
      g.visible = true;
      continue;
    }
    const dx = g.position.x - pp.x;
    const dz = g.position.z - pp.z;
    g.visible = dx * dx + dz * dz <= cull2;
  }
}

function stepTraffic(t, dt, pp) {
  const fx = t.axis === 'h' ? t.dir : 0;
  const fz = t.axis === 'v' ? t.dir : 0;
  let target = t.cruise;

  const check = (px, pz, gap) => {
    const dx = px - t.g.position.x;
    const dz = pz - t.g.position.z;
    const along = dx * fx + dz * fz;
    const lat = Math.abs(dx * fz - dz * fx);
    if (along > 0 && along < gap + 9 && lat < 3) {
      target = Math.min(target, Math.max(0, (along - gap) * 1.6));
    }
  };

  for (const o of G.traffic) {
    if (o !== t) {
      check(
        o.g.position.x,
        o.g.position.z,
        VEH[t.type].len / 2 + VEH[o.type].len / 2 + 1.5
      );
    }
  }
  check(pp.x, pp.z, VEH[t.type].len / 2 + 3);

  const jam = G.jam;
  if (jam && jam.axis === t.axis && jam.k === t.k) {
    const c = t.axis === 'h' ? t.g.position.x : t.g.position.z;
    if (c > jam.from && c < jam.to) target = Math.min(target, 1.6);
  }

  if (G.rain) target *= 0.7;
  target *= roadRules(t.axis, t.k).speed;

  if (
    onBridge(
      t.axis,
      t.k,
      t.axis === 'h' ? t.g.position.x : t.g.position.z
    )
  ) {
    target *= 1.4 * BRIDGE_RUSH(G.state.clock);
  }

  if (roadRules(t.axis, t.k).lights !== false && lightFor(t.axis) !== 'green') {
    for (const j of JUNCTIONS) {
      const jc = t.axis === 'h' ? j.x : j.z;
      const jk = t.axis === 'h' ? j.z : j.x;
      if (jk !== t.k) continue;
      const c = t.axis === 'h' ? t.g.position.x : t.g.position.z;
      const ahead = (jc - c) * t.dir - 14;
      if (ahead > -2 && ahead < 10) {
        target = Math.min(target, Math.max(0, (ahead - 3) * 1.2));
        break;
      }
    }
  }

  const hour = G.state.clock;
  const rushHour = (hour >= 7 && hour < 10) || (hour >= 16 && hour < 20);
  if (rushHour && roadRules(t.axis, t.k).speed <= 1.1) target *= 0.62;

  if (t.stoppedAtStop) {
    if (t.boardingHold) {
      target = 0;
    } else {
      t.stopTimer -= dt;
      if (t.stopTimer <= 0) departTransitStop(t);
      else target = 0;
    }
  } else if (t.transitStops?.length) {
    const nextStop = t.transitStops[t.stopIndex];
    if (nextStop) {
      const along = t.axis === 'h' ? t.g.position.x : t.g.position.z;
      const distance = (nextStop.along - along) * t.dir;
      if (distance >= -1 && distance < 26) {
        target = Math.min(target, Math.max(0, (distance - 3) * 0.5));
        if (distance <= 3 && t.speed < 1.1) {
          if (t.axis === 'h') t.g.position.x = nextStop.along - t.dir * 2;
          else t.g.position.z = nextStop.along - t.dir * 2;
          t.speed = 0;
          serviceTransitStop(t);
        }
      }
    }
  }

  if (t.stoppedAtStop) {
    t.speed = 0;
  } else {
    t.speed = approach(t.speed, target, (target < t.speed ? 22 : 7) * dt);
    t.g.position.x += fx * t.speed * dt;
    t.g.position.z += fz * t.speed * dt;
  }

  t.cool -= dt;
  if (t.cool <= 0 && t.type !== 'brt' && !t.transitStops) {
    const cross = t.axis === 'h' ? ROADS.v : ROADS.h;
    const c = t.axis === 'h' ? t.g.position.x : t.g.position.z;
    for (const k of cross) {
      if (Math.abs(c - k) >= 1.2) continue;
      const [xa, xb] = roadExtent(t.axis === 'h' ? 'v' : 'h', k);
      if (t.k < xa || t.k > xb) continue;
      t.cool = 2.5;
      if (Math.random() < 0.4) {
        const nd = pick([1, -1]);
        if (t.axis === 'h') {
          t.axis = 'v';
          t.k = k;
          t.dir = nd;
          t.g.position.x = k - nd * LANE_OFFSET;
        } else {
          t.axis = 'h';
          t.k = k;
          t.dir = nd;
          t.g.position.z = k + nd * LANE_OFFSET;
        }
        t.g.rotation.y = poseFor(t);
      }
      break;
    }
  }

  const c2 = t.axis === 'h' ? t.g.position.x : t.g.position.z;
  const [ea, eb] = roadExtent(t.axis, t.k);
  if (c2 > eb + 2 || c2 < ea - 2) {
    const nc = c2 > eb ? ea : eb;
    if (t.axis === 'h') t.g.position.x = nc;
    else t.g.position.z = nc;
  }

  const previousY = t.g.position.y;

  t.g.position.y = vehicleSurfaceHeight(
    t.g.position.x,
    t.g.position.z,
    previousY
  );
}