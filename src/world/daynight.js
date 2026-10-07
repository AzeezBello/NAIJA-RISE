import * as THREE from 'three';
import { QUALITY } from '../core/quality.js';
import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { clampN } from '../core/utils.js';
import { lamps, windows, glows } from './builders.js';
import { TIME } from '../data/config.js';

// Keyframes: [hour, fog, sunColor, sunI, hemiSky, hemiGround, hemiI, fogNear, fogFar, skyTop, skyHorizon]
const SKY = [
  [0, 0x101a2e, 0x9fb4ff, 1.3, 0x6e88c8, 0x2a3030, 1.9, 60, 200, 0x050a18, 0x1a2c4e],
  [5, 0x101a2e, 0x9fb4ff, 1.3, 0x6e88c8, 0x2a3030, 1.9, 60, 200, 0x050a18, 0x1a2c4e],
  [6.5, 0xe8a070, 0xffb070, 1.9, 0xa0b4cc, 0x2a2a20, 1.1, 85, 230, 0x4e68a8, 0xf4a878],
  [8, 0xc2dcec, 0xffe6b4, 3.4, 0xe7f5ff, 0x4a5a45, 1.6, 110, 260, 0x4a8ccc, 0xc2dcec],
  [16, 0xc9d6dc, 0xffdca0, 3.1, 0xe4ecf2, 0x4a5240, 1.45, 100, 250, 0x4a84c4, 0xd6c8b0],
  [17.5, 0xf0a868, 0xffa050, 2.4, 0xd8b090, 0x33281f, 1.15, 70, 220, 0x3a4a90, 0xffb060],     // golden hour
  [18.6, 0xd86a40, 0xff7a3a, 1.3, 0xb08070, 0x241c1a, 0.95, 60, 200, 0x2a2f6e, 0xf07040],     // ember sunset
  [19.6, 0x2a3458, 0xa0a8ff, 1.1, 0x7080c0, 0x2a3030, 1.6, 55, 190, 0x0a1230, 0x6a3a5a],     // teal-navy twilight, magenta horizon
  [21, 0x101a2e, 0x9fb4ff, 1.3, 0x6e88c8, 0x2a3030, 1.9, 60, 200, 0x050a18, 0x1a2c4e],
  [24, 0x101a2e, 0x9fb4ff, 1.3, 0x6e88c8, 0x2a3030, 1.9, 60, 200, 0x050a18, 0x1a2c4e],
];
const cA = new THREE.Color(), cB = new THREE.Color();
const lerpC = (a, b, t) => cA.set(a).lerp(cB.set(b), t);

export const isNight = () => G.state.clock < 6.2 || G.state.clock > 18.6;
export const timeStr = () => {
  const h = Math.floor(G.state.clock), m = Math.floor((G.state.clock % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export function applySky() {
  const h = G.state.clock;
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const A = SKY[i], B = SKY[i + 1], t = clampN((h - A[0]) / (B[0] - A[0]), 0, 1);
  const mix = (a, b) => a + (b - a) * t;
  const { scene, sun, hemi, water, sky, sunDisc, clouds } = G;
  scene.background.copy(lerpC(A[1], B[1], t));
  scene.fog.color.copy(scene.background); scene.fog.near = mix(A[7], B[7]); scene.fog.far = mix(A[8], B[8]);
  sun.color.copy(lerpC(A[2], B[2], t)); sun.intensity = mix(A[3], B[3]);
  hemi.color.copy(lerpC(A[4], B[4], t)); hemi.groundColor.copy(lerpC(A[5], B[5], t)); hemi.intensity = mix(A[6], B[6]);
  const az = (h - 6) / 12 * Math.PI, el = Math.sin(az);
  G.sunDir = G.sunDir || new THREE.Vector3(); G.sunDir.set(Math.cos(az) * 120, Math.max(22, el * 110), 45);
  sun.position.copy(G.sunDir).add(sun.target.position);
  if (sky) {
    sky.material.uniforms.top.value.copy(lerpC(A[9], B[9], t));
    sky.material.uniforms.horizon.value.copy(lerpC(A[10], B[10], t));
    sky.material.uniforms.bottom.value.copy(scene.fog.color);
  }
  if (sunDisc) { sunDisc.visible = el > -0.05; sunDisc.position.set(Math.cos(az) * 420, el * 400, 160); sunDisc.material.color.copy(sun.color); }
  const night = isNight(), out = !!G.outage;
  if (G.state.day % 10 >= 7 && !G.rain) { scene.background.lerp(cA.set(0xd9c7a0), 0.45); scene.fog.color.copy(scene.background); scene.fog.near = 35; scene.fog.far = 140; sun.intensity *= 0.75; sun.color.lerp(cA.set(0xffd9a0), 0.5); if (sky) { sky.material.uniforms.top.value.lerp(cA.set(0xc9b890), 0.5); sky.material.uniforms.horizon.value.lerp(cA.set(0xe3d2ad), 0.6); } }
  if (G.rain) { scene.background.multiplyScalar(0.55); scene.fog.color.copy(scene.background); scene.fog.near *= 0.5; scene.fog.far *= 0.6; sun.intensity *= 0.45; hemi.intensity *= 0.8; if (sky) { sky.material.uniforms.top.value.multiplyScalar(0.5); sky.material.uniforms.horizon.value.multiplyScalar(0.6); } }
  if (clouds) { const cc = night ? 0x2a3550 : 0xffffff; for (const c of clouds) c.material.color.set(cc); }
  for (const m of lamps) { m.emissive.set(0xffe7ad); m.emissiveIntensity = night ? 1.6 : 0; }   // solar street lights: NEPA cannot touch them
  for (const m of windows) { m.emissive.set(0xffd9a0); m.emissiveIntensity = out ? 0.06 : night ? 0.62 : h < 7.5 || h > 17.5 ? 0.3 : 0; }
  for (const s of glows) s.visible = night;
  if (out) hemi.intensity *= 0.75;
  if (water) water.material.color.set(night ? 0x0a2a3a : 0x14758e);
  // after dark the asphalt reads wet and glossy; neon and street lights bloom harder
  const wet = night || G.rain ? 1 : h > 17.5 ? (h - 17.5) / 1.1 : 0;
  for (const m of G.roadMats || []) { m.roughness = 0.95 - 0.5 * wet; m.metalness = 0.02 + 0.1 * wet; }
  if (G.bloom) { G.bloom.strength = 0.25 + 0.2 * wet + (G.rain ? 0.1 : 0); G.bloom.threshold = night ? 0.8 : 0.9; G.bloom.radius = 0.35; }
  if (G.grade) { G.grade.uniforms.split.value = 0.1 + 0.1 * wet; G.grade.uniforms.vignette.value = 0.28 + 0.12 * wet; }
  const q = QUALITY[G.quality] || QUALITY.medium;
  scene.fog.far *= q.fogScale; scene.fog.near *= q.fogScale;
  if (G.scene.environmentIntensity !== undefined) G.scene.environmentIntensity = (night ? 0.25 : 0.4) * (q.env / 0.4);
}

let tick = 0;
export function updateClock(dt) {
  const s = G.state;
  s.clock += dt * TIME.daySpeed;
  if (s.clock >= 24) { s.clock -= 24; s.day++; emit('day', s.day); }
  tick += dt;
  if (tick > 0.5) { tick = 0; applySky(); emit('clock'); }
}
import { on } from '../core/events.js';
on('sky', applySky);
export function setClock(h) { G.state.clock = h; applySky(); emit('clock'); }
