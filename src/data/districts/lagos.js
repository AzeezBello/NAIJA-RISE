import * as surulere from './surulere.js';
import { DISTRICT as ikoyi } from './ikoyi.js';
import { DISTRICT as lekki } from './lekki.js';
import { DISTRICT as ikorodu } from './ikorodu.js';
import { DISTRICT as apapa } from './apapa.js';
import { DISTRICT as ikeja } from './ikeja.js';
import { DISTRICT as oyingbo } from './oyingbo.js';
import { DISTRICT as yaba } from './yaba.js';
import { DISTRICT as ajegunle } from './ajegunle.js';
import { DISTRICT as makoko } from './makoko.js';
import { DISTRICT as agege } from './agege.js';
import { DISTRICT as ojoBadagry } from './ojo-badagry.js';
import { DISTRICT as westMainland } from './west-mainland.js';
import { DISTRICT as eastMainland } from './east-mainland.js';
import { DISTRICT as alimoshoOshodi } from './alimosho-oshodi.js';
import { DISTRICT as kosofeMagodo } from './kosofe-magodo.js';
import { STATE_AREA as ogun } from '../states/ogun.js';
import { STATE_AREA as oyo } from '../states/oyo.js';
import { STATE_AREA as fct } from '../states/fct.js';
import { STATE_AREA as rivers } from '../states/rivers.js';
import { STATE_AREA as anambra } from '../states/anambra.js';
import { STATE_AREA as kano } from '../states/kano.js';

