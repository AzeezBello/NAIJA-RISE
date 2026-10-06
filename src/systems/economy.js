import { G } from '../core/context.js';
import { emit, on } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { notify, toast } from '../ui/feedback.js';
import { contactOf } from '../data/characters.js';
import { bizIncome } from '../data/businesses.js';
import { ECON, UNLOCKS, RENT, AWAY } from '../data/config.js';
import { PROPERTIES } from '../data/locations.js';

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
    toast(`LEVEL UP — Level ${s.level}${UNLOCKS[s.level] ? ' · ' + UNLOCKS[s.level] : ''}`);
    msg('bank', `Congratulations on reaching Level ${s.level}. ${UNLOCKS[s.level] || 'Keep rising.'}`);
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
      s.bank += total; tx('Business income', total); emit('cash');
      notify('RiseBank', `Credit alert · ${fmt(total)} business income`);
      emit('hud');
    }
  }
}

// New game day: tenants pay, leases run out.
on('day', day => {
  const s = G.state;
  const income = (s.let || []).reduce((sum, id) => { const p = PROPERTIES.find(p => p.id === id); return sum + (p ? Math.round(p.rent * RENT.tenantShare) : 0); }, 0);
  if (income > 0) { s.bank += income; tx('Rent from tenants', income); notify('RiseBank', `Credit alert · ${fmt(income)} rent from your tenants`); }
  if (s.rented) {
    const p = PROPERTIES.find(p => p.id === s.rented.id), left = s.rented.until - day;
    if (left === 3) msg('landlord', `Oga, your rent for ${p.type} go expire in 3 days. Renew with Agent Kunle.`);
    if (left <= 0) { if (s.home === s.rented.id) s.home = null; s.rented = null; msg('landlord', `Rent don expire. I don pack your load for outside. See the agent if you wan renew.`); }
  }
  emit('hud');
});

// Four reputations (PRD §15), −100..100.
export function addRep(kind, n) { const r = G.state.rep; r[kind] = Math.max(-100, Math.min(100, (r[kind] || 0) + n)); }
// Skills (PRD §5) rise with use, 0..100; a point lands every so often so growth feels earned.
export function gainSkill(kind, n) {
  const sk = G.state.skills, before = Math.floor(sk[kind] || 0);
  sk[kind] = Math.min(100, (sk[kind] || 0) + n);
  if (Math.floor(sk[kind]) > before && Math.floor(sk[kind]) % 5 === 0) { toast(`${kind[0].toUpperCase() + kind.slice(1)} skill ${Math.floor(sk[kind])}`); emit('hud'); }
}

// Property upkeep each morning: owned homes cost rent/60 per day.
on('day', () => {
  const s = G.state;
  const upkeep = s.props.reduce((t, id) => { const p = PROPERTIES.find(p => p.id === id); return t + (p ? Math.round(p.rent / 60) : 0); }, 0);
  if (upkeep > 0) { s.bank -= upkeep; tx('Property maintenance', -upkeep); }
});

// "Lagos Never Sleeps" (PRD §32): businesses and tenants keep earning while the player is away.
export function awayReport() {
  const s = G.state;
  if (!s.lastSeen) return null;
  const minutes = Math.min(AWAY.capMinutes, (Date.now() - s.lastSeen) / 60000);
  if (minutes < AWAY.minMinutes) return null;
  const biz = Math.round(bizIncome(s) * minutes);                       // income is per real minute
  const days = Math.floor(minutes / 18);                                 // one game day is 18 real minutes
  const rent = Math.round((s.let || []).reduce((t, id) => t + PROPERTIES.find(p => p.id === id).rent * RENT.tenantShare, 0) * days);
  const upkeep = Math.round(s.props.reduce((t, id) => t + PROPERTIES.find(p => p.id === id).rent / 60, 0) * days);
  const net = biz + rent - upkeep;
  if (biz) tx('Business income while away', biz); if (rent) tx('Rent while away', rent); if (upkeep) tx('Maintenance while away', -upkeep);
  s.bank += net; s.awayTotal = (s.awayTotal || 0) + net;
  return { minutes: Math.round(minutes), biz, rent, upkeep, net, days };
}
