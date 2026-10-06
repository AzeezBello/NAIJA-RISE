import * as THREE from 'three';
import { G } from '../core/context.js';
import { $ } from '../core/utils.js';
import { mat } from '../world/builders.js';
import { LOOK } from '../data/characters.js';
import { PERF } from '../data/config.js';
import { createCharacter } from './character.js';

// The player: a character instance (rigged GLB when available, primitives otherwise) inside G.player.
// Movement, camera and collision never touch the visuals; they only move the group.
let pBody, pShirt, pHead; const hairs = {};

function primitivePlayer() {
  const g = new THREE.Group();
  pBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.25, 6, 10), mat(0x26312d, { roughness: 0.7 })); pBody.position.y = 1.15;
  pShirt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.7, 0.42), mat(0x3d8b5a)); pShirt.position.y = 1.35;
  pHead = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 10), mat(0x714835)); pHead.position.y = 2.12;
  for (const m of [pBody, pShirt, pHead]) { m.castShadow = true; g.add(m); }
  const hm = mat(0x120b08);
  hairs.Short = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); hairs.Short.position.y = 2.2;
  hairs.Fade = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), hm); hairs.Fade.position.y = 2.22;
  hairs.Afro = new THREE.Mesh(new THREE.SphereGeometry(0.54, 16, 12), hm); hairs.Afro.position.y = 2.3;
  hairs.Braids = new THREE.Group();
  { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); cap.position.y = 2.2; hairs.Braids.add(cap);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), hm); const a = i / 6 * Math.PI * 2; b.position.set(Math.cos(a) * 0.36, 2.0, Math.sin(a) * 0.36); hairs.Braids.add(b); } }
  for (const k in hairs) { hairs[k].castShadow = true; hairs[k].visible = false; g.add(hairs[k]); }
  return g;
}

export function createPlayer() {
  const player = new THREE.Group();
  G.playerChar = createCharacter({ look: G.state.look, placeholder: primitivePlayer(), useRig: !PERF.lowEnd || G.state.settings.rig === true });
  player.add(G.playerChar.group);
  G.scene.add(player);
  G.player = player;
  return player;
}

// Drives the animation controller from the movement states (systems/movement.js); updateCharacters advances the mixer.
export function updatePlayer() { G.playerChar?.setState(G.inCar ? 'idle' : (G.moveState || 'idle'), G.curSpeed); }

// Applies state.look to the 3D character (rig tints + accessories, or the primitive fallback) and every portrait canvas.
export function applyLook() {
  const L = G.state.look;
  if (pHead) {
    pHead.material.color.set(LOOK.skin[L.skin]); pShirt.material.color.set(LOOK.shirt[L.shirt]); pBody.material.color.set(LOOK.pants[L.pants]);
    for (const k in hairs) { hairs[k].visible = LOOK.hair[L.hair] === k; hairs[k].traverse(o => { if (o.isMesh) o.material.color.set(LOOK.hairColor[L.hairColor ?? 0]); }); }
  }
  G.playerChar?.setLook(L);
  for (const id of ['portrait', 'charPreview']) { const c = $(id); if (c) drawPortrait(c); }
}

export function drawPortrait(c) {
  const g = c.getContext('2d'), s = c.width, L = G.state.look;
  const skin = LOOK.skin[L.skin], shirt = LOOK.shirt[L.shirt], hair = LOOK.hair[L.hair], hc = LOOK.hairColor[L.hairColor ?? 0];
  g.clearRect(0, 0, s, s);
  const grd = g.createRadialGradient(s / 2, s * 0.4, 2, s / 2, s * 0.4, s * 0.7);
  grd.addColorStop(0, '#1f4a36'); grd.addColorStop(1, '#0a1612');
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  g.fillStyle = shirt; g.beginPath(); g.ellipse(s / 2, s * 1.04, s * 0.44, s * 0.32, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = skin; g.fillRect(s * 0.44, s * 0.6, s * 0.12, s * 0.16);
  if (hair === 'Afro') { g.fillStyle = hc; g.beginPath(); g.ellipse(s / 2, s * 0.42, s * 0.3, s * 0.32, 0, 0, Math.PI * 2); g.fill(); }
  const face = LOOK.face[L.face ?? 0], rx = face === 'Round' ? 0.23 : face === 'Long' ? 0.18 : 0.2, ry = face === 'Long' ? 0.27 : face === 'Square' ? 0.22 : 0.24;
  g.fillStyle = skin; g.beginPath(); g.ellipse(s / 2, s * 0.46, s * rx, s * ry, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hc;
  if (hair === 'Short') { g.beginPath(); g.ellipse(s / 2, s * 0.3, s * 0.21, s * 0.12, 0, Math.PI, 0); g.fill(); }
  if (hair === 'Fade') { g.beginPath(); g.ellipse(s / 2, s * 0.28, s * 0.19, s * 0.08, 0, Math.PI, 0); g.fill(); }
  if (hair === 'Braids') {
    g.beginPath(); g.ellipse(s / 2, s * 0.3, s * 0.21, s * 0.12, 0, Math.PI, 0); g.fill();
    g.lineWidth = s * 0.035; g.strokeStyle = hc;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(s / 2 + i * s * 0.09, s * 0.3); g.lineTo(s / 2 + i * s * 0.11, s * 0.62); g.stroke(); }
  }
  const fh = LOOK.facialHair[L.facialHair ?? 0];
  if (fh === 'Beard') { g.beginPath(); g.ellipse(s / 2, s * 0.62, s * 0.17, s * 0.09, 0, 0, Math.PI); g.fill(); }
  if (fh === 'Goatee') g.fillRect(s * 0.46, s * 0.6, s * 0.08, s * 0.08);
  if (fh === 'Moustache') g.fillRect(s * 0.43, s * 0.55, s * 0.14, s * 0.025);
  g.fillStyle = '#120b08'; g.fillRect(s * 0.43, s * 0.45, s * 0.045, s * 0.03); g.fillRect(s * 0.525, s * 0.45, s * 0.045, s * 0.03);
  const acc = LOOK.accessory[L.accessory ?? 0];
  if (acc === 'Glasses') { g.strokeStyle = '#111'; g.lineWidth = s * 0.02; g.strokeRect(s * 0.41, s * 0.43, s * 0.08, s * 0.06); g.strokeRect(s * 0.51, s * 0.43, s * 0.08, s * 0.06); }
  if (acc === 'Cap') { g.fillStyle = LOOK.hairColor[4]; g.beginPath(); g.ellipse(s / 2, s * 0.27, s * 0.23, s * 0.1, 0, Math.PI, 0); g.fill(); g.fillRect(s * 0.3, s * 0.26, s * 0.28, s * 0.03); }
}
