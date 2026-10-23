import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'agege',
  name: 'Agege',
  bounds: { x: [-520, -160], z: [-780, -640] },
  spawn: { x: -330, z: -700 },
  regions: [
    { id: 'agege', name: 'Agege', x: [-520, -160], z: [-780, -640] },
  ],
  roads: {
    h: [
      { k: -720, from: -490, to: -120, name: 'Agege Motor Road', width: 20, class: 'main' },
      { k: -690, from: -490, to: -120, name: 'Agege Market Link', width: 12, class: 'residential' },
      { k: -660, from: -490, to: -120, name: 'Oba Ogunji Road', width: 16, class: 'commercial' },
    ],
    v: [
      { k: -490, from: -820, to: -660, name: 'Old Abeokuta Road', width: 18, class: 'main' },
      { k: -300, from: -1880, to: -660, name: 'Iju Road · Lagos–Abeokuta Expressway', width: 18, class: 'commercial' },
    ],
  },
  landmarks: [
    { id: 'agege-market', name: 'Agege Market', short: 'AGEGE MKT', x: -490, z: -680, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'agege-garage', name: 'Agege Bus Garage', short: 'AGEGE GARAGE', x: -310, z: -740, c: '#5c4933', sign: '#ffc52f', h: 5, kind: 'garage' },
    { id: 'agege-carpenter', name: 'Agege Carpentry Workshop', short: 'CARPENTER', x: -410, z: -660, c: '#79563a', sign: '#ffc52f', h: 4, kind: 'artisan', profession: 'Carpenter' },
  ],
  busStops: [
    { id: 'agege-motor-road-stop', name: 'Agege Motor Road Bus Stop', short: 'AGEGE RD', x: -330, z: -732, agberos: 2 },
    { id: 'iju-road-stop', name: 'Iju Road Bus Stop', short: 'IJU ROAD', x: -310, z: -672, agberos: 1 },
  ],
});
