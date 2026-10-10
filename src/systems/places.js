import { G, pos } from '../core/context.js';
import { emit } from '../core/events.js';
import { dist, fmt, pick } from '../core/utils.js';
import { PLACES_CFG } from '../data/config.js';
import { LANDMARKS, VENDORS } from '../data/locations.js';
import { toast } from '../ui/feedback.js';
import { pay, tx, xp, addItem, addRep, gainSkill, msg } from './economy.js';
import { startDialog } from './dialogue.js';
import { cafeCourseRows, completeCourse, completeYabaTechSemester } from './education.js';
import { startSideTask } from './missions.js';

// Living City places (Phase 2): gym, restaurant, mall + cinema, cyber café, football pitch, roadside vendors.
// Every activity moves the player model: money, stamina (energy), skills, reputation, time — and opens opportunities.
const s = () => G.state;
const nearKind = (kind, r) => LANDMARKS.find(l => l.kind === kind && dist(pos(), l) < r);
export const nearPlace = () => (G.inCar ? null : nearKind('gym', 12) || nearKind('restaurant', 12) || nearKind('mall', 18) || nearKind('cafe', 12) || nearKind('pitch', 20) || nearKind('school', 12) || (VENDORS.some(([x, z]) => dist(pos(), { x, z }) < 3.5) ? { kind: 'vendor', name: 'Roadside vendor' } : null));
const hours = h => { s().clock = Math.min(23.95, s().clock + h); emit('clock'); };
const done = ch => { ch.apply?.(); emit('hud'); };

