import { createArea } from '../districts/area.js';

export const STATE_AREA = createArea({
  id: 'kano',
  name: 'Kano, Kaduna & Borno · Northern Trade & Frontier Command',
  state: 'Kano',
  bounds: { x: [-480, 480], z: [-3380, -2900] },
  spawn: { x: 0, z: -3020 },
  regions: [
    { id: 'dawanau-kaduna', name: 'Dawanau Grains Hub, Kaduna Kakuri & Zaria', x: [-480, 0], z: [-3140, -2900] },
    { id: 'sabon-gari-kano', name: 'Sabon Gari, Fagge, Bompai & Wapa BDC FX', x: [0, 480], z: [-3140, -2900] },
    { id: 'kano-ancient-city', name: 'Kano Ancient City · Kurmi & Emir’s Palace', x: [-480, 80], z: [-3380, -3140] },
    { id: 'maiduguri-frontier', name: 'Maiduguri Monday Market & Lake Chad JTF Base', x: [80, 480], z: [-3380, -3140] },
  ],
  roads: {
    h: [
      { k: -3020, from: -460, to: 460, name: 'Kaduna–Zaria–Sabon Gari Trunk Road', width: 28, class: 'highway' },
      { k: -3220, from: -460, to: 460, name: 'Kano–Maiduguri Frontier Expressway (A2/A3)', width: 30, class: 'expressway' },
    ],
    v: [
      { k: 0, from: -3350, to: -2900, name: 'Abuja–Kaduna–Kano Expressway (A2)', width: 36, class: 'expressway' },
    ],
  },
  landmarks: [
    { id: 'kano-zaria-gate', name: 'Zaria–Kano A2 Highway Customs & JTF Checkpoint', short: 'ZARIA GATE', x: 55, z: -2960, c: '#3b5323', sign: '#ffffff', h: 7, kind: 'checkpoint', region: 'sabon-gari-kano' },
    { id: 'kaduna-kakuri-works', name: 'Kakuri Industrial & Textile Works · Kaduna', short: 'KAKURI WORKS', x: -240, z: -2965, c: '#5c6770', sign: '#ffc52f', h: 12, kind: 'warehouse', big: true, region: 'dawanau-kaduna' },
    { id: 'kano-rail', name: 'Kaduna–Kano NRC Standard-Gauge Rail Terminal', short: 'KANO RAIL', x: -115, z: -2965, c: '#1559b8', sign: '#ffffff', h: 9, kind: 'rail', big: true, region: 'dawanau-kaduna' },
    { id: 'kano-airport', name: 'Mallam Aminu Kano International Airport', short: 'KANO AIRPORT', x: 240, z: -2965, c: '#29527a', sign: '#00e5ff', h: 11, kind: 'airport', big: true, region: 'sabon-gari-kano' },
    { id: 'dawanau-grains', name: 'Dawanau International Grains Market · Kano', short: 'DAWANAU MKT', x: -240, z: -3085, c: '#9e7b4f', sign: '#ffffff', h: 9, kind: 'market', big: true, region: 'dawanau-kaduna' },
    { id: 'kurmi-market', name: 'Kurmi Ancient Market & Wapa BDC FX · Kano', short: 'KURMI MKT', x: -240, z: -3285, c: '#b57c4a', sign: '#ffd700', h: 10, kind: 'market', big: true, region: 'kano-ancient-city' },
    { id: 'emirs-palace-kano', name: 'Gidan Rumfa · Emir’s Palace & Durbar Grounds', short: 'EMIR PALACE', x: -100, z: -3285, c: '#c88a4b', sign: '#ffd700', h: 14, kind: 'museum', big: true, region: 'kano-ancient-city' },
    { id: 'maiduguri-monday-mkt', name: 'Monday Market · Maiduguri, Borno', short: 'MONDAY MKT', x: 180, z: -3285, c: '#8a5a36', sign: '#ffc52f', h: 9, kind: 'market', big: true, region: 'maiduguri-frontier' },
    { id: 'jtf-fob-north', name: 'Giwa Barracks & Lake Chad JTF Forward Base', short: 'JTF COMMAND', x: 340, z: -3285, c: '#3b5323', sign: '#ffffff', h: 11, kind: 'army', big: true, region: 'maiduguri-frontier' },
  ],
  busStops: [
    { id: 'barnawa-zaria-bus', name: 'Barnawa · Zaria Highway Terminal, Kaduna', short: 'KADUNA ZARIA', x: -175, z: -3055, agberos: 2 },
    { id: 'sabon-gari-park', name: 'Sabon Gari Luxury Motor Park · Kano', short: 'SABON GARI', x: 150, z: -3055, agberos: 2 },
  ],
  cells: [
    [-350, -3285, 'festac'],
    [280, -3085, 'festac'],
  ],
});
