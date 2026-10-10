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

const areas = [ikoyi, lekki, ikorodu, apapa, ikeja, oyingbo, yaba, ajegunle, makoko, agege, ojoBadagry];
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
  h: { 0: [-150, 470], 142: [-520, 150], '-330': [-520, 480], 240: [340, 1120], 300: [340, 1120] },
  v: { 0: [-940, 150], 440: [-80, 330], 560: [180, 330] },
};
for (const axis of ['h', 'v']) {
  for (const [k, extent] of Object.entries(extraExtent[axis])) {
    ROAD_EXTENT[axis][k] = extent;
  }
}
ROAD_EXTENT.h[300] = [340, 1120];
ROAD_NAMES.h[300] = 'Ahmadu Bello Way · Coastal Road';
ROAD_SEGMENTS.h[300] = [[340, 480, 'Ahmadu Bello Way'], [480, 1120, 'Coastal Road']];
ROAD_SEGMENTS.h[240] = [[340, 480, 'Adeola Odeku Street'], [480, 505, 'Lekki Toll Gate'], [505, 620, 'Lekki–Epe Expressway · Lekki Phase 1'], [620, 840, 'Lekki–Epe Expressway · Ajah'], [840, 1120, 'Lekki–Epe Expressway · Eleko']];
ROAD_SEGMENTS.h[-330] = [[-520, -150, 'Ikorodu Road · Ikorodu'], [-150, -100, 'Ikorodu Road · Ikorodu Garage'], [-100, 300, 'Ikorodu Road · Ebute Metta'], [300, 480, 'Ikorodu Road · Jibowu']];
ROAD_SEGMENTS.h[142] = [[-520, -150, 'Apapa–Oworonshoki Expressway · Apapa Port Road'], [-150, 150, 'Apapa–Oworonshoki Expressway']];
ROAD_SEGMENTS.v[0] = [[-940, -480, 'Adeniran Ogunsanya Street · Ikeja Link'], [-480, -330, 'Adeniran Ogunsanya Street · Maryland Link'], [-330, 150, 'Adeniran Ogunsanya Street']];
ROAD_NAMES.v[0] = 'Adeniran Ogunsanya Street · Ikeja Link';
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
ROAD_EXTENT.h[280] = [-520, -140];
ROAD_EXTENT.h[340] = [-520, -140];
ROAD_EXTENT.h[300] = [-520, 1120];
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
ROAD_EXTENT.v[488] = [80, 230];
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
  { id: 'bet9ja-surulere', name: 'Bet9ja Sports Betting', short: 'BET9JA', x: 12, z: -52, c: '#f2bd18', sign: '#ffffff', h: 4, kind: 'betshop' },
  { id: 'sportybet-yaba', name: 'SportyBet', short: 'SPORTYBET', x: 408, z: -318, c: '#111f3c', sign: '#47b54a', h: 4, kind: 'betshop', region: 'yaba' },
  { id: '1xbet-ikorodu', name: '1xBet Ikorodu', short: '1XBET', x: -270, z: -300, c: '#163f8c', sign: '#ffffff', h: 4, kind: 'betshop', region: 'ikorodu' },
];
const BUSSTOPS = [...surulere.BUSSTOPS, ...areas.flatMap(area => area.BUSSTOPS)];
const REGIONS = [
  ...surulere.REGIONS.filter(r => !['falomo', 'lekki', 'ikorodu', 'yaba', 'ajegunle', 'vi'].includes(r.id)),
  ...agege.REGIONS,
  ...ojoBadagry.REGIONS,
  ...ajegunle.REGIONS,
  ...makoko.REGIONS,
  { id: 'falomo', name: 'Falomo Bridge · Five Cowrie Creek', x: [340, 426], z: [100, 180] },
  { id: 'ikoyi', name: 'Ikoyi', x: [426, 480], z: [100, 180] },
  { id: 'vi', name: 'Victoria Island', x: [340, 480], z: [180, 330] },
  ...lekki.REGIONS.filter(r => r.id !== 'lekki'),
  { id: 'bar-beach', name: 'Bar Beach', x: [426, 470], z: [180, 350] },
  { id: 'oniru', name: 'Oniru', x: [470, 535], z: [250, 350] },
  { id: 'elegushi', name: 'Elegushi · Quilox', x: [535, 620], z: [250, 350] },
  { id: 'ikorodu', name: 'Ikorodu Town', x: [-520, -140], z: [-420, -240] },
  { id: 'apapa', name: 'Apapa Port', x: [-520, -140], z: [40, 240] },
  ...ikeja.REGIONS,
  ...oyingbo.REGIONS,
  ...yaba.REGIONS,
];
const baseWaters = [
  ...surulere.WATERS
    .filter(w => w.id !== 'creek' && w.id !== 'lagoon-e' && w.id !== 'atlantic')
    .map(w => w.id === 'lagoon-n' ? { ...w, x: [339, 1120] } : w),
  { id: 'creek', name: 'Five Cowrie Creek', x: [339, 426], z: [100, 180] },
  { id: 'lagoon-e', name: 'Lagos Lagoon', x: [480, 1120], z: [-85, 180] },
  { id: 'atlantic', name: 'Atlantic Ocean', x: [339, 1120], z: [350, 410] },
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
const PROPERTIES = surulere.PROPERTIES;
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
  bounds: { x: [-520, 1120], z: [-1000, 410] },
};
export { REGIONS, ROADS, ROAD_EXTENT, ROAD_NAMES, ROAD_WIDTHS, LANDMARKS, BUSSTOPS, PROPERTIES, RESERVED, WATERS, JUNCTIONS };
export const PLACES = [...LANDMARKS, ...BUSSTOPS];
export { ROAD_CLASS };
export { ROAD_SEGMENTS };
export const roadExtent = (axis, k) => ROAD_EXTENT[axis][k] || [-150, 150];
export const roadClass = (axis, k) => ROAD_CLASS[axis][k] || 'main';
export const roadRules = (axis, k) => surulere.CLASS_RULES[roadClass(axis, k)];
export const roadName = (axis, k) => ROAD_NAMES[axis][k] || 'the main road';
export const roadNameAt = (axis, k, along) => ROAD_SEGMENTS[axis][k]?.find(([a, b]) => along >= a && along < b)?.[2] || roadName(axis, k);
export const regionAt = (x, z = 0) => REGIONS.find(r => x >= r.x[0] && x < r.x[1] && z >= r.z[0] && z < r.z[1]) || REGIONS[0];
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
export const VENDORS = surulere.VENDORS;
export const BRIDGES = surulere.BRIDGES;
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
