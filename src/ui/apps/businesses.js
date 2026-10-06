import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { BUSINESSES, bizPrice, bizIncome, bizOne } from '../../data/businesses.js';
import { BIZ } from '../../data/config.js';
import { Balance, Card, Btn, Pill, Row, Spacer, Note } from '../components.js';
import { toast } from '../feedback.js';
import { tx, msg, pay, addRep, gainSkill } from '../../systems/economy.js';

const cfg = (s, id) => (s.biz[id] ??= { staff: 0, price: 'normal' });

// Businesses v2 (PRD §9): buy, hire staff, set prices. Income lands in the bank every cycle.
export default {
  id: 'businesses', minLevel: 2, title: 'Business', header: 'Businesses', tint: '#9a4a3c',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 11v9h14v-9M10 20v-5h4v5"/></svg>',
  render(body) {
    const s = G.state, total = bizIncome(s);
    body.innerHTML = Balance('Business income', `${fmt(total)} / min`, total ? `Next payout in ${Math.ceil(s.payIn)}s · paid to bank · Business skill ${Math.round(s.skills.business)}` : 'Buy a business to earn while you play — even while you are away') +
      BUSINESSES.map(b => {
        const own = s.owned.includes(b.id), price = bizPrice(s, b);
        if (!own) return Card(`${Row(`<h6 class="sp">${esc(b.name)}</h6>${price < b.price ? Pill('40% OFF', 'green') : ''}`)}<p>Price ${fmt(price)} · earns ${fmt(b.income)} / min base</p>${Row(Spacer() + Btn('Buy with cash', 'buy', { id: b.id, cls: 'sm', disabled: s.cash < price }))}`);
        const c = cfg(s, b.id);
        const priceBtns = ['low', 'normal', 'high'].map(p => Btn(p[0].toUpperCase() + p.slice(1), 'setPrice', { id: `${b.id}:${p}`, cls: (c.price === p ? '' : 'ghost ') + 'sm' })).join('');
        return Card(`${Row(`<h6 class="sp">${esc(b.name)}</h6>${Pill('OWNED', 'gold')}`)}<p>${fmt(bizOne(s, b))} / min · staff ${c.staff}/${BIZ.maxStaff} · prices ${c.price}</p>${Row(`<span class="sp">Prices</span>${priceBtns}`)}${Row(Spacer() + Btn(c.staff >= BIZ.maxStaff ? 'Fully staffed' : `Hire staff · ${fmt(BIZ.staffCost)}`, 'hire', { id: b.id, cls: 'sm', disabled: c.staff >= BIZ.maxStaff }))}`);
      }).join('') + Note('Each staff member adds 30% income. High prices earn more but cost Business reputation; low prices build it.');
  },
  actions: {
    buy: id => {
      const s = G.state, b = BUSINESSES.find(b => b.id === id), price = bizPrice(s, b);
      if (s.cash < price) return toast('Not enough cash');
      s.cash -= price; s.owned.push(id); cfg(s, id); tx(`Bought ${b.name}`, -price); addRep('business', 8); gainSkill('business', 5);
      toast(`You now own ${b.name}`);
      msg('bank', `Purchase confirmed: ${b.name}. Income of ${fmt(bizOne(s, b))} per minute will be paid to your account.`);
      emit('hud');
    },
    hire: id => { const s = G.state, c = cfg(s, id); if (c.staff >= BIZ.maxStaff) return; if (!pay(BIZ.staffCost, 'Hired staff')) return toast('Not enough money'); c.staff++; gainSkill('business', 2); toast('New hire starts today'); emit('hud'); },
    setPrice: id => { const [bid, p] = id.split(':'); const s = G.state, c = cfg(s, bid); if (c.price === p) return; c.price = p; addRep('business', p === 'high' ? -3 : p === 'low' ? 2 : 0); toast(`Prices set to ${p}`); emit('hud'); },
  },
};
