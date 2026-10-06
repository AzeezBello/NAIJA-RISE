import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { JOBS, jobOf } from '../../data/jobs.js';
import { Card, Btn, Pill, Row, Spacer, Note } from '../components.js';
import { toast } from '../feedback.js';
import { applyJob, applyWaypoint } from '../../systems/navigation.js';

export default {
  id: 'jobs', title: 'Jobs', header: 'Available Jobs', tint: '#2a5d8a',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
  render(body) {
    body.innerHTML = JOBS.map(j => {
      const active = G.state.job === j.id;
      return Card(`${Row(`<h6 class="sp">${esc(j.title)}</h6>${active ? Pill('ACTIVE', 'blue') : ''}`)}<p>${esc(j.where)} · ${fmt(j.pay)} · +${j.xp} XP · ${j.dur}s shift</p>${Row(Spacer() + (active ? Btn('Cancel', 'cancelJob', { cls: 'ghost sm' }) : Btn('Start Job', 'startJob', { id: j.id, cls: 'sm' })))}`);
    }).join('') + Note('Start a job, follow the GPS to the workplace and press E to work the shift. Wages are paid in cash.');
  },
  actions: {
    startJob: id => { G.state.job = id; G.state.waypoint = null; applyWaypoint(); applyJob(); toast(`Job accepted · head to ${jobOf(id).where}`); emit('hud'); },
    cancelJob: () => { G.state.job = null; applyJob(); emit('hud'); },
  },
};
