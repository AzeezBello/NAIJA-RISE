// ============================================================
// NAIJA RISE — Vehicle Configuration
// ============================================================
// Vehicle classes:
// max / boost = metres per second (m/s)
// accel       = metres per second squared (m/s²)
//
// commercial = NPC public-transport fleet.
// fare       = default passenger fare in NGN.
//
// GLB loading is handled by src/entities/vehicleModels.js.
// That loader checks /vehicles/<model>.glb first, then the
// legacy assets/vehicles/kenney/ path.
// ============================================================

export const VEH = {
  car: {
    name: 'Sedan',
    len: 4.75,
    wid: 2.55,
    max: 24,
    boost: 34,
    accel: 12,
  },

  danfo: {
    name: 'Danfo',
    len: 5.4,
    wid: 2.35,
    max: 18,
    boost: 24,
    accel: 8,
    commercial: true,
    fare: 300,
  },

  korope: {
    name: 'Korope',
    len: 3.9,
    wid: 2.05,
    max: 19,
    boost: 25,
    accel: 10,
    commercial: true,
    fare: 200,
  },

  keke: {
    name: 'Keke Napep',
    len: 2.95,
    wid: 1.55,
    max: 12,
    boost: 15,
    accel: 8,
    commercial: true,
    fare: 150,
  },

  okada: {
    name: 'Okada',
    len: 2.35,
    wid: 0.7,
    max: 26,
    boost: 36,
    accel: 16,
    commercial: true,
    fare: 100,
  },

  brt: {
    name: 'BRT',
    len: 12,
    wid: 2.7,
    max: 16,
    boost: 20,
    accel: 4.5,
    commercial: true,
    fare: 500,
  },

  police: {
    name: 'Police',
    len: 4.75,
    wid: 2.55,
    max: 25,
    boost: 35,
    accel: 13,
  },

  fire: {
    name: 'Fire Truck',
    len: 8,
    wid: 2.6,
    max: 16,
    boost: 20,
    accel: 5,
  },

  lawma: {
    name: 'LAWMA Truck',
    len: 7,
    wid: 2.5,
    max: 15,
    boost: 19,
    accel: 5,
  },

  army: {
    name: 'Army Truck',
    len: 7,
    wid: 2.5,
    max: 17,
    boost: 22,
    accel: 6,
  },

  tanker: {
    name: 'Fuel Tanker',
    len: 10,
    wid: 2.6,
    max: 14,
    boost: 18,
    accel: 4,
  },

  pickup: { name: 'Pickup', len: 4.8, wid: 2.05, max: 17, boost: 23, accel: 7 },
  motorcycle: { name: 'Motorcycle', len: 2.5, wid: 0.95, max: 26, boost: 36, accel: 14 },
  van: { name: 'Van', len: 4.9, wid: 2.1, max: 18, boost: 24, accel: 7 },
  delivery: { name: 'Delivery Van', len: 4.7, wid: 2.0, max: 17, boost: 22, accel: 7 },
  truck: { name: 'Truck', len: 6.5, wid: 2.5, max: 15, boost: 19, accel: 5 },
  ambulance: { name: 'Ambulance', len: 5.8, wid: 2.35, max: 21, boost: 28, accel: 9 },
};

export const isCommercial = type => !!VEH[type]?.commercial;

// ============================================================
// TRAFFIC MIX
// ============================================================
// Weighted by repetition.
// Danfo and Keke intentionally dominate the Lagos traffic mix.
// Additional vehicle types can be introduced later without
// changing the vehicle spawning system.
// ============================================================

export const TRAFFIC_MIX = [
  // Danfo — Lagos public transport backbone
  'danfo',
  'danfo',
  'danfo',
  'danfo',
  'danfo',

  // Keke Napep
  'keke',
  'keke',
  'keke',
  'keke',

  // BRT — fewer vehicles, longer routes
  'brt',
  'brt',

  // Korope
  'korope',
  'korope',

  // Okada
  'okada',
  'okada',
  'okada',

  // Private vehicles
  'car',
  'car',
  'car',

  'pickup',
  'van',
  'delivery',
  'truck',
  'motorcycle',
  'ambulance',
  'fire',
  'army',

  // Emergency / service vehicles
  'police',
  'police',
  'lawma',

  // Heavy traffic
  'tanker',
  'tanker',
];

// ============================================================
// MODEL PAINT
// ============================================================

export const MODEL_PAINT = {
  // Lagos commercial yellow
  danfo: 0xf5c518,
  korope: 0xf5c518,
  keke: 0xf5c518,
  okada: 0xf5c518,

  // Lagos BRT blue
  brt: 0x1c4fa0,

  // Service fleet
  lawma: 0xf07a1e,
  army: 0x3f5a2a,

  // These retain their model-specific/procedural paint
  police: null,
  fire: null,
};

