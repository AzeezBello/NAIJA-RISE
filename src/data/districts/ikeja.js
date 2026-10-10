import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'ikeja',
  name: 'Ikeja Mainland',
  bounds: { x: [-160, 360], z: [-1000, -480] },
  spawn: { x: 80, z: -800 },
  regions: [
    { id: 'maryland', name: 'Maryland', x: [-160, 160], z: [-580, -480] },
    { id: 'ojota', name: 'Ojota', x: [160, 360], z: [-640, -480] },
    { id: 'ketu', name: 'Ketu', x: [-160, 360], z: [-760, -640] },
    { id: 'ikeja', name: 'Ikeja', x: [-160, 360], z: [-1000, -760] },
  ],
  roads: {
    h: [
      { k: -500, from: -150, to: 340, name: 'Mobolaji Bank Anthony Way', width: 22, class: 'highway' },
      { k: -560, from: -150, to: 340, name: 'Maryland Road', width: 18, class: 'commercial' },
      { k: -620, from: -150, to: 340, name: 'Ojota Road', width: 20, class: 'main' },
      { k: -680, from: -150, to: 340, name: 'Ketu–Mile 12 Road', width: 20, class: 'highway' },
      { k: -760, from: -150, to: 340, name: 'Allen Avenue', width: 18, class: 'commercial' },
      { k: -840, from: -150, to: 340, name: 'Obafemi Awolowo Way', width: 22, class: 'main' },
      { k: -920, from: -150, to: 340, name: 'Ikeja GRA Road', width: 18, class: 'residential' },
    ],
    v: [
      { k: -120, from: -940, to: -480, name: 'Agege Motor Road', width: 18, class: 'main' },
      { k: 0, from: -940, to: 150, name: 'Ikorodu Road · Maryland Link', width: 20, class: 'highway' },
      { k: 120, from: -940, to: -480, name: 'Alausa–Ketu Road', width: 18, class: 'main' },
      { k: 240, from: -940, to: -480, name: 'Ojota–Ikeja Link', width: 18, class: 'commercial' },
      { k: 360, from: -940, to: -480, name: 'Ikeja Access Road', width: 16, class: 'residential' },
    ],
  },
  landmarks: [
    { id: 'maryland-mall', name: 'Maryland Mall', short: 'MARYLAND MALL', x: -120, z: -530, c: '#8a8f93', sign: '#ffc52f', h: 12, kind: 'mall', big: true },
    { id: 'maryland-market', name: 'Maryland Market', short: 'MARYLAND MARKET', x: 120, z: -530, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'ojota-garage', name: 'Ojota Bus Garage', short: 'OJOTA GARAGE', x: 240, z: -590, c: '#5c4933', sign: '#ffc52f', h: 5, kind: 'garage' },
    { id: 'ketu-market', name: 'Ketu Market', short: 'KETU MARKET', x: 240, z: -700, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market' },
    { id: 'ikeja-city', name: 'Ikeja City Centre', short: 'IKEJA', x: 120, z: -800, c: '#7a8ba0', sign: '#ffffff', h: 14, kind: 'landmark', big: true },
    { id: 'ikeja-tech', name: 'Computer Village', short: 'COMPUTER VILLAGE', x: -120, z: -800, c: '#3a4a7a', sign: '#5db8ff', h: 8, kind: 'cafe', big: true },
    { id: 'ikeja-school', name: 'Ikeja Senior High School', short: 'IKEJA SCHOOL', x: 240, z: -880, c: '#8a7a4a', sign: '#ffffff', h: 6, kind: 'school' },
    { id: 'ikeja-airport', name: 'Murtala Muhammed Airport', short: 'LAGOS AIRPORT', x: 20, z: -900, c: '#69777d', sign: '#ffffff', h: 10, kind: 'airport', big: true },
  ],
  busStops: [
    { id: 'maryland-bus', name: 'Maryland Bus Stop', short: 'MARYLAND', x: 0, z: -546, agberos: 1 },
    { id: 'ojota-bus', name: 'Ojota Bus Stop', short: 'OJOTA', x: 240, z: -606, agberos: 2 },
    { id: 'ketu-bus', name: 'Ketu Bus Stop', short: 'KETU', x: 120, z: -666, agberos: 2 },
    { id: 'ikeja-bus', name: 'Ikeja Under Bridge', short: 'IKEJA', x: 120, z: -826, agberos: 2 },
  ],
});
