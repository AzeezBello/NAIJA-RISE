import { G, pos } from '../core/context.js';
import { emit, on } from '../core/events.js';
import { dist, fmt, pick } from '../core/utils.js';
import {
  FAMILY, FAMILY_HOME, FAMILY_REQUESTS, familyOf, requestOf,
  scheduleSlot, spotCoords, REQUEST_NEED_LABEL, FAMILY_SPOTS, relationshipLabel,
} from '../data/family.js';
import { placeOf } from '../data/locations.js';
import { msg, pay, xp, addRep } from './economy.js';
import { toast, notify } from '../ui/feedback.js';
import { startDialog } from './dialogue.js';
import { setWaypoint } from './navigation.js';

const COOLDOWN_DAYS = 1;
const IGNORE_DAYS = 2;
const ARRIVE_EPS = 0.35;   // snap distance while lerping
const NEED_DECAY = {
  mum: { food: 12, companionship: 14 },
  sibling: { education: 9, companionship: 14 },
};

// Runtime positions (updated each frame)
const live = Object.create(null); // id → { x, z, label }

function resolveSpots() {
  const school = placeOf('school');
  if (school) FAMILY_SPOTS.school_gate = { x: school.x + 10, z: school.z - 12 };
  const yaba = placeOf('yaba');
  if (yaba) FAMILY_SPOTS.market_edge = { x: yaba.x + 8, z: yaba.z + 6 };
}

function canOffer(req, s) {
  const last = s.familyDone?.[req.id];
  if (last != null && s.day - last < COOLDOWN_DAYS) return false;
  if (req.need && (s.familyNeeds?.[req.who]?.[req.need] ?? 100) > (req.threshold ?? 75)) return false;
  return true;
}

export function maybeIssueFamilyRequest() {
  const s = G.state;
  if (s.familyReq) return;
  if (s.familyReqDay === s.day) return;
  const pool = FAMILY_REQUESTS.filter(r => canOffer(r, s));
  if (!pool.length) return;
  pool.sort((a, b) =>
    (s.familyNeeds?.[a.who]?.[a.need] ?? 100) - (s.familyNeeds?.[b.who]?.[b.need] ?? 100)
  );
  const urgentNeed = s.familyNeeds?.[pool[0].who]?.[pool[0].need] ?? 100;
  const req = pick(pool.filter(r => (s.familyNeeds?.[r.who]?.[r.need] ?? 100) <= urgentNeed + 8));
  s.familyReq = req.id;
  s.familyReqDay = s.day;
  msg(req.who, req.msg);
  notify(familyOf(req.who)?.name || req.who, req.blurb, 'warn');
  pinFamily(req);
  emit('hud');
}

function pinFamily(req) {
  const who = req.who;
  const p = familyWorldPos(who);
  setWaypoint({ x: p.x, z: p.z, label: `Family · ${req.title}` });
}

export function activeFamilyRequest() {
  return G.state.familyReq ? requestOf(G.state.familyReq) : null;
}

export function familyWorldPos(who) {
  if (live[who]) return live[who];
  const f = familyOf(who);
  if (!f) return FAMILY_HOME.door;
  return {
    x: FAMILY_HOME.x + (f.offset?.x || 0),
    z: FAMILY_HOME.z + (f.offset?.z || 0),
    label: 'home',
  };
}

/** True if member is in a schedule label allowed for this request. */
export function familyPresentFor(req) {
  const pos = familyWorldPos(req.who);
  const need = REQUEST_NEED_LABEL[req.id] || ['home'];
  return need.includes(pos.label);
}

export function nearFamilyMember(id, r = 4) {
  if (G.inCar) return false;
  const p = familyWorldPos(id);
  return dist(pos(), p) < r;
}

export function nearFamily(r = 7) {
  if (G.inCar) return false;
  return dist(pos(), FAMILY_HOME.door) < r || nearFamilyMember('mum', r) || nearFamilyMember('sibling', r);
}

function bumpRel(who, n) {
  const r = G.state.familyRel;
  r[who] = Math.max(0, Math.min(100, (r[who] || 0) + n));
}

function strengthenBond(who, amount) {
  const before = relationshipLabel(G.state.familyRel[who] || 0);
  bumpRel(who, amount);
  const after = relationshipLabel(G.state.familyRel[who] || 0);
  if (after !== before) toast(`${familyOf(who).name} · relationship: ${after}`);
}

