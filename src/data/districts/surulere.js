// SURULERE, LAGOS — the first playable district. World units are roughly metres; +x east, +z south (down on the map).
// Every district module exports the same shape so new areas (Yaba, Ikeja, Lekki, other states) drop in here.
export const META = { id: 'surulere', name: 'Surulere', state: 'Lagos', spawn: { x: 0, z: 34 }, bounds: 145 };
export const ROADS = { h: [0, -66], v: [0, 72, -72] };
// Real Surulere street names on the stylised grid. Keys are the road coordinates above.
export const ROAD_NAMES = {
  h: { 0: 'Bode Thomas Street', '-66': 'Itire Road · Ojuelegba Road' },
  v: { 0: 'Adeniran Ogunsanya Street', 72: 'Funsho Williams Avenue', '-72': 'Ogunlana Drive' },
};
export const ROAD_WIDTHS = { h: { 0: 22, '-66': 18 }, v: { 0: 22, 72: 18, '-72': 18 } };
export const roadName = (axis, k) => ROAD_NAMES[axis][k] || 'the main road';

// kind: landmark | market | police | army | service | bank | venue | hotel | checkpoint | post
export const LANDMARKS = [
  // Surulere core
  { id: 'ojuelegba', name: 'Ojuelegba Junction', short: 'OJUELEGBA', x: 42, z: -48, c: '#87652e', sign: '#ffc52f', h: 5, kind: 'landmark' },
  { id: 'marina', name: 'Marina', short: 'MARINA', x: 58, z: 60, c: '#245e69', sign: '#3dff79', h: 11, kind: 'landmark' },
  { id: 'ladipo', name: 'Ladipo Garage', short: 'LADIPO', x: -42, z: 48, c: '#5c4933', sign: '#ffc52f', h: 5, kind: 'landmark' },
  { id: 'yaba', name: 'Yaba Market', short: 'YABA MKT', x: -48, z: -48, c: '#6b4737', sign: '#ffc52f', h: 5, kind: 'market' },
  { id: 'shitta', name: 'Shitta Market', short: 'SHITTA MKT', x: -96, z: -24, c: '#6b4737', sign: '#ffc52f', h: 5, kind: 'market' },
  { id: 'mushin', name: 'Mushin Market', short: 'MUSHIN MKT', x: -24, z: -120, c: '#5e4a3a', sign: '#ffc52f', h: 5, kind: 'market' },
  { id: 'stadium', name: 'National Stadium', short: 'STADIUM', x: -104, z: -104, c: '#8a8f93', sign: '#ffffff', stadium: true, kind: 'landmark' },
  // law and public services
  { id: 'police', name: 'Area C Police Station', short: 'POLICE', x: 96, z: -96, c: '#1f2b45', sign: '#ffffff', h: 6, kind: 'police' },
  { id: 'fire', name: 'Lagos State Fire Service', short: 'FIRE', x: 96, z: -48, c: '#8a2222', sign: '#ffffff', h: 6, kind: 'service' },
  { id: 'army', name: 'Army Barracks', short: 'ARMY', x: 120, z: -24, c: '#3b4a2a', sign: '#ffffff', h: 5, kind: 'army' },
  { id: 'lawma', name: 'LAWMA Depot', short: 'LAWMA', x: -96, z: 96, c: '#b85c1a', sign: '#ffffff', h: 5, kind: 'service' },
  { id: 'frsc', name: 'FRSC Checkpoint', short: 'FRSC', x: 84, z: 30, kind: 'checkpoint', c: '#e4d14b' },
  { id: 'lastma', name: 'LASTMA Post', short: 'LASTMA', x: -12, z: -56, kind: 'post', c: '#d9b92e' },
  // banks
  { id: 'bank1', name: 'RiseBank Shitta', short: 'BANK', x: -120, z: -24, c: '#2d2d4a', sign: '#b7b7ff', h: 9, kind: 'bank' },
  { id: 'bank2', name: 'RiseBank Ojuelegba', short: 'BANK', x: 48, z: 24, c: '#2d2d4a', sign: '#b7b7ff', h: 9, kind: 'bank' },
  // nightlife and hotel
  { id: 'forties', name: 'Forties Bar', short: 'FORTIES', x: 24, z: -96, c: '#4a1f3a', sign: '#ff5d9e', h: 5, kind: 'venue', cost: 5000 },
  { id: 'lust', name: 'Lust Club', short: 'LUST', x: 120, z: -96, c: '#3a1a4a', sign: '#c77dff', h: 7, kind: 'venue', cost: 8000 },
  { id: 'crib', name: 'The Crib Lounge', short: 'THE CRIB', x: 24, z: 96, c: '#1f3a3a', sign: '#3dff79', h: 5, kind: 'venue', cost: 6000 },
  { id: 'ritalori', name: 'Rita Lori Hotel', short: 'RITA LORI', x: 96, z: 48, c: '#5a4a7a', sign: '#ffffff', h: 16, kind: 'hotel', cost: 15000 },
  // community
  { id: 'school', name: 'Community Grammar School', short: 'SCHOOL', x: -24, z: 120, c: '#8a7a4a', sign: '#ffffff', h: 6, kind: 'school' },
  { id: 'church', name: 'Grace Chapel', short: 'CHURCH', x: 48, z: -120, c: '#d9d2c2', sign: '#ffc52f', h: 9, kind: 'worship' },
  { id: 'mosque', name: 'Surulere Central Mosque', short: 'MOSQUE', x: -48, z: 120, c: '#2f6b5a', sign: '#ffffff', h: 8, kind: 'worship' },
  { id: 'nepa', name: 'PHCN / Eko Disco Office', short: 'NEPA', x: 120, z: 48, c: '#4a4a4a', sign: '#ffc52f', h: 7, kind: 'nepa' },
  { id: 'fuel', name: 'Mobil Filling Station', short: 'FUEL', x: -48, z: -96, c: '#b32020', sign: '#ffffff', h: 4, kind: 'fuel' },
  { id: 'owambe', name: 'Surulere Event Centre', short: 'EVENT CTR', x: -120, z: 120, c: '#7a3a6a', sign: '#ffc52f', h: 7, kind: 'owambe', cost: 3000 },
];

