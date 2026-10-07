import { G } from '../core/context.js';
import { pick } from '../core/utils.js';
import { placeOf, BUSSTOPS, LANDMARKS } from '../data/locations.js';
import { pickArchetype, slotFor } from '../data/schedules.js';

// Resolve soft destinations once per NPC
const MARKETS = () => ['yaba', 'shitta', 'mushin'].map(placeOf).filter(Boolean);
const WORKS = () => LANDMARKS.filter(l =>
  l.kind === 'bank' || l.kind === 'hotel' || l.id === 'marina' || l.id === 'ladipo'
);
const HOMES = () => {
  // scatter “home” points in Surulere residential band
  const pts = [];
  for (let i = 0; i < 12; i++) {
    pts.push({
      x: -120 + Math.random() * 100,
      z: 40 + Math.random() * 80,
    });
  }
  return pts;
};

let homePool = null;

function destFor(n, label) {
  if (label === 'sleep' || label === 'home') {
    if (!n.home) {
      if (!homePool) homePool = HOMES();
      n.home = pick(homePool);
    }
    return n.home;
  }
  if (label === 'market') return n.marketSpot || (n.marketSpot = pick(MARKETS()));
  if (label === 'work') return n.workSpot || (n.workSpot = pick(WORKS()) || placeOf('marina'));
  if (label === 'bus') {
    if (!n.busSpot) n.busSpot = pick(BUSSTOPS);
    return n.busSpot;
  }
  if (label === 'school') return placeOf('school') || placeOf('yaba');
  if (label === 'venue') {
    const v = LANDMARKS.filter(l => l.kind === 'venue');
    return pick(v) || placeOf('ojuelegba');
  }
  // wander — null means keep random steer
  return null;
}

/** Assign archetype + anchors when spawning. */
export function bindSchedule(n) {
  n.archetype = pickArchetype();
  n.home = null;
  n.marketSpot = null;
  n.workSpot = null;
  n.busSpot = null;
  n.schedLabel = 'wander';
}

/**
 * Steer NPC toward schedule destination.
 * Call inside updateNpcs before integrate, if n has archetype.
 * Returns true if it set velocity (caller can skip pure random).
 */
export function applyScheduleSteer(n, clock, speed = 1.55) {
  if (!n.archetype) return false;
  const slot = slotFor(n.archetype, clock);
  n.schedLabel = slot.at;

  if (slot.at === 'sleep') {
    // Hide or idle near home
    const d = destFor(n, 'home');
    if (d) {
      const dx = d.x - n.g.position.x, dz = d.z - n.g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 4) {
        n.v.set((dx / dist) * speed * 0.7, 0, (dz / dist) * speed * 0.7);
        n.g.visible = !n.hidden;
        return true;
      }
      n.v.set(0, 0, 0);
      // late night: half already hidden by existing logic; sleepers can hide
      if (clock >= 23 || clock < 5) n.g.visible = false;
      return true;
    }
    return false;
  }

  if (slot.at === 'wander') return false;

  const d = destFor(n, slot.at);
  if (!d) return false;
  const dx = d.x - n.g.position.x, dz = d.z - n.g.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 6) {
    // Arrive: slow idle near destination
    n.v.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
    n.g.visible = !n.hidden;
    return true;
  }
  n.v.set((dx / dist) * speed, 0, (dz / dist) * speed);
  n.g.visible = !n.hidden;
  return true;
}