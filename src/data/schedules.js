// Archetype day plans for street pedestrians (Alpha 1.1 C3).
// Spots are place ids from locations.js, or { x, z }.

export const ARCHETYPES = {
  trader: {
    weight: 0.35,
    plan: [
      { from: 6,  to: 10, at: 'home' },
      { from: 10, to: 16, at: 'market' },
      { from: 16, to: 19, at: 'bus' },
      { from: 19, to: 22, at: 'home' },
      { from: 22, to: 24, at: 'sleep' },
      { from: 0,  to: 6,  at: 'sleep' },
    ],
  },
  office: {
    weight: 0.25,
    plan: [
      { from: 6,  to: 9,  at: 'bus' },
      { from: 9,  to: 17, at: 'work' },
      { from: 17, to: 19, at: 'bus' },
      { from: 19, to: 22, at: 'home' },
      { from: 22, to: 24, at: 'sleep' },
      { from: 0,  to: 6,  at: 'sleep' },
    ],
  },
  youth: {
    weight: 0.2,
    plan: [
      { from: 7,  to: 14, at: 'school' },
      { from: 14, to: 18, at: 'market' },
      { from: 18, to: 22, at: 'venue' },
      { from: 22, to: 24, at: 'home' },
      { from: 0,  to: 7,  at: 'sleep' },
    ],
  },
  wander: {
    weight: 0.2,
    plan: [
      { from: 8,  to: 20, at: 'wander' },
      { from: 20, to: 24, at: 'sleep' },
      { from: 0,  to: 8,  at: 'sleep' },
    ],
  },
};

export function pickArchetype() {
  let r = Math.random(), acc = 0;
  for (const [id, a] of Object.entries(ARCHETYPES)) {
    acc += a.weight;
    if (r <= acc) return id;
  }
  return 'wander';
}

export function slotFor(archetype, clock) {
  const plan = ARCHETYPES[archetype]?.plan;
  if (!plan) return { at: 'wander' };
  const h = ((clock % 24) + 24) % 24;
  return plan.find(w => h >= w.from && h < w.to) || plan[0];
}