export const BUSSTOPS = [
  { id: 'kilo', name: 'Kilo Bus Stop', short: 'KILO', x: -40, z: 15, agberos: 2 },
  { id: 'ojstop', name: 'Ojuelegba Bus Stop', short: 'OJUELEGBA B/S', x: 18, z: -54, agberos: 1 },
  { id: 'stadstop', name: 'Stadium Bus Stop', short: 'STADIUM B/S', x: -86, z: -55, agberos: 0 },
  { id: 'mushinstop', name: 'Mushin Bus Stop', short: 'MUSHIN B/S', x: -30, z: -77, agberos: 1 },
];

// Housing (PRD §10): rent through an agent or buy from the landlord; owned homes can be let to tenants.
// style: bungalow | storey | highrise. rent is per lease (30 game days); buy may be null (rent only).
export const PROPERTIES = [
  { id: 'room', name: 'Room · Face-me-I-face-you', type: 'Room', desc: 'One room in a shared compound off Adelabu Street. Shared bathroom, landlord lives upstairs. Rent only.', rent: 60000, buy: null, x: -96, z: 24, sign: 'ROOM TO LET', c: '#c9b48a', h: 3.6, style: 'bungalow' },
  { id: 'selfcon', name: 'Self-contain · Ogunlana Drive', type: 'Self-contained', desc: 'Your own room, kitchen corner and bathroom in a fenced compound. Sleeping here clears one heat.', rent: 150000, buy: 900000, x: -120, z: 72, sign: 'SELF-CON TO LET', c: '#a8b0b8', h: 7, style: 'storey', perk: 'heat1' },
  { id: 'flat', name: '2-Bedroom Flat · Bode Thomas', type: 'Flat', desc: 'Second-floor flat in a three-storey block with a gate man. Sleeping here clears one heat.', rent: 400000, buy: 2400000, x: -24, z: 96, sign: 'FLATS TO LET', c: '#b9a98f', h: 10.5, style: 'storey', perk: 'heat1' },
  { id: 'duplex', name: 'Duplex · Palm Court, Adeniran Ogunsanya', type: 'Duplex', desc: 'Gated duplex with parking. Sleeping here clears all heat and fills your last vehicle.', rent: 1200000, buy: 6000000, x: 96, z: 96, sign: 'PALM COURT', c: '#d9d2c2', h: 8, style: 'storey', perk: 'heat0' },
];
for (const p of PROPERTIES) p.door = { x: p.x, z: p.z - 10.5 };

