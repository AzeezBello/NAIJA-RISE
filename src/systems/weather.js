import * as THREE from 'three';
import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { rnd } from '../core/utils.js';
import { WEATHER } from '../data/config.js';
import { notify } from '../ui/feedback.js';

// Rain (PRD §21): darker sky, wet roads, reduced grip, slower traffic, a particle curtain around the camera.
let rain = null, nextCheck = 60;
export const isRaining = () => !!G.rain;

function makeRain() {
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-40, 40); pos[i * 3 + 1] = rnd(0, 40); pos[i * 3 + 2] = rnd(-40, 40); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfd4e6, size: 0.12, transparent: true, opacity: 0.55, depthWrite: false }));
  pts.frustumCulled = false; G.scene.add(pts); return pts;
}
export const FLOOD = { axis: 'h', k: -66, from: -20, to: 60 };   // Ojuelegba underpass floods in a storm
export const isHarmattan = () => G.state.day % 10 >= 7;             // days 7–9 of every ten: dry, hazy season
export function startRain(minutes = rnd(...WEATHER.rainMinutes), storm = Math.random() < 0.35) {
  if (!rain) rain = makeRain();
  rain.visible = true; G.rain = minutes * 60; G.storm = storm;
  if (storm) { G.jam = { ...FLOOD, until: minutes * 60 + 30, flood: true }; notify('Weather', 'Storm! Ojuelegba underpass don flood — Itire Road is a go-slow.'); }
  else notify('Weather', 'Rain don start — roads slippery, go-slow everywhere.');
  emit('sky'); emit('weather', true);
}
export function stopRain() { G.rain = 0; G.storm = false; if (rain) rain.visible = false; notify('Weather', 'Rain don stop.'); emit('sky'); emit('weather', false); }

export function updateWeather(dt) {
  if (G.rain) {
    G.rain -= dt; if (G.rain <= 0) { stopRain(); return; }
    const a = rain.geometry.attributes.position, cam = G.camera.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * (G.storm ? 40 : 28); if (y < 0) { y += 40; a.setX(i, rnd(-40, 40)); a.setZ(i, rnd(-40, 40)); }
      a.setY(i, y);
    }
    a.needsUpdate = true; rain.position.set(cam.x, 0, cam.z);
  } else {
    nextCheck -= dt;
    if (nextCheck <= 0) { nextCheck = rnd(120, 240); if (!isHarmattan() && Math.random() < WEATHER.rainChance) startRain(); }
  }
}
