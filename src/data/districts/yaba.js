import { createArea } from './area.js';

export const DISTRICT = createArea({
  id: 'yaba',
  name: 'Yaba · Alagomeji',
  bounds: { x: [340, 480], z: [-400, -250] },
  spawn: { x: 408, z: -318 },
  regions: [
    { id: 'alagomeji', name: 'Alagomeji · Yaba Tech Hub', x: [340, 480], z: [-400, -340] },
    { id: 'yaba', name: 'Yaba', x: [340, 480], z: [-340, -250] },
  ],
  roads: {
    h: [
      { k: -360, from: 340, to: 480, name: 'Alagomeji Road', width: 16, class: 'commercial' },
      { k: -300, from: 340, to: 480, name: 'Herbert Macaulay Way', width: 18, class: 'commercial' },
    ],
    v: [
      { k: 360, from: -400, to: -250, name: 'Murtala Muhammed Way', width: 18, class: 'commercial' },
      { k: 440, from: -400, to: -250, name: 'University Road', width: 18, class: 'main' },
    ],
  },
  landmarks: [
    { id: 'tejuosho', name: 'Tejuosho Market', short: 'TEJUOSHO MKT', x: 408, z: -270, c: '#6b4737', sign: '#ffc52f', h: 6, kind: 'market', region: 'yaba' },
    { id: 'yabatech', name: 'Yaba College of Technology', short: 'YABATECH', x: 464, z: -270, c: '#8a7a4a', sign: '#ffffff', h: 8, kind: 'school', region: 'yaba' },
    { id: 'unilag', name: 'University of Lagos · Main Gate', short: 'UNILAG', x: 464, z: -360, c: '#6a7a5a', sign: '#ffffff', h: 7, kind: 'school', region: 'alagomeji' },
    { id: 'alagomeji-tech', name: 'Alagomeji Tech Hub', short: 'YABA TECH HUB', x: 408, z: -360, c: '#3a4a7a', sign: '#5db8ff', h: 8, kind: 'cafe', big: true, region: 'alagomeji' },
    { id: 'alagomeji-startups', name: 'Alagomeji Innovation Centre', short: 'STARTUP HUB', x: 360, z: -360, c: '#35546a', sign: '#3dff79', h: 10, kind: 'landmark', region: 'alagomeji' },
    { id: 'yaba-painter', name: 'Yaba Sign Painting Studio', short: 'PAINTER', x: 360, z: -280, c: '#765a40', sign: '#ffc52f', h: 4, kind: 'artisan', profession: 'Painter' },
    { id: 'yaba-tailor', name: 'Alagomeji Fashion Tailor', short: 'TAILOR', x: 440, z: -320, c: '#725c8a', sign: '#f4d3a4', h: 4, kind: 'artisan', profession: 'Tailor' },
  ],
  busStops: [
    { id: 'alagomeji-bus', name: 'Alagomeji Bus Stop', short: 'ALAGOMEJI', x: 384, z: -344, agberos: 1 },
    { id: 'tejuosho-bus', name: 'Tejuosho Bus Stop', short: 'TEJUOSHO', x: 408, z: -286, agberos: 2 },
  ],
});
