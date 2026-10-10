import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'oyingbo',
  name: 'Oyingbo · Empire',
  bounds: { x: [100, 360], z: [-500, -390] },
  spawn: { x: 240, z: -440 },
  regions: [
    { id: 'oyingbo-market', name: 'Oyingbo Market', x: [260, 360], z: [-500, -390] },
    { id: 'empire', name: 'Empire', x: [100, 260], z: [-500, -390] },
  ],
  roads: {
    h: [
      { k: -430, from: 100, to: 340, name: 'Oyingbo Road', width: 18, class: 'commercial' },
      { k: -470, from: 100, to: 340, name: 'Empire Road', width: 18, class: 'main' },
    ],
    v: [
      { k: 260, from: -490, to: -400, name: 'Oyingbo Market Link', width: 12, class: 'residential' },
      { k: 200, from: -490, to: -400, name: 'Lagos Street', width: 16, class: 'commercial' },
      { k: 320, from: -490, to: -400, name: 'Oyingbo Market Road', width: 18, class: 'market' },
    ],
  },
  landmarks: [
    { id: 'oyingbo-market', name: 'Oyingbo Market', short: 'OYINGBO MARKET', x: 320, z: -450, c: '#6b4737', sign: '#ffc52f', h: 8, kind: 'market', big: true },
    { id: 'empire', name: 'Empire', short: 'EMPIRE', x: 200, z: -450, c: '#8a7d6a', sign: '#ffc52f', h: 6, kind: 'landmark' },
    { id: 'oyingbo-rail', name: 'Oyingbo Rail Terminal', short: 'OYINGBO STATION', x: 200, z: -410, c: '#49606a', sign: '#ffffff', h: 8, kind: 'garage' },
  ],
  busStops: [
    { id: 'oyingbo-bus', name: 'Oyingbo Bus Stop', short: 'OYINGBO', x: 320, z: -414, agberos: 2 },
    { id: 'empire-bus', name: 'Empire Bus Stop', short: 'EMPIRE', x: 200, z: -454, agberos: 1 },
    { id: 'oyingbo-market-bus', name: 'Oyingbo Market Bus Stop', short: 'OYINGBO MKT', x: 320, z: -434, agberos: 2 },
  ],
});
