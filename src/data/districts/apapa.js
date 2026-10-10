import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'apapa',
  name: 'Apapa Port',
  bounds: { x: [-520, -140], z: [40, 240] },
  spawn: { x: -360, z: 142 },
  regions: [
    { id: 'apapa-wharf', name: 'Apapa Wharf', x: [-520, -400], z: [40, 240] },
    { id: 'apapa-port', name: 'Apapa Port', x: [-400, -280], z: [40, 240] },
    { id: 'apapa-liverpool', name: 'Liverpool Road', x: [-280, -140], z: [40, 240] },
  ],
  roads: {
    h: [
      { k: 70, from: -500, to: -150, name: 'Creek Road', width: 18, class: 'commercial' },
      { k: 142, from: -520, to: 150, name: 'Apapa–Oworonshoki Expressway', width: 24, class: 'expressway' },
      { k: 220, from: -500, to: -150, name: 'Warehouse Road', width: 18, class: 'highway' },
    ],
    v: [
      { k: -450, from: 50, to: 230, name: 'Wharf Road', width: 18, class: 'commercial' },
      { k: -350, from: 50, to: 230, name: 'Liverpool Road', width: 20, class: 'highway' },
      { k: -250, from: 50, to: 230, name: 'Marine Road', width: 18, class: 'commercial' },
    ],
  },
  landmarks: [
    { id: 'apapa-port', name: 'Apapa Port', short: 'APAPA PORT', x: -350, z: 70, c: '#49606a', sign: '#ffffff', h: 14, kind: 'landmark', big: true },
    { id: 'apapa-wharf', name: 'Apapa Wharf', short: 'APAPA WHARF', x: -450, z: 220, c: '#5c4933', sign: '#ffc52f', h: 8, kind: 'garage' },
    { id: 'apapa-market', name: 'Apapa Market', short: 'APAPA MARKET', x: -250, z: 70, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'apapa-school', name: 'Apapa Community School', short: 'APAPA SCHOOL', x: -250, z: 220, c: '#8a7a4a', sign: '#ffffff', h: 6, kind: 'school' },
  ],
  busStops: [
    { id: 'apapa-bus', name: 'Apapa Bus Stop', short: 'APAPA', x: -350, z: 158, agberos: 1 },
    { id: 'apapa-wharf-stop', name: 'Wharf Road Bus Stop', short: 'WHARF ROAD', x: -450, z: 86, agberos: 1 },
    { id: 'apapa-liverpool-stop', name: 'Liverpool Road Bus Stop', short: 'LIVERPOOL', x: -350, z: 204, agberos: 1 },
  ],
});
