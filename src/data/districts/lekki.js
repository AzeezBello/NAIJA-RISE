import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'lekki',
  name: 'Lekki–Epe Corridor',
  bounds: { x: [470, 1120], z: [160, 350] },
  spawn: { x: 620, z: 268 },
  regions: [
    { id: 'lekki', name: 'Lekki Phase 1', x: [470, 620], z: [160, 350] },
    { id: 'ajah', name: 'Ajah', x: [620, 840], z: [160, 350] },
    { id: 'eleko', name: 'Eleko', x: [840, 1120], z: [160, 350] },
  ],
  roads: {
    h: [
      { k: 240, from: 470, to: 1120, name: 'Lekki–Epe Expressway', width: 24, class: 'highway' },
      { k: 300, from: 480, to: 1120, name: 'Coastal Road', width: 18, class: 'main' },
      { k: 180, from: 620, to: 840, name: 'Ado Road', width: 16, class: 'commercial' },
    ],
    v: [
      { k: 560, from: 180, to: 330, name: 'Admiralty Way', width: 18, class: 'commercial' },
      { k: 720, from: 180, to: 330, name: 'Lekki County Road', width: 16, class: 'residential' },
      { k: 800, from: 180, to: 330, name: 'Abraham Adesanya Road', width: 18, class: 'main' },
      { k: 920, from: 180, to: 330, name: 'Ogombo Road', width: 16, class: 'commercial' },
      { k: 1040, from: 180, to: 330, name: 'Eleko Beach Road', width: 16, class: 'residential' },
    ],
  },
  landmarks: [
    { id: 'ajah-town', name: 'Ajah Bus Terminal', short: 'AJAH', x: 800, z: 210, c: '#5c4933', sign: '#ffc52f', h: 5, kind: 'garage' },
    { id: 'sangotedo', name: 'Sangotedo Market', short: 'SANGOTEDO', x: 920, z: 210, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'lekki-conservation', name: 'Lekki Conservation Centre', short: 'CONSERVATION', x: 720, z: 318, c: '#39734b', sign: '#ffffff', h: 4, kind: 'landmark', big: true },
    { id: 'eleko-beach', name: 'Eleko Beach', short: 'ELEKO BEACH', x: 1040, z: 318, c: '#cbb98a', sign: '#ffffff', h: 4, kind: 'landmark', waterfront: true },
    { id: 'ajah-school', name: 'Ajah Community School', short: 'AJAH SCHOOL', x: 720, z: 270, c: '#8a7a4a', sign: '#ffffff', h: 6, kind: 'school' },
    { id: 'bar-beach', name: 'Bar Beach', short: 'BAR BEACH', x: 448, z: 318, c: '#cbb98a', sign: '#ffffff', h: 3, kind: 'landmark', waterfront: true, region: 'bar-beach' },
    { id: 'oniru-beach', name: 'Oniru Beach', short: 'ONIRU BEACH', x: 500, z: 318, c: '#cbb98a', sign: '#ffffff', h: 3, kind: 'landmark', waterfront: true, region: 'oniru' },
    { id: 'elegushi-beach', name: 'Elegushi Beach', short: 'ELEGUSHI', x: 580, z: 318, c: '#cbb98a', sign: '#ffffff', h: 3, kind: 'landmark', waterfront: true, region: 'elegushi' },
    { id: 'quilox', name: 'Quilox Nightclub', short: 'QUILOX', x: 520, z: 278, c: '#29253f', sign: '#f3a4ff', h: 7, kind: 'venue', region: 'oniru' },
  ],
  busStops: [
    { id: 'ajah-bus', name: 'Ajah Bus Stop', short: 'AJAH', x: 800, z: 226, agberos: 2 },
    { id: 'sangotedo-bus', name: 'Sangotedo Bus Stop', short: 'SANGOTEDO', x: 920, z: 226, agberos: 1 },
    { id: 'eleko-bus', name: 'Eleko Bus Stop', short: 'ELEKO', x: 1040, z: 226, agberos: 1 },
    { id: 'oniru-bus', name: 'Oniru Bus Stop', short: 'ONIRU', x: 500, z: 302, agberos: 1 },
    { id: 'elegushi-bus', name: 'Elegushi Bus Stop', short: 'ELEGUSHI', x: 580, z: 302, agberos: 1 },
  ],
  water: [{ id: 'lekki-atlantic', name: 'Atlantic Ocean', x: [470, 1120], z: [350, 410] }],
});