const areas = [ikoyi, lekki, ikorodu, apapa, ikeja, oyingbo, yaba, ajegunle, makoko, agege, ojoBadagry, westMainland, eastMainland, alimoshoOshodi, kosofeMagodo, ogun, oyo, fct, rivers, anambra, kano];
const mergeAxisMap = (base, additions) => ({
  h: Object.assign({}, base.h, ...additions.map(map => map.h)),
  v: Object.assign({}, base.v, ...additions.map(map => map.v)),
});
const areaRoads = axis => areas.flatMap(area => area.ROADS[axis]);
const ROADS = {
  h: [...new Set([...surulere.ROADS.h, ...areaRoads('h')])].sort((a, b) => a - b),
  v: [...new Set([...surulere.ROADS.v, ...areaRoads('v')])].sort((a, b) => a - b),
};
const ROAD_EXTENT = mergeAxisMap(surulere.ROAD_EXTENT, areas.map(area => area.ROAD_EXTENT));
const ROAD_NAMES = mergeAxisMap(surulere.ROAD_NAMES, areas.map(area => area.ROAD_NAMES));
const ROAD_WIDTHS = mergeAxisMap(surulere.ROAD_WIDTHS, areas.map(area => area.ROAD_WIDTHS));
const ROAD_CLASS = mergeAxisMap(surulere.ROAD_CLASS, areas.map(area => area.ROAD_CLASS));
const ROAD_SEGMENTS = mergeAxisMap(surulere.ROAD_SEGMENTS, areas.map(area => area.ROAD_SEGMENTS));
const extraExtent = {
  h: { 0: [-196, 470], 142: [-520, 150], '-330': [-520, 480], 240: [340, 2280], 300: [340, 2280] },
  v: { 0: [-3350, 150], '-300': [-1950, -780], 360: [-400, 96], 440: [-80, 330], 560: [180, 330], 1980: [-1680, 320] },
};
for (const axis of ['h', 'v']) {
  for (const [k, extent] of Object.entries(extraExtent[axis])) {
    ROAD_EXTENT[axis][k] = extent;
  }
}
ROAD_EXTENT.h[300] = [-520, 2280];
ROAD_NAMES.h[0] = 'Bode Thomas Street';
ROAD_NAMES.h[-330] = 'Ikorodu Road';
ROAD_NAMES.h[300] = 'Ahmadu Bello Way · Lagos–Calabar Coastal Road';
ROAD_NAMES.v[360] = 'Broad Street · Third Mainland Bridge';
ROAD_NAMES.v[440] = 'Marina · Falomo Bridge';
ROAD_SEGMENTS.h[0] = surulere.ROAD_SEGMENTS.h[0];
ROAD_SEGMENTS.h[300] = [[340, 480, 'Ahmadu Bello Way'], [480, 1120, 'Coastal Road'], [1120, 1720, 'Lagos–Calabar Coastal Highway'], [1720, 2280, 'Lagos–Calabar Coastal Highway · Niger Delta & Bonny']];
ROAD_SEGMENTS.h[240] = [[340, 480, 'Adeola Odeku Street'], [480, 505, 'Lekki Toll Gate'], [505, 620, 'Lekki–Epe Expressway · Lekki Phase 1'], [620, 840, 'Lekki–Epe Expressway · Ajah'], [840, 1120, 'Lekki–Epe Expressway · Eleko'], [1120, 1440, 'Lekki–Epe Expressway · Ibeju-Lekki'], [1440, 1720, 'Lekki–Epe Expressway · Epe'], [1720, 2280, 'East–West Road · Warri & Port Harcourt']];
ROAD_SEGMENTS.h[-330] = [[-520, -150, 'Ikorodu Road · Ikorodu'], [-150, -100, 'Ikorodu Road · Ikorodu Garage'], [-100, 300, 'Ikorodu Road · Ebute Metta'], [300, 480, 'Ikorodu Road · Jibowu']];
ROAD_SEGMENTS.h[142] = [[-520, -150, 'Apapa–Oworonshoki Expressway · Apapa Port Road'], [-150, 150, 'Apapa–Oworonshoki Expressway']];
ROAD_SEGMENTS.v[0] = [[-3350, -2900, 'Abuja–Kaduna–Kano Expressway (A2)'], [-2900, -2420, 'Abuja Airport & Three Arms Expressway (A2)'], [-2420, -1980, 'Lagos–Ibadan Expressway · Ibadan Sector'], [-1980, -1520, 'Lagos–Ibadan Expressway · Mowe & Sagamu'], [-1520, -1000, 'Lagos–Ibadan Expressway · Ojodu Berger'], [-1000, -480, 'Adeniran Ogunsanya Street · Ikeja Link'], [-480, -330, 'Adeniran Ogunsanya Street · Maryland Link'], [-330, 150, 'Adeniran Ogunsanya Street']];
ROAD_SEGMENTS.v[360] = [[-400, -250, 'Murtala Muhammed Way · Yaba'], [-250, -85, 'Third Mainland Bridge'], [-85, 80, 'Broad Street'], [80, 96, 'Kingsway Road']];
ROAD_SEGMENTS.v[440] = [[-400, -250, 'University Road'], [-80, 80, 'Marina'], [80, 180, 'Falomo Bridge'], [180, 330, 'Akin Adesola Street']];
ROAD_SEGMENTS.v[-350] = [[-410, -180, 'Apapa–Oshodi Expressway · Mile 2 Link'], [-180, 40, 'Mile 2 · Creek Link'], [40, 230, 'Liverpool Road']];
ROAD_NAMES.v[0] = 'Adeniran Ogunsanya Street · Lagos–Ibadan Expressway';
ROAD_CLASS.h[142] = 'expressway';
ROAD_CLASS.h[-330] = 'highway';
ROAD_CLASS.h[240] = 'highway';
ROAD_CLASS.v[360] = 'highway';
ROAD_CLASS.h[300] = 'main';
ROAD_WIDTHS.h[142] = 36;
ROAD_WIDTHS.h[-330] = 40;
ROAD_WIDTHS.h[240] = 38;
ROAD_WIDTHS.h[300] = 22;
ROAD_WIDTHS.v[360] = 36;
ROAD_EXTENT.h[-720] = [-520, -160];
ROAD_EXTENT.h[-660] = [-520, -160];
ROAD_EXTENT.v[-450] = [-780, -640];
ROAD_EXTENT.v[-270] = [-780, -640];
ROAD_EXTENT.h[280] = [-1020, -140];
ROAD_EXTENT.h[340] = [-1020, -140];
ROAD_EXTENT.h[300] = [-520, 2280];
ROAD_EXTENT.v[-490] = [-780, -640];
ROAD_EXTENT.v[-310] = [-780, -640];
ROAD_EXTENT.v[-490] = [-780, -640];
ROAD_EXTENT.v[-310] = [-780, -640];
ROAD_EXTENT.v[-400] = [250, 380];
ROAD_EXTENT.v[-220] = [250, 380];
ROAD_WIDTHS.h[280] = 30;
ROAD_WIDTHS.h[340] = 18;
ROAD_WIDTHS.v[-490] = 18;
ROAD_WIDTHS.v[-310] = 16;
ROAD_WIDTHS.v[-400] = 18;
ROAD_WIDTHS.v[-220] = 18;
ROAD_EXTENT.v[-450] = [50, 230];
ROAD_EXTENT.v[-350] = [-410, 230];
ROAD_EXTENT.v[-360] = [-410, -250];
ROAD_EXTENT.v[-270] = [-410, -250];
ROAD_EXTENT.v[-250] = [50, 230];
ROAD_EXTENT.v[488] = [78, 230];
ROAD_EXTENT.v[720] = [180, 330];
ROAD_EXTENT.v[800] = [180, 330];
ROAD_EXTENT.v[920] = [180, 330];
ROAD_EXTENT.v[1040] = [180, 330];
ROAD_WIDTHS.v[440] = 20;
ROAD_WIDTHS.v[488] = 16;
ROAD_WIDTHS.v[720] = 16;
ROAD_WIDTHS.v[800] = 18;
ROAD_WIDTHS.v[920] = 16;
ROAD_WIDTHS.v[1040] = 16;

