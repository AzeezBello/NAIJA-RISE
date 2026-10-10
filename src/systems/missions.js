import { G, pos, frozen } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { dist } from '../core/utils.js';
import { MISSIONS } from '../data/missions.js';
import { placeOf } from '../data/locations.js';
import { toast } from '../ui/feedback.js';
import { addItem, removeItem, addHeat, msg } from './economy.js';
import { curMission, applyMission } from './navigation.js';
import { startRace } from './racing.js';

// Mission tasks: timed deliveries, fragile cargo, escapes, vehicle recovery and races.
// G.task is the live task; its `obj` feeds the HUD objective card and `dest` the GPS.

export function startTask(m) {
  const t = { ...m.task, obj: m.task.obj, mission: G.state.mission, clear: 0 };
  if (t.item) addItem(t.item);
  if (t.type === 'timed') t.deadline = G.state.clock + t.minutes / 60;
  if (t.type === 'escape') { G.state.heat = Math.max(G.state.heat, t.heat); emit('hud'); }
  if (t.type === 'steal') { const v = G.parked.find(v => v.userData.type === t.vehicleType && !v.userData.owned); t.vehicle = v; if (v) { v.userData.marked = true; t.destPos = { x: v.position.x, z: v.position.z }; } }
  G.task = t;
  if (t.type === 'race') startRace({ wager: t.wager, mission: true });
  applyMission(); emit('hud');
}

export function startSideTask({ dest, item, minutes, obj, deliveryLabel, onComplete, onFail }) {
  if (G.task) return toast('Finish your current mission first');
  const t = { type: 'timed', dest, item, minutes, obj, deliveryLabel, onComplete, onFail, sideTask: true, clear: 0 };
  if (item) addItem(item);
  t.deadline = G.state.clock + minutes / 60;
  G.task = t;
  applyMission();
  emit('hud');
  toast('Side mission started · follow the GPS');
}

export const taskDest = () => {
  const t = G.task; if (!t) return null;
  if (t.type === 'steal' && !G.inCar) return t.destPos;          // first the car, then the drop
  if (t.dest) return placeOf(t.dest);
  return null;
};

function finishTask(ok) {
  const task = G.task, s = G.state;
  const m = Number.isInteger(task.mission) ? MISSIONS[task.mission] : null;
  if (task.item) removeItem(task.item);
  if (task.vehicle) task.vehicle.userData.marked = false;
  G.task = null;
  if (ok) {
    if (task.onComplete) task.onComplete();
    if (m) { m.after(); emit('mission:completed', m); if (!s.done) s.mission++; }
  } else {
    if (task.onFail) task.onFail();
    if (m) { m.fail?.(); toast('Mission failed'); }
  }
  applyMission(); emit('mission:refresh'); emit('hud');
}

// Called by interaction when the player presses E at the task destination.
export function tryCompleteTask() {
  const t = G.task; if (!t) return false;
  const d = taskDest(); if (!d || dist(pos(), d) > 13) return false;
  if (t.type === 'steal') { if (!G.inCar || G.car !== t.vehicle) return false; finishTask(true); return true; }
  if (t.type === 'timed' || t.type === 'cargo') { finishTask(true); return true; }
  return false;
}

export function updateMissions(dt) {
  const t = G.task; if (!t) return;
  const s = G.state;
  if (t.type === 'timed' && s.clock > t.deadline && !(s.clock < 1 && t.deadline > 23)) finishTask(false);
  if (t.type === 'cargo' && G.inCar && Math.abs(G.carSpeed) * 3.6 > t.maxKmh) { toast('Too fast — the glassware shattered'); finishTask(false); }
  if (t.type === 'escape') {
    const p = pos(), near = G.traffic.some(v => v.type === 'police' && dist(p, v.g.position) < 60);
    t.clear = near ? 0 : t.clear + dt;
    t.obj = `Lose the police — ${Math.max(0, 8 - t.clear).toFixed(0)} s clear needed${near ? ' · police nearby!' : ''}`;
    if (t.clear >= 8) finishTask(true);
    if (s.heat === 0) finishTask(false);
  }
  if (t.type === 'steal' && G.inCar && G.car === t.vehicle && !t.taken) { t.taken = true; t.obj = 'Drive the sedan to Dayo at Ladipo'; addHeat(1, 'Vehicle taken'); applyMission(); }
  if (t.type === 'race' && G.race?.finished) { const won = G.race.won; G.race = null; finishTask(won); }
}

// Arrest ends escapes, steals and cargo runs.
export function failTaskOnArrest() { if (G.task && ['escape', 'steal', 'cargo', 'timed'].includes(G.task.type)) finishTask(false); }

on('mission:fork', () => applyMission());
