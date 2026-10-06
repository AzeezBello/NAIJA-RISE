import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc } from '../../core/utils.js';
import { LOOK } from '../../data/characters.js';
import { SKILLS, REPS, levelTitle } from '../../data/config.js';
import { Sect, Swatches, Chips, Card } from '../components.js';
import { applyLook } from '../../entities/player.js';
import { characterRigReady } from '../../entities/character.js';

const bar = (label, v, min, max, cls) => `<div class="vbar"><span style="width:62px">${esc(label)}</span><div class="track"><i class="${cls}" style="width:${((v - min) / (max - min)) * 100}%"></i></div><b style="width:34px;text-align:right">${Math.round(v)}</b></div>`;

// Look, skills (PRD §5) and the four reputations (PRD §15).
export default {
  id: 'character', title: 'Character', tint: '#8a3f6b',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M6 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3M9 14l3 3 3-3"/></svg>',
  render(body) {
    const s = G.state, L = s.look;
    body.innerHTML = `<div class="card preview"><canvas id="charPreview" width="144" height="144"></canvas><div><h6>${esc(s.name)}</h6><p>Level ${s.level} · ${levelTitle(s.level)}</p><p>Skills grow with use: drive, sprint, work shifts, trade, socialise.</p></div></div>` +
      Sect('Skills') + Card(Object.entries(SKILLS).map(([k, label]) => bar(label, s.skills[k] || 0, 0, 100, 'hpfill')).join('')) +
      Sect('Reputation') + Card(Object.entries(REPS).map(([k, label]) => bar(label, s.rep[k] || 0, -100, 100, k === 'street' ? 'fuelfill' : 'stafill')).join('') + '<p>Public falls when you are arrested; Street rises with risk; Business with ownership; Social with owambe and nightlife.</p>') +
      Sect('Skin') + Swatches('skin', LOOK.skin, L.skin) + Sect('Face') + Chips('face', LOOK.face, L.face ?? 0) + Sect('Body') + Chips('bodyType', LOOK.bodyType, L.bodyType ?? 1) +
      Sect('Hair') + Chips('hair', LOOK.hair, L.hair) + Sect('Hair colour') + Swatches('hairColor', LOOK.hairColor, L.hairColor ?? 0) + Sect('Facial hair') + Chips('facialHair', LOOK.facialHair, L.facialHair ?? 0) +
      Sect('Shirt') + Swatches('shirt', LOOK.shirt, L.shirt) + Sect('Trousers') + Swatches('pants', LOOK.pants, L.pants) + Sect('Shoes') + Swatches('shoes', LOOK.shoes, L.shoes ?? 0) + Sect('Accessory') + Chips('accessory', LOOK.accessory, L.accessory ?? 0) +
      `<p class="note">${characterRigReady() ? 'Rigged character active — walk and run are real animation clips.' : 'Loading the rigged character… primitives shown meanwhile.'}</p>`;
    applyLook();
  },
  actions: { look: id => { const [k, v] = id.split(':'); G.state.look[k] = +v; applyLook(); emit('hud'); } },
};
