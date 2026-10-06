import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { notify, toast } from '../ui/feedback.js';
import { contactOf } from '../data/characters.js';
import { bizIncome } from '../data/businesses.js';
import { ECON } from '../data/config.js';

export function tx(label, amount) {
  G.state.tx.unshift({ label, amount, t: Date.now() });
  G.state.tx.length = Math.min(G.state.tx.length, 12);
}
// Pays from cash first, then bank. Returns false (and charges nothing) if the player cannot afford it.
export function pay(n, label) {
  const s = G.state;
  if (s.cash + s.bank < n) return false;
  const c = Math.min(s.cash, n); s.cash -= c; s.bank -= n - c;
  if (label) tx(label, -n);
  return true;
}
export function msg(from, text, silent = false) {
  const s = G.state;
  s.msgs.push({ from, text, t: Date.now(), read: false });
  s.unread = s.msgs.filter(m => !m.read).length;
  if (!silent) { notify(contactOf(from).name, text); emit('hud'); }
}
export function xp(n) {
  const s = G.state;
  s.xp += n;
  while (s.xp >= 100) {
    s.xp -= 100; s.level++;
    toast(`LEVEL UP — Level ${s.level}`);
    msg('bank', `Congratulations on reaching Level ${s.level}. New opportunities unlocked.`);
  }
  emit('mission:refresh'); emit('hud');
}
export function addItem(id, n = 1) { G.state.inv[id] = (G.state.inv[id] || 0) + n; }
export function removeItem(id, n = 1) { const s = G.state; s.inv[id] = (s.inv[id] || 0) - n; if (s.inv[id] <= 0) delete s.inv[id]; }
export function addHeat(n, why) {
  const s = G.state, before = s.heat;
  s.heat = Math.max(0, Math.min(5, s.heat + n));
  if (why && s.heat !== before) toast(`${why} · Heat ${n > 0 ? '+' : ''}${n}`);
  emit('hud');
}

let heatT = 45;
// Heat decays over time; owned businesses pay into the bank every cycle.
export function updateEconomy(dt) {
  const s = G.state;
  if (s.heat > 0) { heatT -= dt; if (heatT <= 0) { heatT = 45; s.heat--; emit('hud'); } }
  if (s.owned.length) {
    s.payIn -= dt;
    if (s.payIn <= 0) {
      s.payIn = ECON.payCycle;
      const total = bizIncome(s);
      s.bank += total; tx('Business income', total);
      notify('RiseBank', `Credit alert · ${fmt(total)} business income`);
      emit('hud');
    }
  }
}
