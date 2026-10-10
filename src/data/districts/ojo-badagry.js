import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'ojo-badagry',
  name: 'Ojo · Badagry',
  bounds: { x: [-520, -140], z: [250, 410] },
  spawn: { x: -330, z: 320 },
  regions: [
    { id: 'festac-satellite-town', name: 'Festac Satellite Town', x: [-520, -330], z: [340, 410] },
    { id: 'mile-2', name: 'Mile 2', x: [-330, -140], z: [340, 410] },
    { id: 'ojo-badagry', name: 'Ojo · Badagry', x: [-520, -140], z: [250, 410] },
  ],
  roads: {
    h: [
      { k: 280, from: -520, to: -140, name: 'Lagos–Badagry Expressway', width: 30, class: 'highway' },
      { k: 340, from: -520, to: -140, name: 'Ojo Road', width: 18, class: 'main' },
      { k: 370, from: -520, to: -140, name: 'Festac Link Road', width: 14, class: 'commercial' },
    ],
    v: [
      { k: -340, from: 250, to: 380, name: 'Alaba Local Link', width: 12, class: 'residential' },
      { k: -470, from: 280, to: 380, name: 'Festac Access Road', width: 16, class: 'main' },
      { k: -320, from: 280, to: 380, name: 'Mile 2 Access Road', width: 16, class: 'commercial' },
      { k: -400, from: 250, to: 380, name: 'Iyana-Iba Road', width: 18, class: 'commercial' },
      { k: -220, from: 250, to: 380, name: 'Ojo–Alaba Road', width: 18, class: 'main' },
    ],
  },
  landmarks: [
    { id: 'festac-satellite-town', name: 'Festac Satellite Town', short: 'FESTAC TOWN', x: -430, z: 370, c: '#7a8ba0', sign: '#ffffff', h: 8, kind: 'landmark', big: true, region: 'festac-satellite-town' },
    { id: 'mile-2', name: 'Mile 2 Transport Hub', short: 'MILE 2', x: -250, z: 370, c: '#5c4933', sign: '#ffc52f', h: 6, kind: 'garage', big: true, region: 'mile-2' },
    { id: 'ojo-market', name: 'Ojo Market', short: 'OJO MARKET', x: -450, z: 330, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'ojo-alaba', name: 'Alaba International Market', short: 'ALABA', x: -270, z: 330, c: '#5c4933', sign: '#ffc52f', h: 7, kind: 'market', big: true },
    { id: 'ojo-welder', name: 'Ojo Welding Yard', short: 'WELDER', x: -390, z: 360, c: '#5c6770', sign: '#ffc52f', h: 4, kind: 'artisan', profession: 'Welder' },
    { id: 'badagry-waterfront', name: 'Ojo Waterfront', short: 'OJO BEACH', x: -200, z: 380, c: '#cbb98a', sign: '#ffffff', h: 3, kind: 'beach', waterfront: true },
  ],
  busStops: [
    { id: 'festac-bus', name: 'Festac Satellite Town Bus Stop', short: 'FESTAC', x: -430, z: 350, agberos: 2 },
    { id: 'mile-2-bus', name: 'Mile 2 Bus Terminal', short: 'MILE 2', x: -250, z: 350, agberos: 3 },
    { id: 'ojo-bus', name: 'Ojo Bus Stop', short: 'OJO', x: -330, z: 292, agberos: 2 },
    { id: 'alaba-bus', name: 'Alaba Bus Stop', short: 'ALABA', x: -220, z: 352, agberos: 2 },
  ],
  water: [{ id: 'ojo-atlantic', name: 'Atlantic Ocean · Ojo Coast', x: [-300, -140], z: [400, 410] }],
});
