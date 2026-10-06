import { GAME, ECON, TIME } from '../data/config.js';

export const DEFAULT = {
  v: GAME.saveVersion, name: 'Tunde Okafor',
  cash: ECON.startCash, bank: ECON.startBank, xp: 0, level: 1, heat: 0,
  mission: 0, done: false, path: null, kioskDeal: false,
  health: 100, stamina: 100, fuel: 100,
  job: null, waypoint: null, owned: [], props: [], home: null,
  inv: { water: 2, suya: 1 }, msgs: [], unread: 0, tx: [], payIn: ECON.payCycle,
  clock: TIME.startClock, day: 1,
  look: { skin: 2, hair: 0, shirt: 0, pants: 0 },
  pet: null, prayedDay: 0, partyDay: 0, rented: null, let: [],
  settings: { sens: 1, shadows: true, rotateMap: true, hints: true, touch: 'auto', mature: true },
};

export function hasSave() { try { return !!localStorage.getItem(GAME.saveKey); } catch { return false; } }
export function freshState() { return structuredClone(DEFAULT); }
export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(GAME.saveKey));
    if (s && s.v === GAME.saveVersion) {
      const st = freshState();
      Object.assign(st, s);
      st.settings = Object.assign({}, DEFAULT.settings, s.settings || {});
      st.look = Object.assign({}, DEFAULT.look, s.look || {});
      return st;
    }
  } catch { /* corrupt save → fresh */ }
  return freshState();
}
export function saveState(state) { try { localStorage.setItem(GAME.saveKey, JSON.stringify(state)); } catch { /* storage blocked */ } }
export function clearSave() { try { localStorage.removeItem(GAME.saveKey); } catch { /* ignore */ } }