const HUSTLE_HUBS = {
  egbon: {
    name: 'Surulere',
    contact: 'egbon',
    at: 'egbon-desk',
    missions: [
      ['Deliver a workshop parts crate to Ladipo Garage', 'ladipo', 'phone_parts', 35, 18000, 'Parts Crate', 'business'],
      ['Take community notices to the Iponri Logistics Yard', 'marina', 'event_flyers', 30, 15000, 'Community Notices', 'social'],
    ],
  },
  ikoyi_merchant: {
    name: 'Ikoyi',
    contact: 'ikoyi_merchant',
    at: 'ikoyi-market',
    missions: [
      ['Deliver a market basket to Ikoyi Club', 'ikoyi-club', 'market_basket', 30, 20000, 'Market Basket', 'business'],
      ['Take supplies to the Ikoyi Boulevard service desk', 'ikoyi-boulevard', 'school_supplies', 35, 24000, 'Supplies', 'business'],
    ],
  },
  lekki_keeper: {
    name: 'Lekki–Epe',
    contact: 'lekki_keeper',
    at: 'sangotedo',
    missions: [
      ['Carry field supplies to Lekki Conservation Centre', 'lekki-conservation', 'conservation_kit', 40, 22000, 'Conservation Kit', 'public'],
      ['Deliver school materials to Ajah Community School', 'ajah-school', 'school_supplies', 35, 18000, 'School Supplies', 'public'],
    ],
  },
  ikorodu_trader: {
    name: 'Ikorodu',
    contact: 'ikorodu_trader',
    at: 'ikorodu-market',
    missions: [
      ['Take a market basket to Ikorodu Garage', 'ikorodu-garage-town', 'market_basket', 35, 16000, 'Market Basket', 'business'],
      ['Deliver school supplies to Ikorodu Senior Grammar School', 'ikorodu-school', 'school_supplies', 35, 18000, 'School Supplies', 'public'],
    ],
  },
  apapa_dispatch: {
    name: 'Apapa Port',
    contact: 'apapa_dispatch',
    at: 'apapa-port',
    missions: [
      ['Deliver the dock manifest to Apapa Wharf', 'apapa-wharf', 'dock_manifest', 30, 24000, 'Dock Manifest', 'business'],
      ['Take supplies from the port to Apapa Community School', 'apapa-school', 'school_supplies', 35, 19000, 'School Supplies', 'public'],
    ],
  },
  oyingbo_trader: {
    name: 'Oyingbo · Empire',
    contact: 'oyingbo_trader',
    at: 'oyingbo-market',
    missions: [
      ['Deliver a market basket to the Oyingbo Rail Terminal', 'oyingbo-rail', 'market_basket', 25, 14000, 'Market Basket', 'business'],
      ['Carry community notices to Empire', 'empire', 'event_flyers', 20, 12000, 'Community Notices', 'social'],
    ],
  },
  yaba_connector: {
    name: 'Yaba · Alagomeji',
    contact: 'yaba_connector',
    at: 'alagomeji-tech',
    missions: [
      ['Run laptop parts to the Yaba Sign Painting Studio', 'yaba-painter', 'laptop_parts', 30, 20000, 'Laptop Parts', 'business'],
      ['Deliver school supplies to Yaba College of Technology', 'yabatech', 'school_supplies', 35, 22000, 'School Supplies', 'public'],
    ],
  },
  agege_baker: {
    name: 'Agege',
    contact: 'agege_baker',
    at: 'agege-market',
    missions: [
      ['Deliver fresh bread to Agege Bus Garage', 'agege-garage', 'fresh_bread', 25, 14000, 'Fresh Bread', 'business'],
      ['Take bread to the Agege Carpentry Workshop', 'agege-carpenter', 'fresh_bread', 20, 12000, 'Fresh Bread', 'business'],
    ],
  },
  ojo_trader: {
    name: 'Ojo · Badagry',
    contact: 'ojo_trader',
    at: 'ojo-alaba',
    missions: [
      ['Deliver electronics parts to the Ojo Welding Yard', 'ojo-welder', 'phone_parts', 30, 18000, 'Electronics Parts', 'business'],
      ['Carry a market basket to Ojo Market', 'ojo-market', 'market_basket', 25, 14000, 'Market Basket', 'business'],
    ],
  },
  cv_oga: {
    name: 'Computer Village',
    contact: 'cv_oga',
    at: 'ikeja-tech',
    missions: [
      ['Deliver replacement phone parts to Ikeja Senior High School', 'ikeja-school', 'phone_parts', 30, 18000, 'Phone Parts', 'business'],
      ['Run laptop parts to the airport service desk', 'ikeja-airport', 'laptop_parts', 40, 26000, 'Laptop Parts', 'business'],
      ['Set up a POS terminal at Ikeja City Centre', 'ikeja-city', 'pos_terminal', 35, 22000, 'POS Terminal', 'business'],
    ],
  },
  balogun_osoanya: {
    name: 'Balogun Market',
    contact: 'balogun_osoanya',
    at: 'balogun-market',
    intro: 'Osoanya — also called Oso-ahia — are commission agents who connect shoppers with market traders. Pick a customer order and earn your cut on delivery.',
    missions: [
      ['Carry a fabric order from Balogun Market to Shitta Market', 'shitta', 'fabric_order', 30, 18000, 'Fabric Order', 'business'],
      ['Deliver a customer parcel from Balogun Market to Yaba Market', 'yaba', 'market_basket', 35, 22000, 'Customer Parcel', 'business'],
    ],
  },
  yaba_osoanya: {
    name: 'Yaba Market',
    contact: 'yaba_osoanya',
    at: 'yaba',
    intro: 'We connect Yaba shoppers with traders and earn commission for each completed order. Help us get this purchase to the buyer.',
    missions: [
      ['Deliver a Yaba Market order to Computer Village', 'ikeja-tech', 'phone_parts', 40, 26000, 'Electronics Order', 'business'],
      ['Carry a clothing parcel from Yaba Market to Tejuosho Market', 'tejuosho', 'fabric_order', 25, 16000, 'Clothing Parcel', 'business'],
    ],
  },
  computer_village_osoanya: {
    name: 'Computer Village',
    contact: 'computer_village_osoanya',
    at: 'ikeja-tech',
    intro: 'We be Osoanya, commission agents. We match customers with trusted phone and computer traders, then earn when the order reaches its buyer.',
    missions: [
      ['Deliver a phone repair order from Computer Village to Yaba Market', 'yaba', 'phone_parts', 40, 24000, 'Repair Order', 'business'],
      ['Carry a laptop order from Computer Village to Ikeja City Centre', 'ikeja-city', 'laptop_parts', 25, 18000, 'Laptop Order', 'business'],
    ],
  },
  sisi: {
    name: 'AJ City',
    contact: 'sisi',
    at: 'ajegunle',
    missions: [
      ['Take donated football boots to Baba Goal at the AJ City Street Pitch', 'ajpitch', 'football_boots', 25, 12000, 'Football Boots', 'street'],
    ],
  },
  makoko_fisher: {
    name: 'Makoko',
    contact: 'makoko_fisher',
    at: 'makoko-shore-stop',
    missions: [
      ['Carry the fresh fish crate to the Makoko Canoe Landing', 'makoko-canoe-landing', 'fish_crate', 18, 9000, 'Fish Crate', 'business'],
    ],
  },
  shrine_host: {
    name: 'New Afrika Shrine',
    contact: 'shrine_host',
    at: 'new-afrika-shrine',
    missions: [
      ['Deliver audio cables to the Ikeja City Centre event crew', 'ikeja-city', 'event_cables', 45, 24000, 'Event Cables', 'social'],
      ['Take spare stage connectors to Kalakuta Republic', 'kalakuta-republic', 'event_cables', 50, 28000, 'Event Cables', 'social'],
    ],
  },
  kalakuta_guide: {
    name: 'Kalakuta Republic',
    contact: 'kalakuta_guide',
    at: 'kalakuta-republic',
    missions: [
      ['Deliver an archive box to the New Afrika Shrine history room', 'new-afrika-shrine', 'archive_box', 50, 28000, 'Archive Box', 'social'],
    ],
  },
};

