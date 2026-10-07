import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { TRAITS } from '../data/crew.js';
import { startDialog } from './dialogue.js';
import { pay, tx, addRep, xp, addHeat} from './economy.js';
import { toast } from '../ui/feedback.js';


function greeting(c) {
  const call = c.route?.call || 'Enter!';
  if (c.role === 'conductor') {
    if (c.trait === 'jolly') return `${call} My guy, enter make we dey go! Owo na ${fmt(c.fare)}.`;
    if (c.trait === 'strict') return `${call} Exact change. ${fmt(c.fare)}. No story.`;
    if (c.trait === 'noChange') return `${call} ${fmt(c.fare)} — I no get change o!`;
    if (c.trait === 'hustler') return `${call} Owo da? Make e be ${fmt(c.fare)}.`;
    return `${call} Pay ${fmt(c.fare)}.`;
  }
  // driver
  if (c.trait === 'tired') return `I don tire… still going ${c.route?.id || 'town'}. ${fmt(c.fare)}.`;
  if (c.trait === 'patient') return `No rush. Seat dey. ${fmt(c.fare)} when you ready.`;
  if (c.trait === 'jolly') return `Oya enter! Radio dey, AC no dey — but we go reach. ${fmt(c.fare)}.`;
  return `${call} I dey drive. Conductor go collect ${fmt(c.fare)}.`;
}

export function runCrewDialog(c) {
  const trait = TRAITS[c.trait] || TRAITS.patient;
  c.cool = trait.cool;

  const speaker = c.role === 'conductor' ? 'conductor' : (c.vehType === 'brt' ? 'brt_driver' : 'driver');

  const choices = [
    {
      label: `Pay ${fmt(c.fare)} · board`,
      reply: c.trait === 'jolly' ? 'Correct person. Enter!' : 'Oya, waka enter.',
      apply() {
        if (!pay(c.fare, `${c.vehType} fare · ${c.name}`)) {
          toast('No cash for fare');
          return;
        }
        addRep('street', 1);
        xp(2);
        // Soft “ride”: clock nudge + small stamina cost
        G.state.clock = (G.state.clock + 0.35) % 24;
        G.state.stamina = Math.max(10, G.state.stamina - 4);
        toast(`Boarded ${c.vehType.toUpperCase()} · ${c.route?.call || 'along'}`);
        // Optional: teleport toward a route stop later
      },
    },
    {
      label: 'Negotiate · half',
      reply: c.trait === 'patient' || c.trait === 'jolly'
        ? `Okay, bring ${fmt(Math.round(c.fare * 0.7))}.`
        : 'No negotiation for this route.',
      apply() {
        if (c.trait === 'patient' || c.trait === 'jolly') {
          const f = Math.round(c.fare * 0.7 / 50) * 50;
          if (!pay(f, `${c.vehType} fare (nego)`)) return toast('No cash');
          addRep('street', 2);
          toast('Conductor gree · half-ish fare');
        } else if (c.trait === 'strict') {
          toast('Conductor shout: exact fare!');
          if (trait.heatOnRefuse) addHeat?.(1, 'Bus argument');
        } else {
          toast('Them no gree');
        }
      },
    },
    {
      label: 'I no get money',
      reply: c.trait === 'strict' ? 'Comot for road!' : 'Next time bring change.',
      apply() {
        if (c.trait === 'strict' && trait.heatOnRefuse) {
          addHeat?.(1, 'Bus trouble');
          toast('Argument for bus stop · Heat +1');
        } else if (c.trait === 'hustler') {
          toast('Conductor hiss and turn away');
        } else {
          toast('They wave you off');
        }
        addRep('street', c.trait === 'jolly' ? 0 : -1);
      },
    },
    {
      label: 'Just asking route',
      reply: `${c.route?.call || 'Along'} — ${c.traitLabel} ${c.role}.`,
      apply() { toast(c.route?.call || 'No route'); },
    },
  ];

  startDialog(
    [{ s: speaker, t: greeting(c) }],
    choices,
    ch => { ch.apply?.(); emit('hud'); }
  );
}

/** Nearest crew for promptFor */
export function nearCrew(r = 3.2) {
  if (G.inCar || !G.crew) return null;
  const p = G.player.position;
  let best = null, bd = r;
  for (const c of G.crew) {
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    // use live position if conductor paced
    const d2 = Math.hypot(p.x - c.g.position.x, p.z - c.g.position.z);
    const dd = Math.min(d, d2);
    if (dd < bd) { bd = dd; best = c; }
  }
  return best;
}