const LANDMARKS = [
  ...surulere.LANDMARKS.filter(l => !['ajegunle', 'ajpitch', 'makoko', 'ikorodu', 'tejuosho', 'yabatech', 'unilag'].includes(l.id)),
  ...areas.flatMap(area => area.LANDMARKS),
  { id: 'obalende', name: 'Obalende', short: 'OBALENDE', x: 420, z: 74, c: '#8a7d6a', sign: '#ffc52f', h: 6, kind: 'landmark', region: 'obalende' },
  { id: 'balogun-market', name: 'Balogun Market', short: 'BALOGUN MKT', x: 390, z: 42, c: '#6b4737', sign: '#ffc52f', h: 7, kind: 'market', big: true, region: 'island' },
  { id: 'bet9ja-surulere', name: 'Bet9ja Sports Betting', short: 'BET9JA', x: 12, z: -52, c: '#f2bd18', sign: '#ffffff', h: 4, kind: 'betshop' },
  { id: 'sportybet-yaba', name: 'SportyBet', short: 'SPORTYBET', x: 408, z: -318, c: '#111f3c', sign: '#47b54a', h: 4, kind: 'betshop', region: 'yaba' },
  { id: '1xbet-ikorodu', name: '1xBet Ikorodu', short: '1XBET', x: -270, z: -300, c: '#163f8c', sign: '#ffffff', h: 4, kind: 'betshop', region: 'ikorodu' },
  { id: 'marina-rail', name: 'Marina Blue Line Rail Station', short: 'MARINA RAIL', x: 356, z: 20, c: '#1559b8', sign: '#ffffff', h: 9, kind: 'rail', big: true, region: 'island' },
  { id: 'theatre-rail', name: 'National Theatre Blue Line Station', short: 'THEATRE RAIL', x: 152, z: -20, c: '#1559b8', sign: '#ffffff', h: 9, kind: 'rail', region: 'costain' },
  { id: 'ebute-rail', name: 'Mobolaji Johnson Station · Ebute Metta', short: 'EBUTE RAIL', x: 184, z: -308, c: '#1559b8', sign: '#ffffff', h: 9, kind: 'rail', big: true, region: 'ebute' },
  { id: 'dodan-barracks', name: 'Dodan Barracks · Obalende', short: 'DODAN BARRACKS', x: 404, z: 74, c: '#3b5323', sign: '#ffffff', h: 7, kind: 'army', big: true, region: 'island' },
  { id: 'bonny-camp', name: 'Bonny Camp Military Cantonment', short: 'BONNY CAMP', x: 396, z: 268, c: '#3b5323', sign: '#ffffff', h: 7, kind: 'army', big: true, region: 'vi' },
  { id: 'naval-dockyard', name: 'Naval Dockyard · Victoria Island', short: 'NAVAL DOCKYARD', x: 356, z: 186, c: '#13294b', sign: '#ffffff', h: 6, kind: 'navy', big: true, waterfront: true, region: 'vi' },
  { id: 'island-fire', name: 'Lagos Island Fire Station', short: 'ISLAND FIRE', x: 420, z: 16, c: '#c62828', sign: '#ffffff', h: 6, kind: 'service', region: 'island' },
  { id: 'cbn-lagos', name: 'Central Bank of Nigeria · Tinubu Square', short: 'CBN LAGOS', x: 396, z: -12, c: '#0f5132', sign: '#ffd700', h: 24, kind: 'cbn', big: true, region: 'island' },
  { id: 'efcc-ikoyi', name: 'EFCC Zonal Command · Awolowo Road, Ikoyi', short: 'EFCC IKOYI', x: 464, z: 158, c: '#7f1d1d', sign: '#ffffff', h: 12, kind: 'efcc', big: true, region: 'ikoyi' },
  { id: 'efcc-ikeja', name: 'EFCC Operations Office · Ikeja GRA', short: 'EFCC IKEJA', x: 24, z: -900, c: '#7f1d1d', sign: '#ffffff', h: 10, kind: 'efcc', big: true, region: 'ikeja' },
  { id: 'falomo-jetty', name: 'Five Cowrie Creek Fishing Jetty', short: 'FALOMO JETTY', x: 428, z: 96, c: '#5a6e72', sign: '#3dd68c', h: 3, kind: 'waypoint', waterfront: true, region: 'island' },
  { id: 'bariga-jetty', name: 'Bariga · Oworonshoki Fishing Jetty', short: 'BARIGA JETTY', x: 332, z: -260, c: '#5a6e72', sign: '#3dd68c', h: 3, kind: 'waypoint', waterfront: true, region: 'bariga' },
  { id: 'ebute-ero-jetty', name: 'Ebute Ero Fishermen Jetty · Marina', short: 'EBUTE ERO JETTY', x: 344, z: -46, c: '#5a6e72', sign: '#3dd68c', h: 3, kind: 'waypoint', waterfront: true, region: 'island' },
];
const BUSSTOPS = [...surulere.BUSSTOPS, ...areas.flatMap(area => area.BUSSTOPS)];
const REGIONS = [
  { id: 'obalende', name: 'Obalende', x: [260, 340], z: [0, 80] },
  ...westMainland.REGIONS,
  ...eastMainland.REGIONS,
  ...alimoshoOshodi.REGIONS,
  ...kosofeMagodo.REGIONS,
  ...surulere.REGIONS.filter(r => !['falomo', 'lekki', 'ikorodu', 'yaba', 'ajegunle', 'vi'].includes(r.id)),
  ...agege.REGIONS,
  ...ojoBadagry.REGIONS,
  ...ajegunle.REGIONS,
  ...makoko.REGIONS,
  { id: 'falomo', name: 'Falomo Bridge · Five Cowrie Creek', x: [340, 426], z: [100, 180] },
  ...ikoyi.REGIONS,
  { id: 'vi', name: 'Victoria Island', x: [340, 480], z: [180, 330] },
  ...lekki.REGIONS,
  { id: 'bar-beach', name: 'Bar Beach', x: [426, 470], z: [180, 350] },
  { id: 'oniru', name: 'Oniru', x: [470, 535], z: [250, 350] },
  { id: 'elegushi', name: 'Elegushi · Quilox', x: [535, 620], z: [250, 350] },
  { id: 'ikorodu', name: 'Ikorodu Town', x: [-520, -140], z: [-420, -240] },
  { id: 'apapa', name: 'Apapa Port', x: [-520, -140], z: [40, 240] },
  ...apapa.REGIONS,
  ...ikeja.REGIONS,
  ...oyingbo.REGIONS,
  ...yaba.REGIONS,
  ...ogun.REGIONS,
  ...oyo.REGIONS,
  ...fct.REGIONS,
  ...rivers.REGIONS,
  ...anambra.REGIONS,
  ...kano.REGIONS,
];
const baseWaters = [
  ...surulere.WATERS
    .filter(w => w.id !== 'creek' && w.id !== 'lagoon-e' && w.id !== 'atlantic')
    .map(w => w.id === 'lagoon-n' ? { ...w, x: [339, 1750] } : w),
  { id: 'creek', name: 'Five Cowrie Creek', x: [339, 426], z: [100, 180] },
  { id: 'lagoon-banana-n', name: 'Lagos Lagoon', x: [480, 562], z: [-85, 76] },
  { id: 'lagoon-e', name: 'Lagos Lagoon', x: [562, 1750], z: [-85, 175] },
  { id: 'atlantic', name: 'Atlantic Ocean', x: [339, 1750], z: [350, 410] },
];
const WATERS = [
  ...baseWaters,
  ...areas.flatMap(area => area.WATERS).filter(w =>
    !baseWaters.some(existing =>
      w.x[0] >= existing.x[0] && w.x[1] <= existing.x[1] &&
      w.z[0] >= existing.z[0] && w.z[1] <= existing.z[1]
    )
  ),
];
const PROPERTIES = [...surulere.PROPERTIES, ...areas.flatMap(area => area.PROPERTIES || [])];
const AREA_CELLS = areas.flatMap(area => area.CELLS || []);
const WORLD_BOUNDS = { x: [-1050, 2340], z: [-3400, 410] };
const roadFootprintOverlap = (x, z, width, depth) =>
  ROADS.h.some(y => {
    const [start, end] = ROAD_EXTENT.h[y] || [-150, 150];
    return x + width / 2 + 1 > start && x - width / 2 - 1 < end &&
      Math.abs(z - y) < (ROAD_WIDTHS.h[y] || 12) / 2 + depth / 2 + 1;
  }) ||
  ROADS.v.some(x0 => {
    const [start, end] = ROAD_EXTENT.v[x0] || [-150, 150];
    return z + depth / 2 + 1 > start && z - depth / 2 - 1 < end &&
      Math.abs(x - x0) < (ROAD_WIDTHS.v[x0] || 12) / 2 + width / 2 + 1;
  });
