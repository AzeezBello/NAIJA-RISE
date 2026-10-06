import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { PROPERTIES } from '../../data/locations.js';
import { RENT } from '../../data/config.js';
import { Balance, Card, Btn, Pill, Row, Spacer, Note } from '../components.js';
import { toast } from '../feedback.js';
import { homeProp } from '../../systems/navigation.js';
import { rentProperty, buyProperty } from '../../systems/interaction.js';

// Landlord / agent / tenant loop: rent through Agent Kunle, buy from the landlord, let owned homes to tenants.
export default {
  id: 'property', minLevel: 2, title: 'Property', header: 'My Properties', tint: '#3b6f3a',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/></svg>',
  render(body) {
    const s = G.state, h = homeProp();
    const status = h ? (s.rented?.id === h.id ? `Renting · ${s.rented.until - s.day} days left on the lease` : 'Owned · walk to the gate and press E to sleep') : 'No home yet. Rent through the agent at any gate, or rent a room at Rita Lori Hotel.';
    const rentIncome = (s.let || []).reduce((t, id) => t + Math.round(PROPERTIES.find(p => p.id === id).rent * RENT.tenantShare), 0);
    body.innerHTML = Balance('Home', `<span style="font-size:16px">${h ? esc(h.name) : 'No home yet'}</span>`, status) +
      (rentIncome ? Balance('Tenants', `${fmt(rentIncome)} / day`, `${s.let.length} propert${s.let.length === 1 ? 'y' : 'ies'} let · paid to bank each morning`) : '') +
      PROPERTIES.map(p => {
        const own = s.props.includes(p.id), home = s.home === p.id, renting = s.rented?.id === p.id, letOut = (s.let || []).includes(p.id);
        const fee = Math.round(p.rent * RENT.agentFeeRate);
        const tag = home ? Pill('HOME', 'green') : letOut ? Pill('TENANTS', 'gold') : own ? Pill('OWNED', 'gold') : renting ? Pill('RENTING', 'blue') : '';
        const terms = own ? (letOut ? `Earning ${fmt(Math.round(p.rent * RENT.tenantShare))} / day` : 'Yours. Live here or let it to tenants.') : `Rent ${fmt(p.rent)} + ${fmt(fee)} agent fee per ${RENT.leaseDays} days${p.buy ? ` · Buy ${fmt(p.buy)}` : ' · rent only'}`;
        const actions = Spacer() + Btn('GPS', 'gpsProp', { id: p.id, cls: 'ghost sm' }) +
          (own
            ? (home ? '' : Btn('Set as home', 'setHome', { id: p.id, cls: 'sm' }) + (letOut ? Btn('Stop letting', 'stopLet', { id: p.id, cls: 'ghost sm' }) : Btn('Let to tenants', 'letOut', { id: p.id, cls: 'sm' })))
            : (renting ? (home ? '' : Btn('Set as home', 'setHome', { id: p.id, cls: 'sm' })) : Btn('Rent', 'rent', { id: p.id, cls: 'sm' })) + (p.buy && !own ? Btn('Buy', 'buyProp', { id: p.id, cls: 'sm', disabled: s.cash + s.bank < p.buy }) : ''));
        return Card(`${Row(`<h6 class="sp">${esc(p.name)}</h6>${Pill(p.type)}${tag}`)}<p>${esc(p.desc)}</p><p>${terms}</p>${Row(actions)}`);
      }).join('') + Note('Agents collect 10% on every lease. Owned homes you do not live in can be let; tenants pay every game morning.');
  },
  actions: {
    rent: id => rentProperty(PROPERTIES.find(p => p.id === id)),
    buyProp: id => buyProperty(PROPERTIES.find(p => p.id === id)),
    setHome: id => { const s = G.state; s.home = id; s.let = (s.let || []).filter(x => x !== id); toast('Home updated'); emit('hud'); },
    letOut: id => { const s = G.state; if (s.home === id) return toast('Move out first — set another home'); s.let = [...(s.let || []), id]; toast('Tenants moved in. Rent lands every morning.'); emit('hud'); },
    stopLet: id => { const s = G.state; s.let = (s.let || []).filter(x => x !== id); toast('Tenants given notice'); emit('hud'); },
  },
};
