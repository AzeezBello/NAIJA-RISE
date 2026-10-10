// Story missions. Each has dialogue lines, optional branching choices, and an after() hook.
// `at` is a place id where the dialogue happens; `requires` gates availability; obj() returns the live objective text.
// A mission may start a task after its dialogue: { type: 'timed'|'cargo'|'escape'|'steal'|'race', dest, ... } — see systems/missions.js.
// After the shared prologue (0–6) the story forks by reputation: Amaka's legit arc (8–10) or Baba K's risk arc (11–13).
import { G } from '../core/context.js';
import { tx, msg, xp, addItem, removeItem, addRep } from '../systems/economy.js';
import { toast } from '../ui/feedback.js';

const taskObj = fallback => () => (G.task ? G.task.obj : fallback);

export const MISSIONS = [
  {
    title: 'The First Run', at: 'ojuelegba', r: 9,
    obj: () => 'Meet Baba K at Ojuelegba Junction',
    lines: () => [
      { s: 'babak', t: 'Tunde! You finally show. Lagos no dey wait for anybody.' },
      { s: 'babak', t: 'I get two kinds of work for you. Fast money wey get risk, or slow money wey clean.' },
    ],
    choices: [
      { label: 'The fast one.', reply: 'Ehen. Carry this package go Iponri, Amaka dey wait. Stake na ₦5,000, you go collect ₦25,000.',
        apply() { G.state.path = 'risk'; G.state.cash -= 5000; tx('Stake paid to Baba K', -5000); addItem('package'); } },
      { label: 'The clean one.', reply: 'Wise man. Carry these documents go Iponri for Amaka. ₦12,000, no wahala.',
        apply() { G.state.path = 'legit'; addItem('documents'); } },
    ],
    after() {
      msg('babak', G.state.path === 'risk' ? 'Package dey your hand. Amaka dey wait for Iponri. No waste time.' : 'Documents dey your hand. Amaka dey Iponri. Do am well.');
      xp(20);
    },
  },
  {
    title: 'Make the Delivery', at: 'marina', r: 10,
    obj: () => (G.state.path === 'risk' ? 'Deliver the package to Amaka at Iponri' : 'Deliver the documents to Amaka at Iponri'),
    lines: () => (G.state.path === 'risk'
      ? [{ s: 'amaka', t: 'You carry am come? Give me quick, eyes dey everywhere.' }, { s: 'amaka', t: 'Clean work. ₦25,000. But police go hear about this one.' }]
      : [{ s: 'amaka', t: 'Ah, the documents. Baba K said you were reliable.' }, { s: 'amaka', t: 'Here is ₦12,000. Honest money spends the same.' }]),
    after() {
      const s = G.state;
      if (s.path === 'risk') { s.cash += 25000; removeItem('package'); s.heat = Math.min(5, s.heat + 1); tx('Delivery payment', 25000); toast('+₦25,000 · Heat +1'); addRep('street', 5); }
      else { s.cash += 12000; removeItem('documents'); tx('Courier payment', 12000); toast('+₦12,000'); addRep('public', 5); }
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
    after() { msg('babak', 'You don rise small. Property and Businesses dey your phone. Amaka get one hot job for you at Iponri — if you get liver.'); addRep('street', 5); xp(20); },
  },
  {
    title: 'Hot Delivery', at: 'marina', r: 10,
    obj: () => 'See Amaka at Iponri for the hot job',
    lines: () => [
      { s: 'amaka', t: 'This package na hot one. Police dey watch Iponri. The moment you carry am, dem go follow you.' },
      { s: 'amaka', t: 'Get am to Baba K at Ojuelegba. If dem catch you, na you sabi. ₦60,000 if you deliver.' },
    ],
    choices: [
      { label: 'I go deliver am.', reply: 'Sharp. Go!', apply() { G.state.chase = true; addItem('package'); G.state.heat = Math.max(G.state.heat, 3); } },
      { label: 'Not today.', reply: 'Come back when you ready.', apply() {} },
    ],
    after() { if (!G.state.chase) { G.state.mission--; return; } msg('babak', 'Dem dey follow you? Lose them and come. I dey Ojuelegba.'); },
  },
  {
    title: 'Hot Delivery · Drop', at: 'ojuelegba', r: 9, requires: () => !!G.state.chase,
    obj: () => 'Reach Baba K at Ojuelegba with the package — don\'t get arrested',
    lines: () => [{ s: 'babak', t: 'You reach! With police for your back. Na so we dey do am.' }, { s: 'babak', t: '₦60,000. Lagos don hear your name now.' }],
    after() {
      const s = G.state; s.chase = false; removeItem('package'); s.cash += 60000; tx('Hot delivery', 60000); s.heat = 0; addRep('street', 15); addRep('public', -5);
      msg('amaka', 'Two roads from here. Come see me at Iponri if you want clean money. Baba K go call you if you want the other thing.'); xp(40);
    },
  },
  // ---------- 7 · Crossroads: the fork. Street reputation opens Baba K's arc, Public opens Amaka's. ----------
  {
    title: 'Crossroads', at: 'marina', r: 10,
    obj: () => 'Choose your road — see Amaka at Iponri',
    lines: () => [{ s: 'amaka', t: `Street rep ${G.state.rep.street}, public rep ${G.state.rep.public}. Lagos don notice you.` }, { s: 'amaka', t: 'I run clean logistics — convoys, cold chain, a race the Iponri crews bet on. Baba K runs the other kind. Wetin you be?' }],
    choices: [
      { label: 'Legit with Amaka (needs Public 0+)', reply: 'Good. First job na cold chain — vaccines for the school clinic. Time matters.',
        apply() { if (G.state.rep.public < 0) { toast('Your public reputation is too low. Pray, work shifts, settle fines.'); G.state.mission--; return; } G.state.arc = 'legit'; G.state.mission = 6; } },
      { label: 'Run with Baba K (needs Street 10+)', reply: 'Then Baba K dey wait for you at Ojuelegba. No tell me anything.',
        apply() { if (G.state.rep.street < 10) { toast('The street does not know you yet. Take risks, race, hustle.'); G.state.mission--; return; } G.state.arc = 'risk'; G.state.mission = 9; } },
    ],
    after() { if (G.state.arc) { addRep(G.state.arc === 'legit' ? 'public' : 'street', 3); } },
  },
  // ---------- Legit arc (Amaka) 8–10 ----------
  {
    title: 'Cold Chain', at: 'marina', r: 10, arc: 'legit',
    obj: taskObj('Collect the vaccine box from Amaka at Iponri'),
    lines: () => [{ s: 'amaka', t: 'Vaccine box. Community Grammar School clinic. You get 20 minutes of Lagos time before e spoil.' }],
    task: { type: 'timed', dest: 'school', minutes: 20, item: 'coldbox', obj: 'Deliver the vaccine box to the school before it spoils' },
    after() { const s = G.state; s.cash += 40000; tx('Cold chain delivery', 40000); addRep('public', 6); addRep('business', 4); msg('amaka', 'Clinic got it cold. Next: a warehouse run. No speeding, the cargo is fragile.'); xp(30); },
    fail() { msg('amaka', 'The box spoiled. We lost the batch. Come back, I go give you one more chance.'); },
  },
  {
    title: 'Warehouse Run', at: 'lawma', r: 12, arc: 'legit',
    obj: taskObj('Pick up the fragile cargo at the LAWMA depot'),
    lines: () => [{ s: 'amaka', t: 'Glassware for the filling station shop. Keep it under 90 km/h the whole way or everything breaks.' }],
    task: { type: 'cargo', dest: 'fuel', maxKmh: 90, item: 'cargo', obj: 'Deliver the glassware to Mobil — stay under 90 km/h' },
    after() { const s = G.state; s.cash += 50000; tx('Warehouse run', 50000); addRep('business', 6); msg('amaka', 'Not one crack. The Iponri crews race Funsho Williams tonight — win it and they will respect our name.'); xp(30); },
    fail() { msg('amaka', 'Everything broke. Fragile means fragile. Try again.'); },
  },
  {
    title: 'The Iponri Race', at: 'stadstop', r: 10, arc: 'legit',
    obj: taskObj('Meet Speedy at the Stadium bus stop to race for Amaka'),
    lines: () => [{ s: 'speedy', t: 'Amaka\'s boy? Funsho Williams, two laps, my crew versus you. Lose and Marina pays.' }],
    task: { type: 'race', wager: 0, obj: 'Win the race on Funsho Williams Avenue' },
    after() { const s = G.state; s.cash += 80000; tx('Race purse', 80000); addRep('street', 10); addRep('social', 6); s.done = true; toast('AMAKA\'S ARC COMPLETE — Lagos respects clean money'); msg('amaka', 'You won. Marina is ours. Keep building — more work soon.'); xp(60); },
    fail() { msg('speedy', 'Dem beat you. Come back when your motor get sense.'); },
  },
  // ---------- Risk arc (Baba K) 11–13 ----------
  {
    title: 'Vehicle Recovery', at: 'ojuelegba', r: 9, arc: 'risk',
    obj: taskObj('See Baba K at Ojuelegba'),
    lines: () => [{ s: 'babak', t: 'One sedan dey park near Bode Thomas — the owner owe me. Carry am come Ladipo, Dayo go change the plate.' }],
    task: { type: 'steal', vehicleType: 'car', dest: 'ladipo', obj: 'Take the sedan near Bode Thomas to Dayo at Ladipo' },
    after() { const s = G.state; s.cash += 45000; tx('Vehicle recovery', 45000); addRep('street', 8); msg('babak', 'Plates changed. Next one hot: start at Ojuelegba with the police on you and disappear.'); xp(30); },
  },
  {
    title: 'Getaway', at: 'ojuelegba', r: 9, arc: 'risk',
    obj: taskObj('See Baba K at Ojuelegba for the getaway'),
    lines: () => [{ s: 'babak', t: 'Police go chase you the moment you leave. Lose them — no police within 60 metres for 8 seconds. Then we talk.' }],
    task: { type: 'escape', heat: 4, obj: 'Lose the police — stay 60 m clear of every patrol for 8 seconds' },
    after() { const s = G.state; s.cash += 60000; tx('Getaway', 60000); s.heat = 0; addRep('street', 10); addRep('public', -6); msg('babak', 'Ghost! Last thing: a rival crew dey claim Funsho Williams. Race their driver. Winner keeps the road.'); xp(35); },
    fail() { msg('babak', 'Dem catch you. Pay your fine and come back.'); },
  },
  {
    title: 'Rival Operation', at: 'stadstop', r: 10, arc: 'risk',
    obj: taskObj('Meet Speedy at the Stadium bus stop — the rival crew\'s driver'),
    lines: () => [{ s: 'speedy', t: 'Baba K sent you? Two laps. You lose, Funsho Williams na our own. You win, we respect am.' }],
    task: { type: 'race', wager: 0, obj: 'Win the race on Funsho Williams Avenue' },
    after() { const s = G.state; s.cash += 100000; tx('Territory race', 100000); addRep('street', 15); s.done = true; toast('BABA K\'S ARC COMPLETE — Funsho Williams is yours'); msg('babak', 'The road na your own. More work soon. Lagos no dey sleep.'); xp(60); },
    fail() { msg('babak', 'You lose the road. Race again when you ready.'); },
  },
  {
    title: 'AJ City Errand',
    at: 'ajegunle',
    r: 12,
    // optional: only when free-roaming
    requires: () => !!G.state.storyPaused || G.state.mission >= 3,
    obj: () => 'Meet Sisi Kemi in Ajegunle · AJ City',
    lines: () => [
      {
        s: 'sisi',
        t: 'Welcome to AJ. Dem no dey joke with respect for here.',
      },
      {
        s: 'sisi',
        t: 'My brother dey wait for pure water money for the bus stop. Carry ₦3,000 give the conductor for AJ B/S, then come back.',
      },
    ],
    choices: [
      {
        label: 'I go do am.',
        reply: 'Sharp. AJ Bus Stop. No lose the money.',
        apply() {
          if (!pay(3000, 'AJ errand float')) {
            toast('You need ₦3,000 cash');
            G.state.mission--;
            return;
          }
          G.state.ajErrand = true;
          addItem('aj_envelope');
        },
      },
      {
        label: 'Not today.',
        reply: 'No wahala. AJ go still dey.',
        apply() {},
      },
    ],
    after() {
      if (!G.state.ajErrand) return;
      msg('sisi', 'Conductor dey AJ Bus Stop. Settle am, then come back to me.');
    },
  },
  {
    title: 'AJ City Errand · Return',
    at: 'ajegunle',
    r: 12,
    requires: () => !!G.state.ajErrand,
    obj: () => 'Return to Sisi Kemi in AJ City',
    lines: () => [
      { s: 'sisi', t: 'You try. AJ go remember you.' },
    ],
    after() {
      const s = G.state;
      s.ajErrand = false;
      removeItem('aj_envelope');
      s.cash += 5000;
      tx('AJ City errand', 5000);
      addRep('street', 4);
      addRep('social', 3);
      xp(20);
      msg('sisi', 'Anytime you need something for this side, you know where I dey.');
    },
  },
];
