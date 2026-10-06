import * as THREE from 'three';
import { G } from '../core/context.js';
import { $ } from '../core/utils.js';
import { mat } from '../world/builders.js';
import { LOOK } from '../data/characters.js';

let pBody, pShirt, pHead; const hairs = {};

export function createPlayer() {
  const player = new THREE.Group();
  pBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.25, 6, 10), mat(0x26312d, { roughness: 0.7 })); pBody.position.y = 1.15;
  pShirt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.7, 0.42), mat(0x3d8b5a)); pShirt.position.y = 1.35;
  pHead = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 10), mat(0x714835)); pHead.position.y = 2.12;
  for (const m of [pBody, pShirt, pHead]) { m.castShadow = true; player.add(m); }

  const hm = mat(0x120b08);
  hairs.Short = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); hairs.Short.position.y = 2.2;
  hairs.Fade = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), hm); hairs.Fade.position.y = 2.22;
  hairs.Afro = new THREE.Mesh(new THREE.SphereGeometry(0.54, 16, 12), hm); hairs.Afro.position.y = 2.3;
  hairs.Braids = new THREE.Group();
  { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); cap.position.y = 2.2; hairs.Braids.add(cap);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), hm); const a = i / 6 * Math.PI * 2; b.position.set(Math.cos(a) * 0.36, 2.0, Math.sin(a) * 0.36); hairs.Braids.add(b); } }
  for (const k in hairs) { hairs[k].castShadow = true; hairs[k].visible = false; player.add(hairs[k]); }

  G.scene.add(player);
  G.player = player;
  return player;
}

// Applies state.look to the 3D model and every portrait canvas on screen.
export function applyLook() {
  const L = G.state.look;
  pHead.material.color.set(LOOK.skin[L.skin]);
  pShirt.material.color.set(LOOK.shirt[L.shirt]);
  pBody.material.color.set(LOOK.pants[L.pants]);
  for (const k in hairs) hairs[k].visible = LOOK.hair[L.hair] === k;
  for (const id of ['portrait', 'charPreview']) { const c = $(id); if (c) drawPortrait(c); }
}

export function drawPortrait(c) {
  const g = c.getContext('2d'), s = c.width, L = G.state.look;
  const skin = LOOK.skin[L.skin], shirt = LOOK.shirt[L.shirt], hair = LOOK.hair[L.hair];
  g.clearRect(0, 0, s, s);
  const grd = g.createRadialGradient(s / 2, s * 0.4, 2, s / 2, s * 0.4, s * 0.7);
  grd.addColorStop(0, '#1f4a36'); grd.addColorStop(1, '#0a1612');
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  g.fillStyle = shirt; g.beginPath(); g.ellipse(s / 2, s * 1.04, s * 0.44, s * 0.32, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = skin; g.fillRect(s * 0.44, s * 0.6, s * 0.12, s * 0.16);
  if (hair === 'Afro') { g.fillStyle = '#120b08'; g.beginPath(); g.ellipse(s / 2, s * 0.42, s * 0.3, s * 0.32, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = skin; g.beginPath(); g.ellipse(s / 2, s * 0.46, s * 0.2, s * 0.24, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#120b08';
  if (hair === 'Short') { g.beginPath(); g.ellipse(s / 2, s * 0.3, s * 0.21, s * 0.12, 0, Math.PI, 0); g.fill(); }
  if (hair === 'Fade') { g.beginPath(); g.ellipse(s / 2, s * 0.28, s * 0.19, s * 0.08, 0, Math.PI, 0); g.fill(); }
  if (hair === 'Braids') {
    g.beginPath(); g.ellipse(s / 2, s * 0.3, s * 0.21, s * 0.12, 0, Math.PI, 0); g.fill();
    g.lineWidth = s * 0.035; g.strokeStyle = '#120b08';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(s / 2 + i * s * 0.09, s * 0.3); g.lineTo(s / 2 + i * s * 0.11, s * 0.62); g.stroke(); }
  }
  g.fillRect(s * 0.43, s * 0.45, s * 0.045, s * 0.03); g.fillRect(s * 0.525, s * 0.45, s * 0.045, s * 0.03);
}
