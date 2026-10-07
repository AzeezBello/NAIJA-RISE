import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { JOBS, jobOf, jobPay } from '../../data/jobs.js';
import { hasCourse, courseName } from '../../systems/education.js';
import { SKILLS } from '../../data/config.js';
import { Card, Btn, Pill, Row, Spacer, Note } from '../components.js';
import { toast } from '../feedback.js';
import { applyJob, applyWaypoint } from '../../systems/navigation.js';

// Ten jobs. Pay rises with the related skill; some need a minimum skill or run only at night.
export default {
  id: 'jobs', title: 'Jobs', header: 'Available Jobs', tint: '#2a5d8a',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
  render(body) {
    const s = G.state;
    body.innerHTML = JOBS.map(j => {
      const active = s.job === j.id, skill = s.skills[j.skill] || 0, needCert = j.needCourse && !hasCourse(j.needCourse), locked = (j.min && skill < j.min) || needCert, pay = jobPay(j, s.skills);
      const tags = (active ? Pill('ACTIVE', 'blue') : '') + (j.night ? Pill('NIGHT') : '') + (j.far ? Pill('LONG HAUL') : '') + (j.min && skill < j.min ? Pill(`${SKILLS[j.skill]} ${j.min}+`, 'gold') : '') + (needCert ? Pill(`${courseName(j.needCourse)} cert`, 'gold') : '') + (j.needCourse && !needCert ? Pill('CERTIFIED', 'green') : '');
      return Card(`${Row(`<h6 class="sp">${esc(j.title)}</h6>${tags}`)}<p>${esc(j.where)} · ${fmt(pay)}${pay > j.pay ? ` (+${Math.round((pay / j.pay - 1) * 100)}% ${SKILLS[j.skill]})` : ''} · +${j.xp} XP · ${j.dur}s shift · trains ${SKILLS[j.skill]}</p>${Row(Spacer() + (active ? Btn('Cancel', 'cancelJob', { cls: 'ghost sm' }) : Btn(needCert ? `Needs ${courseName(j.needCourse)}` : locked ? `Needs ${SKILLS[j.skill]} ${j.min}` : 'Start Job', 'startJob', { id: j.id, cls: 'sm', disabled: locked })))}`);
    }).join('') + Note('Start a job, follow the GPS to the workplace and press E to work the shift. Wages are paid in cash. Night jobs run from 20:00.');
  },
  actions: {
    startJob: id => {
      const j = jobOf(id), s = G.state;
      if (j.min && (s.skills[j.skill] || 0) < j.min) return toast(`Build your ${SKILLS[j.skill]} skill first`);
      if (j.needCourse && !hasCourse(j.needCourse)) return toast(`You need the ${courseName(j.needCourse)} certificate first — cyber café`);
      s.job = id; s.waypoint = null; applyWaypoint(); applyJob(); toast(`Job accepted · head to ${j.where}`); emit('hud');
    },
    cancelJob: () => { G.state.job = null; applyJob(); emit('hud'); },
  },
};
