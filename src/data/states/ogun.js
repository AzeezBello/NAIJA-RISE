import { createArea } from '../districts/area.js';

export const STATE_AREA = createArea({
  id: 'ogun',
  name: 'Ogun · Gateway Corridor',
  state: 'Ogun',
  bounds: { x: [-420, 420], z: [-1980, -1550] },
  spawn: { x: 0, z: -1680 },
  regions: [
    { id: 'mowe-ibafo', name: 'Mowe · Ibafo · Redemption Camp', x: [-180, 180], z: [-1780, -1550] },
    { id: 'sagamu-interchange', name: 'Sagamu Interchange', x: [180, 420], z: [-1980, -1550] },
    { id: 'ota-agbara', name: 'Ota · Agbara Industrial Estate', x: [-420, -180], z: [-1780, -1550] },
    { id: 'abeokuta', name: 'Abeokuta · Olumo Rock & Oke-Mosan', x: [-420, 180], z: [-1980, -1780] },
  ],
  roads: {
    h: [
      { k: -1680, from: -400, to: 2020, name: 'Ota–Sagamu–Benin Link Expressway (A121)', width: 28, class: 'highway' },
      { k: -1880, from: -400, to: 400, name: 'Abeokuta–Sagamu Expressway', width: 30, class: 'expressway' },
    ],
    v: [
      { k: 0, from: -1980, to: -1520, name: 'Lagos–Ibadan Expressway (E1 · Ogun Sector)', width: 36, class: 'expressway' },
      { k: -300, from: -1950, to: -1380, name: 'Lagos–Abeokuta Expressway', width: 28, class: 'highway' },
    ],
  },
  landmarks: [
    { id: 'redemption-camp', name: 'Redemption City Mega Auditorium · Mowe', short: 'REDEMPTION CAMP', x: 75, z: -1620, c: '#3d5a80', sign: '#ffffff', h: 12, kind: 'worship', big: true, region: 'mowe-ibafo' },
    { id: 'sagamu-toll', name: 'Sagamu FRSC & Customs Highway Interchange', short: 'SAGAMU GATE', x: 240, z: -1735, c: '#3b5323', sign: '#ffffff', h: 7, kind: 'checkpoint', region: 'sagamu-interchange' },
    { id: 'ota-industrial', name: 'Ota & Agbara Industrial Manufacturing Hub', short: 'OTA FACTORY', x: -230, z: -1620, c: '#5c6770', sign: '#ffc52f', h: 12, kind: 'warehouse', big: true, region: 'ota-agbara' },
    { id: 'olumo-rock', name: 'Olumo Rock Tourist Complex · Abeokuta', short: 'OLUMO ROCK', x: -220, z: -1825, c: '#7a6855', sign: '#ffc52f', h: 18, kind: 'museum', big: true, region: 'abeokuta' },
    { id: 'oke-mosan', name: 'Ogun State Secretariat · Oke-Mosan', short: 'OKE MOSAN', x: -100, z: -1825, c: '#486b5a', sign: '#ffffff', h: 13, kind: 'office', big: true, region: 'abeokuta' },
    { id: 'abeokuta-rail', name: 'Abeokuta Laderin NRC Standard-Gauge Station', short: 'ABEOKUTA RAIL', x: -355, z: -1825, c: '#1559b8', sign: '#ffffff', h: 9, kind: 'rail', big: true, region: 'abeokuta' },
  ],
  busStops: [
    { id: 'mowe-bus', name: 'Mowe–Ibafo Bus Terminal', short: 'MOWE', x: 40, z: -1715, agberos: 2 },
    { id: 'panseke-bus', name: 'Panseke Motor Park · Abeokuta', short: 'PANSEKE', x: -180, z: -1915, agberos: 2 },
  ],
  cells: [
    [-160, -1620, 'festac'],
    [160, -1825, 'festac'],
  ],
});
