// Vehicle classes. max/boost are m/s (×3.6 for km/h), accel is m/s².
// commercial: NPC public-transport fleet (fares, bus-stop behaviour).
export const VEH = {
  car:    { name: 'Sedan',       len: 4.75, wid: 2.55, max: 24, boost: 34, accel: 12 },
  danfo:  { name: 'Danfo',       len: 5.4,  wid: 2.35, max: 18, boost: 24, accel: 8,  commercial: true, fare: 300 },
  korope: { name: 'Korope',      len: 3.6,  wid: 1.9,  max: 19, boost: 25, accel: 10, commercial: true, fare: 200 },
  keke:   { name: 'Keke Napep',  len: 2.6,  wid: 1.45, max: 12, boost: 15, accel: 8,  commercial: true, fare: 150 },
  okada:  { name: 'Okada',       len: 2.1,  wid: 0.7,  max: 26, boost: 36, accel: 16, commercial: true, fare: 100 },
  brt:    { name: 'BRT',         len: 12,   wid: 2.7,  max: 16, boost: 20, accel: 4.5, commercial: true, fare: 500 },
  police: { name: 'Police',      len: 4.75, wid: 2.55, max: 25, boost: 35, accel: 13 },
  fire:   { name: 'Fire Truck',  len: 8,    wid: 2.6,  max: 16, boost: 20, accel: 5 },
  lawma:  { name: 'LAWMA Truck', len: 7,    wid: 2.5,  max: 15, boost: 19, accel: 5 },
  army:   { name: 'Army Truck',  len: 7,    wid: 2.5,  max: 17, boost: 22, accel: 6 },
  tanker: { name: 'Fuel Tanker', len: 10,   wid: 2.6,  max: 14, boost: 18, accel: 4 },
};

export const isCommercial = type => !!VEH[type]?.commercial;

// Prefer commercial fleet on the road (Lagos density).
export const TRAFFIC_MIX = [
  // Danfo (yellow VW-style buses) — backbone
  'danfo', 'danfo', 'danfo', 'danfo', 'danfo',
  // Keke napep
  'keke', 'keke', 'keke', 'keke',
  // BRT (blue) — fewer, longer routes
  'brt', 'brt',
  // Other commercial
  'korope', 'korope', 'okada', 'okada', 'okada',
  // Private / service
  'car', 'car', 'car', 'police', 'police', 'lawma', 'tanker','tanker',
];


export const MODEL_PAINT = {
  danfo: 0xf5c518,   // Lagos yellow
  korope: 0xf5c518,
  keke: 0xf5c518,
  brt: 0x1c4fa0,     // BRT blue
  lawma: 0xf07a1e,
  army: 0x3f5a2a,
  police: null,
  fire: null,
};

// Real models (Kenney Car Kit, CC0) by vehicle type; a type picks one at random. Keke, okada, BRT and the tanker stay procedural.
export const MODEL_BASE = 'assets/vehicles/kenney/';
// The danfo and korope are the original hand-built yellow buses (real Lagos silhouettes); set USE_MODELS false to use the
// procedural vehicles for everything.
export const USE_MODELS = true;

export const MODELS = {
  car: [
    'sedan',
    'suv',
    'hatchback-sports',
    'sedan-sports',
    'suv-luxury',
    'taxi'
  ],

  danfo: [
    'danfo_vanagon'
  ],

  korope: [
    'suzuki_carry_minivan'
  ],

  keke: [
    'keke_bajaj_re'
  ],

  okada: [
    'suzuki_gsx-r750'
  ],

  brt: [
    'volkswagen_crafter'
  ],

  police: [
    'police'
  ],

  lawma: [
    'garbage-truck'
  ],

  fire: [
    'firetruck'
  ],

  army: [
    '2003-gmc-topkick-c6500'
  ],

  tanker: [
    'heavy_commercial_vehicle_hcv'
  ]
};


export const PARKED = [
  { type: 'car', color: 0x172e35, x: 10, z: 32, rot: 0 },
  { type: 'danfo', x: -32, z: 7, rot: -Math.PI / 2 },
  { type: 'keke', x: 48, z: 13, rot: Math.PI },
  { type: 'korope', x: -15, z: -34, rot: 0 },
  { type: 'fire', x: 96, z: -34, rot: Math.PI / 2 },
  { type: 'army', x: 108, z: -13, rot: Math.PI / 2 },
  // danfo queues at the bus terminals
  { type: 'danfo', x: 126, z: 22, rot: Math.PI / 2 }, { type: 'danfo', x: 133, z: 22, rot: Math.PI / 2 }, { type: 'danfo', x: 147, z: 22, rot: Math.PI / 2 },
  { type: 'danfo', x: 380, z: -24, rot: Math.PI / 2 }, { type: 'danfo', x: 387, z: -24, rot: Math.PI / 2 }, { type: 'danfo', x: 394, z: -24, rot: Math.PI / 2 },
  { type: 'danfo', x: 392, z: -320, rot: Math.PI / 2 }, { type: 'danfo', x: 399, z: -320, rot: Math.PI / 2 },
];

export const TRAFFIC_COLORS = [0x6b2730, 0x294c39, 0x2b3a66, 0x7a7a7a, 0x1b1b1b];
export const LANE_OFFSET = 4.5; // right-hand traffic
export const LIVERIES = [0x1f3a5a, 0xf5c518, 0xc62828, 0xf0f0f0, 0x1b1b1b, 0x2bb34a, 0x7a28d6];
export const SLOGANS = ['NO FOOD FOR LAZY MAN', "GOD'S TIME IS THE BEST", 'NO CONDITION IS PERMANENT', 'MAN MUST WACK', 'REMEMBER YOUR SIX FEET', 'EKO O NI BAJE'];