const buildingFootprint = landmark => {
  if (
    landmark.stadium || landmark.waterfront ||
    ['airport', 'beach', 'checkpoint', 'pitch', 'post', 'rail', 'settlement', 'street', 'toll', 'waypoint'].includes(landmark.kind)
  ) return null;
  if (landmark.kind === 'artisan') return { width: 16, depth: 13 };
  if (landmark.big) return { width: 26, depth: 20 };
  if (landmark.kind === 'hotel' || landmark.kind === 'bank') return { width: 20, depth: 16 };
  return { width: 18, depth: 14 };
};
const moveBuildingsClearOfRoads = () => {
  const buildings = [
    ...LANDMARKS.flatMap(landmark => {
      const footprint = buildingFootprint(landmark);
      return footprint ? [{ location: landmark, ...footprint }] : [];
    }),
    ...PROPERTIES.map(property => ({ location: property, width: 20, depth: 18 })),
  ];
  const moving = buildings
    .filter(({ location, width, depth }) => roadFootprintOverlap(location.x, location.z, width, depth))
    .sort((a, b) => b.width * b.depth - a.width * a.depth);
  const occupied = buildings
    .filter(building => !moving.includes(building))
    .map(building => ({ ...building, x: building.location.x, z: building.location.z }));
  for (const stop of BUSSTOPS) occupied.push({ x: stop.x, z: stop.z, width: 16, depth: 16 });

  const offsets = [];
  for (let dx = -80; dx <= 80; dx += 2) {
    for (let dz = -80; dz <= 80; dz += 2) {
      if (dx || dz) offsets.push({ dx, dz, distance: dx * dx + dz * dz });
    }
  }
  offsets.sort((a, b) => a.distance - b.distance || a.dx - b.dx || a.dz - b.dz);

  for (const building of moving) {
    const { location, width, depth } = building;
    const site = offsets.find(({ dx, dz }) => {
      const x = location.x + dx, z = location.z + dz;
      if (
        x - width / 2 < WORLD_BOUNDS.x[0] || x + width / 2 > WORLD_BOUNDS.x[1] ||
        z - depth / 2 < WORLD_BOUNDS.z[0] || z + depth / 2 > WORLD_BOUNDS.z[1] ||
        roadFootprintOverlap(x, z, width, depth) ||
        WATERS.some(water =>
          x + width / 2 > water.x[0] && x - width / 2 < water.x[1] &&
          z + depth / 2 > water.z[0] && z - depth / 2 < water.z[1]
        )
      ) return false;
      return !occupied.some(other =>
        Math.abs(x - other.x) < (width + other.width) / 2 + 3 &&
        Math.abs(z - other.z) < (depth + other.depth) / 2 + 3
      );
    });
    if (!site) {
      throw new Error(`No safe road-free placement found for ${location.id}`);
    }
    location.x += site.dx;
    location.z += site.dz;
    if (location.door) {
      location.door.x = location.x;
      location.door.z = location.z - 10.5;
    }
    occupied.push({ ...building, x: location.x, z: location.z });
  }
};
moveBuildingsClearOfRoads();
const RESERVED = [
  ...LANDMARKS.map(l => ({ x: l.x, z: l.z, r: l.stadium ? 34 : l.kind === 'pitch' ? 26 : l.waterfront || l.kind === 'settlement' ? 52 : l.big ? 22 : (l.kind === 'checkpoint' || l.kind === 'post' || l.kind === 'toll') ? 8 : 17 })),
  ...BUSSTOPS.map(b => ({ x: b.x, z: b.z, r: 13 })),
  ...PROPERTIES.map(p => ({ x: p.x, z: p.z, r: 17 })),
];
const JUNCTIONS = ROADS.h.flatMap(z =>
  ROADS.v
    .filter(x => {
      const [za, zb] = ROAD_EXTENT.v[x] || [0, 0];
      const [xa, xb] = ROAD_EXTENT.h[z] || [0, 0];
      return z >= za && z <= zb && x >= xa && x <= xb &&
        !surulere.onBridge('v', x, z) && !surulere.onBridge('h', z, x);
    })
    .map(x => ({ x, z }))
);

