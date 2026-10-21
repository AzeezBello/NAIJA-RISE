// LAGOS — Surulere plus the corridors: Costain and Eko Bridge to Lagos Island, Falomo Bridge to Victoria Island and the
// Lekki toll gate, Third Mainland Bridge to Yaba, and Ikorodu Road west across Ebute Metta to Ikorodu Garage.
// World units are roughly metres; +x east, +z south (down on the map). Every district module exports the same shape.
export const META = { id: 'surulere', name: 'Surulere', state: 'Lagos', spawn: { x: 0, z: 34 }, bounds: { x: [-145, 615], z: [-395, 325] } };
// Regions of this world (PRD corridor map), as rectangles. The locale indicator names them.
export const REGIONS = [
  { id: 'surulere', name: 'Surulere', x: [-60, 135], z: [-150, 150] },
  { id: 'surulere-west', name: 'Surulere West · Ikate', x: [-200, -60], z: [-150, 40] },
  { id: 'costain', name: 'Costain · Iganmu', x: [135, 165], z: [-150, 150] },
  { id: 'lagoon', name: 'Eko Bridge · Lagos Lagoon', x: [165, 340], z: [-250, 330] }, { id: 'island', name: 'Lagos Island', x: [340, 480], z: [-85, 100] },
  { id: 'thirdmainland', name: 'Third Mainland Bridge', x: [340, 480], z: [-250, -85] }, { id: 'yaba', name: 'Yaba', x: [340, 480], z: [-400, -250] },
  { id: 'ebute', name: 'Ebute Metta · Ikorodu Road', x: [-100, 340], z: [-400, -250] }, { id: 'ikorodu', name: 'Ikorodu Road · Ikorodu Garage', x: [-150, -100], z: [-400, -250] },
  { id: 'falomo', name: 'Falomo Bridge · Five Cowrie Creek', x: [340, 480], z: [100, 180] }, { id: 'vi', name: 'Victoria Island', x: [340, 480], z: [180, 330] },
  { id: 'lekki', name: 'Lekki Phase 1', x: [480, 620], z: [180, 330] },
];
export const regionAt = (x, z = 0) => REGIONS.find(r => x >= r.x[0] && x < r.x[1] && z >= r.z[0] && z < r.z[1]) || REGIONS[0];
export const ROADS = { h: [0, -66, 142, -330, -300, 240, 300], v: [0, 72, -72, 360, 440, 560, -196] };
// Where each road physically runs. Bode Thomas continues east over Eko Bridge onto Lagos Island; Marina continues south over
// Falomo Bridge into Victoria Island; Broad Street continues north over Third Mainland Bridge into Yaba; Ikorodu Road runs
// the whole width of the mainland; Adeola Odeku becomes the Lekki–Epe Expressway past the toll gate. West of Ogunlana Drive,
// Itire Road continues as Lawanson Road and Bode Thomas as Brown Road to Ijesha Road, framing Ikate (OpenStreetMap).
export const ROAD_EXTENT = {
  h: { 0: [-196, 470], '-66': [-196, 150], 142: [-150, 150], '-330': [-150, 480], '-300': [340, 480], 240: [340, 620], 300: [340, 480] },
  v: { 0: [-150, 150], 72: [-330, 150], '-72': [-150, 150], 360: [-400, 80], 440: [-80, 330], 560: [180, 330], '-196': [-66, 0] },
};
export const roadExtent = (axis, k) => ROAD_EXTENT[axis][k] || [-150, 150];
// Named segments along a road (coordinate ranges along its axis).
export const ROAD_SEGMENTS = {
  h: { 0: [[-196, -150, 'Brown Road'], [-150, 150, 'Bode Thomas Street'], [150, 160, 'Costain Interchange'], [160, 345, 'Eko Bridge'], [345, 470, 'Nnamdi Azikiwe Street · CMS']],
       '-66': [[-196, -150, 'Lawanson Road'], [-150, 150, 'Itire Road · Ojuelegba Road']],
       '-330': [[-150, -100, 'Ikorodu Road · Ikorodu Garage'], [-100, 300, 'Ikorodu Road · Ebute Metta'], [300, 480, 'Ikorodu Road · Jibowu']],
       240: [[340, 480, 'Adeola Odeku Street'], [480, 505, 'Lekki Toll Gate'], [505, 620, 'Lekki–Epe Expressway']] },
  v: { 72: [[-330, -145, 'Western Avenue'], [-145, 150, 'Funsho Williams Avenue']],
       360: [[-400, -250, 'Murtala Muhammed Way · Yaba'], [-250, -85, 'Third Mainland Bridge'], [-85, 80, 'Broad Street']],
       440: [[-80, 80, 'Marina'], [80, 180, 'Falomo Bridge'], [180, 330, 'Akin Adesola Street']] },
};
// Bridge spans (rush-hour profile, no street lights at ground level).
export const BRIDGES = [{ axis: 'h', k: 0, from: 155, to: 345 }, { axis: 'v', k: 360, from: -250, to: -85 }, { axis: 'v', k: 440, from: 80, to: 180 }];
export const onBridge = (axis, k, along) => BRIDGES.some(b => b.axis === axis && b.k === k && along > b.from && along < b.to);
export const U_TURNS = [{ axis: 'h', k: -330, at: 0, name: 'Ikorodu Road U-turn' }];
export const roadNameAt = (axis, k, along) => { const seg = (ROAD_SEGMENTS[axis]?.[k] || []).find(([a, b]) => along >= a && along < b); return seg ? seg[2] : ROAD_NAMES[axis][k] || 'the main road'; };
// Road classes drive traffic density, cruise speed, LASTMA speed limits and what lines the kerb.
// class: expressway | highway | main | commercial | residential | market
export const ROAD_CLASS = {
  h: { 0: 'main', '-66': 'market', 142: 'expressway', '-330': 'highway', '-300': 'commercial', 240: 'highway', 300: 'main' },
  v: { 0: 'commercial', 72: 'highway', '-72': 'residential', 360: 'highway', 440: 'main', 560: 'residential', '-196': 'commercial' },
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
  v: { 0: 'Adeniran Ogunsanya Street', 72: 'Funsho Williams Avenue', '-72': 'Ogunlana Drive · Shitta Bridge', 360: 'Broad Street · Third Mainland Bridge', 440: 'Marina · Falomo Bridge', 560: 'Admiralty Way', '-196': 'Ijesha Road' },
};
export const ROAD_WIDTHS = { h: { 0: 22, '-66': 18, 142: 36, '-330': 40, '-300': 18, 240: 38, 300: 22 }, v: { 0: 22, 72: 24, '-72': 16, 360: 36, 440: 22, 560: 18, '-196': 14 } };
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
  { id: 'egbon-desk', name: 'Adugbo Community Desk', short: 'ADUGBO DESK', x: 144, z: 104, c: '#5b6540', sign: '#ffc52f', h: 4, kind: 'service' },
  // Side streets of Ikate (Kilo–Masha side of Surulere): a street-name sign where the street's people hang out. Positions are
  // the streets' real OpenStreetMap locations projected into the block they really sit in — west of Ogunlana Drive, between
  // Lawanson/Itire Road and Brown Road/Bode Thomas, east of Ijesha Road — then nudged apart and clear of Shitta Market and
  // RiseBank Shitta and round Kilo bus stop. Projection: x = -84 - (3.351 - lon) * 5667, z = -(lat - 6.489) * 3000.
  { id: 'oduduwa', name: 'Oduduwa Street', short: 'ODUDUWA ST', x: -149.1, z: -43.7, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'nnobi', name: 'Nnobi Street', short: 'NNOBI ST', x: -95.3, z: -36.7, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'ladejobi', name: 'Ladejobi Street', short: 'LADEJOBI ST', x: -123.1, z: -37.7, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'olaitan', name: 'Olaitan Odularu Street', short: 'OLAITAN ST', x: -134.5, z: -37.7, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'abiodun', name: 'Abiodun Ogunayo Street', short: 'ABIODUN ST', x: -105.5, z: -28.2, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'olusesan-adetula', name: 'Olusesan Adetula Street', short: 'OLUSESAN ADETULA ST', x: -105.4, z: -37.8, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'cole', name: 'Cole Street', short: 'COLE ST', x: -113.5, z: -55.4, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'ladele-dada', name: 'Ladele Dada Street', short: 'LADELE DADA ST', x: -132.2, z: -47.6, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'ayodele', name: 'Ayodele Street', short: 'AYODELE ST', x: -138.7, z: -53.8, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'folawiyo-bankole', name: 'Folawiyo Bankole Street', short: 'FOLAWIYO BANKOLE ST', x: -99, z: -49.6, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  { id: 'akpoguma', name: 'Akpoguma Street', short: 'AKPOGUMA ST', x: -113.6, z: -41.4, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  // Adenowo is described as off Kilo bus stop (not in OpenStreetMap): beside Kilo, in Ikate.
  { id: 'adenowo', name: 'Adenowo Street', short: 'ADENOWO ST', x: -107.9, z: -48.3, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  // Ijero Street: no map position found yet; still a placeholder on Adeniran Ogunsanya's pavement.
  { id: 'ijero', name: 'Ijero Street', short: 'IJERO ST', x: 12.6, z: 110, c: '#1f6b4a', sign: '#ffffff', kind: 'street' },
  // law and public services
  { id: 'police', name: 'Area C Police Station', short: 'POLICE', x: 96, z: -96, c: '#162442', sign: '#f5c518', h: 6, kind: 'police' },
  { id: 'fire', name: 'Lagos State Fire Service', short: 'FIRE SERVICE', x: 96, z: -48, c: '#c62828', sign: '#ffffff', h: 6, kind: 'service' },
  { id: 'army', name: 'Abalti Barracks · Western Avenue', short: 'ABALTI BARRACKS', x: 120, z: -24, c: '#3b5323', sign: '#ffffff', h: 6, kind: 'army', big: true },
  { id: 'lawma', name: 'LAWMA Depot', short: 'LAWMA', x: -96, z: 96, c: '#ff6a00', sign: '#ffffff', h: 5, kind: 'service' },
  { id: 'frsc', name: 'FRSC Checkpoint', short: 'FRSC', x: 84, z: 30, kind: 'checkpoint', c: '#d8c398' },
  { id: 'lastma', name: 'LASTMA Post', short: 'LASTMA', x: -12, z: -56, kind: 'post', c: '#eab308' },
  // banks
  { id: 'bank1', name: 'RiseBank Shitta', short: 'BANK', x: -120, z: -24, c: '#2d2d4a', sign: '#b7b7ff', h: 9, kind: 'bank' },
  { id: 'bank2', name: 'RiseBank Ojuelegba', short: 'BANK', x: 48, z: 24, c: '#2d2d4a', sign: '#b7b7ff', h: 9, kind: 'bank' },
  { id: 'surulere-tailor', name: 'Surulere Tailoring Workshop', short: 'TAILOR', x: -120, z: 16, c: '#725c8a', sign: '#f4d3a4', h: 4, kind: 'artisan', profession: 'Tailor' },
  { id: 'surulere-cobbler', name: 'Ojuelegba Shoe Repair', short: 'SHOE REPAIR', x: 130, z: 64, c: '#694b38', sign: '#ffc52f', h: 4, kind: 'artisan', profession: 'Shoemaker' },
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
  // Teslim Balogun sits beside the National Stadium, on its west side as in reality; Ikate now has the block it stood in.
  { id: 'pitch', name: 'Teslim Balogun Stadium', short: 'TESLIM BALOGUN', x: -170, z: -100, c: '#2f7d49', sign: '#ffffff', kind: 'pitch' },
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

];
export const ARTISAN_NPCS = LANDMARKS.filter(l => l.kind === 'artisan');
// Compound cells for the corridor districts. style: 'island' (towers) | 'vi' (towers and hotels) | 'yaba' (storey) | 'lekki' (duplexes) | 'ebute' (bungalow / storey)
export const VI_CELLS = [[408, 210], [408, 270], [440, 270], [464, 270], [364, 318], [464, 318], [388, 210], [440, 210], [388, 294], [440, 294]];
export const LEKKI_CELLS = [[520, 210], [520, 270], [600, 270], [520, 318], [600, 318], [544, 210], [580, 210], [544, 270], [580, 270], [640, 210], [640, 270], [680, 210], [680, 270]];
export const YABA_CELLS = [[372, -270], [432, -270], [384, -360], [408, -360], [432, -360], [372, -296], [432, -296], [396, -270], [420, -384]];
export const EBUTE_CELLS = [-130, -94, 160, 200, 280, 310].flatMap(x => [[x, -300], [x, -360]]).concat([[110, -300], [36, -300], [0, -360], [36, -360], [-40, -300], [-76, -34], [-116, 44], [34, 68], [82, -28], [-34, -84], [116, -74]]);
export const TOLLS = [{ id: 'lekkitoll', name: 'Lekki Toll Gate', axis: 'h', k: 240, at: 500, fee: 1200 }];
export const FOOTBRIDGES = [{ axis: 'h', k: 142, at: -60 }, { axis: 'h', k: 142, at: 60 }, { axis: 'h', k: -330, at: 200 }, { axis: 'h', k: 240, at: 400 }];
// Compound cells for Lagos Island blocks (dense: towers and storey buildings).
export const ISLAND_CELLS = [384, 408, 464].flatMap(x => [-72, -48, -24, 24, 48, 72].map(z => [x, z]));
// Roadside vendors on the market street and near the markets.
export const VENDORS = [[-30, -56], [-10, -56], [10, -76], [30, -76], [-60, -56], [-96, -12], [-84, -36], [-36, -108]];

export const BUSSTOPS = [
  // Kilo is in Ikate, where Olaitan (Odularu) Street meets Itire/Lawanson Road and the Masha road runs off: on the road's south pavement.
  { id: 'kilo', name: 'Kilo Bus Stop', short: 'KILO', x: -128.2, z: -55.4, agberos: 2 },
  { id: 'ojstop', name: 'Ojuelegba Bus Stop', short: 'OJUELEGBA B/S', x: 18, z: -54, agberos: 1 },
  { id: 'stadstop', name: 'Stadium Bus Stop', short: 'STADIUM B/S', x: -86, z: -55, agberos: 0 },
  { id: 'mushinstop', name: 'Mushin Bus Stop', short: 'MUSHIN B/S', x: -30, z: -77, agberos: 1 },
  { id: 'costain', name: 'Costain Bus Terminal', short: 'COSTAIN', x: 140, z: 15, agberos: 1 },
  { id: 'cms', name: 'CMS Bus Terminal', short: 'CMS', x: 372, z: -15, agberos: 2 },
  { id: 'jibowu', name: 'Jibowu · Yaba Bus Stop', short: 'JIBOWU', x: 384, z: -314, agberos: 2 },
  { id: 'ebutebus', name: 'Ebute Metta Bus Stop', short: 'EBUTE METTA', x: 200, z: -316, agberos: 1 },
  { id: 'lekkibus', name: 'Lekki Toll Bus Stop', short: 'LEKKI B/S', x: 540, z: 226, agberos: 1 },
  { id: 'vibus', name: 'Falomo Bus Stop', short: 'FALOMO B/S', x: 420, z: 226, agberos: 0 },
];

// Housing (PRD §10): rent through an agent or buy from the landlord; owned homes can be let to tenants.
// style: bungalow | storey | highrise. rent is per lease (30 game days); buy may be null (rent only).
export const PROPERTIES = [
  { id: 'room', name: 'Room · Face-me-I-face-you', type: 'Room', desc: 'One room in a shared compound off Adelabu Street. Shared bathroom, landlord lives upstairs. Rent only.', rent: 60000, buy: null, x: -96, z: 24, sign: 'ROOM TO LET', c: '#c9b48a', h: 3.6, style: 'bungalow' },
  { id: 'selfcon', name: 'Self-contain · Ogunlana Drive', type: 'Self-contained', desc: 'Your own room, kitchen corner and bathroom in a fenced compound. Sleeping here clears one heat.', rent: 150000, buy: 900000, x: -120, z: 72, sign: 'SELF-CON TO LET', c: '#a8b0b8', h: 7, style: 'storey', perk: 'heat1' },
  { id: 'flat', name: '2-Bedroom Flat · Bode Thomas', type: 'Flat', desc: 'Second-floor flat in a three-storey block with a gate man. Sleeping here clears one heat.', rent: 400000, buy: 2400000, x: -24, z: 96, sign: 'FLATS TO LET', c: '#b9a98f', h: 10.5, style: 'storey', perk: 'heat1' },
  { id: 'duplex', name: 'Duplex · Palm Court, Adeniran Ogunsanya', type: 'Duplex', desc: 'Gated duplex with parking. Sleeping here clears all heat and fills your last vehicle.', rent: 1200000, buy: 6000000, x: 96, z: 96, sign: 'PALM COURT', c: '#d9d2c2', h: 8, style: 'storey', perk: 'heat0' },
  { id: 'banana_villa', name: 'Waterfront Mansion · Banana Island, Ikoyi', type: 'Mansion', desc: 'Ultra-luxury lagoon-front villa on Banana Island with private jetty and 24/7 armed security. Clears all heat and refills your vehicle.', rent: 3500000, buy: 25000000, x: 516, z: 148, sign: 'BANANA VILLA', c: '#f4f1ea', h: 11.5, style: 'storey', perk: 'heat0' },
  { id: 'yaba_studio', name: 'Studio Flat · Herbert Macaulay, Yaba', type: 'Studio', desc: 'Modern student & tech-founder studio apartment near UNILAG and YabaTech. Sleeping here clears one heat.', rent: 120000, buy: 750000, x: 372, z: -288, sign: 'YABA STUDIO', c: '#c4b7a6', h: 7.5, style: 'storey', perk: 'heat1' },
  { id: 'masha_bungalow', name: '3-Bedroom Bungalow · Masha Road, Surulere', type: 'Bungalow', desc: 'Quiet family compound off Kilo and Masha Road with borehole water and shaded courtyard. Clears one heat.', rent: 280000, buy: 1650000, x: -156, z: -18, sign: 'MASHA COURT', c: '#d6c29f', h: 4.2, style: 'bungalow', perk: 'heat1' },
  { id: 'ebute_colonial', name: 'Brazilian Storey House · Ebute Metta', type: 'Storey', desc: 'Classic Afro-Brazilian two-storey residence with carved balconies and gated yard. Clears one heat.', rent: 180000, buy: 1100000, x: 136, z: -348, sign: 'EBUTE COURT', c: '#cfa97e', h: 8.2, style: 'storey', perk: 'heat1' },
  { id: 'maryland_terrace', name: 'Terrace Duplex · Doyin Estate, Maryland', type: 'Terrace', desc: 'Gated mainland terrace duplex with standby generator and interlocking compound. Clears one heat.', rent: 650000, buy: 3800000, x: 84, z: -592, sign: 'DOYIN TERRACE', c: '#dfd7c8', h: 8.8, style: 'storey', perk: 'heat1' },
  { id: 'magodo_duplex', name: 'Detached Duplex · Magodo Phase 2, Shangisha', type: 'Duplex', desc: 'Spacious hilltop duplex in Magodo GRA with uniformed estate security. Clears all heat and refills your vehicle.', rent: 950000, buy: 5400000, x: 256, z: -552, sign: 'MAGODO COURT', c: '#e8e0d0', h: 9.2, style: 'storey', perk: 'heat0' },
  { id: 'ikeja_gra_villa', name: 'Executive Residence · Ikeja GRA', type: 'Villa', desc: 'Tree-lined detached villa in Ikeja GRA near the golf club and airport. Clears all heat and refills your vehicle.', rent: 1500000, buy: 8500000, x: 164, z: -900, sign: 'IKEJA GRA VILLA', c: '#eee8dc', h: 10.0, style: 'storey', perk: 'heat0' },
  { id: 'ikorodu_bungalow', name: 'Family Bungalow · Ikorodu GRA', type: 'Bungalow', desc: 'Peaceful walled bungalow in Ikorodu town with a wide compound and fruit trees. Clears one heat.', rent: 140000, buy: 820000, x: -310, z: -368, sign: 'IKORODU HOME', c: '#d8b98c', h: 4.0, style: 'bungalow', perk: 'heat1' },
  { id: 'vi_penthouse', name: 'Oceanview Apartment · Adeola Odeku, VI', type: 'Penthouse', desc: 'High-rise luxury residential apartment in Victoria Island with Atlantic breeze and concierge. Clears all heat.', rent: 1800000, buy: 11000000, x: 416, z: 256, sign: 'VI TOWERS', c: '#cfd8df', h: 14.0, style: 'storey', perk: 'heat0' },
  { id: 'lekki_terrace', name: 'Contemporary Terrace · Admiralty Way, Lekki', type: 'Terrace', desc: 'Smart home terrace duplex in Lekki Phase 1 with carport and solar inverter. Clears all heat.', rent: 1400000, buy: 7800000, x: 568, z: 268, sign: 'LEKKI TERRACE', c: '#f0ece1', h: 9.5, style: 'storey', perk: 'heat0' },
  { id: 'bourdillon_mansion', name: 'Ambassadorial Mansion · Bourdillon Road, Ikoyi', type: 'Mansion', desc: 'Prestigious Ikoyi mansion on Bourdillon Road with manicured gardens and diplomatic security. Clears all heat.', rent: 2800000, buy: 18500000, x: 464, z: 228, sign: 'BOURDILLON COURT', c: '#f5f2eb', h: 11.0, style: 'storey', perk: 'heat0' },
];
for (const p of PROPERTIES) p.door = { x: p.x, z: p.z - 10.5 };

// Roadside kiosks double as POS agents (cash withdrawal, pure water, suya).
export const KIOSKS = [[-20, 25], [20, -28], [-56, 20], [88, -22], [140, -14], [372, 12], [440, 200], [520, 228], [240, -312], [-120, -54], [60, -780], [200, -420]];

// Animals: goats around the markets, chickens near compounds, stray dogs roaming.
export const ANIMALS = [
  { kind: 'goat', x: -60, z: -40 }, { kind: 'goat', x: -36, z: -58 }, { kind: 'goat', x: -84, z: -14 }, { kind: 'goat', x: -108, z: -34 }, { kind: 'goat', x: -12, z: -110 }, { kind: 'goat', x: -36, z: -130 },
  { kind: 'chicken', x: -84, z: 34 }, { kind: 'chicken', x: -108, z: 30 }, { kind: 'chicken', x: 84, z: 108 }, { kind: 'chicken', x: 108, z: 84 }, { kind: 'chicken', x: -132, z: 60 },
  { kind: 'dog', x: 30, z: 40 }, { kind: 'dog', x: -30, z: -30 },
];

// Uniformed NPCs standing and patrolling at their posts across Lagos.
export const UNIFORMS = {
  police: 0x162442, army: 0x3b5323, navy: 0x13294b, fire: 0xc62828, lawma: 0xff6a00,
  lastma: 0xeab308, frsc: 0xd8c398, racer: 0xff5d9e, vio: 0xf0f4f8,
  kai: 0x1e6b3a, civildefence: 0x182b49, cbn: 0x0f5132, efcc: 0x8b1e1e,
  politician: 0xd4af37, fraudster: 0xdc2626, boko_haram: 0x292524, bandit: 0x7c2d12,
};
export const SERVICE_NPCS = [
  // NPF Police officers (stations, banks, major junctions, Banana Island & Airport gates)
  { x: 92, z: -84, u: 'police' }, { x: 100, z: -84, u: 'police' }, { x: 86, z: -96, u: 'police' },
  { x: 12, z: 12, u: 'police' }, { x: -12, z: -12, u: 'police' },
  { x: 48, z: 14, u: 'police' }, { x: -114, z: -16, u: 'police' },
  { x: 142, z: 12, u: 'police' }, { x: 240, z: -348, u: 'police' }, { x: 232, z: -348, u: 'police' },
  { x: 376, z: -12, u: 'police' }, { x: 458, z: -14, u: 'police' },
  { x: 458, z: 200, u: 'police' }, { x: 492, z: 120, u: 'police' }, { x: 492, z: 148, u: 'police' },
  { x: 506, z: 232, u: 'police' }, { x: 64, z: -880, u: 'police' },
  { x: 118, z: -780, u: 'police' }, { x: -240, z: 134, u: 'police' },
  { x: -342, z: 148, u: 'police' }, { x: 400, z: -292, u: 'police' },
  // Lagos State Fire & Rescue Service firefighters (Surulere HQ, Lagos Island Fire Station, Ikeja Fire HQ, Airport & Markets)
  { x: 90, z: -36, u: 'fire' }, { x: 102, z: -36, u: 'fire' }, { x: 84, z: -48, u: 'fire' }, { x: 108, z: -48, u: 'fire' },
  { x: 418, z: 8, u: 'fire' }, { x: 430, z: 8, u: 'fire' },
  { x: 162, z: -788, u: 'fire' }, { x: 174, z: -788, u: 'fire' },
  { x: 48, z: -884, u: 'fire' }, { x: -42, z: -88, u: 'fire' }, { x: -340, z: 82, u: 'fire' },
  // LASTMA traffic controllers at junctions across Surulere, Island, VI, Yaba, Lekki & Ikeja
  { x: -12, z: -56, u: 'lastma' }, { x: 12, z: -56, u: 'lastma' },
  { x: 12, z: -12, u: 'lastma' }, { x: -64, z: -12, u: 'lastma' },
  { x: 64, z: -12, u: 'lastma' }, { x: 64, z: -56, u: 'lastma' },
  { x: -64, z: -56, u: 'lastma' }, { x: 136, z: -12, u: 'lastma' },
  { x: 352, z: -12, u: 'lastma' }, { x: 432, z: -12, u: 'lastma' },
  { x: 432, z: 232, u: 'lastma' }, { x: 552, z: 232, u: 'lastma' },
  { x: 352, z: -320, u: 'lastma' }, { x: 12, z: -320, u: 'lastma' },
  { x: 112, z: -752, u: 'lastma' },
  // FRSC road safety marshals on bridges, expressways & highways
  { x: 80, z: 30, u: 'frsc' }, { x: 64, z: 30, u: 'frsc' },
  { x: 152, z: 8, u: 'frsc' }, { x: 348, z: 8, u: 'frsc' },
  { x: 80, z: 134, u: 'frsc' }, { x: -80, z: 134, u: 'frsc' },
  { x: 352, z: -252, u: 'frsc' }, { x: 432, z: 84, u: 'frsc' },
  { x: 520, z: 248, u: 'frsc' }, { x: 12, z: -492, u: 'frsc' },
  // Nigerian Army soldiers at Abalti, Dodan, Bonny Camp, Myoung, Ikeja Cantonment, Arakan & Ojo Cantonment
  { x: 114, z: -12, u: 'army' }, { x: 126, z: -12, u: 'army' },
  { x: 344, z: 50, u: 'army' }, { x: 356, z: 50, u: 'army' },
  { x: 390, z: 256, u: 'army' }, { x: 402, z: 256, u: 'army' },
  { x: 342, z: -304, u: 'army' }, { x: 354, z: -304, u: 'army' },
  { x: -66, z: -516, u: 'army' }, { x: -54, z: -516, u: 'army' },
  { x: -316, z: 82, u: 'army' }, { x: -304, z: 82, u: 'army' },
  { x: -366, z: 250, u: 'army' }, { x: -354, z: 250, u: 'army' },
  { x: 148, z: 134, u: 'army' }, { x: 496, z: 248, u: 'army' },
  // Nigerian Navy ratings & officers at NNS Beecroft Apapa, Navy Town Ojo & Naval Dockyard VI
  { x: -486, z: 82, u: 'navy' }, { x: -474, z: 82, u: 'navy' },
  { x: -496, z: 298, u: 'navy' }, { x: -484, z: 298, u: 'navy' },
  { x: 342, z: 80, u: 'navy' }, { x: 354, z: 80, u: 'navy' },
  // LAWMA highway & street sweepers in bright orange overalls
  { x: -92, z: 84, u: 'lawma' }, { x: -30, z: 13, u: 'lawma' }, { x: 30, z: -13, u: 'lawma' },
  { x: -10, z: 45, u: 'lawma' }, { x: 10, z: 85, u: 'lawma' },
  { x: -52, z: -12, u: 'lawma' }, { x: 82, z: -56, u: 'lawma' },
  { x: 14, z: 134, u: 'lawma' }, { x: -80, z: 134, u: 'lawma' },
  { x: 368, z: 12, u: 'lawma' }, { x: 448, z: 232, u: 'lawma' },
  { x: 392, z: -320, u: 'lawma' }, { x: 530, z: 232, u: 'lawma' },
  // VIO, KAI Environmental Corps & NSCDC Civil Defence
  { x: -84, z: 112, u: 'vio' }, { x: 64, z: -120, u: 'vio' }, { x: 372, z: 232, u: 'vio' },
  { x: 40, z: -76, u: 'kai' }, { x: -42, z: -56, u: 'kai' }, { x: 396, z: -280, u: 'kai' }, { x: 384, z: 36, u: 'kai' },
  { x: 100, z: 80, u: 'civildefence' }, { x: 486, z: 104, u: 'civildefence' }, { x: 400, z: 204, u: 'civildefence' },
  // CBN Armored Bullion Security & EFCC Red-Vest Operatives
  { x: 392, z: -18, u: 'cbn' }, { x: 404, z: -18, u: 'cbn' }, { x: 458, z: -20, u: 'cbn' },
  { x: 458, z: 152, u: 'efcc' }, { x: 470, z: 152, u: 'efcc' }, { x: 32, z: -892, u: 'efcc' }, { x: 42, z: -892, u: 'efcc' }, { x: -112, z: -792, u: 'efcc' },
  // Politician VIP Entourages (Alausa Secretariat, TBS, Dodan State House Annex, Ikoyi Bourdillon)
  { x: -24, z: -808, u: 'politician' }, { x: 404, z: 32, u: 'politician' }, { x: 344, z: 68, u: 'politician' }, { x: 468, z: 220, u: 'politician' },
  // Street & Cyber Fraudsters (Computer Village, VI Clubs, Surulere Cyber Café)
  { x: 44, z: -784, u: 'fraudster' }, { x: 118, z: -80, u: 'fraudster' }, { x: 446, z: 212, u: 'fraudster' },
  // Boko Haram Insurgent Scouts & Highway Bandit Outriders (Outer Interstate & Creek Perimeters)
  { x: 18, z: -988, u: 'boko_haram' }, { x: 28, z: -988, u: 'boko_haram' },
  { x: -378, z: 262, u: 'bandit' }, { x: -368, z: 262, u: 'bandit' },
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
