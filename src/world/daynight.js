import * as THREE from 'three';
import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { clampN } from '../core/utils.js';
import { lamps, windows, glows } from './builders.js';
import { TIME } from '../data/config.js';

// Keyframes: [hour, fog, sunColor, sunI, hemiSky, hemiGround, hemiI, fogNear, fogFar, skyTop, skyHorizon]
const SKY = [
  [0, 0x0b1424, 0x8fa6ff, 0.12, 0x2a3a66, 0x0b1410, 0.5, 60, 190, 0x050a16, 0x16213a],
  [5, 0x0b1424, 0x8fa6ff, 0.12, 0x2a3a66, 0x0b1410, 0.5, 60, 190, 0x050a16, 0x16213a],
  [6.5, 0xe39a6a, 0xffa870, 1.8, 0x9fb0c8, 0x2a2a20, 1.1, 90, 230, 0x5a6ea0, 0xf0a070],
  [8, 0xbcd8e6, 0xffe4ae, 3.4, 0xe7f5ff, 0x4a5a45, 1.6, 110, 260, 0x4f8fc9, 0xbcd8e6],
  [16.5, 0xbcd8e6, 0xffe4ae, 3.2, 0xe7f5ff, 0x4a5a45, 1.5, 110, 260, 0x4f8fc9, 0xbcd8e6],
  [18.5, 0xe0854f, 0xff8f4a, 1.6, 0xc9a08a, 0x2a2420, 1.0, 90, 230, 0x3e3d78, 0xf08a4f],
  [20, 0x0b1424, 0x8fa6ff, 0.12, 0x2a3a66, 0x0b1410, 0.5, 60, 190, 0x050a16, 0x16213a],
  [24, 0x0b1424, 0x8fa6ff, 0.12, 0x2a3a66, 0x0b1410, 0.5, 60, 190, 0x050a16, 0x16213a],
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
  sun.position.set(Math.cos(az) * 120, Math.max(22, el * 110), 45);
  if (sky) {
    sky.material.uniforms.top.value.copy(lerpC(A[9], B[9], t));
    sky.material.uniforms.horizon.value.copy(lerpC(A[10], B[10], t));
    sky.material.uniforms.bottom.value.copy(scene.fog.color);
  }
  if (sunDisc) { sunDisc.visible = el > -0.05; sunDisc.position.set(Math.cos(az) * 420, el * 400, 160); sunDisc.material.color.copy(sun.color); }
  const night = isNight(), out = !!G.outage;
  if (clouds) { const cc = night ? 0x2a3550 : 0xffffff; for (const c of clouds) c.material.color.set(cc); }
  for (const m of lamps) { m.emissive.set(0xffe7ad); m.emissiveIntensity = night && !out ? 1.6 : 0; }
  for (const m of windows) m.emissiveIntensity = out ? 0.08 : night ? 1.1 : h < 7.5 || h > 17.5 ? 0.45 : 0;
  for (const s of glows) s.visible = night && !out;
  if (out) { hemi.intensity *= 0.6; sun.intensity *= 0.7; }
  if (water) water.material.color.set(night ? 0x0a2a3a : 0x14758e);
}

let tick = 0;
export function updateClock(dt) {
  const s = G.state;
  s.clock += dt * TIME.daySpeed;
  if (s.clock >= 24) { s.clock -= 24; s.day++; }
  tick += dt;
  if (tick > 0.5) { tick = 0; applySky(); emit('clock'); }
}
import { on } from '../core/events.js';
on('sky', applySky);
export function setClock(h) { G.state.clock = h; applySky(); emit('clock'); }