export const isHustleContact = id => Object.hasOwn(HUSTLE_HUBS, id);
export const hustleContactAtPlace = placeId =>
  Object.values(HUSTLE_HUBS).find(hub => hub.at === placeId)?.contact || null;

export function openHustleHub(contactId) {
  const hub = HUSTLE_HUBS[contactId];
  if (!hub) return false;
  const contact = hub.contact;
  startDialog([{ s: contact, t: `${hub.intro || `Welcome to ${hub.name}.`} Choose a local run. Deliveries pay when you reach the destination before the deadline.` }], [
    ...(G.task ? [] : hub.missions.map(([description, dest, item, minutes, reward, deliveryLabel, rep]) => ({
      label: description,
      apply() {
        startSideTask({
          dest,
          item,
          minutes,
          obj: description,
          deliveryLabel,
          onComplete() {
            s().cash += reward;
            tx(`${hub.name} delivery`, reward);
            xp(12);
            addRep(rep, 2);
            toast(`Delivery complete · +${fmt(reward)}`);
          },
          onFail() {
            toast(`${hub.name} delivery missed its deadline`);
          },
        });
      },
    }))),
    { label: 'Leave', apply() {} },
  ], done);
  return true;
}

export function placePrompt(p) {
  return { gym: 'Enter gym', restaurant: `Enter ${p.name}`, mall: 'Enter mall', cafe: 'Enter cyber café', pitch: 'Join the football', school: 'Visit school · evening class', vendor: 'Buy from vendor' }[p.kind];
}

export function openPlace(p) { ({ gym: gymMenu, restaurant: foodMenu, mall: mallMenu, cafe: cafeMenu, pitch: footballMenu, school: schoolMenu, vendor: vendorMenu })[p.kind](p); }

