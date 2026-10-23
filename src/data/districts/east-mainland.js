import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'east-mainland',
  name: 'East Mainland',
  bounds: { x: [100, 340], z: [-390, -250] },
  spawn: { x: 220, z: -320 },
  regions: [
    { id: 'gbagada', name: 'Gbagada', x: [100, 180], z: [-390, -250] },
    { id: 'bariga', name: 'Bariga', x: [180, 260], z: [-390, -250] },
    { id: 'shomolu', name: 'Shomolu', x: [260, 340], z: [-390, -250] },
  ],
  roads: {
    h: [
      { k: -380, from: 0, to: 360, name: 'Gbagada Link Road', width: 16, class: 'main' },
      { k: -280, from: -740, to: 360, name: 'Shomolu · Mushin · Ladipo Road', width: 18, class: 'commercial' },
    ],
    v: [
      { k: 150, from: -380, to: -280, name: 'Gbagada Express Road', width: 18, class: 'main' },
      { k: 210, from: -380, to: -280, name: 'Bariga Link Road', width: 14, class: 'residential' },
      { k: 290, from: -380, to: -280, name: 'Shomolu Road', width: 16, class: 'commercial' },
    ],
  },
  landmarks: [
    { id: 'gbagada', name: 'Gbagada', short: 'GBAGADA', x: 132, z: -304, c: '#8a7d6a', sign: '#ffffff', h: 7, kind: 'landmark', region: 'gbagada' },
    { id: 'bariga', name: 'Bariga', short: 'BARIGA', x: 234, z: -304, c: '#7a6a55', sign: '#ffc52f', h: 6, kind: 'landmark', region: 'bariga' },
    { id: 'shomolu', name: 'Shomolu', short: 'SHOMOLU', x: 316, z: -304, c: '#6b5344', sign: '#ffffff', h: 6, kind: 'landmark', region: 'shomolu' },
  ],
  busStops: [
    { id: 'gbagada-bus', name: 'Gbagada Bus Stop', short: 'GBAGADA', x: 132, z: -348, agberos: 1 },
    { id: 'bariga-bus', name: 'Bariga Bus Stop', short: 'BARIGA', x: 228, z: -348, agberos: 2 },
    { id: 'shomolu-bus', name: 'Shomolu Bus Stop', short: 'SHOMOLU', x: 312, z: -348, agberos: 2 },
  ],
});
