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
export const RIVAL = { name: "Chidi's Corner", after: 2, penalty: 0.85 };   // opens once you own two businesses; low prices beat it
export const bizCfg = (state, id) => (state.biz[id] ??= { staff: 0, price: 'normal', stock: 100, names: [] });
export const rivalOpen = state => state.owned.length >= RIVAL.after;
export const bizOne = (state, b) => {
  const c = bizCfg(state, b.id);
  const rival = rivalOpen(state) && c.price !== 'low' ? RIVAL.penalty : 1;
  return Math.round(b.income * (1 + (c.staff || 0) * BIZ.staffBonus) * BIZ.priceEffect[c.price || 'normal'] * (1 + (state.skills?.business || 0) * 0.005) * ((c.stock ?? 100) / 100) * rival);
};
export const restockCost = b => Math.round(b.income * 1.5);
export const bizIncome = state => BUSINESSES.filter(b => state.owned.includes(b.id)).reduce((s, b) => s + bizOne(state, b), 0);
