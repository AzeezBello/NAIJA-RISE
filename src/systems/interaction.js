import * as THREE from 'three';
import { G, pos, frozen } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { $, dist, fmt } from '../core/utils.js';
import { saveState } from '../core/state.js';
import { ECON, TIME, PRICES, RENT, DEALER } from '../data/config.js';
import { VEH } from '../data/vehicles.js';
import { jobOf } from '../data/jobs.js';
import { placeOf, LANDMARKS, KIOSKS, PROPERTIES } from '../data/locations.js';
import { vForward, spawnOwned } from '../entities/vehicles.js';
import { saveState as persist } from '../core/state.js';
import { applyPet } from '../entities/animals.js';
import { toast } from '../ui/feedback.js';
import { applySky } from '../world/daynight.js';
import { tx, pay, xp, addItem, msg, addHeat, addRep, gainSkill } from './economy.js';
import { missionActive, missionAvailable, curMission, missionPos, jobPos, homeProp } from './navigation.js';
import { runMission, advanceDialog, startDialog } from './dialogue.js';
import { owambeOn } from './events.js';
import { tryCompleteTask } from './missions.js';
import { startRace } from './racing.js';
import { nearPlace, openPlace, placePrompt } from './places.js';
import { LIVERIES, SLOGANS } from '../data/vehicles.js';

export function nearestCar() {
  let best = null, d0 = 5;
  for (const c of G.parked) { const d = c.position.distanceTo(G.player.position); if (d < d0) { d0 = d; best = c; } }
  return best;
}
const nearKind = (kind, r) => LANDMARKS.find(l => l.kind === kind && dist(pos(), l) < r);
const nearKiosk = () => !G.inCar && KIOSKS.some(([x, z]) => dist(G.player.position, { x, z }) < 4);
const nearNight = () => !G.inCar && G.state.settings.mature !== false && venueOpen() && (G.nightlife || []).find(n => dist(G.player.position, n) < 3.5);
export const nearHome = () => { const h = homeProp(); return !!h && !G.inCar && dist(G.player.position, h.door) < 6; };
const nearGate = () => !G.inCar && PROPERTIES.find(p => p.id !== G.state.home && dist(G.player.position, p.door) < 6);
const nearPump = () => G.inCar && (dist(pos(), placeOf('ladipo')) < 16 || dist(pos(), placeOf('fuel')) < 16);
const venueOpen = () => G.state.clock >= TIME.venueOpen || G.state.clock < TIME.venueClose;
const nearYaba = () => !G.inCar && !missionActive() && dist(pos(), placeOf('yaba')) < 11;
const nearDealer = () => !G.inCar && dist(pos(), placeOf('ladipo')) < 13;
const nearRacer = () => !G.race && !G.task && dist(pos(), placeOf('stadstop')) < 10 && !(missionActive() && curMission().at === 'stadstop');

export function toggleCar() {
  if (frozen()) return;
  if (G.inCar) {
    const f = vForward(G.car);
    G.player.position.copy(G.car.position).add(new THREE.Vector3(f.z, 0, -f.x).multiplyScalar(-2.6));
    G.inCar = false; G.player.visible = true; G.car = null; G.carSpeed = 0;
    toast('Back on foot'); return;
  }
  const c = nearestCar(); if (!c) return;
  G.inCar = true; G.player.visible = false; G.car = c; G.carSpeed = 0; G.camYaw = c.rotation.y;
  if (!c.userData.owned && !c.userData.stolen) { c.userData.stolen = true; addHeat(1, 'Stolen vehicle'); addRep('street', 2); addRep('public', -2); }
  toast(`${VEH[c.userData.type].name}${c.userData.owned ? ' · yours' : ' · not yours'} · W gas · S brake · A/D steer`);
}

