import * as THREE from 'three';
import { G } from '../core/context.js';
import { colliders, occluders, mat } from './builders.js';

const ROOM = { x: 10000, z: 10000, width: 18, depth: 18, height: 3.2 };

function renderScene(scene) {
  const pass = G.composer?.passes.find(p => p.scene);
  if (pass) pass.scene = scene;
}

function roomBox(interior, x, y, z, w, h, d, color, solid = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  interior.scene.add(mesh);
  interior.objects.push(mesh);
  if (solid) {
    const collider = { x, z, w, d, bottomY: y, topY: y + h };
    colliders.push(collider);
    interior.colliders.push(collider);
    occluders.push(mesh);
    interior.occluders.push(mesh);
  }
  return mesh;
}

function buildRoom(place, kind) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x253039);
  scene.fog = new THREE.Fog(0x253039, 24, 52);
  scene.environment = G.scene.environment;
  const interior = {
    place,
    kind,
    scene,
    objects: [],
    colliders: [],
    occluders: [],
    door: null,
    closeTimer: 0.6,
    exiting: false,
    exitTimer: 0,
    work: { x: ROOM.x, z: ROOM.z - 1 },
  };

  roomBox(interior, ROOM.x, -0.12, ROOM.z, ROOM.width, 0.24, ROOM.depth, 0x887d6b);
  roomBox(interior, ROOM.x, 0, ROOM.z - ROOM.depth / 2, ROOM.width, ROOM.height, 0.3, 0xc6b99e, true);
  roomBox(interior, ROOM.x - ROOM.width / 2, 0, ROOM.z, 0.3, ROOM.height, ROOM.depth, 0xb9aa8f, true);
  roomBox(interior, ROOM.x + ROOM.width / 2, 0, ROOM.z, 0.3, ROOM.height, ROOM.depth, 0xb9aa8f, true);
  roomBox(interior, ROOM.x - 5.15, 0, ROOM.z + ROOM.depth / 2, 7.7, ROOM.height, 0.3, 0xc6b99e, true);
  roomBox(interior, ROOM.x + 5.15, 0, ROOM.z + ROOM.depth / 2, 7.7, ROOM.height, 0.3, 0xc6b99e, true);
  roomBox(interior, ROOM.x, 2.72, ROOM.z + ROOM.depth / 2, 2.6, 0.48, 0.3, 0xc6b99e, true);

  const hinge = new THREE.Group();
  hinge.position.set(ROOM.x - 1.1, 0, ROOM.z + ROOM.depth / 2);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.12), mat(0x493120));
  door.position.set(1.1, 1.1, 0);
  door.castShadow = true;
  hinge.add(door);
  scene.add(hinge);
  interior.objects.push(door);
  interior.door = hinge;
  interior.doorCollider = { x: ROOM.x, z: ROOM.z + ROOM.depth / 2, w: 2.2, d: 0.3, bottomY: 0, topY: 2.2 };
  colliders.push(interior.doorCollider);
  interior.colliders.push(interior.doorCollider);
  hinge.rotation.y = -Math.PI / 2;

  const ambient = new THREE.HemisphereLight(0xffedd2, 0x443629, 1.8);
  const ceiling = new THREE.PointLight(0xffd99a, 16, 30, 2);
  ceiling.position.set(ROOM.x, 2.8, ROOM.z);
  scene.add(ambient, ceiling);
  interior.objects.push(ambient, ceiling);
  interior.ambient = ambient;
  interior.ceiling = ceiling;

  if (kind === 'home') {
    roomBox(interior, ROOM.x - 4, 0.35, ROOM.z - 2, 4.6, 0.55, 2.6, 0x704c35, true);
    roomBox(interior, ROOM.x - 4, 0.9, ROOM.z - 2, 3.8, 0.22, 2.2, 0xd4c4a2);
    roomBox(interior, ROOM.x + 3, 0.3, ROOM.z + 1, 4, 0.5, 1.4, 0x79543b, true);
  } else if (place.kind === 'artisan') {
    roomBox(interior, ROOM.x, 0.45, ROOM.z - 1, 6, 0.9, 2, 0x795b3d, true);
    roomBox(interior, ROOM.x + 4.2, 0.8, ROOM.z - 5, 2.4, 1.6, 1, 0x846e54, true);
  } else if (['market', 'cafe', 'mall', 'restaurant', 'betshop', 'venue', 'museum'].includes(place.kind)) {
    roomBox(interior, ROOM.x, 0.55, ROOM.z - 2, 7.2, 1.1, 1.4, 0x76553c, true);
    for (const x of [-6, 6]) {
      roomBox(interior, ROOM.x + x, 0.4, ROOM.z - 6, 1.4, 0.8, 3, 0x8a7356, true);
    }
  } else {
    roomBox(interior, ROOM.x, 0.52, ROOM.z - 2, 5.2, 1.04, 2.2, 0x5a4638, true);
    roomBox(interior, ROOM.x + 5.6, 0.5, ROOM.z - 5, 2.4, 1, 1.4, 0x79634d, true);
  }
  if (kind === 'home') interior.work = { x: ROOM.x - 4, z: ROOM.z - 2 };
  return interior;
}

