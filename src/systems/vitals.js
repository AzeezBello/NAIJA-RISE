import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { clampN, fmt } from '../core/utils.js';
import { saveState } from '../core/state.js';
import { toast } from '../ui/feedback.js';
import { tx, msg, xp, gainSkill, addRep } from './economy.js';
import { jobPay } from '../data/jobs.js';
import { applyJob } from './navigation.js';

let saveT = 0;
// Shift progress, fuel and stamina, autosave.
export function updateVitals(dt) {
  const s = G.state, w = G.working;
  if (w) {
    w.t += dt;
    if (w.t >= w.job.dur) {
      const j = w.job, pay = jobPay(j, s.skills);
      s.cash += pay; tx(`Wages · ${j.title}`, pay); emit('cash');
      gainSkill(j.skill, 2); addRep('public', 1);
      toast(`Shift done · +${fmt(pay)}${pay > j.pay ? ` (skill bonus)` : ''}`);
      msg(j.by, `Thanks for the shift. ${fmt(j.pay)} don enter your hand.`);
      s.job = null; G.working = null; applyJob(); xp(j.xp);
    }
  }
  if (G.inCar) {
    if (Math.abs(G.carSpeed) > 0.5) { s.fuel = Math.max(0, s.fuel - dt * 0.4 * (Math.abs(G.carSpeed) / 24)); gainSkill('driving', dt * 0.03 * Math.min(1, Math.abs(G.carSpeed) / 15)); }
    s.stamina = Math.min(100, s.stamina + dt * 6);
  } else {
    const sprinting = (G.keys.shift || G.pad?.sprint) && G.curSpeed > 5.5;
    const tank = s.home && s.upgrades?.[s.home]?.includes('tank') ? 1.25 : 1;
    const recovery = (10 + Math.min(5, (s.skills.fitness || 0) * 0.05)) * tank;
    const sprintCost = 16 * (1 - Math.min(0.25, (s.skills.strength || 0) * 0.0025));
    s.stamina = clampN(s.stamina + (sprinting ? -sprintCost : recovery) * dt, 0, 100);
    if (sprinting) gainSkill('fitness', dt * 0.05);
  }
  saveT += dt; if (saveT > 15) { saveT = 0; for (const v of G.parked) if (v.userData.owned) { const o = s.vehicles.find(o => o.id === v.userData.ownedId); if (o) o.pos = { x: v.position.x, z: v.position.z, rot: v.rotation.y }; } saveState(s); }
}