export const META = {
  ...surulere.META,
  id: 'lagos',
  name: 'Lagos',
  bounds: WORLD_BOUNDS,
};
const REGION_PRIORITY = [...REGIONS].sort((a, b) =>
  (a.x[1] - a.x[0]) * (a.z[1] - a.z[0]) -
  (b.x[1] - b.x[0]) * (b.z[1] - b.z[0])
);
const LAGOS_REGION = { id: 'lagos', name: 'Lagos', x: META.bounds.x, z: META.bounds.z };
export { REGIONS, ROADS, ROAD_EXTENT, ROAD_NAMES, ROAD_WIDTHS, LANDMARKS, BUSSTOPS, PROPERTIES, RESERVED, WATERS, JUNCTIONS };
export const PLACES = [...LANDMARKS, ...BUSSTOPS];
export { ROAD_CLASS };
export { ROAD_SEGMENTS };
export const roadExtent = (axis, k) => ROAD_EXTENT[axis][k] || [-150, 150];
export const roadClass = (axis, k) => ROAD_CLASS[axis][k] || 'main';
export const roadRules = (axis, k) => surulere.CLASS_RULES[roadClass(axis, k)];
export const roadName = (axis, k) => ROAD_NAMES[axis][k] || 'the main road';
export const roadNameAt = (axis, k, along) => ROAD_SEGMENTS[axis][k]?.find(([a, b]) => along >= a && along < b)?.[2] || roadName(axis, k);
export const regionAt = (x, z = 0) =>
  REGION_PRIORITY.find(r => x >= r.x[0] && x <= r.x[1] && z >= r.z[0] && z <= r.z[1]) ||
  REGION_PRIORITY.reduce((best, r) => {
    const dx = x < r.x[0] ? r.x[0] - x : x > r.x[1] ? x - r.x[1] : 0;
    const dz = z < r.z[0] ? r.z[0] - z : z > r.z[1] ? z - r.z[1] : 0;
    const d = dx * dx + dz * dz;
    return !best || d < best.d ? { r, d } : best;
  }, null)?.r || LAGOS_REGION;