// ============================================================
// MODEL PATHS
// ============================================================
//
// Kenney fallback models:
//   assets/vehicles/kenney/
//
// New / Lagos-specific models:
//   /vehicles/<filename>.glb
//
// vehicleModels.js is responsible for trying both paths.
// ============================================================

export const MODEL_BASE = 'assets/vehicles/kenney/';

export const USE_MODELS = true;

// ============================================================
// VEHICLE GLB MAPPING
// ============================================================
//
// Names are stable model IDs; vehicleModels.js maps IDs to organized GLB paths.
//
// Current Lagos fleet:
// Every local vehicle GLB is assigned to a traffic vehicle family below.
// Procedural geometry remains the fallback if a GLB cannot load.
// ============================================================

export const MODELS = {
  // ----------------------------------------------------------
  // PRIVATE CARS
  // ----------------------------------------------------------
  car: [
    'sedan',
    'suv',
    'hatchback-sports',
    'sedan-sports',
    'suv-luxury',
    'taxi',
  ],

  // ----------------------------------------------------------
  // LAGOS COMMERCIAL TRANSPORT
  // ----------------------------------------------------------

  danfo: [
    'danfo_vanagon',
  ],

  keke: [
    'keke_bajaj_re',
  ],

  korope: [
    'suzuki_carry_minivan',
  ],

  okada: [
    'suzuki_gsx-r750',
  ],

  // Temporary BRT model.
  // Replace with a true Lagos BRT GLB when available.
  brt: [
    'volkswagen_crafter',
  ],

  // ----------------------------------------------------------
  // GOVERNMENT / EMERGENCY / SERVICE
  // ----------------------------------------------------------

  police: [
    'police',
  ],

  lawma: [
    'garbage-truck',
  ],

  fire: [
    'firetruck',
  ],

  ambulance: [
    'ambulance',
  ],

  army: [
    '2003-gmc-topkick-c6500',
  ],

  tanker: [
    'heavy_commercial_vehicle_hcv',
  ],

  // ----------------------------------------------------------
  // AVAILABLE FUTURE MODELS
  // ----------------------------------------------------------
  //
  // These are deliberately NOT included in TRAFFIC_MIX yet.
  // They can be activated when their gameplay behaviour,
  // liveries and spawning rules are ready.
  // ----------------------------------------------------------

  pickup: [
    'lightbody_90_md_pickup_-_low_poly_model',
  ],

  motorcycle: [
    '2008_kawasaki_ninja_zx-10r-em',
    'suzuki_hayabusa_gsx-1300r-k8',
  ],

  van: [
    'volkswagen_crafter',
    'volkswagen_id._buzz',
    'van',
  ],

  delivery: [
    'delivery',
    'delivery-flat',
  ],

  truck: [
    'truck',
    'truck-flat',
  ],
};

// ============================================================
// PARKED VEHICLES
// ============================================================

export const PARKED = [
  { type: 'car', color: 0x172e35, x: 8, z: 28, rot: 0 },
  { type: 'danfo', x: -28, z: 10, rot: -Math.PI / 2 },
  { type: 'keke', x: 46, z: 16, rot: Math.PI },
  // Street kerb on Adeniran Ogunsanya — not inside compound walls
  { type: 'korope', x: 6, z: 40, rot: Math.PI / 2 },
  { type: 'fire', x: 100, z: -40, rot: Math.PI / 2 },
  { type: 'army', x: 112, z: -18, rot: Math.PI / 2 },
  { type: 'danfo', x: 126, z: 22, rot: Math.PI / 2 },
  { type: 'danfo', x: 133, z: 22, rot: Math.PI / 2 },
  { type: 'danfo', x: 147, z: 22, rot: Math.PI / 2 },
  { type: 'danfo', x: 380, z: -24, rot: Math.PI / 2 },
  { type: 'danfo', x: 387, z: -24, rot: Math.PI / 2 },
  { type: 'danfo', x: 394, z: -24, rot: Math.PI / 2 },
];

// ============================================================
// TRAFFIC / LIVERY CONSTANTS
// ============================================================

export const TRAFFIC_COLORS = [
  0x6b2730,
  0x294c39,
  0x2b3a66,
  0x7a7a7a,
  0x1b1b1b,
];

// Right-hand traffic lane offset used by the existing road system.
export const LANE_OFFSET = 4.5;

export const LIVERIES = [
  0x1f3a5a,
  0xf5c518,
  0xc62828,
  0xf0f0f0,
  0x1b1b1b,
  0x2bb34a,
  0x7a28d6,
];

export const SLOGANS = [
  'NO FOOD FOR LAZY MAN',
  "GOD'S TIME IS THE BEST",
  'NO CONDITION IS PERMANENT',
  'MAN MUST WACK',
  'REMEMBER YOUR SIX FEET',
  'EKO O NI BAJE',
];