function bumpNeed(who, need, n) {
  if (!need) return;
  const needs = G.state.familyNeeds[who];
  if (needs && Number.isFinite(needs[need])) {
    needs[need] = Math.max(0, Math.min(100, needs[need] + n));
  }
}

function completeRequest(req) {
  const s = G.state;
  s.familyDone[req.id] = s.day;
  s.familyReq = null;
  strengthenBond(req.who, 8);
  bumpNeed(req.who, req.need, req.restore || 35);
  if (req.rep) for (const [k, v] of Object.entries(req.rep)) addRep(k, v);
  xp(req.xp || 5);
  if (s.waypoint?.label?.startsWith('Family')) setWaypoint(null);
  toast(req.done);
  msg(req.who, req.done, true);
  if (req.id === 'school_levy') msg('sibling', 'School no go chase me again. Thank you. Evening class go give you extra credit now.');
  emit('hud');
}

/** Decay ignored requests after IGNORE_DAYS. */
export function tickFamilyIgnore() {
  const s = G.state;
  if (!s.familyReq || !s.familyReqDay) return;
  if (s.day - s.familyReqDay < IGNORE_DAYS) return;
  const req = requestOf(s.familyReq);
  if (!req) { s.familyReq = null; return; }
  bumpRel(req.who, -5);
  msg(req.who, 'You no even reply me. Family no be joke.', false);
  notify(familyOf(req.who)?.name || req.who, 'Request expired', 'bad');
  s.familyReq = null;
  if (s.waypoint?.label?.startsWith('Family')) setWaypoint(null);
  emit('hud');
}

export function tickFamilyNeeds() {
  const needs = G.state.familyNeeds;
  for (const [who, decay] of Object.entries(NEED_DECAY)) {
    needs[who] ??= {};
    for (const [need, amount] of Object.entries(decay)) {
      needs[who][need] = Math.max(0, (needs[who][need] ?? 100) - amount);
    }
  }
}

export function tryFamilyInteract() {
  const req = activeFamilyRequest();

  // Idle greet when no request or wrong person
  if (!req) {
    const who = FAMILY.find(f => nearFamilyMember(f.id, 4));
    if (!who) return false;
    greetFamily(who.id);
    return true;
  }

  if (!nearFamilyMember(req.who, 4.5)) {
    // Near other family member → soft redirect
    const other = FAMILY.find(f => nearFamilyMember(f.id, 4));
    if (other) {
      startDialog(
        [{ s: other.id, t: `${familyOf(req.who).name} no dey here now. Check later.` }],
        [{ label: 'Okay', apply() {} }],
        ch => ch.apply()
      );
      return true;
    }
    return false;
  }

  // Presence gate
  if (!familyPresentFor(req)) {
    const label = familyWorldPos(req.who).label;
    startDialog(
      [{ s: req.who, t: label === 'sleep'
        ? 'I dey rest. Come morning.'
        : `I busy for ${label} now. Catch me when I reach house.` }],
      [{ label: 'Alright', apply() {} }],
      ch => ch.apply()
    );
    return true;
  }

  if (req.kind === 'money') {
    startDialog(
      [{ s: req.who, t: req.msg }],
      [
        {
          label: `Give ${fmt(req.amount)}`,
          apply() {
            if (!pay(req.amount, `Family · ${req.title}`)) return toast('No enough money');
            completeRequest(req);
          },
        },
        { label: 'Not today', apply() { bumpRel(req.who, -2); toast('Maybe later…'); emit('hud'); } },
      ],
      ch => { ch.apply(); emit('hud'); }
    );
    return true;
  }

  if (req.kind === 'visit') {
    startDialog(
      [{ s: req.who, t: 'You don come! Sit down small.' }],
      [
        {
          label: 'Visit · spend time',
          apply() {
            completeRequest(req);
            G.state.stamina = Math.min(100, G.state.stamina + 15);
          },
        },
        { label: 'Just passing', apply() {} },
      ],
      ch => { ch.apply(); emit('hud'); }
    );
    return true;
  }

  if (req.kind === 'fetch') {
    const has = (G.state.inv[req.item] || 0) > 0;
    startDialog(
      [{ s: req.who, t: has ? 'You get the thing?' : req.msg }],
      has
        ? [{
            label: `Give ${req.item}`,
            apply() { G.state.inv[req.item]--; completeRequest(req); },
          }, { label: 'Not yet', apply() {} }]
        : [{
            label: 'I go find am',
            apply() { toast(`Buy ${req.item} from a kiosk or Yaba`); },
          }, { label: 'Later', apply() {} }],
      ch => { ch.apply(); emit('hud'); }
    );
    return true;
  }

  return false;
}