export function enterBuilding(place, kind = place.kind) {
  if (!place || G.interior || !G.player || G.inCar) return false;
  const outdoorScene = G.scene;
  const interior = buildRoom(place, kind);
  Object.assign(interior, {
    outdoorScene,
    outdoorPosition: G.player.position.clone(),
    outdoorRotation: G.player.rotation.clone(),
    outdoorYaw: G.camYaw,
    outdoorPitch: G.camPitch,
    outdoorDistance: G.camDistance,
    outdoorSky: G.sky,
    outdoorCameraPosition: G.camera.position.clone(),
    outdoorCameraQuaternion: G.camera.quaternion.clone(),
    outsideDoor: place.doorMesh || null,
  });
  if (interior.outsideDoor) interior.outsideDoor.rotation.y = -Math.PI / 2;
  const doorIndex = colliders.indexOf(interior.doorCollider);
  if (doorIndex >= 0) colliders.splice(doorIndex, 1);
  G.interior = interior;
  G.scene = interior.scene;
  G.scene.add(G.sun.target, G.sun, G.hemi, G.player);
  G.sky = null;
  G.player.position.set(ROOM.x, 0, ROOM.z + 6);
  G.player.rotation.set(0, Math.PI, 0);
  G.camYaw = 0;
  G.camPitch = 0.2;
  G.camDistance = 7.5;
  G.camera.position.set(ROOM.x, 7, ROOM.z + 15);
  G.camera.lookAt(ROOM.x, 1.2, ROOM.z);
  G.curSpeed = 0;
  renderScene(G.scene);
  return true;
}

export function leaveBuilding() {
  const interior = G.interior;
  if (!interior || interior.exiting) return;
  interior.exiting = true;
  interior.exitTimer = 0.28;
  interior.door.rotation.y = -Math.PI / 2;
  const doorIndex = colliders.indexOf(interior.doorCollider);
  if (doorIndex >= 0) colliders.splice(doorIndex, 1);
}

export function updateInterior(dt) {
  const interior = G.interior;
  if (!interior) return;
  if (interior.closeTimer > 0) {
    interior.closeTimer = Math.max(0, interior.closeTimer - dt);
    interior.door.rotation.y = -Math.PI / 2 * (interior.closeTimer / 0.6);
    if (!interior.closeTimer && !interior.exiting) colliders.push(interior.doorCollider);
  }
  if (!interior.exiting) return;
  interior.exitTimer -= dt;
  if (interior.exitTimer > 0) return;

  const { outdoorScene } = interior;
  G.scene = outdoorScene;
  G.scene.add(G.sun.target, G.sun, G.hemi, G.player);
  G.player.position.copy(interior.outdoorPosition);
  G.player.rotation.copy(interior.outdoorRotation);
  G.camYaw = interior.outdoorYaw;
  G.camPitch = interior.outdoorPitch;
  G.camDistance = interior.outdoorDistance;
  G.camera.position.copy(interior.outdoorCameraPosition);
  G.camera.quaternion.copy(interior.outdoorCameraQuaternion);
  G.sky = interior.outdoorSky;
  if (interior.outsideDoor) interior.outsideDoor.rotation.y = 0;
  for (const collider of interior.colliders) {
    const index = colliders.indexOf(collider);
    if (index >= 0) colliders.splice(index, 1);
  }
  for (const mesh of interior.occluders) {
    const index = occluders.indexOf(mesh);
    if (index >= 0) occluders.splice(index, 1);
  }
  for (const object of interior.objects) {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
    else object.material?.dispose();
  }
  interior.scene.clear();
  G.interior = null;
  renderScene(G.scene);
}

export function interactInterior() {
  const interior = G.interior;
  if (!interior || interior.exiting) return null;
  const p = G.player.position;
  if (Math.hypot(p.x - ROOM.x, p.z - (ROOM.z + 7.4)) < 2.5) {
    leaveBuilding();
    return 'exit';
  }
  if (Math.hypot(p.x - interior.work.x, p.z - interior.work.z) > 3.2) return null;
  if (interior.kind === 'home') return 'sleep';
  return 'service';
}

export function interiorPrompt() {
  if (!G.interior) return null;
  if (G.interior.exiting) return { text: 'Closing door…' };
  const p = G.player.position;
  if (Math.hypot(p.x - ROOM.x, p.z - (ROOM.z + 7.4)) < 3.2) {
    return { key: 'E', text: 'Close door · Leave building' };
  }
  if (Math.hypot(p.x - G.interior.work.x, p.z - G.interior.work.z) < 4) {
    return { key: 'E', text: G.interior.kind === 'home' ? 'Rest at home' : `Use ${G.interior.place.name}` };
  }
  return { text: G.interior.place.name };
}
