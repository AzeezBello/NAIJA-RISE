import { esc } from '../../core/utils.js';
import { CONTACTS, contactOf } from '../../data/characters.js';
import { Avatar, Btn, Card } from '../components.js';
import { toast } from '../feedback.js';
import { G } from '../../core/context.js';
import { resumeStory } from '../../systems/dialogue.js';
import { FAMILY_NEED_LABELS, relationshipLabel, requestOf } from '../../data/family.js';
import { getRel, relTier } from '../../systems/relationships.js';

export default {
  id: 'contacts', title: 'Contacts', tint: '#6b4a9a',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  render(body) {
    body.innerHTML = CONTACTS.map(c => {
      const relation = ['mum', 'sibling'].includes(c.id)
        ? (() => {
          const score = G.state.familyRel[c.id] || 0;
          const needs = G.state.familyNeeds?.[c.id] || {};
          const request = requestOf(G.state.familyReq);
          const needSummary = Object.entries(needs)
            .map(([key, value]) => `${FAMILY_NEED_LABELS[key] || key} ${Math.round(value)}`)
            .join(' · ');
          const activeRequest = request?.who === c.id ? `<p class="note">Request: ${esc(request.title)}</p>` : '';
          return `<p>${relationshipLabel(score)} · Bond ${Math.round(score)}/100</p><p class="note">${esc(needSummary)} · lower means more urgent</p>${activeRequest}`;
        })()
        : (() => {
          const rel = getRel(c.id);
          return `<p>${relTier(c.id)} · Trust ${Math.round(rel.trust)} · Respect ${Math.round(rel.respect)}</p>`;
        })();
      return Card(`${Avatar(c)}<div class="sp"><h6>${esc(c.name)}</h6><p>${esc(c.role)}</p>${relation}</div>${Btn('Call', 'call', { id: c.id, cls: 'ghost sm' })}${c.at ? Btn('GPS', 'gpsContact', { id: c.id, cls: 'sm' }) : ''}`, 'row');
    }).join('');
  },
  actions: { call: id => { const c = contactOf(id); if (G.state.storyPaused && (id === 'babak' || id === 'amaka')) { resumeStory(); toast(`${c.name}: “You ready? Come find me.” — mission marker is back`); return; } toast(`${c.name}: “${c.line}”`); } },
};
