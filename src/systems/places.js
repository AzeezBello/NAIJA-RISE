import { G, pos } from '../core/context.js';
import { emit } from '../core/events.js';
import { dist, fmt, pick } from '../core/utils.js';
import { PLACES_CFG } from '../data/config.js';
import { LANDMARKS, VENDORS } from '../data/locations.js';
import { toast } from '../ui/feedback.js';
import { pay, tx, xp, addItem, addRep, gainSkill, msg } from './economy.js';
import { startDialog } from './dialogue.js';
import { cafeCourseRows, completeCourse, completeYabaTechSemester } from './education.js';

// Living City places (Phase 2): gym, restaurant, mall + cinema, cyber café, football pitch, roadside vendors.
// Every activity moves the player model: money, stamina (energy), skills, reputation, time — and opens opportunities.
const s = () => G.state;
const nearKind = (kind, r) => LANDMARKS.find(l => l.kind === kind && dist(pos(), l) < r);
export const nearPlace = () => (G.inCar ? null : nearKind('gym', 12) || nearKind('restaurant', 12) || nearKind('mall', 18) || nearKind('cafe', 12) || nearKind('pitch', 20) || nearKind('school', 12) || (VENDORS.some(([x, z]) => dist(pos(), { x, z }) < 3.5) ? { kind: 'vendor', name: 'Roadside vendor' } : null));
const hours = h => { s().clock = Math.min(23.95, s().clock + h); emit('clock'); };
const done = ch => { ch.apply?.(); emit('hud'); };

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