// Roadside kiosks double as POS agents (cash withdrawal, pure water, suya).
export const KIOSKS = [[-20, 25], [20, -28], [-56, 20], [88, -22]];

// Animals: goats around the markets, chickens near compounds, stray dogs roaming.
export const ANIMALS = [
  { kind: 'goat', x: -60, z: -40 }, { kind: 'goat', x: -36, z: -58 }, { kind: 'goat', x: -84, z: -14 }, { kind: 'goat', x: -108, z: -34 }, { kind: 'goat', x: -12, z: -110 }, { kind: 'goat', x: -36, z: -130 },
  { kind: 'chicken', x: -84, z: 34 }, { kind: 'chicken', x: -108, z: 30 }, { kind: 'chicken', x: 84, z: 108 }, { kind: 'chicken', x: 108, z: 84 }, { kind: 'chicken', x: -132, z: 60 },
  { kind: 'dog', x: 30, z: 40 }, { kind: 'dog', x: -30, z: -30 },
];

// Uniformed NPCs standing at their posts.
export const UNIFORMS = { police: 0x111318, army: 0x3f5a2a, fire: 0xb52a2a, lawma: 0xf07a1e, lastma: 0xd9b92e, frsc: 0xe4d14b, racer: 0xff5d9e };
export const SERVICE_NPCS = [
  { x: 92, z: -84, u: 'police' }, { x: 100, z: -84, u: 'police' },
  { x: 114, z: -12, u: 'army' }, { x: 124, z: -12, u: 'army' },
  { x: 90, z: -36, u: 'fire' },
  { x: -92, z: 84, u: 'lawma' }, { x: -30, z: 13, u: 'lawma' }, { x: 30, z: -13, u: 'lawma' },
  { x: -12, z: -56, u: 'lastma' },
  { x: 80, z: 30, u: 'frsc' }, { x: 64, z: 30, u: 'frsc' },
  { x: -80, z: -58, u: 'racer' },
];

// Night hustlers outside the clubs (mature content, toggle in Settings).
export const NIGHTLIFE_NPCS = [
  { x: 112, z: -84, name: 'Olosho' }, { x: 128, z: -84, name: 'Ashawo' }, { x: 16, z: -84, name: 'OS' }, { x: 32, z: -84, name: 'Ashana' },
];

// Grid buildings and palms keep clear of these spots.
export const RESERVED = [
  ...LANDMARKS.map(l => ({ x: l.x, z: l.z, r: l.stadium ? 34 : (l.kind === 'checkpoint' || l.kind === 'post') ? 8 : 17 })),
  ...BUSSTOPS.map(b => ({ x: b.x, z: b.z, r: 13 })),
  ...PROPERTIES.map(p => ({ x: p.x, z: p.z, r: 17 })),
];

export const PLACES = [...LANDMARKS, ...BUSSTOPS];
export const placeOf = id => LANDMARKS.find(l => l.id === id) || BUSSTOPS.find(b => b.id === id) || PROPERTIES.find(p => p.id === id);
export const placesOfKind = kind => LANDMARKS.filter(l => l.kind === kind);
export const WATER = { x: -170, w: 70 };   // lagoon strip west of the district