/* ---------- small vendor dialogues reuse the mission dialogue box ---------- */
function posDialog() {
  startDialog([{ s: 'pos', t: 'POS agent dey. Withdrawal, pure water, suya — wetin you want?' }], [
    { label: `Withdraw ${fmt(PRICES.posAmount)} (fee ${fmt(PRICES.posFee)})`, apply() { const s = G.state; if (s.bank < PRICES.posAmount + PRICES.posFee) return toast('Bank balance too low'); s.bank -= PRICES.posAmount + PRICES.posFee; s.cash += PRICES.posAmount; tx('POS withdrawal', -PRICES.posFee); toast(`${fmt(PRICES.posAmount)} cash collected`); } },
    { label: `Pure Water ${fmt(PRICES.water)}`, apply() { if (!pay(PRICES.water)) return toast('No money'); addItem('water'); toast('Pure water added to bag'); } },
    { label: `Suya ${fmt(PRICES.suya)}`, apply() { if (!pay(PRICES.suya)) return toast('No money'); addItem('suya'); toast('Suya added to bag'); } },
  ], ch => { ch.apply(); emit('hud'); });
}
function petDialog() {
  startDialog([{ s: 'nkechi', t: G.state.pet ? 'Your dog dey enjoy? Buy pure water for am.' : 'My customer! I get one fine dog here. Agbero no go near you again if you carry am.' }], [
    ...(G.state.pet ? [] : [{ label: `Adopt the dog ${fmt(PRICES.pet)}`, apply() { if (!pay(PRICES.pet, 'Adopted a dog')) return toast('Not enough money'); G.state.pet = 'dog'; applyPet(); toast('You now have a dog. Agberos will keep their distance.'); } }]),
    { label: `Pure Water ${fmt(PRICES.water)}`, apply() { if (!pay(PRICES.water)) return toast('No money'); addItem('water'); toast('Pure water added to bag'); } },
    { label: 'Just looking.', apply() {} },
  ], ch => { ch.apply(); emit('hud'); });
}
function hookupDialog(n) {
  startDialog([{ s: 'olosho', t: `${n.name}: Fine boy, you dey find hook up? ${fmt(PRICES.hookup)} make we go inside.` }], [
    { label: `Hook up ${fmt(PRICES.hookup)}`, apply() {
      if (!pay(PRICES.hookup, 'Night out')) return toast('Not enough money');
      fadeOut(() => {
        const s = G.state; s.clock = Math.min(23.9, s.clock + 1); s.stamina = 100;
        const r = Math.random();
        const guarded = s.home && s.upgrades?.[s.home]?.includes('security');
        if (r < 0.25 && !guarded) { const loss = Math.min(s.cash, 10000); s.cash -= loss; tx('Pocket picked', -loss); toast(`Your pocket don light — ${fmt(loss)} missing`); }
        else if (r < 0.35) { addHeat(1, 'Police raid at the club'); }
        else toast('You come out with a smile. Stamina restored.');
        applySky(); emit('hud');
      });
    } },
    { label: 'Not tonight.', reply: 'Your loss, baby.', apply() {} },
  ], ch => { ch.apply(); emit('hud'); });
}
// Property agent at the gate: rent for a lease, or buy from the landlord. Exported for the Property app.
export function rentProperty(p) {
  const s = G.state, fee = Math.round(p.rent * RENT.agentFeeRate);
  if (!pay(p.rent + fee, `Rent + agent fee · ${p.name}`)) return toast(`You need ${fmt(p.rent + fee)} (rent + ${fmt(fee)} agent fee)`);
  if (s.rented && s.home === s.rented.id) s.home = null;
  s.rented = { id: p.id, until: s.day + RENT.leaseDays }; s.home = p.id;
  toast(`Lease signed · ${p.type} for ${RENT.leaseDays} days`);
  msg('landlord', `Welcome. ${p.type} na yours for ${RENT.leaseDays} days. No late rent, no wahala. Agent Kunle don collect him ${fmt(fee)}.`);
  emit('hud');
}
export function buyProperty(p) {
  const s = G.state;
  if (!p.buy) return toast('This one na rent only');
  if (!pay(p.buy, `Bought ${p.name}`)) return toast(`You need ${fmt(p.buy)} across cash and bank`);
  s.props.push(p.id); if (s.rented?.id === p.id) s.rented = null; if (!s.home) s.home = p.id;
  toast(`${p.name} is yours`);
  msg('landlord', `Papers signed. ${p.name} na your own now. Collect rent from tenants if you no wan live there.`);
  emit('hud');
}
function agentDialog(p) {
  const s = G.state, owned = s.props.includes(p.id), renting = s.rented?.id === p.id, fee = Math.round(p.rent * RENT.agentFeeRate);
  const lines = [{ s: 'agent', t: owned ? `${p.name} — this one na your own. You wan move in?` : renting ? `Your lease still dey run, ${s.rented.until - s.day} days left.` : `${p.type} for ${fmt(p.rent)} per ${RENT.leaseDays} days${p.buy ? `, or buy am outright for ${fmt(p.buy)}` : ''}. Agent fee na ${fmt(fee)}.` }];
  const choices = [];
  if (owned || renting) choices.push({ label: 'Make this my home', apply() { s.home = p.id; s.let = s.let.filter(id => id !== p.id); toast('Home updated'); } });
  else { choices.push({ label: `Rent · ${fmt(p.rent + fee)}`, apply() { rentProperty(p); } }); if (p.buy) choices.push({ label: `Buy · ${fmt(p.buy)}`, apply() { buyProperty(p); } }); }
  choices.push({ label: 'Just looking.', apply() {} });
  startDialog(lines, choices, ch => { ch.apply(); emit('hud'); });
}
function racerDialog() {
  startDialog([{ s: 'speedy', t: 'Funsho Williams, two laps, ₦20,000 on the table. You need a motor. Ready?' }], [
    { label: 'Race · ₦20,000 wager', apply() { if (!G.inCar) { toast('Come back in a vehicle'); return; } startRace({ wager: 20000 }); } },
    { label: 'Not now.', apply() {} },
  ], ch => { ch.apply(); emit('hud'); });
}
function vehicleMenu(v) {
  const s = G.state, o = s.vehicles.find(o => o.id === v.userData.ownedId), name = VEH[v.userData.type].name, price = DEALER.find(d => d[0] === v.userData.type)?.[1] || 1000000;
  const choices = [];
  const cond = v.userData.cond ?? 100;
  if (cond < 100) { const c = Math.round((100 - cond) * 500 * (o.insured ? 0.5 : 1)); choices.push({ label: `Service · ${fmt(c)}${o.insured ? ' (insured)' : ''}`, apply() { if (!pay(c, `Service · ${name}`)) return toast('Not enough money'); v.userData.cond = 100; o.cond = 100; toast('Serviced'); } }); }
  if (!o.insured) { const c = Math.round(price * 0.08); choices.push({ label: `Insure · ${fmt(c)}`, apply() { if (!pay(c, `Insurance · ${name}`)) return toast('Not enough money'); o.insured = true; toast('Insured: half-price service, half crash damage'); } }); }
  choices.push({ label: `Livery · ${fmt(20000)}`, apply() { if (!pay(20000, `Livery · ${name}`)) return toast('Not enough money'); o.livery = (o.livery + 1) % LIVERIES.length || 0; applyLivery(v, o); toast('Fresh paint'); } });
  if (v.userData.type === 'danfo' || v.userData.type === 'korope') choices.push({ label: `Slogan · ${fmt(5000)}`, apply() { if (!pay(5000, `Slogan · ${name}`)) return toast('Not enough money'); o.slogan = ((o.slogan ?? -1) + 1) % SLOGANS.length; applySlogan(v, o); toast(`"${SLOGANS[o.slogan]}"`); } });
  choices.push({ label: 'Back', apply() { dealerDialog(); } });
  startDialog([{ s: 'dayo', t: `${name} · condition ${Math.round(cond)}%${o.insured ? ' · insured' : ''}. Wetin we dey do?` }], choices, ch => { ch.apply(); emit('hud'); });
}
export function applyLivery(v, o) { const c = LIVERIES[o.livery || 0]; v.traverse(m => { if (m.isMesh && m.userData.body) m.material.color.set(c); }); }
export function applySlogan(v, o) { if (v.userData.sloganSprite) v.remove(v.userData.sloganSprite); if (o.slogan === undefined) return; import('../world/builders.js').then(b => { const sp = b.textSprite(SLOGANS[o.slogan], '#07100e', 'rgba(245,197,24,.98)'); sp.position.set(0, 2.9, 0); sp.scale.set(4.2, 1, 1); v.add(sp); v.userData.sloganSprite = sp; }); }
function dealerDialog() {
  const s = G.state, mine = G.parked.filter(v => v.userData.owned);
  const worst = mine.filter(v => (v.userData.cond ?? 100) < 100);
  const buy = DEALER.map(([type, price]) => ({ label: `${VEH[type].name} · ${fmt(price)}`, apply() {
    if (!pay(price, `Bought ${VEH[type].name}`)) return toast(`You need ${fmt(price)} across cash and bank`);
    s.vehicles = [...(s.vehicles || []), { id: Date.now().toString(36), type, cond: 100 }]; spawnOwned(homeProp());
    addRep('business', 2); toast(`${VEH[type].name} is yours — parked at ${homeProp() ? 'your gate' : 'Ladipo'}`); msg('dayo', `${VEH[type].name} don ready. Papers dey inside. Bring am back when e need service.`);
  } }));
  void worst;
  const choices = [];
  if (mine.length) choices.push({ label: 'Buy another vehicle', apply() { startDialog([{ s: 'dayo', t: 'Which one?' }], [...buy, { label: 'Back', apply() { dealerDialog(); } }], ch => { ch.apply(); emit('hud'); }); } });
  for (const v of mine.slice(0, 4)) choices.push({ label: `My ${VEH[v.userData.type].name} · service, insure, customise`, apply() { vehicleMenu(v); } });
  if (!mine.length) choices.push(...buy);
  choices.push({ label: 'Just looking.', apply() {} });
  startDialog([{ s: 'dayo', t: mine.length ? `Welcome back. Wetin you need — service, insurance, paint, or another motor?` : `Ladipo get everything. Okada, keke, korope, danfo, tokunbo car. Which one?` }], choices.slice(0, 6), ch => { ch.apply(); emit('hud'); });
}
function fadeOut(then) {
  G.sleeping = true; $('sleepfade').classList.add('on');
  setTimeout(() => { then(); setTimeout(() => { $('sleepfade').classList.remove('on'); G.sleeping = false; }, 400); }, 800);
}

