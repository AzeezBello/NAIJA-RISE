import { G, pos } from '../core/context.js';
import { TOLLS, ROAD_WIDTHS } from '../data/locations.js';
import { pay, tx } from './economy.js';
import { toast, notify } from '../ui/feedback.js';
import { addHeat } from './economy.js';

// Toll plazas (Lekki). Crossing the barrier line in a vehicle charges the fee; no money means a jumped toll and heat.
const side = {};
export function updateTolls() {
  const p = pos();
  for (const t of TOLLS) {
    const along = t.axis === 'h' ? p.x : p.z, across = t.axis === 'h' ? p.z : p.x;
    const onRoad = Math.abs(across - t.k) < ROAD_WIDTHS[t.axis][t.k] / 2 + 1;
    const s = along < t.at ? -1 : 1;
    if (!onRoad) { side[t.id] = null; continue; }
    if (side[t.id] && side[t.id] !== s && G.inCar) {
      if (pay(t.fee, `${t.name} toll`)) toast(`${t.name} · ₦${t.fee.toLocaleString()} paid`);
      else { addHeat(1); notify('LASTMA', `You jumped the ${t.name}. Plate noted — heat +1.`); }
    }
    side[t.id] = s;
  }
}