export const placeOf = id => LANDMARKS.find(l => l.id === id) || BUSSTOPS.find(b => b.id === id) || PROPERTIES.find(p => p.id === id);
export const placesOfKind = kind => LANDMARKS.filter(l => l.kind === kind);
export const inWater = (x, z) => WATERS.some(w => x >= w.x[0] && x <= w.x[1] && z >= w.z[0] && z <= w.z[1]);
export const onBridge = (axis, k, along) => surulere.onBridge(axis, k, along);
export const WATER = surulere.WATER;
export const KIOSKS = surulere.KIOSKS;
export const ANIMALS = surulere.ANIMALS;
export const UNIFORMS = surulere.UNIFORMS;
export const SERVICE_NPCS = surulere.SERVICE_NPCS;
export const NIGHTLIFE_NPCS = surulere.NIGHTLIFE_NPCS;
export const TOLLS = surulere.TOLLS;
export const FOOTBRIDGES = surulere.FOOTBRIDGES;
export const VI_CELLS = surulere.VI_CELLS;
export const LEKKI_CELLS = surulere.LEKKI_CELLS;
export const YABA_CELLS = [...surulere.YABA_CELLS, [360, -384], [456, -384], [360, -336], [456, -336], [384, -312], [456, -312]];
export const EBUTE_CELLS = surulere.EBUTE_CELLS;
export const ISLAND_CELLS = surulere.ISLAND_CELLS;
export { AREA_CELLS };
export const VENDORS = surulere.VENDORS;
export const BRIDGES = surulere.BRIDGES;
export const BRIDGE_RUSH = surulere.BRIDGE_RUSH;
export const CLASS_RULES = surulere.CLASS_RULES;
export const DISTRICT_AREAS = areas;
export const U_TURNS = [
  ...surulere.U_TURNS,
  { axis: 'h', k: -330, at: -430, name: 'Ikorodu Town U-turn' },
  { axis: 'h', k: -330, at: -180, name: 'Ikorodu Garage U-turn' },
  { axis: 'h', k: 142, at: -400, name: 'Apapa Port Road U-turn' },
  { axis: 'h', k: 240, at: 780, name: 'Ajah U-turn' },
  { axis: 'h', k: 240, at: 1000, name: 'Eleko U-turn' },
];
export const ARTISAN_NPCS = LANDMARKS.filter(l => l.kind === 'artisan');
