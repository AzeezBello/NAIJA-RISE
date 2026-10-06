// Vehicle classes. max/boost are m/s (×3.6 for km/h), accel is m/s².
export const VEH = {
  car:    { name: 'Sedan',       len: 4.75, wid: 2.55, max: 24, boost: 34, accel: 12 },
  danfo:  { name: 'Danfo',       len: 5.2,  wid: 2.3,  max: 20, boost: 27, accel: 9 },
  korope: { name: 'Korope',      len: 3.6,  wid: 1.9,  max: 19, boost: 25, accel: 10 },
  keke:   { name: 'Keke Napep',  len: 2.5,  wid: 1.4,  max: 13, boost: 16, accel: 9 },
  okada:  { name: 'Okada',       len: 2.1,  wid: 0.7,  max: 26, boost: 36, accel: 16 },
  brt:    { name: 'BRT',         len: 11,   wid: 2.6,  max: 17, boost: 21, accel: 5 },
  police: { name: 'Police',      len: 4.75, wid: 2.55, max: 25, boost: 35, accel: 13 },
  fire:   { name: 'Fire Truck',  len: 8,    wid: 2.6,  max: 16, boost: 20, accel: 5 },
  lawma:  { name: 'LAWMA Truck', len: 7,    wid: 2.5,  max: 15, boost: 19, accel: 5 },
  army:   { name: 'Army Truck',  len: 7,    wid: 2.5,  max: 17, boost: 22, accel: 6 },
  tanker: { name: 'Fuel Tanker', len: 10,   wid: 2.6,  max: 14, boost: 18, accel: 4 },
};

export const PARKED = [
  { type: 'car', color: 0x172e35, x: 10, z: 32, rot: 0 },
  { type: 'danfo', x: -32, z: 7, rot: -Math.PI / 2 },
  { type: 'keke', x: 48, z: 13, rot: Math.PI },
  { type: 'korope', x: -15, z: -34, rot: 0 },
  { type: 'fire', x: 96, z: -34, rot: Math.PI / 2 },
  { type: 'army', x: 108, z: -13, rot: Math.PI / 2 },
];

export const TRAFFIC_MIX = ['danfo', 'danfo', 'danfo', 'danfo', 'korope', 'korope', 'keke', 'keke', 'keke', 'okada', 'okada', 'okada', 'okada', 'brt', 'car', 'car', 'police', 'police', 'lawma', 'tanker', 'tanker'];
export const TRAFFIC_COLORS = [0x6b2730, 0x294c39, 0x2b3a66, 0x7a7a7a, 0x1b1b1b];
export const LANE_OFFSET = 4.5; // right-hand traffic