export function interact() {
  if (G.working || G.sleeping) return;
  if (G.dialog) { advanceDialog(); return; }
  const p = pos(), s = G.state;
  if (tryCompleteTask()) return;
  if (missionAvailable() && !G.task && dist(p, missionPos()) < curMission().r) { runMission(); return; }   // paused stories resume here
  const j = jobOf(s.job);
  if (j && dist(p, jobPos(j)) < 9) { G.working = { job: j, t: 0 }; return; }
  if (nearHome()) { sleep(homeProp()); return; }
  if (!G.inCar) {
    const gate = nearGate(); if (gate) { agentDialog(gate); return; }
    const night = nearNight(); if (night) { hookupDialog(night); return; }
    if (nearKiosk()) { posDialog(); return; }
    if (nearYaba()) { petDialog(); return; }
    const place = nearPlace(); if (place) { openPlace(place); return; }
    if (nearDealer()) { dealerDialog(); return; }
    if (nearRacer()) { racerDialog(); return; }
    const bank = nearKind('bank', 11); if (bank) { emit('phone:open', 'bank'); return; }
    const venue = nearKind('venue', 11);
    if (venue) {
      if (!venueOpen()) return toast(`${venue.name} opens at ${TIME.venueOpen}:00`);
      if (!pay(venue.cost, `Night out · ${venue.name}`)) return toast('Not enough money');
      s.stamina = 100; s.health = Math.min(100, s.health + 10); xp(5);
      toast(`Good vibes at ${venue.name} · stamina restored`); emit('hud'); return;
    }
    const party = nearKind('owambe', 16);
    if (party) {
      if (!owambeOn()) return toast('Owambe starts at 19:00');
      if (s.partyDay === s.day) return toast('You don spray enough for tonight');
      if (!pay(party.cost, 'Owambe · spraying')) return toast('Not enough money to spray');
      s.partyDay = s.day; s.stamina = 100; xp(15); addRep('social', 8); gainSkill('charisma', 3);
      toast('You spray, you dance, you network · +15 XP'); msg('amaka', 'Saw you at the owambe. You sabi dance! Call me when you need work.'); return;
    }
    const worship = nearKind('worship', 12);
    if (worship) {
      if (s.prayedDay === s.day) return toast('You already prayed today');
      s.prayedDay = s.day; s.stamina = Math.min(100, s.stamina + 30); if (s.heat > 0) s.heat--; xp(5); addRep('public', 3);
      toast(`${worship.name} · peace of mind, heat eased`); emit('hud'); return;
    }
    const hotel = nearKind('hotel', 13);
    if (hotel) { if (!pay(hotel.cost, `Room · ${hotel.name}`)) return toast('Not enough money'); sleep(null); return; }
    const police = nearKind('police', 13);
    if (police && s.heat > 0) {
      const fine = s.heat * ECON.fineRate;
      if (!pay(fine, 'Police fine · record cleared')) return toast('Not enough money to settle the fine');
      s.heat = 0; toast(`Record cleared · ${fmt(fine)} paid`); emit('hud'); return;
    }
    const nepa = nearKind('nepa', 12);
    if (nepa) { if (G.outage) { if (!pay(5000, 'NEPA · generator diesel')) return toast('Not enough money'); G.outage = 0; emit('sky'); toast('Up NEPA! Light don come back.'); } else toast('PHCN: "No outage for now. Pay your bill."'); return; }
  }
  if (nearPump()) {
    if (!pay(ECON.refuel, 'Fuel')) return toast('Not enough money to refuel');
    s.fuel = 100; toast('Tank full'); emit('hud');
  }
}

