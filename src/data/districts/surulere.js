// LAGOS — Surulere plus the corridors: Costain and Eko Bridge to Lagos Island, Falomo Bridge to Victoria Island and the
// Lekki toll gate, Third Mainland Bridge to Yaba, and Ikorodu Road west across Ebute Metta to Ikorodu Garage.
// World units are roughly metres; +x east, +z south (down on the map). Every district module exports the same shape.
export const META = { id: 'surulere', name: 'Surulere', state: 'Lagos', spawn: { x: 0, z: 34 }, bounds: { x: [-145, 615], z: [-395, 325] } };
// Regions of this world (PRD corridor map), as rectangles. The locale indicator names them.
export const REGIONS = [
  { id: 'surulere', name: 'Surulere', x: [-150, 135], z: [-150, 150] }, { id: 'costain', name: 'Costain · Iganmu', x: [135, 165], z: [-150, 150] },
  { id: 'ajegunle', name: 'Ajegunle · AJ City', x: [-150, -60], z: [40, 150] },
  { id: 'lagoon', name: 'Eko Bridge · Lagos Lagoon', x: [165, 340], z: [-250, 330] }, { id: 'island', name: 'Lagos Island', x: [340, 480], z: [-85, 100] },
  { id: 'thirdmainland', name: 'Third Mainland Bridge', x: [340, 480], z: [-250, -85] }, { id: 'yaba', name: 'Yaba', x: [340, 480], z: [-400, -250] },
  { id: 'ebute', name: 'Ebute Metta · Ikorodu Road', x: [-100, 340], z: [-400, -250] }, { id: 'ikorodu', name: 'Ikorodu Road · Ikorodu Garage', x: [-150, -100], z: [-400, -250] },
  { id: 'falomo', name: 'Falomo Bridge · Five Cowrie Creek', x: [340, 480], z: [100, 180] }, { id: 'vi', name: 'Victoria Island', x: [340, 480], z: [180, 330] },
  { id: 'lekki', name: 'Lekki Phase 1', x: [480, 620], z: [180, 330] },
];
export const regionAt = (x, z = 0) => REGIONS.find(r => x >= r.x[0] && x < r.x[1] && z >= r.z[0] && z < r.z[1]) || REGIONS[0];
export const ROADS = { h: [0, -66, 142, -330, -300, 240, 300], v: [0, 72, -72, 360, 440, 560] };
// Where each road physically runs. Bode Thomas continues east over Eko Bridge onto Lagos Island; Marina continues south over
// Falomo Bridge into Victoria Island; Broad Street continues north over Third Mainland Bridge into Yaba; Ikorodu Road runs
// the whole width of the mainland; Adeola Odeku becomes the Lekki–Epe Expressway past the toll gate.
export const ROAD_EXTENT = {
  h: { 0: [-150, 470], '-66': [-150, 150], 142: [-150, 150], '-330': [-150, 480], '-300': [340, 480], 240: [340, 620], 300: [340, 480] },
  v: { 0: [-150, 150], 72: [-330, 150], '-72': [-150, 150], 360: [-400, 80], 440: [-80, 330], 560: [180, 330] },
};
export const roadExtent = (axis, k) => ROAD_EXTENT[axis][k] || [-150, 150];
// Named segments along a road (coordinate ranges along its axis).
export const ROAD_SEGMENTS = {
  h: { 0: [[-150, 150, 'Bode Thomas Street'], [150, 160, 'Costain Interchange'], [160, 345, 'Eko Bridge'], [345, 470, 'Nnamdi Azikiwe Street · CMS']],
       '-330': [[-150, -100, 'Ikorodu Road · Ikorodu Garage'], [-100, 300, 'Ikorodu Road · Ebute Metta'], [300, 480, 'Ikorodu Road · Jibowu']],
       240: [[340, 480, 'Adeola Odeku Street'], [480, 505, 'Lekki Toll Gate'], [505, 620, 'Lekki–Epe Expressway']] },
  v: { 72: [[-330, -145, 'Western Avenue'], [-145, 150, 'Funsho Williams Avenue']],
       360: [[-400, -250, 'Murtala Muhammed Way · Yaba'], [-250, -85, 'Third Mainland Bridge'], [-85, 80, 'Broad Street']],
       440: [[-80, 80, 'Marina'], [80, 180, 'Falomo Bridge'], [180, 330, 'Akin Adesola Street']] },
};
// Bridge spans (rush-hour profile, no street lights at ground level).
export const BRIDGES = [{ axis: 'h', k: 0, from: 155, to: 345 }, { axis: 'v', k: 360, from: -250, to: -85 }, { axis: 'v', k: 440, from: 80, to: 180 }];
export const onBridge = (axis, k, along) => BRIDGES.some(b => b.axis === axis && b.k === k && along > b.from && along < b.to);
export const roadNameAt = (axis, k, along) => { const seg = (ROAD_SEGMENTS[axis]?.[k] || []).find(([a, b]) => along >= a && along < b); return seg ? seg[2] : ROAD_NAMES[axis][k] || 'the main road'; };
// Road classes drive traffic density, cruise speed, LASTMA speed limits and what lines the kerb.
// class: expressway | highway | main | commercial | residential | market
export const ROAD_CLASS = {
  h: { 0: 'main', '-66': 'market', 142: 'expressway', '-330': 'highway', '-300': 'commercial', 240: 'highway', 300: 'main' },
  v: { 0: 'commercial', 72: 'highway', '-72': 'residential', 360: 'commercial', 440: 'main', 560: 'residential' },
};
export const CLASS_RULES = {
  expressway: { speed: 1.7, limit: 120, density: 1.3, lights: false, median: true },
  highway: { speed: 1.25, limit: 100, density: 1.2, lights: true, median: true },
  main: { speed: 1, limit: 80, density: 1, lights: true },
  commercial: { speed: 0.9, limit: 60, density: 1.1, lights: true },
  residential: { speed: 0.7, limit: 50, density: 0.6, lights: true },
  market: { speed: 0.6, limit: 40, density: 1, lights: true, vendors: true },
  bridge: { speed: 1.4, limit: 100, density: 1.4, lights: false, median: true },
};
// Rush-hour profile for the bridge (PRD: traffic understands bridges). Factor on cruise speed by hour.
export const BRIDGE_RUSH = h => (h >= 7 && h < 10) || (h >= 16 && h < 19.5) ? 0.45 : h >= 22 || h < 5 ? 1.3 : 1;
export const roadClass = (axis, k) => ROAD_CLASS[axis][k] || 'main';
export const roadRules = (axis, k) => CLASS_RULES[roadClass(axis, k)];
// Real Surulere street names on the stylised grid. Keys are the road coordinates above.
export const ROAD_NAMES = {
  h: { 0: 'Bode Thomas Street', '-66': 'Itire Road · Ojuelegba Road', 142: 'Apapa–Oworonshoki Expressway', '-330': 'Ikorodu Road', '-300': 'Herbert Macaulay Way', 240: 'Adeola Odeku Street · Lekki–Epe Expressway', 300: 'Ahmadu Bello Way' },
  v: { 0: 'Adeniran Ogunsanya Street', 72: 'Funsho Williams Avenue', '-72': 'Ogunlana Drive · Shitta Bridge', 360: 'Broad Street · Third Mainland Bridge', 440: 'Marina · Falomo Bridge', 560: 'Admiralty Way' },
};
export const ROAD_WIDTHS = { h: { 0: 22, '-66': 18, 142: 24, '-330': 24, '-300': 18, 240: 24, 300: 22 }, v: { 0: 22, 72: 24, '-72': 16, 360: 18, 440: 22, 560: 18 } };
export const roadName = (axis, k) => ROAD_NAMES[axis][k] || 'the main road';

