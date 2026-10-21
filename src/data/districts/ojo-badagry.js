import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'ojo-badagry',
  name: 'Ojo · Badagry',
  bounds: { x: [-1050, -140], z: [250, 410] },
  spawn: { x: -330, z: 320 },
  regions: [
    { id: 'festac-satellite-town', name: 'Festac Satellite Town', x: [-520, -330], z: [340, 410] },
    { id: 'mile-2', name: 'Mile 2', x: [-330, -140], z: [340, 410] },
    { id: 'ojo-badagry', name: 'Ojo · Alaba', x: [-520, -140], z: [250, 410] },
    { id: 'lasu-iyana-iba', name: 'LASU · Iyana Iba', x: [-780, -520], z: [250, 410] },
    { id: 'badagry-town', name: 'Badagry Heritage Town', x: [-1050, -780], z: [250, 410] },
  ],
  roads: {
    h: [
      { k: 280, from: -1020, to: -140, name: 'Lagos–Badagry Expressway', width: 30, class: 'highway' },
      { k: 340, from: -1020, to: -140, name: 'Ojo–Badagry Coastal Road', width: 18, class: 'main' },
      { k: 370, from: -520, to: -140, name: 'Festac Link Road', width: 14, class: 'commercial' },
    ],
    v: [
      { k: -340, from: 250, to: 380, name: 'Alaba Local Link', width: 12, class: 'residential' },
      { k: -470, from: 280, to: 380, name: 'Festac Access Road', width: 16, class: 'main' },
      { k: -320, from: 280, to: 380, name: 'Mile 2 Access Road', width: 16, class: 'commercial' },
      { k: -400, from: 250, to: 380, name: 'Iyana-Iba Road', width: 18, class: 'commercial' },
      { k: -220, from: 250, to: 380, name: 'Ojo–Alaba Road', width: 18, class: 'main' },
      { k: -640, from: 250, to: 380, name: 'LASU Campus Boulevard', width: 18, class: 'main' },
      { k: -820, from: 250, to: 380, name: 'Agbara–Badagry Link Road', width: 18, class: 'commercial' },
      { k: -960, from: 250, to: 380, name: 'Badagry Marina Road', width: 16, class: 'main' },
    ],
  },
  landmarks: [
    { id: 'festac-satellite-town', name: 'Festac Satellite Town', short: 'FESTAC TOWN', x: -430, z: 370, c: '#7a8ba0', sign: '#ffffff', h: 8, kind: 'landmark', big: true, region: 'festac-satellite-town' },
    { id: 'mile-2', name: 'Mile 2 Transport Hub', short: 'MILE 2', x: -250, z: 370, c: '#5c4933', sign: '#ffc52f', h: 6, kind: 'garage', big: true, region: 'mile-2' },
    { id: 'ojo-market', name: 'Ojo Market', short: 'OJO MARKET', x: -450, z: 330, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'ojo-alaba', name: 'Alaba International Market', short: 'ALABA', x: -270, z: 330, c: '#5c4933', sign: '#ffc52f', h: 7, kind: 'market', big: true },
    { id: 'ojo-welder', name: 'Ojo Welding Yard', short: 'WELDER', x: -390, z: 360, c: '#5c6770', sign: '#ffc52f', h: 4, kind: 'artisan', profession: 'Welder' },
    { id: 'badagry-waterfront', name: 'Ojo Waterfront', short: 'OJO BEACH', x: -200, z: 380, c: '#cbb98a', sign: '#ffffff', h: 3, kind: 'beach', waterfront: true },
    { id: 'navy-town', name: 'Navy Town & NNS Wey · Ojo', short: 'NAVY TOWN', x: -490, z: 310, c: '#13294b', sign: '#ffffff', h: 7, kind: 'navy', big: true, region: 'festac-satellite-town' },
    { id: 'ojo-cantonment', name: 'Ojo Military Cantonment', short: 'OJO CANTONMENT', x: -360, z: 262, c: '#3b5323', sign: '#ffffff', h: 7, kind: 'army', big: true, region: 'ojo-badagry' },
    { id: 'lasu-campus', name: 'Lagos State University (LASU) · Ojo', short: 'LASU CAMPUS', x: -640, z: 310, c: '#6a7a5a', sign: '#ffffff', h: 9, kind: 'school', big: true, region: 'lasu-iyana-iba' },
    { id: 'badagry-barracks', name: '244 Recce Battalion Barracks · Badagry', short: 'BADAGRY BARRACKS', x: -820, z: 310, c: '#3b5323', sign: '#ffffff', h: 7, kind: 'army', big: true, region: 'badagry-town' },
    { id: 'badagry-heritage', name: 'Badagry Heritage Museum & Marina', short: 'BADAGRY MARINA', x: -960, z: 360, c: '#7a6040', sign: '#f5c518', h: 6, kind: 'museum', big: true, waterfront: true, region: 'badagry-town' },
  ],
  busStops: [
    { id: 'festac-bus', name: 'Festac Satellite Town Bus Stop', short: 'FESTAC', x: -430, z: 350, agberos: 2 },
    { id: 'mile-2-bus', name: 'Mile 2 Bus Terminal', short: 'MILE 2', x: -250, z: 350, agberos: 3 },
    { id: 'ojo-bus', name: 'Ojo Bus Stop', short: 'OJO', x: -330, z: 292, agberos: 2 },
    { id: 'alaba-bus', name: 'Alaba Bus Stop', short: 'ALABA', x: -220, z: 352, agberos: 2 },
    { id: 'lasu-bus', name: 'LASU Gate Bus Stop', short: 'LASU GATE', x: -640, z: 294, agberos: 2 },
    { id: 'badagry-bus', name: 'Badagry Roundabout Bus Stop', short: 'BADAGRY', x: -960, z: 294, agberos: 2 },
  ],
  water: [{ id: 'ojo-atlantic', name: 'Atlantic Ocean · Badagry Coast', x: [-1050, -140], z: [400, 410] }],
});