/* ---------- gym ---------- */
export const gymMember = () => s().gym.until > s().day;
function train(kind, fitnessGain, strengthGain, cost) {
  if (s().stamina < 35) return toast('Too tired to train — eat or rest first');
  if (cost && !pay(cost, `Gym · ${kind}`)) return toast('Not enough money');
  s().stamina = Math.max(0, s().stamina - 35); s().gym.sessions++;
  if (fitnessGain) gainSkill('fitness', fitnessGain);
  if (strengthGain) gainSkill('strength', strengthGain);
  hours(1); xp(4);
  toast(`${kind} done${fitnessGain ? ` · Fitness +${fitnessGain}` : ''}${strengthGain ? ` · Strength +${strengthGain}` : ''}`);
  if (s().gym.sessions === 5) msg('coach', 'Five sessions. You dey build. Boxing class dey open for you now.');
  return true;
}
function gymMenu() {
  const c = PLACES_CFG.gym, m = gymMember();
  startDialog([{ s: 'coach', t: m ? `Member till day ${s().gym.until}. Fitness helps you recover faster; strength makes sprinting cost less. Wetin we dey train today?` : `Day pass ${fmt(c.dayPass)}, monthly ${fmt(c.monthly)}. Fitness helps recovery; strength makes sprinting cost less. Which one you want to build?` }], [
    { label: m ? 'Strength training' : `Strength training · day pass ${fmt(c.dayPass)}`, apply() { train('Strength training', 2, 5, m ? 0 : c.dayPass); } },
    { label: m ? 'Cardio' : `Cardio · day pass ${fmt(c.dayPass)}`, apply() { if (train('Cardio', 5, 0, m ? 0 : c.dayPass)) s().stamina = Math.min(100, s().stamina + 10); } },
    { label: `Personal trainer · ${fmt(c.trainer)}`, apply() { train('Trainer session', 5, 6, c.trainer); } },
    ...(s().skills.fitness >= c.boxingMin ? [{ label: 'Boxing class', apply() { if (train('Boxing', 3, 4, m ? 0 : c.dayPass)) addRep('street', 3); } }] : []),
    ...(m ? [] : [{ label: `Monthly membership · ${fmt(c.monthly)}`, apply() { if (!pay(c.monthly, 'Gym membership')) return toast('Not enough money'); s().gym.until = s().day + 30; addRep('social', 2); toast('Member for 30 days'); } }]),
    { label: 'Leave', apply() {} },
  ].slice(0, 6), done);
}

/* ---------- restaurant ---------- */
function foodMenu(p) {
  const items = PLACES_CFG.food.filter(([n]) => n !== 'Business lunch' || s().owned.length);
  startDialog([{ s: 'cashier', t: `Welcome to ${p.name}. Wetin you dey chop?` }], [
    ...items.map(([name, cost, sta, hp]) => ({ label: `${name} · ${fmt(cost)}`, apply() {
      if (!pay(cost, `${p.name} · ${name}`)) return toast('Not enough money');
      s().stamina = Math.min(100, s().stamina + sta); s().health = Math.min(100, s().health + hp); s().ate = s().day; hours(0.5);
      if (name === 'Business lunch') { addRep('business', 3); gainSkill('charisma', 2); toast('Good meeting · Business reputation up'); } else toast(`${name} · energy +${sta}`);
    } })),
    { label: 'Leave', apply() {} },
  ], done);
}

/* ---------- mall + cinema ---------- */
function mallMenu(p) {
  const c = PLACES_CFG.mall;
  startDialog([{ s: 'mallguy', t: 'Clothing, electronics, supermarket, barber — or the cinema upstairs.' }], [
    { label: `Buy an outfit · ${fmt(c.outfit)}`, apply() { if (!pay(c.outfit, 'Mall · outfit')) return toast('Not enough money'); s().outfit++; s().look.shirt = (s().look.shirt + 1) % 6; gainSkill('charisma', 3); addRep('social', 2); import('../entities/player.js').then(m => m.applyLook()); toast('Fresh fit · Charisma +3'); } },
    { label: s().inv.laptop ? 'Laptop · owned' : `Laptop · ${fmt(c.laptop)}`, apply() { if (s().inv.laptop) return; if (!pay(c.laptop, 'Mall · laptop')) return toast('Not enough money'); addItem('laptop'); toast('Laptop bought — freelance gigs pay double at the cyber café'); } },
    { label: `Supermarket run · ${fmt(c.groceries)}`, apply() { if (!pay(c.groceries, 'Mall · groceries')) return toast('Not enough money'); addItem('water', 5); addItem('suya', 2); toast('5 Pure Water, 2 Suya in your bag'); } },
    { label: `Barber · ${fmt(c.barber)}`, apply() { if (!pay(c.barber, 'Barber')) return toast('Not enough money'); s().look.hair = (s().look.hair + 1) % 5; gainSkill('charisma', 1); import('../entities/player.js').then(m => m.applyLook()); toast('Fresh cut'); } },
    { label: 'Cinema', apply() { cinemaMenu(); } },
    { label: 'Leave', apply() {} },
  ], done);
}
function cinemaMenu() {
  const c = PLACES_CFG.cinema;
  startDialog([{ s: 'mallguy', t: `Now showing: ${c.movies.join(', ')}. Ticket ${fmt(c.ticket)}.` }], [
    ...c.movies.map((m, i) => ({ label: `${m} · ${fmt(c.ticket)}`, apply() {
      if (!pay(c.ticket, `Cinema · ${m}`)) return toast('Not enough money');
      hours(2); s().stamina = Math.min(100, s().stamina + 20); addRep('social', 3); xp(5);
      const after = [() => msg('amaka', 'You watched King of Boys? That one na Lagos politics. We go talk.'), () => msg('babak', 'Danfo Chronicles! That film na my life story.'), () => msg('nkechi', 'Lagos Never Sleeps... true talk. Come buy pure water.')][i];
      after(); toast(`${m} · good night out`);
    } })),
    { label: 'Back', apply() { mallMenu(); } },
  ], done);
}

