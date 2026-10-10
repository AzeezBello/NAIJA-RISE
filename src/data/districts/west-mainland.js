import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'west-mainland',
  name: 'West Mainland',
  bounds: { x: [-145, 135], z: [142, 325] },
  spawn: { x: -5, z: 220 },
  regions: [
    { id: 'orile-iganmu', name: 'Orile Iganmu', x: [-145, -75], z: [142, 232] },
    { id: 'abebe-village', name: 'Abebe Village', x: [-75, -5], z: [142, 232] },
    { id: 'ijora-badiya', name: 'Ijora Badiya', x: [-5, 65], z: [142, 232] },
    { id: 'ijora-7up', name: 'Ijora 7up', x: [65, 135], z: [142, 232] },
    { id: 'coker-aguda', name: 'Coker Aguda', x: [-145, -75], z: [232, 325] },
    { id: 'ijesha', name: 'Ijesha', x: [-75, -5], z: [232, 325] },
    { id: 'pako', name: 'Pako', x: [-5, 65], z: [232, 325] },
  ],
  roads: {
    h: [
      { k: 170, from: -145, to: 135, name: 'Orile–Iganmu Link', width: 14, class: 'commercial' },
      { k: 210, from: -145, to: 135, name: 'Ijora Badiya Road', width: 14, class: 'main' },
      { k: 260, from: -145, to: 135, name: 'Coker–Ijesha Road', width: 14, class: 'commercial' },
    ],
    v: [
      { k: -140, from: 142, to: 325, name: 'Orile Road', width: 14, class: 'main' },
      { k: -105, from: 142, to: 325, name: 'Abebe Village Road', width: 12, class: 'residential' },
      { k: -35, from: 142, to: 325, name: 'Ijora 7up Road', width: 14, class: 'commercial' },
      { k: 35, from: 142, to: 325, name: 'Coker Aguda Road', width: 12, class: 'residential' },
      { k: 105, from: 142, to: 325, name: 'Ijesha–Pako Road', width: 14, class: 'main' },
    ],
  },
  landmarks: [
    { id: 'orile-iganmu', name: 'Orile Iganmu', short: 'ORILE IGANMU', x: -110, z: 190, c: '#8a7d6a', sign: '#ffc52f', h: 6, kind: 'landmark', region: 'orile-iganmu' },
    { id: 'abebe-village', name: 'Abebe Village', short: 'ABEBE VILLAGE', x: -40, z: 190, c: '#7a6a55', sign: '#ffffff', h: 5, kind: 'landmark', region: 'abebe-village' },
    { id: 'ijora-badiya', name: 'Ijora Badiya', short: 'IJORA BADIYA', x: 30, z: 190, c: '#6b5344', sign: '#ffc52f', h: 6, kind: 'landmark', region: 'ijora-badiya' },
    { id: 'ijora-7up', name: 'Ijora 7up', short: 'IJORA 7UP', x: 100, z: 190, c: '#5c6770', sign: '#ffffff', h: 6, kind: 'landmark', region: 'ijora-7up' },
    { id: 'coker-aguda', name: 'Coker Aguda', short: 'COKER AGUDA', x: -110, z: 280, c: '#8a7d6a', sign: '#ffc52f', h: 6, kind: 'landmark', region: 'coker-aguda' },
    { id: 'ijesha', name: 'Ijesha', short: 'IJESHA', x: -40, z: 280, c: '#7a6a55', sign: '#ffffff', h: 6, kind: 'landmark', region: 'ijesha' },
    { id: 'pako', name: 'Pako', short: 'PAKO', x: 30, z: 280, c: '#6b5344', sign: '#ffc52f', h: 5, kind: 'landmark', region: 'pako' },
  ],
  busStops: [
    { id: 'orile-bus', name: 'Orile Iganmu Bus Stop', short: 'ORILE', x: -110, z: 170, agberos: 2 },
    { id: 'ijora-badiya-bus', name: 'Ijora Badiya Bus Stop', short: 'IJORA BADIYA', x: 30, z: 210, agberos: 2 },
    { id: 'coker-bus', name: 'Coker Aguda Bus Stop', short: 'COKER', x: -110, z: 270, agberos: 1 },
  ],
});
