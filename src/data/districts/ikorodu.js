import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'ikorodu',
  name: 'Ikorodu',
  bounds: { x: [-520, -140], z: [-420, -240] },
  spawn: { x: -360, z: -320 },
  regions: [
    { id: 'ikorodu-garage', name: 'Ikorodu Garage', x: [-520, -400], z: [-420, -240] },
    { id: 'ikorodu-centre', name: 'Ikorodu Town Centre', x: [-400, -280], z: [-420, -240] },
    { id: 'ikorodu-itunmoja', name: 'Itunmoja', x: [-280, -140], z: [-420, -240] },
  ],
  roads: {
    h: [
      { k: -390, from: -500, to: -150, name: 'Ikorodu Town Road', width: 18, class: 'commercial' },
      { k: -330, from: -520, to: 480, name: 'Ikorodu Road', width: 40, class: 'highway' },
      { k: -270, from: -500, to: -150, name: 'Itunmoja Road', width: 16, class: 'main' },
    ],
    v: [
      { k: -450, from: -410, to: -250, name: 'Ita-Elewa Road', width: 16, class: 'commercial' },
      { k: -360, from: -410, to: -250, name: 'Ikorodu Garage Road', width: 18, class: 'main' },
      { k: -270, from: -410, to: -250, name: 'Ibeshe Road', width: 16, class: 'residential' },
    ],
  },
  landmarks: [
    { id: 'ikorodu-town', name: 'Ikorodu Town Centre', short: 'IKORODU TOWN', x: -360, z: -360, c: '#8a7d6a', sign: '#ffc52f', h: 7, kind: 'landmark', big: true },
    { id: 'ikorodu-garage-town', name: 'Ikorodu Garage', short: 'IKORODU GARAGE', x: -450, z: -300, c: '#5c4933', sign: '#ffc52f', h: 5, kind: 'garage' },
    { id: 'ikorodu-market', name: 'Ikorodu Central Market', short: 'IKORODU MARKET', x: -270, z: -360, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'ikorodu-school', name: 'Ikorodu Senior Grammar School', short: 'IKORODU SCHOOL', x: -450, z: -270, c: '#8a7a4a', sign: '#ffffff', h: 6, kind: 'school' },
  ],
  busStops: [
    { id: 'ikorodu-garage-stop', name: 'Ikorodu Garage Bus Stop', short: 'IKORODU', x: -360, z: -314, agberos: 2 },
    { id: 'ikorodu-market-stop', name: 'Ikorodu Central Market Bus Stop', short: 'IKORODU MKT', x: -270, z: -344, agberos: 2 },
    { id: 'ikorodu-itunmoja-stop', name: 'Itunmoja Bus Stop', short: 'ITUNMOJA', x: -270, z: -284, agberos: 1 },
  ],
});
