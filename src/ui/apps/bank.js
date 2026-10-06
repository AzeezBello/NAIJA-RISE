import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { fmt } from '../../core/utils.js';
import { Balance, Card, Btn, Row, Sect, Empty, TxRow } from '../components.js';
import { tx } from '../../systems/economy.js';

const AMOUNTS = [10000, 50000, 'all'];
const btns = act => AMOUNTS.map(a => Btn(a === 'all' ? 'All' : '₦' + a / 1000 + 'k', act, { id: a, cls: (act === 'withdraw' ? 'ghost ' : '') + 'sm' })).join('');

export default {
  id: 'bank', title: 'Bank', header: 'RiseBank', tint: '#b3851c',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 19h18"/></svg>',
  render(body) {
    const s = G.state;
    body.innerHTML = Balance('Account balance', fmt(s.bank), `Cash on hand · ${fmt(s.cash)}`) +
      Card(`<h6>Deposit cash</h6>${Row(btns('deposit'))}`) + Card(`<h6>Withdraw</h6>${Row(btns('withdraw'))}`) +
      Sect('Recent activity') + (s.tx.length ? s.tx.map(TxRow).join('') : Empty('No transactions yet'));
  },
  actions: {
    deposit: a => { const s = G.state, n = a === 'all' ? s.cash : Math.min(s.cash, +a); if (n <= 0) return; s.cash -= n; s.bank += n; tx('Deposit', n); emit('hud'); },
    withdraw: a => { const s = G.state, n = a === 'all' ? s.bank : Math.min(s.bank, +a); if (n <= 0) return; s.bank -= n; s.cash += n; tx('Withdrawal', -n); emit('hud'); },
  },
};
