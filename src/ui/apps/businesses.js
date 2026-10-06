import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { BUSINESSES, bizPrice, bizIncome } from '../../data/businesses.js';
import { Balance, Card, Btn, Pill, Row, Spacer } from '../components.js';
import { toast } from '../feedback.js';
import { tx, msg } from '../../systems/economy.js';

export default {
  id: 'businesses', minLevel: 2, title: 'Business', header: 'Businesses', tint: '#9a4a3c',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 11v9h14v-9M10 20v-5h4v5"/></svg>',
  render(body) {
    const s = G.state, total = bizIncome(s);
    body.innerHTML = Balance('Business income', `${fmt(total)} / min`, total ? `Next payout in ${Math.ceil(s.payIn)}s · paid to bank` : 'Buy a business to earn while you play') +
      BUSINESSES.map(b => {
        const own = s.owned.includes(b.id), price = bizPrice(s, b);
        return Card(`${Row(`<h6 class="sp">${esc(b.name)}</h6>${own ? Pill('OWNED', 'gold') : price < b.price ? Pill('40% OFF', 'green') : ''}`)}<p>${own ? fmt(b.income) + ' / min' : `Price ${fmt(price)} · earns ${fmt(b.income)} / min`}</p>${own ? '' : Row(Spacer() + Btn('Buy with cash', 'buy', { id: b.id, cls: 'sm', disabled: s.cash < price }))}`);
      }).join('');
  },
  actions: {
    buy: id => {
      const s = G.state, b = BUSINESSES.find(b => b.id === id), price = bizPrice(s, b);
      if (s.cash < price) return toast('Not enough cash');
      s.cash -= price; s.owned.push(id); tx(`Bought ${b.name}`, -price);
      toast(`You now own ${b.name}`);
      msg('bank', `Purchase confirmed: ${b.name}. Income of ${fmt(b.income)} per minute will be paid to your account.`);
      emit('hud');
    },
  },
};
