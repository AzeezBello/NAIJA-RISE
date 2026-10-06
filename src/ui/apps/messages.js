import { G } from '../../core/context.js';
import { esc, ago } from '../../core/utils.js';
import { contactOf } from '../../data/characters.js';
import { Avatar, Empty } from '../components.js';

export default {
  id: 'messages', title: 'Messages', tint: '#22a35a',
  icon: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/></svg>',
  render(body) {
    const list = [...G.state.msgs].reverse();
    body.innerHTML = list.length
      ? list.map(m => { const c = contactOf(m.from); return `<div class="msg card ${m.read ? '' : 'unread'}">${Avatar(c)}<div class="mb"><div class="mh"><b>${esc(c.name)}</b><span>${ago(m.t)}</span></div><p>${esc(m.text)}</p></div></div>`; }).join('')
      : Empty('No messages yet');
  },
};
