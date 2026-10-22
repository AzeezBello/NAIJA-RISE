import { createArea } from '../districts/area.js';

export const STATE_AREA = createArea({
  id: 'oyo',
  name: 'Oyo · Ibadan Metropolitan Grid',
  state: 'Oyo',
  bounds: { x: [-420, 420], z: [-2420, -1980] },
  spawn: { x: 0, z: -2160 },
  regions: [
    { id: 'ibadan-challenge', name: 'Challenge · Ring Road, Ibadan', x: [-240, 120], z: [-2160, -1980] },
    { id: 'ibadan-dugbe', name: 'Dugbe & Cocoa House CBD · Ibadan', x: [-420, 120], z: [-2300, -2160] },
    { id: 'ibadan-bodija', name: 'Bodija Market & UI Agbowo · Ibadan', x: [-420, 420], z: [-2420, -2300] },
    { id: 'ibadan-iwo-road', name: 'Iwo Road & Mapo Hall · Ibadan', x: [120, 420], z: [-2300, -1980] },
  ],
  roads: {
    h: [
      { k: -2080, from: -400, to: 400, name: 'MKO Abiola Way · Ring Road Ibadan', width: 28, class: 'highway' },
      { k: -2240, from: -400, to: 400, name: 'Dugbe–Mokola–Iwo Road Corridor', width: 24, class: 'commercial' },
      { k: -2360, from: -400, to: 400, name: 'UI–Bodija–Ojoo Road', width: 24, class: 'main' },
    ],
    v: [
      { k: 0, from: -2420, to: -1980, name: 'Lagos–Ibadan–Oyo Expressway (A1)', width: 36, class: 'expressway' },
    ],
  },
  landmarks: [
    { id: 'cocoa-house', name: 'Cocoa House · Dugbe, Ibadan', short: 'COCOA HOUSE', x: -110, z: -2185, c: '#8c5a32', sign: '#ffd700', h: 26, kind: 'office', big: true, region: 'ibadan-dugbe' },
    { id: 'amala-skye-dugbe', name: 'Amala Skye & Gbegiri Buka · Dugbe', short: 'AMALA SKYE', x: -230, z: -2185, c: '#a8432b', sign: '#ffc52f', h: 6, kind: 'restaurant', region: 'ibadan-dugbe' },
    { id: 'mapo-hall', name: 'Mapo Colonial City Hall · Bere, Ibadan', short: 'MAPO HALL', x: 170, z: -2185, c: '#d8cfb8', sign: '#141414', h: 14, kind: 'museum', big: true, region: 'ibadan-iwo-road' },
    { id: 'bodija-market', name: 'Bodija International Foodstuff Market', short: 'BODIJA MKT', x: 110, z: -2305, c: '#7a5230', sign: '#ffc52f', h: 8, kind: 'market', big: true, region: 'ibadan-bodija' },
    { id: 'ui-gate', name: 'University of Ibadan Main Gate · Agbowo', short: 'UI IBADAN', x: -110, z: -2305, c: '#1e3a5f', sign: '#ffffff', h: 10, kind: 'school', big: true, region: 'ibadan-bodija' },
    { id: 'ibadan-rail', name: 'Obafemi Awolowo NRC Station · Moniya, Ibadan', short: 'IBADAN RAIL', x: 240, z: -2305, c: '#1559b8', sign: '#ffffff', h: 9, kind: 'rail', big: true, region: 'ibadan-bodija' },
  ],
  busStops: [
    { id: 'challenge-bus', name: 'Challenge Motor Park · Ibadan', short: 'CHALLENGE', x: -60, z: -2115, agberos: 2 },
    { id: 'iwo-road-bus', name: 'Iwo Road Interstate Mega Terminal · Ibadan', short: 'IWO ROAD', x: 260, z: -2205, agberos: 3 },
  ],
  cells: [
    [-310, -2140, 'yaba'],
    [290, -2140, 'yaba'],
  ],
});
