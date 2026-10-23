import { createArea } from '../districts/area.js';

export const STATE_AREA = createArea({
  id: 'anambra',
  name: 'Anambra, Enugu & Abia · Eastern Commercial & Industrial Belt',
  state: 'Anambra',
  bounds: { x: [1750, 2320], z: [-1680, -750] },
  spawn: { x: 1980, z: -1140 },
  regions: [
    { id: 'onitsha-bridgehead', name: 'Onitsha Main Market & Niger Bridgehead', x: [1750, 2040], z: [-1250, -750] },
    { id: 'nnewi-industrial', name: 'Nnewi Automotive & Awka Industrial Cluster', x: [2040, 2320], z: [-1250, -950] },
    { id: 'aba-ariaria', name: 'Ariaria International Market · Aba', x: [2040, 2320], z: [-950, -750] },
    { id: 'enugu-coal-city', name: 'Independence Layout, Ogui & New Haven · Enugu', x: [1750, 2320], z: [-1680, -1250] },
  ],
  roads: {
    h: [
      { k: -1460, from: 1760, to: 2280, name: 'Onitsha–Awka–Enugu Expressway (A232)', width: 32, class: 'expressway' },
      { k: -1140, from: 1760, to: 2280, name: 'Second Niger Bridge–Onitsha–Nnewi Highway', width: 28, class: 'commercial' },
      { k: -860, from: 1760, to: 2280, name: 'Nnewi–Aba–Ariaria Industrial Road', width: 26, class: 'main' },
    ],
    v: [
      { k: 1980, from: -1680, to: -750, name: 'River Niger Bridgehead–Enugu Trunk Corridor', width: 30, class: 'highway' },
    ],
  },
  landmarks: [
    { id: 'niger-bridge-gate', name: 'River Niger Bridgehead FRSC & Customs Gate', short: 'NIGER BRIDGE', x: 1855, z: -1055, c: '#3b5323', sign: '#ffffff', h: 8, kind: 'checkpoint', region: 'onitsha-bridgehead' },
    { id: 'onitsha-main-mkt', name: 'Onitsha Main Market · West Africa Trade Hub', short: 'ONITSHA MKT', x: 1855, z: -1180, c: '#8a4b29', sign: '#ffc52f', h: 12, kind: 'market', big: true, region: 'onitsha-bridgehead' },
    { id: 'nnewi-auto-plant', name: 'Nnewi Indigenous Vehicle Assembly Plant', short: 'NNEWI MOTORS', x: 2140, z: -1180, c: '#2b4c7e', sign: '#ffffff', h: 14, kind: 'warehouse', big: true, region: 'nnewi-industrial' },
    { id: 'ariaria-market', name: 'Ariaria International Market & Shoe Cluster · Aba', short: 'ARIARIA MKT', x: 2140, z: -915, c: '#7a5230', sign: '#ffc52f', h: 10, kind: 'market', big: true, region: 'aba-ariaria' },
    { id: 'enugu-lion-building', name: 'Independence Layout & Coal City Hub · Enugu', short: 'ENUGU HUB', x: 1855, z: -1525, c: '#3d5a80', sign: '#ffffff', h: 14, kind: 'office', big: true, region: 'enugu-coal-city' },
    { id: 'enugu-anambra-airport', name: 'Akanu Ibiam & Anambra International Airport', short: 'EAST AIRPORT', x: 2140, z: -1525, c: '#29527a', sign: '#00e5ff', h: 11, kind: 'airport', big: true, region: 'enugu-coal-city' },
  ],
  busStops: [
    { id: 'upper-iweka-bus', name: 'Upper Iweka Motor Park · Onitsha', short: 'UPPER IWEKA', x: 1920, z: -1155, agberos: 3 },
    { id: 'ogui-new-haven-bus', name: 'Ogui Road · New Haven Terminal, Enugu', short: 'OGUI ENUGU', x: 2045, z: -1425, agberos: 2 },
  ],
  cells: [
    [2240, -1180, 'ladipo'],
    [1855, -1380, 'festac'],
  ],
});
