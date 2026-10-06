import * as THREE from 'three';
import { G } from './context.js';
import { PERF } from '../data/config.js';

// Creates the Three.js scene, camera, renderer and lights, and stores them on the context.
export function createRenderer(mount) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbcd8e6);
  scene.fog = new THREE.Fog(0xbcd8e6, 110, 260);
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 600);
  const renderer = new THREE.WebGLRenderer({ antialias: !PERF.lowEnd, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, PERF.lowEnd ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  mount.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xe7f5ff, 0x4a5a45, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe4ae, 3.4);
  sun.position.set(65, 105, 45);
  sun.castShadow = true;
  // The shadow frustum is a 140 m box that follows the player (systems/movement.js), so 2048 stays crisp and cheap.
  sun.shadow.mapSize.set(PERF.lowEnd ? 1024 : 2048, PERF.lowEnd ? 1024 : 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 340 });
  scene.add(sun.target);
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  Object.assign(G, { scene, camera, renderer, hemi, sun, clock: new THREE.Clock() });
  return { scene, camera, renderer };
}
