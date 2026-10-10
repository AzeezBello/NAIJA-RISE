import * as THREE from 'three';
import { person } from './npcs.js'; // or export person from npcs.js

/** Seat offsets in local vehicle space (x right, y up, z forward−back). Lagos RHD → driver on +x-ish depending on model; use −x for “left” seat. */
const SEATS = {
  car:     { driver: { x: -0.45, y: 0.95, z: -0.35 }, passengers: [{ x: 0.45, y: 0.95, z: -0.35 }] },
  danfo:   { driver: { x: -0.7, y: 1.15, z: -1.6 }, passengers: [
    { x: 0.5, y: 1.1, z: -0.2 }, { x: -0.5, y: 1.1, z: 0.4 }, { x: 0.5, y: 1.1, z: 0.9 },
    { x: -0.5, y: 1.1, z: 1.4 }, { x: 0.5, y: 1.1, z: 1.8 },
  ]},
  korope:  { driver: { x: -0.45, y: 1.0, z: -1.0 }, passengers: [
    { x: 0.4, y: 1.0, z: 0.2 }, { x: -0.4, y: 1.0, z: 0.7 }, { x: 0.4, y: 1.0, z: 1.2 },
  ]},
  keke:    { driver: { x: 0, y: 0.85, z: 0.55 }, passengers: [
    { x: -0.35, y: 0.75, z: -0.35 }, { x: 0.35, y: 0.75, z: -0.35 },
  ]},
  okada:   { driver: { x: 0, y: 1.05, z: 0.1 }, passengers: [{ x: 0, y: 1.0, z: -0.45 }] },
  brt:     { driver: { x: -0.8, y: 1.4, z: -4.5 }, passengers: [
    { x: -0.6, y: 1.2, z: -2 }, { x: 0.6, y: 1.2, z: -1 }, { x: -0.6, y: 1.2, z: 0 },
    { x: 0.6, y: 1.2, z: 1 }, { x: -0.6, y: 1.2, z: 2 }, { x: 0.6, y: 1.2, z: 3 },
  ]},
};

function seatPerson(lookScale = 0.92) {
  const g = person({ scale: lookScale });
  // Sit: shorten legs visually by sinking into seat
  g.position.y = 0;
  g.rotation.x = 0.08;
  g.userData.occupant = true;
  return g;
}

/** Fill a vehicle group with driver (+ optional passengers). */
export function fillOccupants(vehicle, type, { passengers = true } = {}) {
  const seats = SEATS[type] || SEATS.car;
  const nPass = passengers
    ? (type === 'danfo' || type === 'brt' ? 3 + Math.floor(Math.random() * 3)
      : type === 'korope' ? 1 + Math.floor(Math.random() * 3)
      : type === 'keke' ? Math.floor(Math.random() * 3)
      : Math.random() < 0.5 ? 1 : 0)
    : 0;

  // Clear old
  for (const c of [...vehicle.children]) {
    if (c.userData?.occupant) vehicle.remove(c);
  }

  const driver = seatPerson(0.95);
  driver.position.set(seats.driver.x, seats.driver.y, seats.driver.z);
  driver.userData.role = 'driver';
  vehicle.add(driver);
  vehicle.userData.driver = driver;
  vehicle.userData.hasDriver = true;

  const list = [];
  for (let i = 0; i < nPass && i < (seats.passengers?.length || 0); i++) {
    const s = seats.passengers[i];
    const p = seatPerson(0.9);
    p.position.set(s.x, s.y, s.z);
    p.userData.role = 'passenger';
    vehicle.add(p);
    list.push(p);
  }
  vehicle.userData.passengers = list;
}

/** Remove driver (hijack). Passengers can flee or stay. */
export function ejectDriver(vehicle, worldPos) {
  const d = vehicle.userData.driver;
  if (!d) return null;
  vehicle.remove(d);
  // Place beside door in world space
  vehicle.updateMatrixWorld(true);
  const wp = worldPos || new THREE.Vector3();
  vehicle.localToWorld(wp.set(-1.2, 0, 0));
  d.position.copy(wp);
  d.position.y = 0;
  d.rotation.x = 0;
  d.userData.role = 'ejected';
  vehicle.userData.driver = null;
  vehicle.userData.hasDriver = false;
  return d;
}