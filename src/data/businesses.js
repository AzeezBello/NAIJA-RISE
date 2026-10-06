export const BUSINESSES = [
  { id: 'kiosk', name: 'Roadside Kiosk', price: 150000, income: 4000, x: -20, z: 25 },
  { id: 'phone', name: 'Phone & Data Shop', price: 400000, income: 12000, x: 20, z: -28 },
  { id: 'buka', name: 'Mama Put Buka', price: 650000, income: 21000, x: -56, z: 20 },
  { id: 'wash', name: 'Car Wash', price: 900000, income: 32000, x: 88, z: -22 },
];
export const bizPrice = (state, b) => (state.kioskDeal && b.id === 'kiosk' ? Math.round(b.price * 0.6) : b.price);
import { BIZ } from './config.js';
// Income per owned business: base × (1 + staff bonus) × price level, plus a Business-skill bonus.
export const bizOne = (state, b) => { const c = state.biz?.[b.id] || {}; return Math.round(b.income * (1 + (c.staff || 0) * BIZ.staffBonus) * (BIZ.priceEffect[c.price || 'normal']) * (1 + (state.skills?.business || 0) * 0.005)); };
export const bizIncome = state => BUSINESSES.filter(b => state.owned.includes(b.id)).reduce((s, b) => s + bizOne(state, b), 0);
