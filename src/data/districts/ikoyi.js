import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'ikoyi',
  name: 'Ikoyi · Banana Island',
  bounds: { x: [330, 560], z: [80, 250] },
  spawn: { x: 440, z: 150 },
  roads: {
    h: [
      { k: 78, from: 440, to: 550, name: 'Awolowo Road · Banana Island Link', width: 18, class: 'main' },
      { k: 96, from: 488, to: 550, name: 'Banana Island North Causeway', width: 16, class: 'residential' },
      { k: 120, from: 488, to: 550, name: 'Banana Island Boulevard', width: 18, class: 'residential' },
      { k: 144, from: 488, to: 550, name: 'Gerrard Road · Banana Island Causeway', width: 18, class: 'commercial' },
      { k: 176, from: 488, to: 550, name: 'Ikoyi Club Link Road', width: 12, class: 'residential' },
      { k: 208, from: 340, to: 500, name: 'Bourdillon Road', width: 18, class: 'main' },
    ],
    v: [
      { k: 360, from: 80, to: 96, name: 'Kingsway Road', width: 16, class: 'commercial' },
      { k: 440, from: 80, to: 230, name: 'Awolowo Road', width: 20, class: 'main' },
      { k: 488, from: 78, to: 230, name: 'Gerrard Road', width: 16, class: 'residential' },
      { k: 530, from: 78, to: 176, name: 'Banana Island Ring Road', width: 16, class: 'residential' },
    ],
  },
  regions: [
    { id: 'banana-island', name: 'Banana Island · Ikoyi', x: [480, 560], z: [80, 165] },
    { id: 'ikoyi-west', name: 'Ikoyi West', x: [330, 426], z: [80, 250] },
    { id: 'ikoyi', name: 'Ikoyi', x: [426, 510], z: [80, 250] },
  ],
  landmarks: [
    { id: 'ikoyi-club', name: 'Ikoyi Club 1938', short: 'IKOYI CLUB', x: 396, z: 90, c: '#42605a', sign: '#ffffff', h: 5, kind: 'venue' },
    { id: 'ikoyi-golf', name: 'Ikoyi Golf Course', short: 'GOLF COURSE', x: 370, z: 196, c: '#39734b', sign: '#ffffff', h: 3, kind: 'landmark', big: true },
    { id: 'ikoyi-boulevard', name: 'Ikoyi Boulevard', short: 'BOULEVARD', x: 464, z: 120, c: '#8a9aa8', sign: '#ffffff', h: 16, kind: 'hotel', big: true },
    { id: 'ikoyi-market', name: 'Ikoyi Local Market', short: 'IKOYI MARKET', x: 464, z: 196, c: '#6b4737', sign: '#ffc52f', h: 5, kind: 'market' },
    { id: 'banana-island', name: 'Banana Island Waterfront Estate', short: 'BANANA ISLAND', x: 512, z: 108, c: '#f2efe9', sign: '#ffd700', h: 18, kind: 'banana', big: true, region: 'banana-island' },
    { id: 'banana-towers', name: 'Leonardo Tower · Banana Island', short: 'LEONARDO TOWER', x: 544, z: 132, c: '#7fa6c4', sign: '#ffffff', h: 28, kind: 'hotel', big: true, region: 'banana-island' },
  ],
  busStops: [
    { id: 'ikoyi-club-stop', name: 'Ikoyi Club Bus Stop', short: 'IKOYI CLUB', x: 360, z: 92, agberos: 1 },
    { id: 'ikoyi-gerrard-stop', name: 'Gerrard Road Bus Stop', short: 'GERRARD RD', x: 488, z: 160, agberos: 1 },
    { id: 'ikoyi-bourdillon-stop', name: 'Bourdillon Road Bus Stop', short: 'BOURDILLON', x: 464, z: 224, agberos: 1 },
    { id: 'banana-gate-stop', name: 'Banana Island Gate', short: 'BANANA GATE', x: 492, z: 136, agberos: 0 },
  ],
});
