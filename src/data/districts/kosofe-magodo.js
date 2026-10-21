import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'kosofe-magodo',
  name: 'Kosofe · Ojota · Mile 12 · Magodo GRA',
  bounds: { x: [-120, 380], z: [-1520, -980] },
  spawn: { x: 60, z: -1180 },
  regions: [
    { id: 'magodo-gra', name: 'Magodo GRA Phase 1 & 2 · Shangisha', x: [-120, 120], z: [-1520, -1220] },
    { id: 'ojota-ogudu', name: 'Ojota Interstate Park & Ogudu GRA', x: [-80, 220], z: [-1220, -980] },
    { id: 'ketu-mile12', name: 'Ketu & Mile 12 Perishable Food Market', x: [120, 380], z: [-1420, -1040] },
  ],
  roads: {
    h: [
      { k: -1120, from: -120, to: 380, name: 'Ojota–Ogudu–Oworonshoki Expressway', width: 26, class: 'highway' },
      { k: -1280, from: -120, to: 380, name: 'Ketu–Mile 12–Ikorodu Road Corridor', width: 28, class: 'highway' },
      { k: -1420, from: -120, to: 120, name: 'CMD Road · Magodo GRA Boulevard', width: 18, class: 'residential' },
    ],
    v: [
      { k: 180, from: -1520, to: -980, name: 'Ikorodu Road (Ketu–Mile 12 Axis)', width: 32, class: 'highway' },
    ],
  },
  landmarks: [
    { id: 'mile12-market', name: 'Mile 12 International Perishable Food Market', short: 'MILE 12 MKT', x: 240, z: -1260, c: '#7a5230', sign: '#ffc52f', h: 8, kind: 'market', big: true, region: 'ketu-mile12' },
    { id: 'ojota-motor-park', name: 'Ojota Chemical Market & Interstate Motor Park', short: 'OJOTA PARK', x: 40, z: -1100, c: '#5c4933', sign: '#ffffff', h: 7, kind: 'garage', big: true, region: 'ojota-ogudu' },
    { id: 'magodo-phase2-club', name: 'Magodo GRA Phase 1 & 2 Executive Clubhouse', short: 'MAGODO CLUB', x: -20, z: -1400, c: '#2f5241', sign: '#ffd700', h: 10, kind: 'venue', big: true, region: 'magodo-gra' },
    { id: 'oworonshoki-jetty', name: 'Oworonshoki Lagoon Rim Jetty · Kosofe', short: 'OWORO JETTY', x: 340, z: -1100, c: '#35546a', sign: '#3dd68c', h: 5, kind: 'waypoint', waterfront: true, region: 'ojota-ogudu' },
  ],
  busStops: [
    { id: 'ojota-bridge-bus', name: 'Ojota Pedestrian Bridge Bus Stop', short: 'OJOTA BRIDGE', x: 60, z: -1120, agberos: 2 },
    { id: 'mile12-bus', name: 'Mile 12 BRT & Danfo Terminal', short: 'MILE 12', x: 180, z: -1280, agberos: 3 },
  ],
  cells: [
    { style: 'magodo', x: -70, z: -1360 },
    { style: 'magodo', x: 50, z: -1360 },
    { style: 'magodo', x: 90, z: -1460 },
  ],
});
