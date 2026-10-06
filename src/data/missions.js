// Story missions. Each has dialogue lines, optional branching choices, and an after() hook.
// `at` is a place id; `requires` gates availability; obj() returns the live objective text.
import { G } from '../core/context.js';
import { tx, msg, xp, addItem, removeItem } from '../systems/economy.js';
import { toast } from '../ui/feedback.js';

export const MISSIONS = [
  {
    title: 'The First Run', at: 'ojuelegba', r: 9,
    obj: () => 'Meet Baba K at Ojuelegba Junction',
    lines: () => [
      { s: 'babak', t: 'Tunde! You finally show. Lagos no dey wait for anybody.' },
      { s: 'babak', t: 'I get two kinds of work for you. Fast money wey get risk, or slow money wey clean.' },
    ],
    choices: [
      { label: 'The fast one.', reply: 'Ehen. Carry this package go Marina, Amaka dey wait. Stake na ₦5,000, you go collect ₦25,000.',
        apply() { G.state.path = 'risk'; G.state.cash -= 5000; tx('Stake paid to Baba K', -5000); addItem('package'); } },
      { label: 'The clean one.', reply: 'Wise man. Carry these documents go Marina for Amaka. ₦12,000, no wahala.',
        apply() { G.state.path = 'legit'; addItem('documents'); } },
    ],
    after() {
      msg('babak', G.state.path === 'risk' ? 'Package dey your hand. Amaka dey wait for Marina. No waste time.' : 'Documents dey your hand. Amaka dey Marina. Do am well.');
      xp(20);
    },
  },
  {
    title: 'Make the Delivery', at: 'marina', r: 10,
    obj: () => (G.state.path === 'risk' ? 'Deliver the package to Amaka at Marina' : 'Deliver the documents to Amaka at Marina'),
    lines: () => (G.state.path === 'risk'
      ? [{ s: 'amaka', t: 'You carry am come? Give me quick, eyes dey everywhere.' }, { s: 'amaka', t: 'Clean work. ₦25,000. But police go hear about this one.' }]
      : [{ s: 'amaka', t: 'Ah, the documents. Baba K said you were reliable.' }, { s: 'amaka', t: 'Here is ₦12,000. Honest money spends the same.' }]),
    after() {
      const s = G.state;
      if (s.path === 'risk') { s.cash += 25000; removeItem('package'); s.heat = Math.min(5, s.heat + 1); tx('Delivery payment', 25000); toast('+₦25,000 · Heat +1'); }
      else { s.cash += 12000; removeItem('documents'); tx('Courier payment', 12000); toast('+₦12,000'); }
      msg('amaka', 'Received. Baba K go settle you at Ojuelegba.');
      xp(35);
    },
  },
  {
    title: 'Get Paid', at: 'ojuelegba', r: 9,
    obj: () => 'Return to Baba K at Ojuelegba Junction',
    lines: () => [{ s: 'babak', t: 'My guy! Amaka talk say you do well.' }, { s: 'babak', t: 'I fit add something on top. Wetin you want?' }],
    choices: [
      { label: 'Cash bonus.', reply: 'Straight to the point. ₦10,000 on top.',
        apply() { G.state.cash += 10000; tx('Bonus from Baba K', 10000); } },
      { label: 'Introduce me to Mama Nkechi.', reply: 'Smart. She go sell you her kiosk for cheap. Check your phone.',
        apply() { G.state.kioskDeal = true; msg('nkechi', 'Baba K talk say you serious. My Roadside Kiosk na 40% off for you. Check Businesses.'); } },
    ],
    after() { msg('babak', 'Reach Level 2, then come back. I go show you bigger things.'); xp(45); },
  },
  {
    title: 'Raise Your Game', at: 'ojuelegba', r: 9,
    requires: () => G.state.level >= 2,
    obj: () => (G.state.level >= 2 ? 'Return to Baba K at Ojuelegba Junction' : 'Reach Level 2 — work jobs from your phone'),
    lines: () => [{ s: 'babak', t: 'Level 2 already? Lagos dey favour you.' }, { s: 'babak', t: 'This na just the beginning. Buy property, buy business, build your empire.' }],
    after() { G.state.done = true; toast('VERTICAL SLICE COMPLETE — Alpha 0.5'); msg('babak', 'You don rise small. Property and Businesses dey your phone. Build.'); },
  },
];
