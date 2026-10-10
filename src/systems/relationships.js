import { G } from '../core/context.js';
import { emit, on } from '../core/events.js';
import { contactOf } from '../data/characters.js';
import { addRep, xp, msg } from './economy.js';
import { toast } from '../ui/feedback.js';
import { startDialog } from './dialogue.js';
import { JOBS } from '../data/jobs.js';
import { jobUnlocked } from './education.js';
import { applyJob, curMission, missionAvailable, missionPos, setWaypoint } from './navigation.js';

const DEFAULT_REL = { trust: 20, respect: 15 };

export function getRel(id) {
  const s = G.state;
  if (!s.contactRel) s.contactRel = {};
  s.contactRel[id] ??= { ...DEFAULT_REL };
  s.contactRel[id].trust ??= DEFAULT_REL.trust;
  s.contactRel[id].respect ??= DEFAULT_REL.respect;
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

function useDailyAction(id, kind = 'talk') {
  const key = kind === 'favour' ? 'contactFavourDay' : 'contactTalkDay';
  const days = G.state[key] ??= {};
  if (days[id] === G.state.day) return false;
  days[id] = G.state.day;
  return true;
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
  if (id === 'egbon') return talkToEgbon(c);
  const tier = relTier(id);

  const choices = [
    {
      label: 'Greet / small talk',
      apply() {
        if (!useDailyAction(id)) return toast(`You already caught up with ${c.name} today`);
        const previousTier = relTier(id);
        bumpRel(id, 2, 1);
        if (tier === 'stranger') addRep('social', 1);
        announceTierChange(c.name, previousTier, id);
        toast(`${c.name} · trust ${Math.round(getRel(id).trust)}`);
      },
    },
    {
      label: 'Ask about work',
      apply() {
        if (!useDailyAction(id)) return toast(`You already caught up with ${c.name} today`);
        const previousTier = relTier(id);
        bumpRel(id, 1, 2);
        announceTierChange(c.name, previousTier, id);
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
        const r = getRel(id);
        if (r.trust < 50) {
          bumpRel(id, -1, 0);
          toast(`${c.name} no too sure yet`);
          return;
        }
        if (!useDailyAction(id, 'favour')) return toast(`${c.name} has already helped you today`);
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

function announceTierChange(name, previousTier, id) {
  const nextTier = relTier(id);
  if (nextTier !== previousTier) toast(`${name} · relationship: ${nextTier}`);
}

function talkToEgbon(c) {
  const tier = relTier('egbon');
  const social = G.state.rep?.social || 0;
  const offers = [];
  if (G.state.job) {
    offers.push({ label: 'You already have active work', apply() {} });
  } else {
    const localOnly = social < 10 && tier !== 'friend' && tier !== 'close';
    const candidates = JOBS.filter(job =>
      job.id !== G.state.job &&
      jobUnlocked(job) &&
      (!job.night || G.state.clock >= 20 || G.state.clock < 4) &&
      (!job.far || social >= 18 || tier === 'close') &&
      (!localOnly || !job.far)
    ).sort((a, b) => b.pay - a.pay);
    for (const job of candidates.slice(0, 2)) {
      offers.push({
        label: `Take lead · ${job.title} · ${job.where}`,
        apply() {
          if (G.state.job) return toast('Finish or cancel your current job first');
          G.state.job = job.id;
          G.state.waypoint = null;
          applyJob();
          toast(`Egbon linked you with ${job.title} · head to ${job.where}`);
          msg('egbon', `I put your name forward for ${job.title}. Go show them say I no recommend anyhow person.`);
        },
      });
    }
    if (!candidates.length) offers.push({ label: 'No matching work lead yet', apply() { toast('Build your skills or reputation, then check back'); } });
  }
  const canOfferStoryLead = social >= 10 || tier === 'friend' || tier === 'close';
  if (canOfferStoryLead && missionAvailable()) {
    const mission = curMission(), target = missionPos();
    if (target) offers.push({
      label: `Story lead · ${mission.title}`,
      apply() {
        setWaypoint({ x: target.x, z: target.z, label: `Egbon lead · ${mission.title}` });
        toast(`Egbon shared a lead · ${mission.title}`);
      },
    });
  }
  offers.push({
    label: 'Talk with Egbon',
    apply() {
      const previousTier = relTier('egbon');
      if (!useDailyAction('egbon')) return toast('You already checked in with Egbon today');
      bumpRel('egbon', 2, 2);
      announceTierChange(c.name, previousTier, 'egbon');
      toast(`Egbon · neighbourhood respect ${Math.round(G.state.contactRel.egbon.respect)}`);
    },
  }, { label: 'Leave', apply() {} });
  startDialog(
    [{ s: 'egbon', t: social >= 18
      ? 'Your name don dey travel past Surulere. I fit connect you to longer runs; keep your word and the community go remember.'
      : 'I know everybody for this adugbo. Build your name, do good work, and I go connect you to stronger jobs and story leads.' }],
    offers.slice(0, 6),
    choice => { choice.apply?.(); emit('hud'); }
  );
  return true;
}

/** Optional: mission success boosts contact who owns the mission */
export function rewardContact(id, trust = 5, respect = 5) {
  if (!id) return;
  const previousTier = relTier(id);
  bumpRel(id, trust, respect);
  announceTierChange(contactOf(id)?.name || id, previousTier, id);
}

on('mission:completed', mission => {
  const who = mission.who || (typeof mission.lines === 'function' ? mission.lines()[0]?.s : null);
  rewardContact(who, 4, 5);
});
