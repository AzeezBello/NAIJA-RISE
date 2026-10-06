import { GAME, ECON, TIME, PERF } from '../data/config.js';

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
  skills: { driving: 0, business: 0, charisma: 0, fitness: 0 },
  rep: { public: 0, business: 0, street: 0, social: 0 },
  vehicles: [], biz: {}, lastSeen: 0, awayTotal: 0, arc: null, upgrades: {}, complaints: {},
  gym: { until: 0, sessions: 0 }, digital: {}, football: { wins: 0, tier: 0 }, outfit: 0, ate: 0, storyPaused: false,
  settings: { sens: 1, shadows: !PERF.lowEnd, rotateMap: true, hints: true, touch: 'auto', mature: true },
};

const LEGACY_KEYS = ['naijarise.alpha08', 'naijarise.alpha07', 'naijarise.alpha06', 'naijarise.alpha05'];
export function hasSave() { try { return !!(localStorage.getItem(GAME.saveKey) || LEGACY_KEYS.some(k => localStorage.getItem(k))); } catch { return false; } }
export function freshState() { return structuredClone(DEFAULT); }
export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(GAME.saveKey)) || LEGACY_KEYS.map(k => JSON.parse(localStorage.getItem(k))).find(Boolean);
    if (s && (s.v === GAME.saveVersion || [8, 7, 6, 5].includes(s.v))) {   // v5 saves migrate: new fields take defaults
      const st = freshState();
      Object.assign(st, s);
      st.settings = Object.assign({}, DEFAULT.settings, s.settings || {});
      st.look = Object.assign({}, DEFAULT.look, s.look || {});
      st.skills = Object.assign({}, DEFAULT.skills, s.skills || {});
      st.rep = Object.assign({}, DEFAULT.rep, s.rep || {});
      st.v = GAME.saveVersion;
      return st;
    }
  } catch { /* corrupt save → fresh */ }
  return freshState();
}
export function saveState(state) { try { state.lastSeen = Date.now(); localStorage.setItem(GAME.saveKey, JSON.stringify(state)); } catch { /* storage blocked */ } }
export function clearSave() { try { localStorage.removeItem(GAME.saveKey); for (const k of LEGACY_KEYS) localStorage.removeItem(k); } catch { /* ignore */ } }