// What the bottom-centre prompt should show right now, or null.
export function promptFor() {
  const p = pos(), s = G.state;
  if (G.sleeping) return { text: '…' };
  if (G.dialog) return null;
  if (G.working) return { text: `Working · ${G.working.job.title}`, bar: G.working.t / G.working.job.dur };
  if (G.task && !G.race) { const d = missionPos(); if (d && dist(p, d) < 13 && (G.task.type !== 'steal' || G.inCar)) return { key: 'E', text: G.task.type === 'steal' ? 'Hand over the sedan' : 'Deliver' }; }
  if (missionAvailable() && !G.task && dist(p, missionPos()) < curMission().r) return { key: 'E', text: s.storyPaused ? 'Resume the story' : 'Talk' };
  const j = jobOf(s.job);
  if (j && dist(p, jobPos(j)) < 9) return { key: 'E', text: `Start shift · ${j.title}` };
  if (nearHome()) return { key: 'E', text: 'Sleep · restore and skip to morning' };
  if (!G.inCar) {
    const gate = nearGate(); if (gate) return { key: 'E', text: `Agent · ${gate.type} ${G.state.props.includes(gate.id) || G.state.rented?.id === gate.id ? '(yours)' : 'to let'}` };
    const night = nearNight(); if (night) return { key: 'E', text: `${night.name} · talk` };
    if (nearKiosk()) return { key: 'E', text: 'POS agent · cash, water, suya' };
    if (nearYaba()) return { key: 'E', text: 'Mama Nkechi · pets and provisions' };
    const place = nearPlace(); if (place) return { key: 'E', text: placePrompt(place) };
    if (nearDealer()) return { key: 'E', text: 'Dayo · buy or service a vehicle' };
    if (nearRacer()) return { key: 'E', text: 'Speedy · street race (₦20,000 wager)' };
    const bank = nearKind('bank', 11); if (bank) return { key: 'E', text: `${bank.name} · banking` };
    const venue = nearKind('venue', 11); if (venue) return venueOpen() ? { key: 'E', text: `${venue.name} · ${fmt(venue.cost)}` } : { text: `${venue.name} · opens ${TIME.venueOpen}:00` };
    const party = nearKind('owambe', 16); if (party) return owambeOn() ? { key: 'E', text: `Owambe · spray ${fmt(party.cost)}` } : { text: 'Owambe · tonight from 19:00' };
    const worship = nearKind('worship', 12); if (worship) return { key: 'E', text: `${worship.name} · pray` };
    const hotel = nearKind('hotel', 13); if (hotel) return { key: 'E', text: `Rent a room · ${fmt(hotel.cost)}` };
    const police = nearKind('police', 13); if (police && s.heat > 0) return { key: 'E', text: `Settle fine · ${fmt(s.heat * ECON.fineRate)}` };
    const nepa = nearKind('nepa', 12); if (nepa) return { key: 'E', text: G.outage ? 'PHCN · pay for diesel ₦5,000' : 'PHCN office' };
  }
  if (nearPump()) return { key: 'E', text: `Refuel · ${fmt(ECON.refuel)}` };
  if (G.inCar) return { key: 'F', text: 'Exit vehicle' };
  const c = nearestCar(); if (c) return { key: 'F', text: `Enter ${VEH[c.userData.type].name}` };
  return null;
}

// Sleep at a property (perks apply) or a hotel room (prop = null).
export function sleep(prop) {
  fadeOut(() => {
    const s = G.state;
    s.clock = 7; s.day++; s.health = 100; s.stamina = 100;
    if (prop?.perk === 'heat0') { s.heat = 0; s.fuel = 100; } else if (prop?.perk === 'heat1') s.heat = Math.max(0, s.heat - 1);
    applySky(); emit('hud'); emit('clock'); saveState(s);
    toast(`Day ${s.day} · Good morning, ${s.name.split(' ')[0]}`);
  });
}

export function setupInteraction() {
  on('key', k => { if (k === 'e') interact(); if (k === 'f') toggleCar(); });
}
