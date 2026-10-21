import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'alimosho-oshodi',
  name: 'Alimosho · Oshodi–Isolo · Mushin · Ifako-Ijaiye',
  bounds: { x: [-920, -160], z: [-920, -180] },
  spawn: { x: -480, z: -420 },
  regions: [
    { id: 'alimosho-egbeda', name: 'Alimosho · Egbeda, Ikotun, Igando, Idimu, Ipaja & Ayobo', x: [-920, -520], z: [-680, -280] },
    { id: 'oshodi-isolo', name: 'Oshodi–Isolo · Oshodi Interchange, Mafoluku, Ago Palace & Ejigbo', x: [-520, -260], z: [-560, -320] },
    { id: 'mushin-ladipo', name: 'Mushin · Idi-Oro, Ladipo Market, Palm Avenue & Daleko', x: [-340, -160], z: [-360, -180] },
    { id: 'ifako-ijaiye', name: 'Ifako-Ijaiye · Ogba, Fagba, Iju-Ishaga & Alagbado', x: [-780, -260], z: [-920, -680] },
  ],
  roads: {
    h: [
      { k: -820, from: -780, to: -260, name: 'Ogba–Fagba–Iju-Ishaga Road', width: 20, class: 'commercial' },
      { k: -520, from: -920, to: -160, name: 'Egbeda–Idimu–Ikotun–Igando Road', width: 20, class: 'commercial' },
      { k: -420, from: -920, to: -160, name: 'Apapa–Oshodi Expressway · Isolo & Ago Palace Link', width: 28, class: 'expressway' },
      { k: -280, from: -520, to: -160, name: 'Ladipo–Palm Avenue–Daleko–Mushin Road', width: 18, class: 'market' },
    ],
    v: [
      { k: -740, from: -920, to: -280, name: 'LASU–Isheri–Ipaja–Alagbado Expressway', width: 24, class: 'highway' },
      { k: -420, from: -920, to: -180, name: 'Oshodi–Mafoluku–Ogba–Fagba Link', width: 22, class: 'main' },
    ],
  },
  landmarks: [
    { id: 'oshodi-interchange', name: 'Oshodi 3-Terminal Transport Interchange', short: 'OSHODI HUB', x: -410, z: -410, c: '#1559b8', sign: '#ffffff', h: 11, kind: 'garage', big: true, region: 'oshodi-isolo' },
    { id: 'ikotun-market', name: 'Synagogue & Ikotun Central Market · Alimosho', short: 'IKOTUN MKT', x: -720, z: -500, c: '#6b4737', sign: '#ffc52f', h: 7, kind: 'market', big: true, region: 'alimosho-egbeda' },
    { id: 'alimosho-hospital', name: 'Alimosho General Hospital · Igando', short: 'IGANDO HOSP', x: -820, z: -560, c: '#d8e2dc', sign: '#ef4444', h: 9, kind: 'hospital', big: true, region: 'alimosho-egbeda' },
    { id: 'ladipo-auto-hub', name: 'Ladipo Auto Spare Parts Market · Mushin', short: 'LADIPO AUTO', x: -260, z: -270, c: '#5c6770', sign: '#ffc52f', h: 7, kind: 'market', big: true, region: 'mushin-ladipo' },
    { id: 'ifako-ogba-hub', name: 'Ogba & Fagba Commercial Plaza · Ifako-Ijaiye', short: 'OGBA FAGBA', x: -460, z: -800, c: '#7a6855', sign: '#ffc52f', h: 7, kind: 'market', big: true, region: 'ifako-ijaiye' },
  ],
  busStops: [
    { id: 'egbeda-bus', name: 'Egbeda Bus Stop · Alimosho', short: 'EGBEDA', x: -680, z: -520, agberos: 3 },
    { id: 'oshodi-terminal-bus', name: 'Oshodi Terminal 1 BRT Stop', short: 'OSHODI', x: -420, z: -420, agberos: 3 },
    { id: 'isolo-ago-bus', name: 'Ago Palace Way · Isolo Bus Stop', short: 'AGO PALACE', x: -480, z: -380, agberos: 2 },
    { id: 'ogba-fagba-bus', name: 'Ogba · Fagba Bus Stop · Ifako-Ijaiye', short: 'OGBA FAGBA', x: -420, z: -820, agberos: 2 },
  ],
  cells: [
    { style: 'ladipo', x: -290, z: -245 },
    { style: 'ladipo', x: -230, z: -305 },
    { style: 'ladipo', x: -640, z: -490 },
  ],
});