function greetFamily(id) {
  const f = familyOf(id);
  const rel = G.state.familyRel[id] || 0;
  const label = familyWorldPos(id).label;
  const line =
    label === 'sleep' ? 'Shh… dey sleep.' :
    rel >= 85 ? `${f.line} You always show up for your family. I proud of you.` :
    rel >= 65 ? `${f.line} You be good child. We fit count on you.` :
    rel >= 40 ? `${f.line} E good say you come around.` :
    rel >= 20 ? f.line :
    'Hmm. You rare for this house nowadays.';
  const alreadyGreeted = G.state.familyGreetingDay[id] === G.state.day;
  startDialog([{ s: id, t: line }], [{
    label: alreadyGreeted ? 'Say goodbye' : 'Greet · spend a moment together',
    apply() {
      if (label === 'sleep' || alreadyGreeted) return;
      G.state.familyGreetingDay[id] = G.state.day;
      strengthenBond(id, 2);
      bumpNeed(id, 'companionship', 8);
      if (id === 'mum') bumpNeed(id, 'food', 3);
      if (id === 'sibling') bumpNeed(id, 'education', 2);
    },
  }], ch => { ch.apply(); emit('hud'); });
}

export function familyPrompt() {
  const req = activeFamilyRequest();
  if (req && nearFamilyMember(req.who, 4.5)) {
    const ready = familyPresentFor(req);
    return {
      key: 'E',
      text: ready
        ? `Talk to ${familyOf(req.who).name} · ${req.title}`
        : `Talk to ${familyOf(req.who).name} · busy`,
    };
  }
  for (const f of FAMILY) {
    if (nearFamilyMember(f.id, 4)) return { key: 'E', text: `Talk to ${f.name}` };
  }
  return null;
}

/**
 * Move family members toward their schedule targets.
 * Call every frame from city update.
 */
export function updateFamily(dt) {
  const clock = G.state?.clock ?? 12;
  const speed = 2.4; // units/sec — short hops between compound spots feel fine

  for (const f of FAMILY) {
    const slot = scheduleSlot(f.id, clock);
    const target = spotCoords(slot.spot);
    let cur = live[f.id];
    if (!cur) {
      cur = live[f.id] = {
        x: FAMILY_HOME.x + (f.offset?.x || 0),
        z: FAMILY_HOME.z + (f.offset?.z || 0),
        label: slot.label,
      };
    }
    cur.label = slot.label;
    const dx = target.x - cur.x, dz = target.z - cur.z;
    const d = Math.hypot(dx, dz);
    if (d > ARRIVE_EPS) {
      const step = Math.min(d, speed * dt);
      cur.x += (dx / d) * step;
      cur.z += (dz / d) * step;
    } else {
      cur.x = target.x;
      cur.z = target.z;
    }

    // Push into contact mesh if spawned
    const c = G.contacts?.find(c => c.id === f.id);
    if (c?.g) {
      c.g.position.x = cur.x;
      c.g.position.z = cur.z;
      c.x = cur.x;
      c.z = cur.z;
      if (G.contactPos) G.contactPos[f.id] = { x: cur.x, z: cur.z };
      const sp = d > ARRIVE_EPS ? speed : 0;
      c.c?.setState(sp > 0.2 ? 'walk' : 'idle', sp);
      if (sp > 0.2) c.g.rotation.y = Math.atan2(dx, dz);
    }
  }

  // Keep family waypoint on the active issuer
  const req = activeFamilyRequest();
  if (req && G.state.waypoint?.label?.startsWith('Family')) {
    const p = familyWorldPos(req.who);
    G.state.waypoint.x = p.x;
    G.state.waypoint.z = p.z;
  }
}

export function setupFamily() {
  resolveSpots();
  on('day', () => {
    tickFamilyNeeds();
    tickFamilyIgnore();
    maybeIssueFamilyRequest();
  });
}