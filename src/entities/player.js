import * as THREE from 'three';
import { G } from '../core/context.js';
import { $ } from '../core/utils.js';
import { LOOK } from '../data/characters.js';
import { PERF } from '../data/config.js';
import { createCharacter } from './character.js';
import { buildPrimitive, fabricCanvas, fabricOf } from './wardrobe.js';

// The player: a character instance (rigged GLB when available, primitive outfit body otherwise) inside G.player.
// Movement, camera and collision never touch the visuals; they only move the group.
export function createPlayer() {
  const player = new THREE.Group();
  G.playerChar = createCharacter({ look: G.state.look, build: look => buildPrimitive(look), useRig: G.state.settings.rig !== false });
  player.add(G.playerChar.group);
  G.scene.add(player);
  G.player = player;
  return player;
}

// Drives the animation controller from the movement states (systems/movement.js); updateCharacters advances the mixer.
export function updatePlayer() {
  const ch = G.playerChar;
  if (!ch) return;
  if (G.vehicleT != null) {
    // setState driven by updateVehicleTransition
    return;
  }
  if (G.inCar) {
    ch.setState('idle', 0);
    return;
  }
  ch.setState(G.moveState || 'idle', G.curSpeed || 0);
}

// Applies state.look to the 3D character (rig tints + fabric + accessories, or a rebuilt primitive body) and every portrait canvas.
export function applyLook() {
  G.playerChar?.setLook(G.state.look);
  for (const id of ['portrait', 'charPreview']) { const c = $(id); if (c) drawPortrait(c); }
}

export function drawPortrait(c) {
  const g = c.getContext('2d'), s = c.width, L = G.state.look;
  const skin = LOOK.skin[L.skin], hair = LOOK.hair[L.hair], hc = LOOK.hairColor[L.hairColor ?? 0], fab = fabricOf(L), out = LOOK.outfit[L.outfit ?? 0];
  g.clearRect(0, 0, s, s);
  const grd = g.createRadialGradient(s / 2, s * 0.4, 2, s / 2, s * 0.4, s * 0.7);
  grd.addColorStop(0, '#1f4a36'); grd.addColorStop(1, '#0a1612');
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  // shoulders in the outfit fabric (agbada and buba sit wider)
  const pat = g.createPattern(fabricCanvas(L.shirt ?? 0), 'repeat'); const sw = out === 'Agbada' ? 0.6 : out === 'Buba & Sokoto' ? 0.52 : 0.44;
  g.save(); g.scale(0.4, 0.4); g.fillStyle = pat; g.beginPath(); g.ellipse(s / 2 / 0.4, s * 1.04 / 0.4, s * sw / 0.4, s * 0.32 / 0.4, 0, 0, Math.PI * 2); g.fill(); g.restore();
  if (out === 'Agbada' || out === 'Senator') { g.strokeStyle = fab.accent; g.lineWidth = s * 0.02; g.beginPath(); g.ellipse(s / 2, s * 0.8, s * 0.09, s * 0.05, 0, 0, Math.PI * 2); g.stroke(); }
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
  if (acc === 'Fila') {   // Yoruba cap, tilted to one side, in the outfit fabric
    g.save(); g.translate(s / 2, s * 0.27); g.rotate(-0.18); g.scale(0.4, 0.4); g.fillStyle = pat; g.beginPath(); g.ellipse(0, 0, s * 0.22 / 0.4, s * 0.12 / 0.4, 0, Math.PI, 0); g.fill(); g.restore();
    g.fillStyle = fab.accent; g.fillRect(s * 0.3, s * 0.255, s * 0.4, s * 0.025);
  }
  if (acc === 'Face cap') { g.fillStyle = LOOK.hairColor[4]; g.beginPath(); g.ellipse(s / 2, s * 0.27, s * 0.23, s * 0.1, 0, Math.PI, 0); g.fill(); g.fillRect(s * 0.3, s * 0.26, s * 0.28, s * 0.03); }
}
