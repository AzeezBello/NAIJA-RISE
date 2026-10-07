import { G } from '../core/context.js';
import { PLACES_CFG } from '../data/config.js';
import { JOBS } from '../data/jobs.js';
import { gainSkill, xp, msg } from './economy.js';
import { toast } from '../ui/feedback.js';

// Education progression (Alpha 1.1 C2): cyber café courses grant skills, XP and certificates that unlock jobs.
// Certificates live in state.digital as { day, name }; older saves stored `true` and still count.
export function hasCourse(id) { const d = G.state.digital?.[id]; return !!(d === true || (d && d.day != null)); }
export const coursesDone = () => Object.keys(G.state.digital || {}).filter(hasCourse);

// Apply a course completion: certificate, skill gains, XP, message. Returns false if already held.
export function completeCourse(id, name, hours, skillMap) {
  const s = G.state;
  if (!s.digital) s.digital = {};
  if (hasCourse(id)) return false;
  s.digital[id] = { day: s.day, name };
  if (skillMap) for (const [k, v] of Object.entries(skillMap)) gainSkill(k, v);
  xp(20);
  const ids = new Set([...JOBS.filter(j => j.needCourse === id).map(j => j.id), ...(PLACES_CFG.cafe.courses.find(c => c[0] === id)?.[5] || [])]);
  const unlocked = JOBS.filter(j => ids.has(j.id)).map(j => j.title);
  const extra = unlocked.length ? ` Unlocks: ${unlocked.join(', ')}.` : '';
  toast(`${name} learned.${extra}`);
  msg('cafeguy', `${name} certificate ready.${extra}`);
  return true;
}

// True when the player can take this job: skill minimum plus any required certificate.
export function jobUnlocked(j) {
  const s = G.state;
  if (j.min && (s.skills?.[j.skill] || 0) < j.min) return false;
  if (j.needCourse && !hasCourse(j.needCourse)) return false;
  return true;
}
export const courseName = id => PLACES_CFG.cafe.courses.find(c => c[0] === id)?.[1] || id;

export function cafeCourseRows() {
  return PLACES_CFG.cafe.courses.map(([id, name, cost, hrs, skills, unlocks]) => ({ id, name, cost, hrs, skills, unlocks: unlocks || [], done: hasCourse(id) }));
}