/* ---------- cyber café ---------- */
function cafeMenu() {
  const c = PLACES_CFG.cafe, st = s(), rows = cafeCourseRows();
  const skilled = rows.filter(r => r.done).length, gig = c.gig * (st.inv.laptop ? 2 : 1);
  startDialog([{ s: 'cafeguy', t: skilled ? `You get ${skilled} certificate${skilled > 1 ? 's' : ''}. Freelance gig ${fmt(gig)}. Courses still dey.` : 'Learn a trade for the digital economy. Certificates open better jobs.' }], [
    ...rows.filter(r => !r.done).map(r => ({ label: `Learn ${r.name} · ${fmt(r.cost)} · ${r.hrs}h`, apply() {
      if (st.stamina < 20) return toast('Too tired to study — rest first');
      if (!pay(r.cost, `Course · ${r.name}`)) return toast('Not enough money');
      st.stamina -= 20; hours(r.hrs || 3); completeCourse(r.id, r.name, r.hrs, r.skills);
    } })),
    ...(skilled ? [{ label: `Freelance gig · ${fmt(gig)}`, apply() { if (st.stamina < 25) return toast('Too tired to focus'); st.cash += gig; tx('Freelance gig', gig); hours(2); st.stamina -= 25; gainSkill('business', 3); addRep('business', 2); xp(12); toast(`Gig delivered · +${fmt(gig)}`); } }] : []),
    { label: `Browse jobs · ${fmt(c.browse)}`, apply() { if (!pay(c.browse, 'Cyber café')) return toast('No money'); hours(0.5); gainSkill('business', 1); toast('Applications sent — check Jobs on your phone'); } },
    { label: 'Leave', apply() {} },
  ].slice(0, 8), done);
}

/* ---------- Community Grammar School: evening adult classes ---------- */
function schoolMenu(p) {
  const cfg = PLACES_CFG.school, st = s(), helped = st.familyDone?.school_levy != null;
  if (p.id === 'yabatech') {
    const college = st.college;
    const course = cfg.yabaTech;
    const semesterAction = () => {
      if (st.stamina < course.stamina) return toast('Too tired to study — rest first');
      if (!pay(course.semester, 'Yaba Tech · semester fees')) return toast('Not enough money for semester fees');
      st.stamina -= course.stamina;
      hours(course.duration);
      completeYabaTechSemester();
    };
    startDialog([{
      s: 'cafeguy',
      t: college?.graduated
        ? 'Your Yaba Tech Diploma don complete. The Alagomeji Tech Hub dey hire — check your Jobs app.'
        : college
          ? `Welcome back. You don complete ${college.semester} of ${course.semesters} semesters for Computer Systems.`
          : `Yaba College of Technology. Enrol for the Computer Systems diploma, study ${course.semesters} semesters, and qualify for IT support work.`,
    }], [
      ...(!college ? [{
        label: `Enrol · Computer Systems diploma · ${fmt(course.enrollment)}`,
        apply() {
          if (!pay(course.enrollment, 'Yaba Tech · enrollment')) return toast('Not enough money to enrol');
          st.college = { program: 'computer-systems', semester: 0, enrolledDay: st.day, graduated: false };
          hours(1);
          xp(5);
          toast('Enrolled at Yaba Tech · Computer Systems');
        },
      }] : []),
      ...(college && !college.graduated ? [{
        label: `Study semester ${college.semester + 1} · ${fmt(course.semester)} · ${course.duration}h`,
        apply: semesterAction,
      }] : []),
      { label: 'Leave', apply() {} },
    ], done);
    return;
  }
  startDialog([{ s: 'cafeguy', t: helped ? 'Chioma school levy don clear. Evening adult class dey open for you.' : 'Community Grammar School. Evening adult classes — or support a student.' }], [
    { label: `Evening class · ${fmt(cfg.eveningClass)}`, apply() {
      if (st.stamina < 15) return toast('Too tired');
      if (!pay(cfg.eveningClass, 'School · evening class')) return toast('Not enough money');
      st.stamina -= 15; hours(2);
      for (const [k, v] of Object.entries(cfg.eveningSkill || {})) gainSkill(k, v);
      xp(helped ? 12 : 8); if (helped) addRep('social', 2);
      toast(helped ? 'Class done · extra credit for helping family' : 'Class done');
    } },
    { label: 'Leave', apply() {} },
  ], done);
}

