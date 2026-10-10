const NOOP = () => false;

export function createArea({
  id,
  name,
  bounds,
  spawn,
  regions,
  roads,
  landmarks,
  busStops = [],
  water = [],
  uTurns = [],
}) {
  const meta = { id, name, state: 'Lagos', bounds, spawn };
  const roadGroups = { h: [], v: [] };
  const extents = { h: {}, v: {} };
  const names = { h: {}, v: {} };
  const widths = { h: {}, v: {} };
  const classes = { h: {}, v: {} };
  const segments = { h: {}, v: {} };

  for (const axis of ['h', 'v']) {
    for (const road of roads[axis]) {
      roadGroups[axis].push(road.k);
      extents[axis][road.k] = [road.from, road.to];
      names[axis][road.k] = road.name;
      widths[axis][road.k] = road.width;
      classes[axis][road.k] = road.class || 'main';
      segments[axis][road.k] = [[road.from, road.to, road.name]];
    }
  }

  const regionList = regions || [{ id, name, x: bounds.x, z: bounds.z }];
  const area = {
    META: meta,
    REGIONS: regionList,
    regionAt: (x, z = 0) => regionList.find(r => x >= r.x[0] && x < r.x[1] && z >= r.z[0] && z < r.z[1]) || regionList[0],
    ROADS: roadGroups,
    ROAD_EXTENT: extents,
    roadExtent: (axis, k) => extents[axis][k] || [0, 0],
    ROAD_NAMES: names,
    ROAD_WIDTHS: widths,
    ROAD_CLASS: classes,
    CLASS_RULES: {
      expressway: { speed: 1.7, limit: 120, density: 1.3, lights: false, median: true },
      highway: { speed: 1.25, limit: 100, density: 1.2, lights: true, median: true },
      main: { speed: 1, limit: 80, density: 1, lights: true },
      commercial: { speed: 0.9, limit: 60, density: 1.1, lights: true },
      residential: { speed: 0.7, limit: 50, density: 0.6, lights: true },
      market: { speed: 0.6, limit: 40, density: 1, lights: true, vendors: true },
      bridge: { speed: 1.4, limit: 100, density: 1.4, lights: false, median: true },
    },
    ROAD_SEGMENTS: segments,
    roadName: (axis, k) => names[axis][k] || 'the main road',
    roadNameAt: (axis, k, along) => segments[axis][k]?.find(([a, b]) => along >= a && along < b)?.[2] || names[axis][k] || 'the main road',
    roadClass: (axis, k) => classes[axis][k] || 'main',
    roadRules: (axis, k) => area.CLASS_RULES[area.roadClass(axis, k)],
    LANDMARKS: landmarks,
    BUSSTOPS: busStops,
    PROPERTIES: [],
    KIOSKS: [],
    ANIMALS: [],
    UNIFORMS: {},
    SERVICE_NPCS: [],
    NIGHTLIFE_NPCS: [],
    RESERVED: [
      ...landmarks.map(l => ({ x: l.x, z: l.z, r: 14 })),
      ...busStops.map(b => ({ x: b.x, z: b.z, r: 12 })),
    ],
    PLACES: [...landmarks, ...busStops],
    placeOf: placeId => landmarks.find(l => l.id === placeId) || busStops.find(b => b.id === placeId),
    placesOfKind: kind => landmarks.filter(l => l.kind === kind),
    WATER: { x: 0, w: 0 },
    WATERS: water,
    U_TURNS: uTurns,
    ARTISAN_NPCS: landmarks.filter(l => l.kind === 'artisan'),
    inWater: (x, z) => water.some(w => x >= w.x[0] && x <= w.x[1] && z >= w.z[0] && z <= w.z[1]),
    BRIDGES: [],
    onBridge: NOOP,
    VI_CELLS: [],
    LEKKI_CELLS: [],
    YABA_CELLS: [],
    EBUTE_CELLS: [],
    TOLLS: [],
    FOOTBRIDGES: [],
    VENDORS: [],
    JUNCTIONS: [],
    ISLAND_CELLS: [],
  };

  area.JUNCTIONS = roadGroups.h.flatMap(z =>
    roadGroups.v
      .filter(x => {
        const [za, zb] = extents.v[x];
        const [xa, xb] = extents.h[z];
        return z >= za && z <= zb && x >= xa && x <= xb;
      })
      .map(x => ({ x, z }))
  );

  return area;
}