// kind: landmark | market | police | army | service | bank | venue | hotel | checkpoint | post
export const LANDMARKS = [
  // Surulere core
  { id: 'ojuelegba', name: 'Ojuelegba Junction', short: 'OJUELEGBA', x: 42, z: -48, c: '#87652e', sign: '#ffc52f', h: 5, kind: 'landmark' },
  { id: 'marina', name: 'Iponri Logistics Yard', short: 'IPONRI', x: 58, z: 60, c: '#245e69', sign: '#3dff79', h: 11, kind: 'landmark' },
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
  // Living City · places (Phase 2)
  { id: 'gym', name: 'Surulere Fitness Gym', short: 'GYM', x: 24, z: 48, c: '#2a4a6a', sign: '#3dff79', h: 6, kind: 'gym' },
  { id: 'fastfood', name: 'Chicken Republic', short: 'FAST FOOD', x: 48, z: -24, c: '#c62828', sign: '#ffffff', h: 5, kind: 'restaurant' },
  { id: 'mall', name: 'Adeniran Ogunsanya Shopping Mall', short: 'MALL', x: -24, z: 72, c: '#8a8f93', sign: '#ffc52f', h: 12, kind: 'mall', big: true },
  { id: 'cafe', name: 'Surulere Cyber Café', short: 'CYBER CAFE', x: -48, z: 72, c: '#3a4a7a', sign: '#5db8ff', h: 5, kind: 'cafe' },
  { id: 'pitch', name: 'Teslim Balogun Stadium', short: 'TESLIM BALOGUN', x: -120, z: -48, c: '#2f7d49', sign: '#ffffff', kind: 'pitch' },
  // Costain / Iganmu corridor and Lagos Island (Phase: Bridges & Corridors)
  { id: 'theatre', name: 'National Theatre', short: 'NAT. THEATRE', x: 148, z: -44, c: '#8a8f93', sign: '#ffffff', kind: 'theatre', region: 'costain' },
  { id: 'cathedral', name: 'Cathedral Church of Christ, Marina', short: 'CATHEDRAL', x: 408, z: -24, c: '#d9d2c2', sign: '#ffc52f', h: 12, kind: 'worship', region: 'island' },
  { id: 'tbs', name: 'Tafawa Balewa Square', short: 'TBS', x: 408, z: 48, c: '#b9a98f', sign: '#ffffff', h: 6, kind: 'landmark', big: true, region: 'island' },
  { id: 'marinabank', name: 'RiseBank Marina', short: 'BANK', x: 464, z: -24, c: '#2d2d4a', sign: '#b7b7ff', h: 18, kind: 'bank', region: 'island' },
  { id: 'broadbank', name: 'First Lagos Tower · Broad Street', short: 'TOWER', x: 384, z: 24, c: '#4a6a8a', sign: '#ffffff', h: 30, kind: 'landmark', region: 'island' },
  // Victoria Island and Lekki (Falomo corridor)
  { id: 'civic', name: 'Civic Centre', short: 'CIVIC CENTRE', x: 364, z: 210, c: '#8a9aa8', sign: '#ffffff', h: 14, kind: 'landmark', region: 'vi' },
  { id: 'vibank', name: 'RiseBank Victoria Island', short: 'BANK', x: 464, z: 210, c: '#2d2d4a', sign: '#b7b7ff', h: 22, kind: 'bank', region: 'vi' },
  { id: 'yellowchilli', name: 'The Yellow Chilli', short: 'YELLOW CHILLI', x: 364, z: 270, c: '#c9a227', sign: '#ffffff', h: 5, kind: 'restaurant', region: 'vi' },
  { id: 'ekohotel', name: 'Eko Hotel & Suites', short: 'EKO HOTEL', x: 410, z: 318, c: '#5a4a7a', sign: '#ffffff', h: 26, kind: 'hotel', cost: 60000, big: true, region: 'vi' },
  { id: 'ekoatlantic', name: 'Eko Atlantic · Bar Beach', short: 'EKO ATLANTIC', x: 454, z: 318, c: '#b9a98f', sign: '#ffffff', h: 6, kind: 'landmark', region: 'vi' },
  { id: 'lekkitoll', name: 'Lekki Toll Gate', short: 'TOLL', x: 500, z: 240, kind: 'toll', c: '#e4d14b', region: 'lekki' },
  { id: 'lekkimart', name: 'Lekki Mart · Admiralty Way', short: 'LEKKI MART', x: 600, z: 210, c: '#8a8f93', sign: '#ffc52f', h: 9, kind: 'mall', region: 'lekki' },
  // Yaba and the mainland north (Third Mainland and Ikorodu Road corridors)
  { id: 'tejuosho', name: 'Tejuosho Market', short: 'TEJUOSHO MKT', x: 408, z: -270, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market', region: 'yaba' },
  { id: 'yabatech', name: 'Yaba College of Technology', short: 'YABATECH', x: 464, z: -270, c: '#8a7a4a', sign: '#ffffff', h: 8, kind: 'school', region: 'yaba' },
  { id: 'unilag', name: 'University of Lagos · Main Gate', short: 'UNILAG', x: 464, z: -360, c: '#6a7a5a', sign: '#ffffff', h: 7, kind: 'school', region: 'yaba' },
  { id: 'ebutepolice', name: 'Ebute Metta Police Post', short: 'POLICE', x: 240, z: -360, c: '#1f2b45', sign: '#ffffff', h: 5, kind: 'police', region: 'ebute' },
  { id: 'ikorodu', name: 'Ikorodu Garage', short: 'IKORODU GARAGE', x: -120, z: -352, c: '#5c4933', sign: '#ffc52f', h: 5, kind: 'garage', region: 'ikorodu' },

    // Makoko — lagoon stilts west of / under Third Mainland Bridge (k = 360)
  {
    id: 'makoko',
    name: 'Makoko',
    short: 'MAKOKO',
    x: 300,          // inside lagoon x[165,339]
    z: -185,         // inside lagoon z[-250,330] and lagoon-n band
    c: '#5a6e72',
    sign: '#f5c518',
    h: 3,
    kind: 'settlement',
    waterfront: true,
    region: 'thirdmainland',
  },

  // dense cosmopolitan neighbourhood (Ajeromi-Ifelodun / AJ City)
  {
    id: 'ajegunle',
    name: 'Ajegunle · AJ City',
    short: 'AJ CITY',
    x: -108,
    z: 96,
    c: '#5c4a3a',
    sign: '#ffc52f',
    h: 4,
    kind: 'settlement',
    dense: true,
    region: 'ajegunle',
  },
  {
    id: 'ajpitch',
    name: 'AJ City Street Pitch',
    short: 'AJ PITCH',
    x: -102,   // same yard as buildAjegunle open space
    z: 92,
    c: '#2f7d49',
    sign: '#ffffff',
    kind: 'pitch',
    region: 'ajegunle',
  },
];
// Compound cells for the corridor districts. style: 'island' (towers) | 'vi' (towers and hotels) | 'yaba' (storey) | 'lekki' (duplexes) | 'ebute' (bungalow / storey)
export const VI_CELLS = [[408, 210], [408, 270], [440, 270], [464, 270], [364, 318], [464, 318]];
export const LEKKI_CELLS = [[520, 210], [520, 270], [600, 270], [520, 318], [600, 318]];
export const YABA_CELLS = [[372, -270], [432, -270], [384, -360], [408, -360], [432, -360]];
export const EBUTE_CELLS = [-130, -94, 160, 200, 280, 310].flatMap(x => [[x, -300], [x, -360]]).concat([[110, -300], [36, -300], [0, -360], [36, -360], [-40, -300]]);
export const TOLLS = [{ id: 'lekkitoll', name: 'Lekki Toll Gate', axis: 'h', k: 240, at: 500, fee: 1200 }];
export const FOOTBRIDGES = [{ axis: 'h', k: 142, at: -60 }, { axis: 'h', k: 142, at: 60 }, { axis: 'h', k: -330, at: 200 }, { axis: 'h', k: 240, at: 400 }];
// Compound cells for Lagos Island blocks (dense: towers and storey buildings).
export const ISLAND_CELLS = [384, 408, 464].flatMap(x => [-72, -48, -24, 24, 48, 72].map(z => [x, z]));
// Roadside vendors on the market street and near the markets.
export const VENDORS = [[-30, -56], [-10, -56], [10, -76], [30, -76], [-60, -56], [-96, -12], [-84, -36], [-36, -108]];

export const BUSSTOPS = [
  { id: 'kilo', name: 'Kilo Bus Stop', short: 'KILO', x: -40, z: 15, agberos: 2 },
  { id: 'ojstop', name: 'Ojuelegba Bus Stop', short: 'OJUELEGBA B/S', x: 18, z: -54, agberos: 1 },
  { id: 'stadstop', name: 'Stadium Bus Stop', short: 'STADIUM B/S', x: -86, z: -55, agberos: 0 },
  { id: 'mushinstop', name: 'Mushin Bus Stop', short: 'MUSHIN B/S', x: -30, z: -77, agberos: 1 },
  { id: 'costain', name: 'Costain Bus Terminal', short: 'COSTAIN', x: 140, z: 15, agberos: 1 },
  { id: 'cms', name: 'CMS Bus Terminal', short: 'CMS', x: 372, z: -15, agberos: 2 },
  { id: 'jibowu', name: 'Jibowu · Yaba Bus Stop', short: 'JIBOWU', x: 384, z: -314, agberos: 2 },
  { id: 'ebutebus', name: 'Ebute Metta Bus Stop', short: 'EBUTE METTA', x: 200, z: -316, agberos: 1 },
  { id: 'lekkibus', name: 'Lekki Toll Bus Stop', short: 'LEKKI B/S', x: 540, z: 226, agberos: 1 },
  { id: 'vibus', name: 'Falomo Bus Stop', short: 'FALOMO B/S', x: 420, z: 226, agberos: 0 },
  
  // Ajegunle corridor (dense, cosmopolitan, low-income)
  { id: 'ajstop', name: 'Ajegunle Bus Stop', short: 'AJ B/S', x: -100, z: 88, agberos: 2 },
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
  ...LANDMARKS.map(l => ({ x: l.x, z: l.z, r: l.stadium ? 34 : l.kind === 'pitch' ? 26 : l.waterfront || l.kind === 'settlement' ? 52 : l.big ? 22 : (l.kind === 'checkpoint' || l.kind === 'post' || l.kind === 'toll') ? 8 : 17 })),
  ...BUSSTOPS.map(b => ({ x: b.x, z: b.z, r: 13 })),
  ...PROPERTIES.map(p => ({ x: p.x, z: p.z, r: 17 })),
];

export const PLACES = [...LANDMARKS, ...BUSSTOPS];
export const JUNCTIONS = ROADS.h.flatMap(z => ROADS.v.filter(x => { const [a, b] = ROAD_EXTENT.v[x], [c, d] = ROAD_EXTENT.h[z]; return z >= a && z <= b && x >= c && x <= d && !onBridge('v', x, z) && !onBridge('h', z, x); }).map(x => ({ x, z })));
export const placeOf = id => LANDMARKS.find(l => l.id === id) || BUSSTOPS.find(b => b.id === id) || PROPERTIES.find(p => p.id === id);
export const placesOfKind = kind => LANDMARKS.filter(l => l.kind === kind);
// Water: the Lagos Lagoon between Costain and the Island, the lagoon north of the Island under Third Mainland Bridge,
// Five Cowrie Creek under Falomo Bridge, the open lagoon east of the Island, and the Atlantic off Bar Beach.
export const WATERS = [
  { id: 'lagoon', name: 'Lagos Lagoon', x: [165, 339], z: [-250, 330] }, { id: 'lagoon-n', name: 'Lagos Lagoon', x: [339, 620], z: [-250, -85] },
  { id: 'creek', name: 'Five Cowrie Creek', x: [339, 480], z: [100, 180] }, { id: 'lagoon-e', name: 'Lagos Lagoon', x: [480, 620], z: [-85, 180] },
  { id: 'atlantic', name: 'Atlantic Ocean', x: [339, 620], z: [330, 420] },
];
export const WATER = { x: 252, w: 174 };   // the main lagoon strip (minimap label, palms)
export const inWater = (x, z) => WATERS.some(w => x >= w.x[0] && x <= w.x[1] && z >= w.z[0] && z <= w.z[1]);
