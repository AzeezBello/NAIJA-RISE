import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { clampN, fmt } from '../core/utils.js';
import { saveState } from '../core/state.js';
import { toast } from '../ui/feedback.js';
import { tx, msg, xp } from './economy.js';
import { applyJob } from './navigation.js';

let saveT = 0;
// Shift progress, fuel and stamina, autosave.
export function updateVitals(dt) {
  const s = G.state, w = G.working;
  if (w) {
    w.t += dt;
    if (w.t >= w.job.dur) {
      const j = w.job;
      s.cash += j.pay; tx(`Wages · ${j.title}`, j.pay);
      toast(`Shift done · +${fmt(j.pay)}`);
      msg(j.by, `Thanks for the shift. ${fmt(j.pay)} don enter your hand.`);
      s.job = null; G.working = null; applyJob(); xp(j.xp);
    }
  }
  if (G.inCar) {
    if (Math.abs(G.carSpeed) > 0.5) s.fuel = Math.max(0, s.fuel - dt * 0.4 * (Math.abs(G.carSpeed) / 24));
    s.stamina = Math.min(100, s.stamina + dt * 6);
  } else {
    const sprinting = (G.keys.shift || G.pad?.sprint) && G.curSpeed > 5.5;
    s.stamina = clampN(s.stamina + (sprinting ? -16 : 10) * dt, 0, 100);
  }
  saveT += dt; if (saveT > 15) { saveT = 0; saveState(s); }
}
