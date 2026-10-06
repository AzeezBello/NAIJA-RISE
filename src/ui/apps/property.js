import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { PROPERTIES } from '../../data/locations.js';
import { Balance, Card, Btn, Pill, Row, Spacer } from '../components.js';
import { toast } from '../feedback.js';
import { tx, msg } from '../../systems/economy.js';
import { homeProp } from '../../systems/navigation.js';

export default {
  id: 'property', minLevel: 2, title: 'Property', header: 'My Properties', tint: '#3b6f3a',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/></svg>',
  render(body) {
    const s = G.state, h = homeProp();
    body.innerHTML = Balance('Home', `<span style="font-size:16px">${h ? esc(h.name) : 'No home yet'}</span>`, h ? 'Walk to the door and press E to sleep. You spawn at home when you return.' : 'Buy a property to sleep, save and spawn there. Rita Lori Hotel rents rooms meanwhile.') +
      PROPERTIES.map(p => {
        const own = s.props.includes(p.id), home = s.home === p.id;
        return Card(`${Row(`<h6 class="sp">${esc(p.name)}</h6>${home ? Pill('HOME', 'green') : own ? Pill('OWNED', 'gold') : ''}`)}<p>${esc(p.desc)}</p>${own ? '' : `<p>Price ${fmt(p.price)} · paid from bank</p>`}${Row(Spacer() + Btn('GPS', 'gpsProp', { id: p.id, cls: 'ghost sm' }) + (own ? (home ? '' : Btn('Set as home', 'setHome', { id: p.id, cls: 'sm' })) : Btn('Buy', 'buyProp', { id: p.id, cls: 'sm', disabled: s.bank < p.price })))}`);
      }).join('');
  },
  actions: {
    buyProp: id => {
      const s = G.state, p = PROPERTIES.find(p => p.id === id);
      if (s.bank < p.price) return toast('Not enough in the bank');
      s.bank -= p.price; s.props.push(id); if (!s.home) s.home = id;
      tx(`Bought ${p.name}`, -p.price); toast(`${p.name} is yours`);
      msg('bank', `Property purchase confirmed: ${p.name}.${s.home === id ? ' It is now your home.' : ''}`);
      emit('hud');
    },
    setHome: id => { G.state.home = id; toast('Home updated'); emit('hud'); },
  },
};
