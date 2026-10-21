import { createArea } from '../districts/area.js';

export const STATE_AREA = createArea({
  id: 'rivers',
  name: 'Rivers, Delta & Edo · Niger Delta Oil & Gas Corridor',
  state: 'Rivers',
  bounds: { x: [1750, 2320], z: [-240, 350] },
  spawn: { x: 2060, z: 120 },
  regions: [
    { id: 'benin-warri', name: 'Benin Ring Road & Warri Refinery Creeks', x: [1750, 2020], z: [-240, 120] },
    { id: 'ph-gra', name: 'Old & New GRA · Port Harcourt', x: [2020, 2320], z: [-240, 80] },
    { id: 'trans-amadi', name: 'Trans-Amadi Industrial Layout · Port Harcourt', x: [1750, 2050], z: [120, 350] },
    { id: 'bonny-onne', name: 'Onne Oil Free Zone & Bonny LNG Terminal', x: [2050, 2320], z: [80, 350] },
  ],
  roads: {
    h: [
      { k: -120, from: 1750, to: 2280, name: 'Benin Ring Road · Port Harcourt GRA Boulevard', width: 26, class: 'commercial' },
      { k: 240, from: 1720, to: 2280, name: 'East–West Road · Warri–Port Harcourt Expressway', width: 32, class: 'highway' },
      { k: 300, from: 1720, to: 2280, name: 'Lagos–Calabar Coastal Highway · Bonny–Onne Sector', width: 26, class: 'main' },
    ],
    v: [
      { k: 1980, from: -1680, to: 320, name: 'Benin–Asaba–Onitsha–Port Harcourt Trunk Highway', width: 30, class: 'highway' },
    ],
  },
  landmarks: [
    { id: 'benin-igun-bronze', name: 'Benin Royal Palace & Igun Street Bronze Guild', short: 'IGUN BRONZE', x: 1845, z: -175, c: '#8c4a27', sign: '#ffd700', h: 12, kind: 'museum', big: true, region: 'benin-warri' },
    { id: 'warri-refinery', name: 'Warri Petrochemical Refinery & Escravos Jetty', short: 'WARRI REFINERY', x: 1845, z: 180, c: '#4a5568', sign: '#ffc52f', h: 15, kind: 'warehouse', big: true, waterfront: true, region: 'benin-warri' },
    { id: 'ph-airport', name: 'Port Harcourt International Airport · Omagwa', short: 'PH AIRPORT', x: 2110, z: -175, c: '#29527a', sign: '#00e5ff', h: 11, kind: 'airport', big: true, region: 'ph-gra' },
    { id: 'mile1-market', name: 'Mile 1 & Mile 3 Market · Diobu, Port Harcourt', short: 'MILE 1 MKT', x: 2110, z: -55, c: '#7a5230', sign: '#ffffff', h: 9, kind: 'market', big: true, region: 'ph-gra' },
    { id: 'ph-gra-lounge', name: 'New GRA VIP Nightlife Lounge · Port Harcourt', short: 'PH GRA CLUB', x: 2235, z: -55, c: '#4a154b', sign: '#ff66c4', h: 10, kind: 'venue', cost: 8000, big: true, region: 'ph-gra' },
    { id: 'trans-amadi-yard', name: 'Trans-Amadi Oilfield Services Base · PH', short: 'TRANS AMADI', x: 1860, z: 55, c: '#5c6770', sign: '#ffc52f', h: 14, kind: 'warehouse', big: true, region: 'trans-amadi' },
    { id: 'onne-oil-port', name: 'Onne Oil & Gas Free Zone Deepwater Port', short: 'ONNE PORT', x: 2110, z: 180, c: '#1f4e5f', sign: '#00e5ff', h: 14, kind: 'warehouse', big: true, waterfront: true, region: 'bonny-onne' },
    { id: 'bonny-lng', name: 'Nigeria LNG Terminal · Bonny Island', short: 'BONNY LNG', x: 2235, z: 180, c: '#29527a', sign: '#00e5ff', h: 22, kind: 'warehouse', big: true, waterfront: true, region: 'bonny-onne' },
  ],
  busStops: [
    { id: 'benin-ring-bus', name: 'Benin Ring Road Interstate Terminal', short: 'BENIN RING', x: 1910, z: -85, agberos: 2 },
    { id: 'waterlines-bus', name: 'Waterlines Junction · Port Harcourt', short: 'WATERLINES PH', x: 2055, z: 205, agberos: 2 },
  ],
  cells: [
    [2235, -175, 'magodo'],
    [1845, -55, 'epe'],
  ],
});