/* ---------- street football ---------- */
function footballMenu() {
  const c = PLACES_CFG.football, f = s().football, tier = Math.min(f.tier, c.tiers.length - 1);
  startDialog([{ s: 'captain', t: f.wins ? `${f.wins} win${f.wins > 1 ? 's' : ''}. Next: ${c.tiers[tier]}${c.prizes[tier] ? ` — ${fmt(c.prizes[tier])} prize` : ''}.` : `Five-a-side. ${fmt(c.wager)} wager or just play. You sabi ball?` }], [
    { label: `${c.tiers[tier]}${c.prizes[tier] ? '' : ` · ${fmt(c.wager)} wager`}`, apply() { playMatch(tier, true); } },
    { label: 'Friendly kickabout (no money)', apply() { playMatch(0, false); } },
    { label: 'Leave', apply() {} },
  ], done);
}
function playMatch(tier, stakes) {
  const c = PLACES_CFG.football, f = s().football;
  if (s().stamina < 40) return toast('Too tired to play');
  if (stakes && !c.prizes[tier] && !pay(c.wager, 'Football wager')) return toast('Not enough money for the wager');
  const chance = 0.35 + s().skills.fitness * 0.006 - tier * 0.12;
  const won = Math.random() < chance;
  s().stamina -= 40; hours(1.5); gainSkill('fitness', 3); addRep('social', 2);
  if (won) {
    f.wins++; addRep('street', 3); xp(10);
    if (stakes) { const prize = c.prizes[tier] || c.wager * 2; s().cash += prize; tx(c.tiers[tier], prize); toast(`You won ${c.tiers[tier]} · +${fmt(prize)}`); if (c.prizes[tier]) f.tier = Math.min(tier + 1, c.tiers.length - 1); }
    else toast('Won the kickabout · Fitness up');
    if (f.wins === 3) { f.tier = Math.max(f.tier, 1); msg('captain', 'Omo, you sabi ball! Neighbourhood tournament dey next week. ₦20,000 prize.'); }
    if (f.wins === 6) msg('amaka', 'Heard you dey win tournaments. Iponri crews want a sponsor deal — come see me.');
  } else toast(won === false && stakes ? 'Lost the match' : 'Lost the kickabout');
}

/* ---------- roadside vendor ---------- */
function vendorMenu() {
  startDialog([{ s: 'vendor', t: 'Pure water! Gala! Plantain chips! Cold one!' }], [
    { label: 'Pure Water · ₦100', apply() { if (!pay(100)) return toast('No money'); addItem('water'); toast('Pure water added'); } },
    { label: 'Gala & Coke · ₦800', apply() { if (!pay(800, 'Roadside snack')) return toast('No money'); s().stamina = Math.min(100, s().stamina + 25); toast('Energy +25'); } },
    { label: 'Suya · ₦1,500', apply() { if (!pay(1500)) return toast('No money'); addItem('suya'); toast('Suya added'); } },
    { label: 'Leave', apply() {} },
  ], done);
}
