import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'makoko',
  name: 'Makoko',
  bounds: { x: [250, 360], z: [-250, -65] },
  spawn: { x: 320, z: -74 },
  regions: [
    { id: 'makoko', name: 'Makoko Waterfront', x: [250, 360], z: [-250, -65] },
  ],
  roads: {
    h: [
      { k: -74, from: 250, to: 360, name: 'Makoko Shore Road', width: 12, class: 'market' },
    ],
    v: [
      { k: 340, from: -85, to: -74, name: 'Makoko Landing', width: 10, class: 'residential' },
    ],
  },
  landmarks: [
    { id: 'makoko', name: 'Makoko', short: 'MAKOKO', x: 300, z: -185, c: '#5a6e72', sign: '#f5c518', h: 3, kind: 'settlement', waterfront: true, region: 'makoko' },
  ],
  busStops: [
    { id: 'makoko-shore-stop', name: 'Makoko Shore Bus Stop', short: 'MAKOKO', x: 320, z: -74, agberos: 1 },
  ],
  water: [{ id: 'makoko-lagoon', name: 'Lagos Lagoon · Makoko', x: [250, 340], z: [-250, -85] }],
});
