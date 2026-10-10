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
      { k: -380, from: 100, to: 340, name: 'Gbagada Link Road', width: 16, class: 'main' },
      { k: -350, from: 100, to: 340, name: 'Bariga Road', width: 14, class: 'commercial' },
      { k: -280, from: 100, to: 340, name: 'Shomolu Road', width: 14, class: 'commercial' },
    ],
    v: [
      { k: 150, from: -390, to: -250, name: 'Gbagada Express Road', width: 18, class: 'main' },
      { k: 210, from: -390, to: -250, name: 'Bariga Link Road', width: 14, class: 'residential' },
      { k: 290, from: -390, to: -250, name: 'Shomolu Road', width: 16, class: 'commercial' },
    ],
  },
  landmarks: [
    { id: 'gbagada', name: 'Gbagada', short: 'GBAGADA', x: 140, z: -320, c: '#8a7d6a', sign: '#ffffff', h: 7, kind: 'landmark', region: 'gbagada' },
    { id: 'bariga', name: 'Bariga', short: 'BARIGA', x: 220, z: -320, c: '#7a6a55', sign: '#ffc52f', h: 6, kind: 'landmark', region: 'bariga' },
    { id: 'shomolu', name: 'Shomolu', short: 'SHOMOLU', x: 300, z: -320, c: '#6b5344', sign: '#ffffff', h: 6, kind: 'landmark', region: 'shomolu' },
  ],
  busStops: [
    { id: 'gbagada-bus', name: 'Gbagada Bus Stop', short: 'GBAGADA', x: 140, z: -350, agberos: 1 },
    { id: 'bariga-bus', name: 'Bariga Bus Stop', short: 'BARIGA', x: 220, z: -350, agberos: 2 },
    { id: 'shomolu-bus', name: 'Shomolu Bus Stop', short: 'SHOMOLU', x: 300, z: -350, agberos: 2 },
  ],
});
