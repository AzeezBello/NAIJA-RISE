export const BUSINESSES = [
  { id: 'kiosk', name: 'Roadside Kiosk', price: 150000, income: 4000, x: -20, z: 25 },
  { id: 'phone', name: 'Phone & Data Shop', price: 400000, income: 12000, x: 20, z: -28 },
  { id: 'buka', name: 'Mama Put Buka', price: 650000, income: 21000, x: -56, z: 20 },
  { id: 'wash', name: 'Car Wash', price: 900000, income: 32000, x: 88, z: -22 },
];
export const bizPrice = (state, b) => (state.kioskDeal && b.id === 'kiosk' ? Math.round(b.price * 0.6) : b.price);
import { BIZ } from './config.js';
// Income per owned business: base × (1 + staff bonus) × price level, plus a Business-skill bonus.
export const STAFF_NAMES = ['Chidi', 'Bisi', 'Emeka', 'Funke', 'Musa', 'Ngozi', 'Tope', 'Halima', 'Seun', 'Ifeoma'];
export const STAFF_SHIFTS = {
  morning: { label: 'Morning · 06–14', start: 6, end: 14 },
  afternoon: { label: 'Afternoon · 14–22', start: 14, end: 22 },
  night: { label: 'Night · 22–06', start: 22, end: 6 },
  'all-day': { label: 'All day', start: 0, end: 24 },
};
export const RIVAL = { name: "Chidi's Corner", after: 2, penalty: 0.85 };   // opens once you own two businesses; low prices beat it
export const bizCfg = (state, id) => {
  state.biz ??= {};
  const config = (state.biz[id] ??= { staff: 0, price: 'normal', stock: 100, names: [], shifts: {} });
  config.names ??= [];
  config.shifts ??= {};
  return config;
};
export const rivalOpen = state => state.owned.length >= RIVAL.after;
export const staffIsOnDuty = (state, businessId, name, clock = state.clock ?? 12) => {
  const c = bizCfg(state, businessId);
  const hour = ((clock % 24) + 24) % 24;
  if (!c.names.slice(0, c.staff || 0).includes(name)) return false;
  const shift = STAFF_SHIFTS[c.shifts?.[name] || 'all-day'];
  if (!shift) return false;
  return shift.start < shift.end
    ? hour >= shift.start && hour < shift.end
    : hour >= shift.start || hour < shift.end;
};
export const staffOnDuty = (state, businessId, clock = state.clock ?? 12) => {
  const c = bizCfg(state, businessId);
  return c.names.slice(0, c.staff || 0).filter(name => staffIsOnDuty(state, businessId, name, clock)).length;
};
export const bizOne = (state, b, clock = state.clock ?? 12) => {
  const c = bizCfg(state, b.id);
  const rival = rivalOpen(state) && c.price !== 'low' ? RIVAL.penalty : 1;
  return Math.round(b.income * (1 + staffOnDuty(state, b.id, clock) * BIZ.staffBonus) * BIZ.priceEffect[c.price || 'normal'] * (1 + (state.skills?.business || 0) * 0.005) * ((c.stock ?? 100) / 100) * rival);
};
export const restockCost = b => Math.round(b.income * 1.5);
export const bizIncome = (state, clock = state.clock ?? 12) => BUSINESSES.filter(b => state.owned.includes(b.id)).reduce((s, b) => s + bizOne(state, b, clock), 0);
