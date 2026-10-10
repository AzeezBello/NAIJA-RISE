import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'ajegunle',
  name: 'Ajegunle · AJ City',
  bounds: { x: [-165, -60], z: [40, 150] },
  spawn: { x: -108, z: 112 },
  regions: [
    { id: 'ajegunle', name: 'Ajegunle · AJ City', x: [-165, -60], z: [40, 150] },
  ],
  roads: {
    h: [
      { k: 64, from: -165, to: -60, name: 'Ajegunle Main Street', width: 16, class: 'commercial' },
      { k: 112, from: -165, to: -60, name: 'Boundary Road · AJ City', width: 18, class: 'main' },
    ],
    v: [
      { k: -132, from: 40, to: 150, name: 'Wilmer Crescent', width: 14, class: 'residential' },
      { k: -84, from: 40, to: 150, name: 'Tolu Road', width: 16, class: 'commercial' },
    ],
  },
  landmarks: [
    { id: 'ajegunle', name: 'Ajegunle · AJ City', short: 'AJ CITY', x: -108, z: 96, c: '#5c4a3a', sign: '#ffc52f', h: 4, kind: 'settlement', dense: true, region: 'ajegunle' },
    { id: 'ajpitch', name: 'AJ City Street Pitch', short: 'AJ PITCH', x: -102, z: 92, c: '#2f7d49', sign: '#ffffff', kind: 'pitch', region: 'ajegunle' },
  ],
  busStops: [
    { id: 'ajstop', name: 'Ajegunle Bus Stop', short: 'AJ B/S', x: -100, z: 88, agberos: 2 },
    { id: 'tolu-road-stop', name: 'Tolu Road Bus Stop', short: 'TOLU RD', x: -84, z: 128, agberos: 1 },
  ],
});
