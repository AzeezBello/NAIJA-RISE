import { G, pos } from '../core/context.js';
import { emit, on } from '../core/events.js';
import { dist, fmt, pick } from '../core/utils.js';
import { FAMILY, FAMILY_HOME, FAMILY_REQUESTS, familyOf, requestOf } from '../data/family.js';
import { msg, pay, xp, addRep, tx } from './economy.js';
import { toast, notify } from '../ui/feedback.js';
import { startDialog } from './dialogue.js';
import { setWaypoint } from './navigation.js';

const COOLDOWN_DAYS = 1; // min days between completing the same request type

function canOffer(req, s) {
  const last = s.familyDone?.[req.id];
  if (last != null && s.day - last < COOLDOWN_DAYS) return false;
  return true;
}

/** Issue a new daily request if none active. Call on day change and once at city enter. */
export function maybeIssueFamilyRequest() {
  const s = G.state;
  if (s.familyReq) return; // already have one
  // Only offer after morning (day tick) and not more than once per day
  if (s.familyReqDay === s.day) return;

  const pool = FAMILY_REQUESTS.filter(r => canOffer(r, s));
  if (!pool.length) return;

  const req = pick(pool);
  s.familyReq = req.id;
  s.familyReqDay = s.day;
  msg(req.who, req.msg);
  notify(familyOf(req.who).name, req.blurb, 'warn');
  // Soft GPS pin to family home
  setWaypoint({ x: FAMILY_HOME.door.x, z: FAMILY_HOME.door.z, label: `Family · ${req.title}` });
  emit('hud');
}

export function activeFamilyRequest() {
  return G.state.familyReq ? requestOf(G.state.familyReq) : null;
}

export function familyPos() {
  return FAMILY_HOME.door;
}

export function nearFamily(r = 7) {
  if (G.inCar) return false;
  return dist(pos(), FAMILY_HOME.door) < r;
}

export function nearFamilyMember(id, r = 4) {
  const f = familyOf(id);
  if (!f || G.inCar) return false;
  const p = {
    x: FAMILY_HOME.x + f.offset.x,
    z: FAMILY_HOME.z + f.offset.z,
  };
  return dist(pos(), p) < r;
}

function bumpRel(who, n) {
  const r = G.state.familyRel;
  r[who] = Math.max(0, Math.min(100, (r[who] || 0) + n));
}

function completeRequest(req) {
  const s = G.state;
  s.familyDone[req.id] = s.day;
  s.familyReq = null;
  bumpRel(req.who, 8);
  if (req.rep) for (const [k, v] of Object.entries(req.rep)) addRep(k, v);
  xp(req.xp || 5);
  if (s.waypoint?.label?.startsWith('Family')) setWaypoint(null);
  toast(req.done);
  msg(req.who, req.done, true);
  emit('hud');
}

/** Try to finish the active request by talking to the right person. */
export function tryFamilyInteract() {
  const req = activeFamilyRequest();
  if (!req) {
    // Idle greet
    const who = FAMILY.find(f => nearFamilyMember(f.id, 4));
    if (!who) return false;
    greetFamily(who.id);
    return true;
  }

  if (!nearFamilyMember(req.who, 4.5) && !nearFamily(8)) return false;

  if (req.kind === 'money') {
    startDialog(
      [{ s: req.who, t: req.msg }],
      [
        {
          label: `Give ${fmt(req.amount)}`,
          apply() {
            if (!pay(req.amount, `Family · ${req.title}`)) {
              toast('No enough money');
              return;
            }
            completeRequest(req);
          },
        },
        {
          label: 'Not today',
          apply() {
            bumpRel(req.who, -2);
            toast('Maybe later…');
            emit('hud');
          },
        },
      ],
      ch => { ch.apply(); emit('hud'); }
    );
    return true;
  }

  if (req.kind === 'visit') {
    startDialog(
      [{ s: req.who, t: 'You don come! Come inside, rest small.' }],
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
        ? [
            {
              label: `Give ${req.item}`,
              apply() {
                G.state.inv[req.item]--;
                completeRequest(req);
              },
            },
            { label: 'Not yet', apply() {} },
          ]
        : [
            {
              label: 'I go find am',
              apply() {
                toast(`Buy ${req.item} from a kiosk or Yaba`);
              },
            },
            { label: 'Later', apply() {} },
          ],
      ch => { ch.apply(); emit('hud'); }
    );
    return true;
  }

  return false;
}

function greetFamily(id) {
  const f = familyOf(id);
  const rel = G.state.familyRel[id] || 0;
  const line =
    rel >= 60 ? `${f.line} You be good child.` :
    rel >= 30 ? f.line :
    'Hmm. You rare for this house nowadays.';
  startDialog([{ s: id, t: line }], [{ label: 'Greet', apply() { bumpRel(id, 1); } }], ch => { ch.apply(); emit('hud'); });
}

export function familyPrompt() {
  const req = activeFamilyRequest();
  if (req && (nearFamilyMember(req.who, 4.5) || nearFamily(8))) {
    return { key: 'E', text: `Talk to ${familyOf(req.who).name} · ${req.title}` };
  }
  for (const f of FAMILY) {
    if (nearFamilyMember(f.id, 4)) return { key: 'E', text: `Talk to ${f.name}` };
  }
  return null;
}

/** Hook day change — issue a request the morning after none is active. */
export function setupFamily() {
  on('day', () => {
    // Clear stale waypoint label only; keep request until completed
    maybeIssueFamilyRequest();
  });
}