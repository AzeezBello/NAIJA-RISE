import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc } from '../../core/utils.js';
import { ITEMS } from '../../data/items.js';
import { Card, Btn, Row, Empty } from '../components.js';
import { toast } from '../feedback.js';
import { removeItem } from '../../systems/economy.js';

export default {
  id: 'inventory', title: 'Inventory', tint: '#3c6e7a',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/></svg>',
  render(body) {
    const ids = Object.keys(G.state.inv);
    body.innerHTML = ids.length
      ? `<div class="inv">${ids.map(id => { const it = ITEMS[id]; return Card(`<span class="qty">×${G.state.inv[id]}</span><h6>${esc(it.name)}</h6><p>${esc(it.desc)}</p>${it.use ? Row(Btn('Use', 'use', { id, cls: 'sm' })) : ''}`); }).join('')}</div>`
      : Empty('Your bag is empty');
  },
  actions: { use: id => { ITEMS[id].use(G.state); removeItem(id); toast(`Used ${ITEMS[id].name}`); emit('hud'); } },
};
