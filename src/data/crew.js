// Commercial vehicle crew: danfo / BRT drivers + conductors (Alpha 1.1).
// Traits affect fare, patience, and dialogue tone.
import { VEH } from './vehicles.js';

export const TRAITS = {
  patient:   { label: 'Patient',   fareMul: 1.0,  cool: 8,  heatOnRefuse: 0 },
  hustler:   { label: 'Hustler',   fareMul: 1.15, cool: 5,  heatOnRefuse: 0 },
  strict:    { label: 'Strict',    fareMul: 1.0,  cool: 4,  heatOnRefuse: 1 },
  jolly:     { label: 'Jolly',     fareMul: 0.9,  cool: 10, heatOnRefuse: 0 },
  tired:     { label: 'Tired',     fareMul: 1.0,  cool: 6,  heatOnRefuse: 0 },
  noChange:  { label: 'No change', fareMul: 1.0,  cool: 5,  heatOnRefuse: 0 }, // hates big notes
};

export const DRIVER_NAMES = [
  'Oga Femi', 'Mallam Musa', 'Brother Chinedu', 'Oga Kayode', 'Uncle Biodun',
  'Driver Wale', 'Oga Tunde', 'Mallam Sani', 'Baba Gani', 'Captain Lekan',
];

export const CONDUCTOR_NAMES = [
  'Conductor Sola', 'Bayo', 'Chuks', 'Ibrahim', 'Kola',
  'Emeka', 'Tope', 'Segun', 'Ahmed', 'Jude',
];

export const ROUTES = [
  { id: 'kilo',      call: 'Kilo! Kilo!',           stops: ['ojuelegba', 'kilo'] },
  { id: 'cms',       call: 'CMS! CMS last!',        stops: ['ojuelegba', 'marina'] },
  { id: 'yaba',      call: 'Yaba! Under bridge!',   stops: ['yaba', 'ojuelegba'] },
  { id: 'ikeja',     call: 'Ikeja! Along!',         stops: ['ojuelegba'] },
  { id: 'barracks',  call: 'Barracks! Enter!',      stops: ['kilo'] },
  { id: 'brt_corridor', call: 'BRT · CMS–Ikorodu',  stops: ['marina'] },
];

/** Role uniforms (hex body colours). */
export const CREW_LOOK = {
  danfo_driver:    { top: 0xf5c518, bottom: 0x1b1b1b, cap: 0x111111 }, // yellow shirt
  danfo_conductor: { top: 0x2bb34a, bottom: 0x1b1b1b, cap: 0xd62828 }, // green + red cap
  brt_driver:      { top: 0x1c4fa0, bottom: 0x111318, cap: 0x1c4fa0 }, // BRT blue
  brt_conductor:   { top: 0x1c4fa0, bottom: 0xf0f0f0, cap: 0xffc52f },
  keke_driver:     { top: 0xf5c518, bottom: 0x2bb34a, cap: 0x111111 },
};

export function pickTrait() {
  const keys = Object.keys(TRAITS);
  return keys[Math.floor(Math.random() * keys.length)];
}

export function fareFor(type, traitId) {
  const base = VEH[type]?.fare ?? 300;  
  const mul = TRAITS[traitId]?.fareMul ?? 1;
  return Math.round(base * mul / 50) * 50; // snap to ₦50
}