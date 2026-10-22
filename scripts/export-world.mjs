// Exports the merged Lagos map (src/data/districts/lagos.js) to JSON for the Unity edition (unity/).
// Run with `npm run export:unity` or `node scripts/export-world.mjs [outfile]`. Re-run whenever the district data changes:
// the Unity WorldBuilder reads this file at startup, so the two editions share one map.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

// The data modules read a few browser globals at import time.
globalThis.matchMedia ??= () => ({ matches: false });
globalThis.innerWidth ??= 1280;
globalThis.location ??= { hash: '', search: '' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = f => import(pathToFileURL(resolve(root, f)).href);
const [L, C, J, Ch, V, F, B, It, St, SMap] = await Promise.all([load('src/data/districts/lagos.js'), load('src/data/config.js'), load('src/data/jobs.js'), load('src/data/characters.js'), load('src/data/vehicles.js'), load('src/data/family.js'), load('src/data/businesses.js'), load('src/data/items.js'), load('src/data/nigeria-states.js'), load('src/data/states/index.js')]);
const out = process.argv[2] ? resolve(process.argv[2]) : resolve(root, 'unity/Assets/Rise/Resources/world/lagos.json');
const manifestOut = resolve(dirname(out), 'manifest.json');

const AXES = ['h', 'v'];
const roads = AXES.flatMap(axis => L.ROADS[axis].map(k => {
  const [from, to] = L.roadExtent(axis, k);
  const cls = L.roadClass(axis, k);
  const rules = L.CLASS_RULES[cls] || L.CLASS_RULES.main;
  return {
    axis, k, from, to, width: L.ROAD_WIDTHS[axis][k] || 12, name: L.roadName(axis, k), cls,
    speed: rules.speed, limit: rules.limit, density: rules.density,
    median: !!rules.median, lights: rules.lights !== false, vendors: !!rules.vendors,
  };
}));
const segments = AXES.flatMap(axis => Object.entries(L.ROAD_SEGMENTS[axis] || {})
  .flatMap(([k, segs]) => (segs || []).map(([from, to, name]) => ({ axis, k: Number(k), from, to, name }))));

// Bridge deck profiles: [along, height] pairs; halfW: half the deck width used for height queries.
const bridges = [
  { id: 'eko', name: 'Eko Bridge', axis: 'h', k: 0, halfW: 10, profile: [[155, 0], [192, 9], [310, 9], [345, 0]] },
  { id: 'falomo', name: 'Falomo Bridge', axis: 'v', k: 440, halfW: 10, profile: [[82, 0], [108, 8], [156, 8], [180, 0]] },
  { id: 'thirdmainland', name: 'Third Mainland Bridge', axis: 'v', k: 360, halfW: 10, profile: [[-248, 0], [-218, 9], [-115, 9], [-86, 0]] },
].map(b => ({ ...b, profile: b.profile.map(([along, height]) => ({ along, height })) }));

const regionStateMap = new Map();
const biomeForState = {
  lagos: 'coastal',
  ogun: 'southwest',
  oyo: 'southwest',
  fct: 'abuja',
  rivers: 'niger_delta',
  anambra: 'southeast',
  kano: 'sahel',
};
for (const [stateKey, area] of Object.entries(SMap.STATE_MAPS)) {
  if (stateKey === 'lagos') continue;
  for (const r of (area.REGIONS || [])) regionStateMap.set(r.id, stateKey);
}
const rect = r => {
  const state = regionStateMap.get(r.id) || 'lagos';
  return { id: r.id, name: r.name, state, biome: biomeForState[state] || 'coastal', minX: r.x[0], maxX: r.x[1], minZ: r.z[0], maxZ: r.z[1] };
};
const waterRect = r => ({ id: r.id, name: r.name, minX: r.x[0], maxX: r.x[1], minZ: r.z[0], maxZ: r.z[1] });
const point = ([x, z]) => ({ x, z });

const world = {
  meta: {
    id: L.META.id, name: L.META.name, version: C.GAME.version,
    spawnX: L.META.spawn.x, spawnZ: L.META.spawn.z,
    minX: L.META.bounds.x[0], maxX: L.META.bounds.x[1], minZ: L.META.bounds.z[0], maxZ: L.META.bounds.z[1],
    startClock: C.TIME.startClock, hoursPerSecond: C.TIME.daySpeed,
    venueOpen: C.TIME.venueOpen, venueClose: C.TIME.venueClose,
    startCash: C.ECON.startCash, startBank: C.ECON.startBank,
    priceWater: C.PRICES.water, priceSuya: C.PRICES.suya, posFee: C.PRICES.posFee, posAmount: C.PRICES.posAmount, refuel: C.ECON.refuel,
    awayMinMinutes: C.AWAY.minMinutes, awayCapMinutes: C.AWAY.capMinutes,
    // law and economy rules (src/data/config.js LAW, ECON, RENT, BIZ)
    pursuitHeat: C.LAW.pursuitHeat, bustSeconds: C.LAW.bustSeconds, ticketKmh: C.LAW.ticketKmh, checkpointKmh: C.LAW.checkpointKmh,
    fineRate: C.ECON.fineRate, bustRate: C.ECON.bustRate, speedTicket: C.ECON.speedTicket, payCycle: C.ECON.payCycle,
    agentFeeRate: C.RENT.agentFeeRate, leaseDays: C.RENT.leaseDays,
    priceLow: C.BIZ.priceEffect.low, priceHigh: C.BIZ.priceEffect.high, propertyLevel: 2,
  },
  regions: L.REGIONS.map(rect),
  roads,
  segments,
  bridges,
  junctions: L.JUNCTIONS.map(j => ({ x: j.x, z: j.z })),
  landmarks: [...L.LANDMARKS, { id: F.FAMILY_HOME.id, name: F.FAMILY_HOME.name, short: 'FAMILY HOUSE', x: F.FAMILY_HOME.x, z: F.FAMILY_HOME.z, c: '#c9b48a', sign: '#e8b86d', h: 3.6, kind: 'home' }].map(l => ({
    id: l.id, name: l.name, shortName: l.short || l.name.toUpperCase(), kind: l.kind || 'landmark',
    color: l.c || '#8a7d6a', sign: l.sign || '#ffc52f', region: l.region || '',
    x: l.x, z: l.z, h: l.h ?? 5, cost: l.cost || 0, big: !!l.big, stadium: !!l.stadium, waterfront: !!l.waterfront,
  })),
  busStops: L.BUSSTOPS.map(b => ({ id: b.id, name: b.name, shortName: b.short || b.name.toUpperCase(), x: b.x, z: b.z, agberos: b.agberos || 0 })),
  properties: L.PROPERTIES.map(p => ({
    id: p.id, name: p.name, type: p.type, style: p.style || 'bungalow', color: p.c || '#c9b48a', sign: p.sign || '',
    x: p.x, z: p.z, h: p.h ?? 3.6, rent: p.rent || 0, buy: p.buy || 0, perk: p.perk || '',
  })),
  businesses: B.BUSINESSES.map(b => ({ id: b.id, name: b.name, price: b.price, income: b.income, x: b.x, z: b.z })),
  dealer: C.DEALER.map(([type, price]) => ({ type, price })),
  // Place activities (src/data/config.js PLACES_CFG)
  gym: { dayPass: C.PLACES_CFG.gym.dayPass, monthly: C.PLACES_CFG.gym.monthly, trainer: C.PLACES_CFG.gym.trainer, boxingMin: C.PLACES_CFG.gym.boxingMin },
  food: C.PLACES_CFG.food.map(([name, price, stamina, business]) => ({ name, price, stamina, business })),
  mall: { outfit: C.PLACES_CFG.mall.outfit, laptop: C.PLACES_CFG.mall.laptop, groceries: C.PLACES_CFG.mall.groceries, barber: C.PLACES_CFG.mall.barber, ticket: C.PLACES_CFG.cinema.ticket, movies: C.PLACES_CFG.cinema.movies },
  cafe: { browse: C.PLACES_CFG.cafe.browse, gig: C.PLACES_CFG.cafe.gig },
  courses: C.PLACES_CFG.cafe.courses.map(([id, name, cost, hours, skills, unlocks]) => ({ id, name, cost, hours, skills: Object.entries(skills).map(([skill, points]) => ({ skill, points })), unlocks })),
  football: { wager: C.PLACES_CFG.football.wager, tiers: C.PLACES_CFG.football.tiers, prizes: C.PLACES_CFG.football.prizes },
  raceWager: 20000,
  school: { levyHelp: C.PLACES_CFG.school.levyHelp, eveningClass: C.PLACES_CFG.school.eveningClass, eveningSkill: Object.entries(C.PLACES_CFG.school.eveningSkill).map(([skill, points]) => ({ skill, points })), enrollment: C.PLACES_CFG.school.yabaTech.enrollment, semester: C.PLACES_CFG.school.yabaTech.semester, semesters: C.PLACES_CFG.school.yabaTech.semesters, duration: C.PLACES_CFG.school.yabaTech.duration, stamina: C.PLACES_CFG.school.yabaTech.stamina },
  weather: { rainChance: C.WEATHER.rainChance, rainMinMinutes: C.WEATHER.rainMinutes[0], rainMaxMinutes: C.WEATHER.rainMinutes[1] },
  animals: L.ANIMALS.map(a => ({ kind: a.kind, x: a.x, z: a.z })),
  petPrice: C.PRICES.pet, hookupPrice: C.PRICES.hookup,
  serviceNpcs: L.SERVICE_NPCS.map(n => ({ x: n.x, z: n.z, u: n.u, color: '#' + (L.UNIFORMS[n.u] || 0x888888).toString(16).padStart(6, '0') })),
  nightlife: L.NIGHTLIFE_NPCS.map(n => ({ x: n.x, z: n.z, name: n.name })),
  upgrades: C.UPGRADES.map(([id, name, price, desc]) => ({ id, name, price, desc })),
  liveries: V.LIVERIES.map(c => '#' + c.toString(16).padStart(6, '0')),
  slogans: V.SLOGANS,
  staffNames: B.STAFF_NAMES, staffCost: C.BIZ.staffCost, staffBonus: C.BIZ.staffBonus, maxStaff: C.BIZ.maxStaff,
  rivalName: B.RIVAL.name, rivalAfter: B.RIVAL.after, rivalPenalty: B.RIVAL.penalty, tenantShare: C.RENT.tenantShare,
  // Family (src/data/family.js): members, requests, spots, schedules, relationship labels
  family: F.FAMILY.map(f => ({ id: f.id, name: f.name, role: f.role, color: f.c, line: f.line, offsetX: f.offset?.x || 0, offsetZ: f.offset?.z || 0,
    outfit: f.look?.outfit ?? 0, fabric: f.look?.shirt ?? 0, pants: f.look?.pants ?? 0, skin: f.look?.skin ?? 2, hair: f.look?.hair ?? 0, bodyType: f.look?.bodyType ?? 1 })),
  familyRequests: F.FAMILY_REQUESTS.map(r => ({ id: r.id, who: r.who, title: r.title, blurb: r.blurb, kind: r.kind, amount: r.amount || 0, item: r.item || '', need: r.need, threshold: r.threshold, restore: r.restore, msg: r.msg, done: r.done, xp: r.xp, repSocial: r.rep?.social || 0 })),
  familySpots: Object.entries(F.FAMILY_SPOTS).map(([id, p]) => ({ id, x: p.x, z: p.z })),
  familySchedules: Object.entries(F.FAMILY_SCHEDULES).flatMap(([who, plan]) => plan.map(w => ({ who, from: w.from, to: w.to, spot: w.spot, label: w.label }))),
  relationshipLevels: F.RELATIONSHIP_LEVELS.map(l => ({ min: l.min, label: l.label })),
  outfits: Ch.LOOK.outfit, hairStyles: Ch.LOOK.hair, faces: Ch.LOOK.face, bodyTypes: Ch.LOOK.bodyType, accessories: Ch.LOOK.accessory, facialHair: Ch.LOOK.facialHair, hairColors: Ch.LOOK.hairColor,
  waters: L.WATERS.map(waterRect),
  tolls: L.TOLLS.map(t => ({ id: t.id, name: t.name, axis: t.axis, k: t.k, at: t.at, fee: t.fee })),
  footbridges: L.FOOTBRIDGES.map(f => ({ axis: f.axis, k: f.k, at: f.at, name: '' })),
  uTurns: L.U_TURNS.map(u => ({ axis: u.axis, k: u.k, at: u.at, name: u.name || '' })),
  kiosks: L.KIOSKS.map(point),
  vendors: L.VENDORS.map(point),
  jobs: J.JOBS.map(j => ({
    id: j.id, title: j.title, where: j.where, at: j.at, by: j.by || '', skill: j.skill || 'business', needCourse: j.needCourse || '',
    pay: j.pay, xp: j.xp, min: j.min || 0, dur: j.dur, night: !!j.night, far: !!j.far,
  })),
  // Contacts who stand in the world (they have a place). The first entry wins when an id repeats.
  contacts: Ch.CONTACTS.filter((c, i, all) => c.at && all.findIndex(o => o.id === c.id) === i)
    .map(c => ({
      id: c.id, name: c.name, role: c.role || '', at: c.at, color: c.c || '#ffc52f', line: c.line || '', offsetX: c.offset?.x || 0, offsetZ: c.offset?.z || 0,
      runs: (c.runs || []).map(r => ({ text: r.text, dest: r.dest, item: r.item, label: r.label, rep: r.rep || 'business', minutes: r.minutes, reward: r.reward, heat: r.heat || 0 })),
    })),
  items: Object.entries(It.ITEMS).map(([id, i]) => ({ id, name: i.name, desc: i.desc || '' })),
  allContacts: Ch.CONTACTS.filter((c, i, all) => all.findIndex(o => o.id === c.id) === i).map(c => ({ id: c.id, name: c.name })),
  vehicleClasses: Object.entries(V.VEH).map(([id, v]) => ({ id, name: v.name, len: v.len, wid: v.wid, max: v.max, boost: v.boost, accel: v.accel, commercial: !!v.commercial, fare: v.fare || 0 })),
  fabrics: Ch.FABRICS.map(f => ({ name: f.name, baseColor: f.base, accent: f.accent, pattern: f.pattern })),
  skins: Ch.LOOK.skin, pants: Ch.LOOK.pants,
  levels: C.LEVELS.map(([level, title]) => ({ level, title })),
  unlocks: Object.entries(C.UNLOCKS).map(([level, text]) => ({ level: Number(level), text })),
  cells: [
    ...[[L.VI_CELLS, 'vi'], [L.LEKKI_CELLS, 'lekki'], [L.YABA_CELLS, 'yaba'], [L.EBUTE_CELLS, 'ebute'], [L.ISLAND_CELLS, 'island']]
      .flatMap(([cells, style]) => cells.map(([x, z]) => ({ style, x, z }))),
    ...(L.AREA_CELLS || []).map(c => ({ style: c.style || 'mainland', x: c.x, z: c.z })),
  ],
  states: St.NIGERIA_STATES.map(s => ({
    id: s.id, name: s.name, capital: s.capital, zone: s.zone, slogan: s.slogan,
    corridor: s.corridor, distanceKm: s.distanceKm, fare: s.fare, status: s.status,
  })),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(world));

const manifest = {
  version: C.GAME.version,
  chunkSizeMeters: 500,
  activeRadiusChunks: 3,
  rebaseThresholdMeters: 4000,
  states: [
    { id: 'lagos', name: 'Lagos', biome: 'coastal', bounds: { x: [-1050, 1750], z: [-1550, 410] }, spawn: L.META.spawn, airports: ['ikeja-airport', 'lekki-epe-airport'], railStations: ['marina-rail', 'theatre-rail', 'ebute-rail'], commodityMultipliers: { produce: 1.0, electronics: 1.25, fuel: 0.85, propertyYield: 1.3 } },
    { id: 'ogun', name: 'Ogun', biome: 'southwest', bounds: SMap.STATE_MAPS.ogun.META.bounds, spawn: SMap.STATE_MAPS.ogun.META.spawn, airports: [], railStations: ['abeokuta-rail'], commodityMultipliers: { produce: 1.15, electronics: 1.1, fuel: 1.0, propertyYield: 1.05 } },
    { id: 'oyo', name: 'Oyo (Ibadan)', biome: 'southwest', bounds: SMap.STATE_MAPS.oyo.META.bounds, spawn: SMap.STATE_MAPS.oyo.META.spawn, airports: [], railStations: ['ibadan-rail'], commodityMultipliers: { produce: 1.3, electronics: 1.05, fuel: 1.0, propertyYield: 1.1 } },
    { id: 'fct', name: 'FCT Abuja', biome: 'abuja', bounds: SMap.STATE_MAPS.fct.META.bounds, spawn: SMap.STATE_MAPS.fct.META.spawn, airports: ['abuja-airport'], railStations: ['abuja-rail'], commodityMultipliers: { produce: 1.1, electronics: 1.15, fuel: 1.0, propertyYield: 1.45 } },
    { id: 'rivers', name: 'Rivers · Delta · Edo', biome: 'niger_delta', bounds: SMap.STATE_MAPS.rivers.META.bounds, spawn: SMap.STATE_MAPS.rivers.META.spawn, airports: ['ph-airport'], railStations: [], commodityMultipliers: { produce: 1.05, electronics: 1.1, fuel: 0.65, propertyYield: 1.25 } },
    { id: 'anambra', name: 'Anambra · Enugu · Abia', biome: 'southeast', bounds: SMap.STATE_MAPS.anambra.META.bounds, spawn: SMap.STATE_MAPS.anambra.META.spawn, airports: ['enugu-anambra-airport'], railStations: [], commodityMultipliers: { produce: 1.1, electronics: 1.35, fuel: 1.0, propertyYield: 1.2 } },
    { id: 'kano', name: 'Kano · Kaduna · Borno', biome: 'sahel', bounds: SMap.STATE_MAPS.kano.META.bounds, spawn: SMap.STATE_MAPS.kano.META.spawn, airports: ['kano-airport'], railStations: ['kano-rail'], commodityMultipliers: { produce: 1.4, electronics: 1.15, fuel: 1.05, propertyYield: 1.1 } },
  ],
};
writeFileSync(manifestOut, JSON.stringify(manifest, null, 2));
const n = k => world[k].length;
console.log(`exported ${out} & ${manifestOut}`);
console.log(`businesses ${n('businesses')}`);
console.log(`jobs ${n('jobs')} · contacts ${n('contacts')} · vehicle classes ${n('vehicleClasses')} · fabrics ${n('fabrics')}`);
console.log(`roads ${n('roads')} · segments ${n('segments')} · bridges ${n('bridges')} · junctions ${n('junctions')} · landmarks ${n('landmarks')} · bus stops ${n('busStops')} · properties ${n('properties')} · waters ${n('waters')} · cells ${n('cells')} · regions ${n('regions')}`);
