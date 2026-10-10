import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, fmt, pick } from '../../core/utils.js';
import { BUSINESSES, bizPrice, bizIncome, bizOne, bizCfg, staffIsOnDuty, STAFF_SHIFTS, restockCost, rivalOpen, RIVAL, STAFF_NAMES } from '../../data/businesses.js';
import { BIZ } from '../../data/config.js';
import { Balance, Card, Btn, Pill, Row, Spacer, Note } from '../components.js';
import { toast } from '../feedback.js';
import { tx, msg, pay, addRep, gainSkill } from '../../systems/economy.js';

// Businesses v3 (PRD §9): buy, hire named staff, set prices, keep stock, and beat the rival trader.
export default {
  id: 'businesses', minLevel: 2, title: 'Business', header: 'Businesses', tint: '#9a4a3c',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 11v9h14v-9M10 20v-5h4v5"/></svg>',
  render(body) {
    const s = G.state, total = bizIncome(s);
    body.innerHTML = Balance('Business income', `${fmt(total)} / min`, total ? `Next payout in ${Math.ceil(s.payIn)}s · paid to bank · Business skill ${Math.round(s.skills.business)}` : 'Buy a business to earn while you play — even while you are away') +
      (rivalOpen(s) ? Card(`<h6>${esc(RIVAL.name)} opened nearby</h6><p>Rival trader. Businesses not on low prices lose ${Math.round((1 - RIVAL.penalty) * 100)}% of customers.</p>`) : '') +
      BUSINESSES.map(b => {
        const own = s.owned.includes(b.id), price = bizPrice(s, b);
        if (!own) return Card(`${Row(`<h6 class="sp">${esc(b.name)}</h6>${price < b.price ? Pill('40% OFF', 'green') : ''}`)}<p>Price ${fmt(price)} · earns ${fmt(b.income)} / min base</p>${Row(Spacer() + Btn('Buy with cash', 'buy', { id: b.id, cls: 'sm', disabled: s.cash < price }))}`);
        const c = bizCfg(s, b.id);
        const priceBtns = ['low', 'normal', 'high'].map(p => Btn(p[0].toUpperCase() + p.slice(1), 'setPrice', { id: `${b.id}:${p}`, cls: (c.price === p ? '' : 'ghost ') + 'sm' })).join('');
        const stockCls = c.stock < 30 ? 'fuelfill' : 'hpfill';
        const roster = c.names.slice(0, c.staff).map(name => {
          const shiftId = c.shifts?.[name] || 'all-day';
          const onDuty = STAFF_SHIFTS[shiftId] && staffIsOnDuty(s, b.id, name);
          return Row(`<span class="sp">${esc(name)} ${onDuty ? Pill('ON SHIFT', 'green') : ''}</span>${Btn(STAFF_SHIFTS[shiftId]?.label || 'Set shift', 'cycleShift', { id: `${b.id}:${name}`, cls: 'ghost sm' })}`);
        }).join('');
        return Card(`${Row(`<h6 class="sp">${esc(b.name)}</h6>${Pill('OWNED', 'gold')}${c.stock < 30 ? Pill('LOW STOCK', 'blue') : ''}`)}<p>${fmt(bizOne(s, b))} / min · staff ${c.names.length ? esc(c.names.join(', ')) : 'none'} · prices ${c.price}</p>
          <div class="vbar"><span style="width:40px">STOCK</span><div class="track"><i class="${stockCls}" style="width:${c.stock}%"></i></div><b style="width:30px;text-align:right">${Math.round(c.stock)}</b></div>
          ${Row(`<span class="sp">Prices</span>${priceBtns}`)}${roster}${Row(Btn(`Restock · ${fmt(restockCost(b))}`, 'restock', { id: b.id, cls: 'ghost sm', disabled: c.stock >= 95 }) + Spacer() + Btn(c.staff >= BIZ.maxStaff ? 'Fully staffed' : `Hire · ${fmt(BIZ.staffCost)}`, 'hire', { id: b.id, cls: 'sm', disabled: c.staff >= BIZ.maxStaff }))}`);
      }).join('') + Note('Stock drains 15% every payout and income scales with it. Staff add 30% income while on shift. Cycle each worker between morning, afternoon, night and all-day shifts; overnight covers 22:00–06:00. Low prices build Business reputation and beat the rival.');
  },
  actions: {
    buy: id => {
      const s = G.state, b = BUSINESSES.find(b => b.id === id), price = bizPrice(s, b);
      if (s.cash < price) return toast('Not enough cash');
      s.cash -= price; s.owned.push(id); bizCfg(s, id); tx(`Bought ${b.name}`, -price); addRep('business', 8); gainSkill('business', 5);
      toast(`You now own ${b.name}`);
      msg('bank', `Purchase confirmed: ${b.name}. Income of ${fmt(bizOne(s, b))} per minute will be paid to your account.`);
      emit('hud');
    },
    hire: id => { const s = G.state, c = bizCfg(s, id); if (c.staff >= BIZ.maxStaff) return; if (!pay(BIZ.staffCost, 'Hired staff')) return toast('Not enough money'); c.staff++; const n = pick(STAFF_NAMES.filter(n => !c.names.includes(n))); c.names.push(n); (c.shifts ??= {})[n] = 'morning'; gainSkill('business', 2); toast(`${n} starts on the morning shift`); emit('hud'); },
    cycleShift: id => {
      const [bid, name] = id.split(':');
      const c = bizCfg(G.state, bid);
      if (!c.names.includes(name)) return;
      const shifts = Object.keys(STAFF_SHIFTS);
      const current = c.shifts?.[name] || 'all-day';
      c.shifts ??= {};
      c.shifts[name] = shifts[(shifts.indexOf(current) + 1) % shifts.length];
      toast(`${name} · ${STAFF_SHIFTS[c.shifts[name]].label} shift`);
      emit('hud');
    },
    restock: id => { const s = G.state, c = bizCfg(s, id), b = BUSINESSES.find(b => b.id === id); if (!pay(restockCost(b), `Restock · ${b.name}`)) return toast('Not enough money'); c.stock = 100; toast('Shelves full'); emit('hud'); },
    setPrice: id => { const [bid, p] = id.split(':'); const s = G.state, c = bizCfg(s, bid); if (c.price === p) return; c.price = p; addRep('business', p === 'high' ? -3 : p === 'low' ? 2 : 0); toast(`Prices set to ${p}`); emit('hud'); },
  },
};
