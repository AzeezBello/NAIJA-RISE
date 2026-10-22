import { createArea } from '../districts/area.js';

export const STATE_AREA = createArea({
  id: 'fct',
  name: 'FCT Abuja · Federal Capital Territory',
  state: 'FCT Abuja',
  bounds: { x: [-480, 480], z: [-2900, -2420] },
  spawn: { x: 0, z: -2600 },
  regions: [
    { id: 'garki-jabi', name: 'Garki, Jabi Lake & Airport Road · Abuja', x: [-480, -80], z: [-2660, -2420] },
    { id: 'abuja-cbd', name: 'Central Business District · Abuja', x: [-80, 200], z: [-2660, -2420] },
    { id: 'three-arms', name: 'Three Arms Zone · Aso Rock, Abuja', x: [200, 480], z: [-2660, -2420] },
    { id: 'wuse-maitama', name: 'Wuse, Maitama & Asokoro · Abuja', x: [-480, 480], z: [-2900, -2660] },
  ],
  roads: {
    h: [
      { k: -2540, from: -460, to: 460, name: 'Shehu Shagari Way · Three Arms Boulevard', width: 34, class: 'expressway' },
      { k: -2740, from: -460, to: 460, name: 'Aminu Kano Crescent · Wuse II & Maitama', width: 28, class: 'commercial' },
    ],
    v: [
      { k: 0, from: -2900, to: -2420, name: 'Abuja Airport–Three Arms–Kaduna Expressway (A2)', width: 36, class: 'expressway' },
    ],
  },
  landmarks: [
    { id: 'abuja-zuba-gate', name: 'Zuba A1/A2 Federal Highway Military & FRSC Gate', short: 'ZUBA GATE', x: 55, z: -2470, c: '#3b5323', sign: '#ffffff', h: 7, kind: 'checkpoint', region: 'abuja-cbd' },
    { id: 'abuja-airport', name: 'Nnamdi Azikiwe International Airport · Abuja', short: 'ABUJA AIRPORT', x: -350, z: -2485, c: '#29527a', sign: '#00e5ff', h: 12, kind: 'airport', big: true, region: 'garki-jabi' },
    { id: 'abuja-rail', name: 'Idu NRC Standard-Gauge Rail Terminal · Abuja', short: 'ABUJA RAIL', x: -220, z: -2485, c: '#1559b8', sign: '#ffffff', h: 9, kind: 'rail', big: true, region: 'garki-jabi' },
    { id: 'jabi-lake-mall', name: 'Jabi Lake Waterfront Mall · Abuja', short: 'JABI MALL', x: -350, z: -2605, c: '#2b5876', sign: '#ffc52f', h: 11, kind: 'mall', big: true, region: 'garki-jabi' },
    { id: 'efcc-hq-abuja', name: 'EFCC National Headquarters · Jabi, Abuja', short: 'EFCC HQ', x: -220, z: -2605, c: '#7f1d1d', sign: '#ffffff', h: 16, kind: 'efcc', big: true, region: 'garki-jabi' },
    { id: 'cbn-hq-abuja', name: 'Central Bank of Nigeria Headquarters · Abuja CBD', short: 'CBN HQ', x: -95, z: -2605, c: '#0f5132', sign: '#ffd700', h: 28, kind: 'cbn', big: true, region: 'abuja-cbd' },
    { id: 'nnpc-towers', name: 'NNPC Towers · Abuja Central Business District', short: 'NNPC TOWERS', x: 95, z: -2605, c: '#1b6ca8', sign: '#ffffff', h: 26, kind: 'warehouse', big: true, region: 'abuja-cbd' },
    { id: 'nass-complex', name: 'National Assembly Complex (Senate & House)', short: 'NASS ABUJA', x: 225, z: -2605, c: '#2e6b4e', sign: '#ffffff', h: 20, kind: 'office', big: true, region: 'three-arms' },
    { id: 'aso-rock-villa', name: 'Aso Rock Presidential Villa · Three Arms Zone', short: 'ASO VILLA', x: 355, z: -2605, c: '#1f4e3d', sign: '#ffd700', h: 18, kind: 'office', big: true, region: 'three-arms' },
    { id: 'wuse-market', name: 'Wuse Main Market · Abuja', short: 'WUSE MKT', x: -140, z: -2805, c: '#7a5230', sign: '#ffc52f', h: 9, kind: 'market', big: true, region: 'wuse-maitama' },
    { id: 'maitama-transcorp', name: 'Transcorp Hilton & Maitama Diplomatic Suites', short: 'MAITAMA HILTON', x: 180, z: -2805, c: '#d8cfb8', sign: '#ffd700', h: 22, kind: 'hotel', cost: 35000, big: true, region: 'wuse-maitama' },
  ],
  busStops: [
    { id: 'utako-bus', name: 'Utako Interstate Luxury Bus Terminal · Abuja', short: 'UTAKO', x: -130, z: -2505, agberos: 1 },
    { id: 'nyanya-kubwa-bus', name: 'Nyanya–Kubwa Commuter Terminal · Abuja', short: 'NYANYA', x: 310, z: -2505, agberos: 2 },
  ],
  cells: [
    [-310, -2805, 'magodo'],
    [320, -2805, 'magodo'],
  ],
});
