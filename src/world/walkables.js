// Sidewalk + junction walkable registry for NPC pathing.
// Sidewalk strips match district.sidewalks() (4 m concrete). Junctions are
// square crosswalk zones at every road intersection so NPCs can cross on purpose.
// Call registerSidewalks() once from buildDistrict() after sidewalks are built.

import { ROADS, ROAD_WIDTHS, roadExtent, roadClass, JUNCTIONS, inWater } from '../data/locations.js';

export const walks = [];       // sidewalk centre-line segments
export const crossings = [];   // junction crosswalk zones { x, z, r }

const ROAD_W = ROAD_WIDTHS.h;
const VROAD_W = ROAD_WIDTHS.v;
const STRIP = 4;               // sidewalk width (matches district.js)
const HALF = STRIP / 2;

export function registerSidewalks() {
  walks.length = 0;
  crossings.length = 0;

  for (const z of ROADS.h) {
    if (z === 142 || roadClass('h', z) === 'expressway') continue;
    const hw = ROAD_W[z] / 2;
    const [a, b] = roadExtent('h', z);
    walks.push({ x0: a, z0: z - hw - 2, x1: b, z1: z - hw - 2, axis: 'h' });
    walks.push({ x0: a, z0: z + hw + 2, x1: b, z1: z + hw + 2, axis: 'h' });
  }
  for (const x of ROADS.v) {
    if (roadClass('v', x) === 'expressway') continue;
    const hw = VROAD_W[x] / 2;
    const [a, b] = roadExtent('v', x);
    walks.push({ x0: x - hw - 2, z0: a, x1: x - hw - 2, z1: b, axis: 'v' });
    walks.push({ x0: x + hw + 2, z0: a, x1: x + hw + 2, z1: b, axis: 'v' });
  }

  // Crosswalk zones: radius covers the road width so an NPC can leave one
  // sidewalk, cross, and land on the opposite strip.
  for (const j of JUNCTIONS) {
    const hw = Math.max(ROAD_W[j.z] || 18, VROAD_W[j.x] || 18) / 2 + 3;
    crossings.push({ x: j.x, z: j.z, r: hw });
  }
}

/** Random point on a random sidewalk (spawn). */
export function randomWalkPoint() {
  if (!walks.length) return { x: 0, z: 20 };
  let tries = 12;
  while (tries--) {
    const s = walks[(Math.random() * walks.length) | 0];
    const t = 0.05 + Math.random() * 0.9;
    const x = s.x0 + (s.x1 - s.x0) * t + (Math.random() - 0.5) * (STRIP - 0.8);
    const z = s.z0 + (s.z1 - s.z0) * t + (Math.random() - 0.5) * (STRIP - 0.8);
    if (!inWater(x, z)) return { x, z };
  }
  return { x: 0, z: 20 };
}

/** True if (x,z) is on a sidewalk strip OR inside a junction crosswalk. */
export function onWalkable(x, z, pad = 2.5) {
  for (const c of crossings) {
    if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
  }
  for (const s of walks) {
    if (s.axis === 'h') {
      if (Math.abs(z - s.z0) < pad && x >= s.x0 - 1 && x <= s.x1 + 1) return true;
    } else {
      if (Math.abs(x - s.x0) < pad && z >= s.z0 - 1 && z <= s.z1 + 1) return true;
    }
  }
  return false;
}

/**
 * Project onto the nearest sidewalk centre-line.
 * Returns null if farther than maxDist (so junction-crossers are not yanked mid-road).
 */
export function projectToWalk(x, z, maxDist = 6) {
  // Don't leash while inside a crosswalk — let them finish the crossing.
  for (const c of crossings) {
    if (Math.hypot(x - c.x, z - c.z) < c.r) return null;
  }
  let best = null, bestD = maxDist * maxDist;
  for (const s of walks) {
    let px, pz;
    if (s.axis === 'h') {
      px = Math.max(s.x0, Math.min(s.x1, x));
      pz = s.z0;
    } else {
      px = s.x0;
      pz = Math.max(s.z0, Math.min(s.z1, z));
    }
    const d = (px - x) * (px - x) + (pz - z) * (pz - z);
    if (d < bestD) { bestD = d; best = { x: px, z: pz }; }
  }
  return best;
}

/**
 * Nearest junction within range, or null.
 * Used to decide "start a deliberate crossing".
 */
export function nearestCrossing(x, z, range = 14) {
  let best = null, bestD = range;
  for (const c of crossings) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}