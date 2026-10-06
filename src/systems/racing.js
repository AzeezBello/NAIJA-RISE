import * as THREE from 'three';
import { G, pos } from '../core/context.js';
import { emit } from '../core/events.js';
import { dist, fmt } from '../core/utils.js';
import { makeVehicle, vForward } from '../entities/vehicles.js';
import { toast } from '../ui/feedback.js';
import { tx, pay, addRep, gainSkill, addHeat } from './economy.js';

// Street racing on Funsho Williams Avenue (x = 72): two laps between the Itire Road junction and the south end,
// against a rival driver. Checkpoints are flat rings; the next one is the GPS target.
const LAP = [{ x: 72, z: -40 }, { x: 72, z: 120 }, { x: 72, z: -40 }, { x: 72, z: 120 }];
let ring;

export function startRace({ wager = 20000, mission = false, rivalSpeed = 19 } = {}) {
  if (G.race) return;
  if (wager && !pay(wager, 'Race wager')) return toast(`You need ${fmt(wager)} for the wager`);
  if (!ring) { ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.25, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff5d9e })); ring.rotation.x = Math.PI / 2; G.scene.add(ring); }
  const rival = makeVehicle('car', 0xd62828); rival.position.set(75, 0, -50); rival.rotation.y = Math.PI;
  G.race = { cps: LAP, i: 0, t: 0, rival, rivalI: 0, rivalSpeed, wager, mission, finished: false, won: false };
  for (const v of G.parked) if (!v.userData.owned) v.userData.marked = false;
  ring.visible = true; ring.position.set(LAP[0].x, 0.4, LAP[0].z);
  toast('RACE · reach the pink ring, two laps on Funsho Williams');
  emit('hud');
}

export const raceTarget = () => (G.race && !G.race.finished ? { ...G.race.cps[G.race.i], label: `Race · checkpoint ${G.race.i + 1}/${G.race.cps.length}`, kind: 'race' } : null);

function endRace(won) {
  const r = G.race; r.finished = true; r.won = won;
  G.scene.remove(r.rival); ring.visible = false;
  if (won) { gainSkill('driving', 6); addRep('street', 6); if (r.wager) { G.state.cash += r.wager * 2; tx('Race winnings', r.wager * 2); } toast(`You won${r.wager ? ` · ${fmt(r.wager * 2)}` : ''}`); }
  else toast('Speedy\'s crew took it');
  if (Math.random() < 0.3) addHeat(1, 'LASTMA clocked the race');
  if (!r.mission) G.race = null;
  emit('hud');
}

export function updateRace(dt) {
  const r = G.race; if (!r || r.finished) return;
  r.t += dt;
  const p = pos(), cp = r.cps[r.i];
  if (G.inCar && dist(p, cp) < 5) { r.i++; if (r.i >= r.cps.length) return endRace(true); ring.position.set(r.cps[r.i].x, 0.4, r.cps[r.i].z); toast(`Checkpoint ${r.i}/${r.cps.length}`); }
  // rival drives the same checkpoints at a steady speed with a short rolling start
  if (r.t > 2) {
    const rc = r.cps[r.rivalI], d = Math.hypot(rc.x - r.rival.position.x, rc.z - r.rival.position.z);
    if (d < 3) { r.rivalI++; if (r.rivalI >= r.cps.length) return endRace(false); }
    else { const dx = (rc.x - r.rival.position.x) / d, dz = (rc.z - r.rival.position.z) / d; r.rival.position.x += dx * r.rivalSpeed * dt; r.rival.position.z += dz * r.rivalSpeed * dt; r.rival.rotation.y = Math.atan2(-dx, -dz); }
  }
  ring.rotation.z += dt * 2;
  r.obj = `Race · checkpoint ${r.i + 1}/${r.cps.length} · rival at ${r.rivalI + 1}/${r.cps.length}`;
  if (G.task?.type === 'race') G.task.obj = r.obj;
}
export const raceStatus = () => (G.race && !G.race.finished ? G.race.obj : null);
