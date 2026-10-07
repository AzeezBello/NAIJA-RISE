import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { contactOf } from '../data/characters.js';
import { addRep, xp } from './economy.js';
import { toast } from '../ui/feedback.js';
import { startDialog } from './dialogue.js';

const DEFAULT_REL = { trust: 20, respect: 15 };

export function getRel(id) {
  const s = G.state;
  if (!s.contactRel) s.contactRel = {};
  if (!s.contactRel[id]) s.contactRel[id] = { ...DEFAULT_REL };
  return s.contactRel[id];
}

export function bumpRel(id, trust = 0, respect = 0) {
  const r = getRel(id);
  r.trust = Math.max(0, Math.min(100, r.trust + trust));
  r.respect = Math.max(0, Math.min(100, r.respect + respect));
  return r;
}

export function relTier(id) {
  const r = getRel(id);
  const score = (r.trust + r.respect) / 2;
  if (score >= 70) return 'close';
  if (score >= 45) return 'friend';
  if (score >= 25) return 'known';
  return 'stranger';
}

/** Greeting line by tier */
function greetLine(id) {
  const c = contactOf(id);
  const tier = relTier(id);
  const lines = {
    stranger: `${c?.line || 'Wetin you want?'}`,
    known: `Ah, ${G.state.name.split(' ')[0]}. How far?`,
    friend: `My guy! You don show. Wetin dey?`,
    close: `My person. Anything you need, talk.`,
  };
  return lines[tier];
}

/**
 * Generic talk-to-contact menu. Call when player presses E near a story contact
 * and no mission/family prompt owns the interaction.
 */
export function talkToContact(id) {
  const c = contactOf(id);
  if (!c) return false;
  const tier = relTier(id);
  const r = getRel(id);

  const choices = [
    {
      label: 'Greet / small talk',
      apply() {
        bumpRel(id, 2, 1);
        if (tier === 'stranger') addRep('social', 1);
        toast(`${c.name} · trust ${Math.round(getRel(id).trust)}`);
      },
    },
    {
      label: 'Ask about work',
      apply() {
        bumpRel(id, 1, 2);
        toast(tier === 'close' || tier === 'friend'
          ? `${c.name} gives you a useful tip`
          : `${c.name}: 'Hustle hard, my friend.'`);
        if (tier === 'friend' || tier === 'close') xp(3);
      },
    },
  ];

  if (tier === 'friend' || tier === 'close') {
    choices.push({
      label: 'Ask for a favour',
      apply() {
        if (r.trust < 50) {
          bumpRel(id, -1, 0);
          toast(`${c.name} no too sure yet`);
          return;
        }
        bumpRel(id, -3, 2); // favour spends trust, gains respect if repaid later
        G.state.cash += 2000;
        toast(`${c.name} lends you ₦2,000`);
      },
    });
  }

  choices.push({ label: 'Leave', apply() {} });

  startDialog(
    [{ s: id, t: greetLine(id) }],
    choices,
    ch => { ch.apply?.(); emit('hud'); }
  );
  return true;
}

/** Optional: mission success boosts contact who owns the mission */
export function rewardContact(id, trust = 5, respect = 5) {
  if (!id) return;
  bumpRel(id, trust, respect);
}
