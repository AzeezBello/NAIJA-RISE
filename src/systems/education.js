import { G } from '../core/context.js';
import { PLACES_CFG } from '../data/config.js';
import { JOBS } from '../data/jobs.js';
import { gainSkill, xp, msg } from './economy.js';
import { toast } from '../ui/feedback.js';

// Education progression (Alpha 1.1 C2): cyber café courses grant skills, XP and certificates that unlock jobs.
// Certificates live in state.digital as { day, name }; older saves stored `true` and still count.
export function hasCourse(id) {
  if (id === 'yabatech') return !!G.state.college?.graduated;
  const d = G.state.digital?.[id];
  return !!(d === true || (d && d.day != null));
}
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

export function completeYabaTechSemester() {
  const college = G.state.college;
  if (!college || college.graduated) return false;
  college.semester++;
  gainSkill('business', 4);
  gainSkill('charisma', 1);
  if (college.semester >= PLACES_CFG.school.yabaTech.semesters) {
    college.graduated = true;
    college.graduatedDay = G.state.day;
    xp(30);
    toast('Yaba Tech Diploma completed · IT Support Technician unlocked');
    msg('cafeguy', 'Congratulations! Your Yaba Tech diploma don ready. Alagomeji Tech Hub dey hire IT Support Technicians.');
    return true;
  }
  xp(10);
  toast(`Yaba Tech semester ${college.semester} of ${PLACES_CFG.school.yabaTech.semesters} completed`);
  return true;
}

// True when the player can take this job: skill minimum plus any required certificate.
export function jobUnlocked(j) {
  const s = G.state;
  if (j.min && (s.skills?.[j.skill] || 0) < j.min) return false;
  if (j.needCourse && !hasCourse(j.needCourse)) return false;
  return true;
}
export const courseName = id => id === 'yabatech'
  ? 'Yaba Tech diploma'
  : PLACES_CFG.cafe.courses.find(c => c[0] === id)?.[1] || id;

export function cafeCourseRows() {
  return PLACES_CFG.cafe.courses.map(([id, name, cost, hrs, skills, unlocks]) => ({ id, name, cost, hrs, skills, unlocks: unlocks || [], done: hasCourse(id) }));
}
