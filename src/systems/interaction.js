import * as THREE from 'three';
import { G, pos, frozen } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { $, dist, fmt } from '../core/utils.js';
import { saveState } from '../core/state.js';
import { ECON, TIME, PRICES, RENT, DEALER, CHARACTER } from '../data/config.js';
import { VEH, LIVERIES, SLOGANS } from '../data/vehicles.js';
import { jobOf } from '../data/jobs.js';
import { placeOf, LANDMARKS, KIOSKS, PROPERTIES } from '../data/locations.js';
import { contactOf } from '../data/characters.js';
import {
  vForward,
  spawnOwned,
  setDriverVisible,
  ejectDriver,
} from '../entities/vehicles.js';
import { applyPet } from '../entities/animals.js';
import { toast } from '../ui/feedback.js';
import { applySky } from '../world/daynight.js';
import { heightAt } from '../world/terrain.js';
import {
  tx,
  pay,
  xp,
  addItem,
  msg,
  addHeat,
  addRep,
  gainSkill,
} from './economy.js';
import {
  missionActive,
  missionAvailable,
  curMission,
  missionPos,
  jobPos,
  homeProp,
} from './navigation.js';
import { runMission, advanceDialog, startDialog } from './dialogue.js';
import { owambeOn } from './events.js';
import { tryCompleteTask } from './missions.js';
import { startRace } from './racing.js';
import { nearPlace, openPlace, placePrompt } from './places.js';
import { familyPrompt, tryFamilyInteract } from './family.js';
import { talkToContact } from './relationships.js';
import { nearCrew, runCrewDialog } from './crew.js';
import { enterBuilding, interactInterior, interiorPrompt } from '../world/interior.js';

function nearStoryContact(r = 4) {
  if (G.inCar || !G.contacts) return null;
  const p = G.player.position;
  let best = null;
  let bd = r;
  for (const c of G.contacts) {
    if (!c.g && c.x == null) continue;
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

/** Parked vehicles only. Radius 7 helps long GLBs (BRT / danfo). */
export function nearestCar() {
  let best = null;
  let d0 = 7;
  if (!G.parked?.length) return null;
  for (const c of G.parked) {
    if (!c?.position || c.userData?.enterable === false) continue;
    if (!c.userData?.type || !VEH[c.userData.type]) continue;
    const d = c.position.distanceTo(G.player.position);
    if (d < d0) {
      d0 = d;
      best = c;
    }
  }
  return best;
}

const nearKind = (kind, r) =>
  LANDMARKS.find(l => l.kind === kind && dist(pos(), l) < r);
const nearKiosk = () =>
  !G.inCar && KIOSKS.some(([x, z]) => dist(G.player.position, { x, z }) < 4);
const nearNight = () =>
  !G.inCar &&
  G.state.settings.mature !== false &&
  venueOpen() &&
  (G.nightlife || []).find(n => dist(G.player.position, n) < 3.5);
const ENTERABLE_KINDS = new Set([
  'airport', 'artisan', 'bank', 'betshop', 'cafe', 'garage', 'gym', 'hotel',
  'mall', 'market', 'office', 'police', 'restaurant', 'school', 'service',
  'venue', 'worship',
]);
const nearBuilding = () => {
  if (G.inCar) return null;
  let best = null, bestDistance = 11;
  for (const building of LANDMARKS) {
    if (!ENTERABLE_KINDS.has(building.kind) || building.stadium) continue;
    const d = dist(G.player.position, building);
    if (d < bestDistance) { best = building; bestDistance = d; }
  }
  return best;
};

export const nearHome = () => {
  const h = homeProp();
  return !!h && !G.inCar && dist(G.player.position, h.door) < 6;
};
const nearGate = () =>
  !G.inCar &&
  PROPERTIES.find(
    p => p.id !== G.state.home && dist(G.player.position, p.door) < 6
  );
const nearPump = () =>
  G.inCar &&
  (dist(pos(), placeOf('ladipo')) < 16 || dist(pos(), placeOf('fuel')) < 16);
const venueOpen = () =>
  G.state.clock >= TIME.venueOpen || G.state.clock < TIME.venueClose;
const nearYaba = () =>
  !G.inCar && !missionActive() && dist(pos(), placeOf('yaba')) < 11;
const nearDealer = () => !G.inCar && dist(pos(), placeOf('ladipo')) < 13;
const nearRacer = () =>
  G.race &&
  !G.task &&
  dist(pos(), placeOf('stadstop')) < 10 &&
  !(missionActive() && curMission().at === 'stadstop');

const _side = new THREE.Vector3();
const ENTER_EXIT_T = () =>
  CHARACTER.enterExit ?? CHARACTER.enterExitT ?? 0.85;

function doorOffset(car, side = -1) {
  const type = car?.userData?.type;
  const spec = (type && VEH[type]) || { wid: 2.4 };
  const half = (spec.wid || 2.4) * 0.55 + 0.85;
  const f = vForward(car);
  _side.set(f.z, 0, -f.x).normalize();
  return _side.clone().multiplyScalar(side * half);
}

function isVehicleBlending() {
  return G.vehicleMode === 'enter' || G.vehicleMode === 'exit';
}

function clearVehicleBlend() {
  G.vehicleT = null;
  G.vehicleMode = null;
  G.vehicleFrom = null;
  G.vehicleTo = null;
  G.vehicleCar = null;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export function toggleCar() {
  if (frozen() || isVehicleBlending()) return;

  if (G.inCar) {
    const car = G.car;
    if (!car) {
      G.inCar = false;
      G.car = null;
      G.carSpeed = 0;
      clearVehicleBlend();
      if (G.player) G.player.visible = true;
      return;
    }

    const door = car.position.clone().add(doorOffset(car, -1));
    door.y = car.position.y;

    G.vehicleT = 0;
    G.vehicleMode = 'exit';
    G.vehicleFrom = G.player.position.clone();
    G.vehicleTo = door;
    G.vehicleCar = car;
    G.player.visible = true;
    G.playerChar?.setState('exit', 0);
    G.camBlend = 1;
    return;
  }

  const c = nearestCar();
  if (!c) return;

  const door = c.position.clone().add(doorOffset(c, -1));
  door.y = c.position.y;

  G.vehicleT = 0;
  G.vehicleMode = 'enter';
  G.vehicleFrom = G.player.position.clone();
  G.vehicleTo = door;
  G.vehicleCar = c;
  G.playerChar?.setState('enter', 0);
  G.camBlend = 1;

  const dx = c.position.x - G.player.position.x;
  const dz = c.position.z - G.player.position.z;
  if (Math.hypot(dx, dz) > 0.1) {
    G.player.rotation.y = Math.atan2(dx, dz);
  }
}

function finishEnter(car) {
  G.inCar = true;
  G.player.visible = false;
  G.car = car;
  G.carSpeed = 0;
  G.player.position.copy(car.position);

  // Hide AI driver while player drives. Optional eject for stolen cars.
  if (car.userData?.hasDriver || car.userData?.driver) {
    if (!car.userData.owned && !car.userData.stolen) {
      // First take: pull driver out (hijack flavour)
      try {
        ejectDriver(car, 1);
      } catch {
        setDriverVisible(car, false);
      }
    } else {
      setDriverVisible(car, false);
    }
  }

  if (!car.userData.owned && !car.userData.stolen) {
    car.userData.stolen = true;
    addHeat(1, 'Stolen vehicle');
    addRep('street', 2);
    addRep('public', -2);
  }

  const name = VEH[car.userData.type]?.name || 'Vehicle';
  toast(
    `${name}${car.userData.owned ? ' · yours' : ' · not yours'} · W gas · S brake · A/D steer`
  );
  clearVehicleBlend();
}

function finishExit(car) {
  const door =
    G.vehicleTo && G.vehicleTo.clone
      ? G.vehicleTo.clone()
      : car
        ? car.position.clone().add(doorOffset(car, -1))
        : G.player?.position.clone();

  const referenceY = car?.position?.y ?? door?.y ?? 0;

  // Complete the exit state transition.
  G.inCar = false;
  G.car = null;
  G.carSpeed = 0;
  G.curSpeed = 0;

  // Restore an existing, non-stolen driver.
  if (car?.userData?.driver && !car.userData.stolen) {
    setDriverVisible(car, true);
  }

  if (G.player) {
    G.player.visible = true;

    if (door) {
      G.player.position.copy(door);

      // Resolve the door position using the car's surface elevation.
      G.player.position.y = heightAt(
        G.player.position.x,
        G.player.position.z,
        referenceY
      );

      if (car) {
        // Move away from the car horizontally.
        const away = G.player.position.clone().sub(car.position);
        away.y = 0;

        if (away.lengthSq() < 0.01) {
          away.set(1, 0, 0);
        }

        away.normalize().multiplyScalar(1.1);
        G.player.position.add(away);

        // Sample again after the horizontal displacement.
        G.player.position.y = heightAt(
          G.player.position.x,
          G.player.position.z,
          referenceY
        );
      }
    }
  }

  G.playerChar?.setState('idle', 0);
  toast('Back on foot');
  clearVehicleBlend();
}

/** Call every frame from city update (BEFORE updateMovement). */
export function updateVehicleTransition(dt) {
  if (!isVehicleBlending() || G.vehicleT == null) return;

  const car = G.vehicleCar;
  const from = G.vehicleFrom;
  const to = G.vehicleTo;

  if (!car || !from || !to || !G.player) {
    G.inCar = false;
    G.car = null;
    G.carSpeed = 0;
    if (G.player) G.player.visible = true;
    clearVehicleBlend();
    return;
  }

  const dur = Math.max(0.25, ENTER_EXIT_T());
  G.vehicleT = Math.min(1, G.vehicleT + dt / dur);
  const t = smoothstep(G.vehicleT);

  if (G.vehicleMode === 'enter') {
    const seat = car.position.clone();
    seat.y = car.position.y;
    const p =
      t < 0.55
        ? from.clone().lerp(to, t / 0.55)
        : to.clone().lerp(seat, (t - 0.55) / 0.45);
    G.player.position.copy(p);
    G.playerChar?.setState(t < 0.55 ? 'walk' : 'enter', t < 0.55 ? 3 : 0);
    if (G.vehicleT >= 1) finishEnter(car);
  } else {
    const seat = car.position.clone();
    const p = t < 0.4 ? seat.clone().lerp(to, t / 0.4) : to.clone();
    G.player.position.copy(p);
    G.player.visible = true;
    G.playerChar?.setState(t < 0.5 ? 'exit' : 'idle', 0);
    if (G.vehicleT >= 1) finishExit(car);
  }
}

/* ---------- vendor / place dialogs ---------- */
function posDialog() {
  startDialog(
    [{ s: 'pos', t: 'POS agent dey. Withdrawal, pure water, suya — wetin you want?' }],
    [
      {
        label: `Withdraw ${fmt(PRICES.posAmount)} (fee ${fmt(PRICES.posFee)})`,
        apply() {
          const s = G.state;
          if (s.bank < PRICES.posAmount + PRICES.posFee)
            return toast('Bank balance too low');
          s.bank -= PRICES.posAmount + PRICES.posFee;
          s.cash += PRICES.posAmount;
          tx('POS withdrawal', -PRICES.posFee);
          toast(`${fmt(PRICES.posAmount)} cash collected`);
        },
      },
      {
        label: `Pure Water ${fmt(PRICES.water)}`,
        apply() {
          if (!pay(PRICES.water)) return toast('No money');
          addItem('water');
          toast('Pure water added to bag');
        },
      },
      {
        label: `Suya ${fmt(PRICES.suya)}`,
        apply() {
          if (!pay(PRICES.suya)) return toast('No money');
          addItem('suya');
          toast('Suya added to bag');
        },
      },
    ],
    ch => {
      ch.apply();
      emit('hud');
    }
  );
}

function petDialog() {
  startDialog(
    [
      {
        s: 'nkechi',
        t: G.state.pet
          ? 'Your dog dey enjoy? Buy pure water for am.'
          : 'My customer! I get one fine dog here. Agbero no go near you again if you carry am.',
      },
    ],
    [
      ...(G.state.pet
        ? []
        : [
            {
              label: `Adopt the dog ${fmt(PRICES.pet)}`,
              apply() {
                if (!pay(PRICES.pet, 'Adopted a dog'))
                  return toast('Not enough money');
                G.state.pet = 'dog';
                applyPet();
                toast(
                  'You now have a dog. Agberos will keep their distance.'
                );
              },
            },
          ]),
      {
        label: `Pure Water ${fmt(PRICES.water)}`,
        apply() {
          if (!pay(PRICES.water)) return toast('No money');
          addItem('water');
          toast('Pure water added to bag');
        },
      },
      { label: 'Just looking.', apply() {} },
    ],
    ch => {
      ch.apply();
      emit('hud');
    }
  );
}

function hookupDialog(n) {
  startDialog(
    [
      {
        s: 'olosho',
        t: `${n.name}: Fine boy, you dey find hook up? ${fmt(PRICES.hookup)} make we go inside.`,
      },
    ],
    [
      {
        label: `Hook up ${fmt(PRICES.hookup)}`,
        apply() {
          if (!pay(PRICES.hookup, 'Night out'))
            return toast('Not enough money');
          fadeOut(() => {
            const s = G.state;
            s.clock = Math.min(23.9, s.clock + 1);
            s.stamina = 100;
            const r = Math.random();
            const guarded =
              s.home && s.upgrades?.[s.home]?.includes('security');
            if (r < 0.25 && !guarded) {
              const loss = Math.min(s.cash, 10000);
              s.cash -= loss;
              tx('Pocket picked', -loss);
              toast(`Your pocket don light — ${fmt(loss)} missing`);
            } else if (r < 0.35) {
              addHeat(1, 'Police raid at the club');
            } else {
              toast('You come out with a smile. Stamina restored.');
            }
            applySky();
            emit('hud');
          });
        },
      },
      {
        label: 'Not tonight.',
        reply: 'Your loss, baby.',
        apply() {},
      },
    ],
    ch => {
      ch.apply();
      emit('hud');
    }
  );
}

export function rentProperty(p) {
  const s = G.state;
  const fee = Math.round(p.rent * RENT.agentFeeRate);
  if (!pay(p.rent + fee, `Rent + agent fee · ${p.name}`))
    return toast(
      `You need ${fmt(p.rent + fee)} (rent + ${fmt(fee)} agent fee)`
    );
  if (s.rented && s.home === s.rented.id) s.home = null;
  s.rented = { id: p.id, until: s.day + RENT.leaseDays };
  s.home = p.id;
  toast(`Lease signed · ${p.type} for ${RENT.leaseDays} days`);
  msg(
    'landlord',
    `Welcome. ${p.type} na yours for ${RENT.leaseDays} days. No late rent, no wahala. Agent Kunle don collect him ${fmt(fee)}.`
  );
  emit('hud');
}

export function buyProperty(p) {
  const s = G.state;
  if (!p.buy) return toast('This one na rent only');
  if (!pay(p.buy, `Bought ${p.name}`))
    return toast(`You need ${fmt(p.buy)} across cash and bank`);
  s.props.push(p.id);
  if (s.rented?.id === p.id) s.rented = null;
  if (!s.home) s.home = p.id;
  toast(`${p.name} is yours`);
  msg(
    'landlord',
    `Papers signed. ${p.name} na your own now. Collect rent from tenants if you no wan live there.`
  );
  emit('hud');
}

function agentDialog(p) {
  const s = G.state;
  const owned = s.props.includes(p.id);
  const renting = s.rented?.id === p.id;
  const fee = Math.round(p.rent * RENT.agentFeeRate);
  const lines = [
    {
      s: 'agent',
      t: owned
        ? `${p.name} — this one na your own. You wan move in?`
        : renting
          ? `Your lease still dey run, ${s.rented.until - s.day} days left.`
          : `${p.type} for ${fmt(p.rent)} per ${RENT.leaseDays} days${p.buy ? `, or buy am outright for ${fmt(p.buy)}` : ''}. Agent fee na ${fmt(fee)}.`,
    },
  ];
  const choices = [];
  if (owned || renting) {
    choices.push({
      label: 'Make this my home',
      apply() {
        s.home = p.id;
        s.let = s.let.filter(id => id !== p.id);
        toast('Home updated');
      },
    });
  } else {
    choices.push({
      label: `Rent · ${fmt(p.rent + fee)}`,
      apply() {
        rentProperty(p);
      },
    });
    if (p.buy) {
      choices.push({
        label: `Buy · ${fmt(p.buy)}`,
        apply() {
          buyProperty(p);
        },
      });
    }
  }
  choices.push({ label: 'Just looking.', apply() {} });
  startDialog(lines, choices, ch => {
    ch.apply();
    emit('hud');
  });
}

function racerDialog() {
  startDialog(
    [
      {
        s: 'speedy',
        t: 'Funsho Williams, two laps, ₦20,000 on the table. You need a motor. Ready?',
      },
    ],
    [
      {
        label: 'Race · ₦20,000 wager',
        apply() {
          if (!G.inCar) {
            toast('Come back in a vehicle');
            return;
          }
          startRace({ wager: 20000 });
        },
      },
      { label: 'Not now.', apply() {} },
    ],
    ch => {
      ch.apply();
      emit('hud');
    }
  );
}

function vehicleMenu(v) {
  const s = G.state;
  const o = s.vehicles.find(o => o.id === v.userData.ownedId);
  const name = VEH[v.userData.type].name;
  const price =
    DEALER.find(d => d[0] === v.userData.type)?.[1] || 1000000;
  const choices = [];
  const cond = v.userData.cond ?? 100;
  if (cond < 100) {
    const c = Math.round(
      (100 - cond) * 500 * (o.insured ? 0.5 : 1)
    );
    choices.push({
      label: `Service · ${fmt(c)}${o.insured ? ' (insured)' : ''}`,
      apply() {
        if (!pay(c, `Service · ${name}`))
          return toast('Not enough money');
        v.userData.cond = 100;
        o.cond = 100;
        toast('Serviced');
      },
    });
  }
  if (!o.insured) {
    const c = Math.round(price * 0.08);
    choices.push({
      label: `Insure · ${fmt(c)}`,
      apply() {
        if (!pay(c, `Insurance · ${name}`))
          return toast('Not enough money');
        o.insured = true;
        toast('Insured: half-price service, half crash damage');
      },
    });
  }
  choices.push({
    label: `Livery · ${fmt(20000)}`,
    apply() {
      if (!pay(20000, `Livery · ${name}`))
        return toast('Not enough money');
      o.livery = (o.livery + 1) % LIVERIES.length || 0;
      applyLivery(v, o);
      toast('Fresh paint');
    },
  });
  if (v.userData.type === 'danfo' || v.userData.type === 'korope') {
    choices.push({
      label: `Slogan · ${fmt(5000)}`,
      apply() {
        if (!pay(5000, `Slogan · ${name}`))
          return toast('Not enough money');
        o.slogan = ((o.slogan ?? -1) + 1) % SLOGANS.length;
        applySlogan(v, o);
        toast(`"${SLOGANS[o.slogan]}"`);
      },
    });
  }
  choices.push({
    label: 'Back',
    apply() {
      dealerDialog();
    },
  });
  startDialog(
    [
      {
        s: 'dayo',
        t: `${name} · condition ${Math.round(cond)}%${o.insured ? ' · insured' : ''}. Wetin we dey do?`,
      },
    ],
    choices,
    ch => {
      ch.apply();
      emit('hud');
    }
  );
}

export function applyLivery(v, o) {
  const c = LIVERIES[o.livery || 0];
  v.userData.livery = c;
  if (v.userData.repaint) return v.userData.repaint(c);
  v.traverse(m => {
    if (m.isMesh && m.userData.body) m.material.color.set(c);
  });
}

export function applySlogan(v, o) {
  if (v.userData.sloganSprite) v.remove(v.userData.sloganSprite);
  if (o.slogan === undefined) return;
  import('../world/builders.js').then(b => {
    const sp = b.textSprite(
      SLOGANS[o.slogan],
      '#07100e',
      'rgba(245,197,24,.98)'
    );
    sp.position.set(0, 2.9, 0);
    sp.scale.set(4.2, 1, 1);
    v.add(sp);
    v.userData.sloganSprite = sp;
  });
}

function dealerDialog() {
  const s = G.state;
  const mine = G.parked.filter(v => v.userData.owned);
  const buy = DEALER.map(([type, price]) => ({
    label: `${VEH[type].name} · ${fmt(price)}`,
    apply() {
      if (!pay(price, `Bought ${VEH[type].name}`))
        return toast(`You need ${fmt(price)} across cash and bank`);
      s.vehicles = [
        ...(s.vehicles || []),
        { id: Date.now().toString(36), type, cond: 100 },
      ];
      spawnOwned(homeProp());
      addRep('business', 2);
      toast(
        `${VEH[type].name} is yours — parked at ${homeProp() ? 'your gate' : 'Ladipo'}`
      );
      msg(
        'dayo',
        `${VEH[type].name} don ready. Papers dey inside. Bring am back when e need service.`
      );
    },
  }));
  const choices = [];
  if (mine.length) {
    choices.push({
      label: 'Buy another vehicle',
      apply() {
        startDialog(
          [{ s: 'dayo', t: 'Which one?' }],
          [...buy, { label: 'Back', apply() { dealerDialog(); } }],
          ch => {
            ch.apply();
            emit('hud');
          }
        );
      },
    });
  }
  for (const v of mine.slice(0, 4)) {
    choices.push({
      label: `My ${VEH[v.userData.type].name} · service, insure, customise`,
      apply() {
        vehicleMenu(v);
      },
    });
  }
  if (!mine.length) choices.push(...buy);
  choices.push({ label: 'Just looking.', apply() {} });
  startDialog(
    [
      {
        s: 'dayo',
        t: mine.length
          ? `Welcome back. Wetin you need — service, insurance, paint, or another motor?`
          : `Ladipo get everything. Okada, keke, korope, danfo, tokunbo car. Which one?`,
      },
    ],
    choices.slice(0, 6),
    ch => {
      ch.apply();
      emit('hud');
    }
  );
}

function fadeOut(then) {
  G.sleeping = true;
  $('sleepfade').classList.add('on');
  setTimeout(() => {
    then();
    setTimeout(() => {
      $('sleepfade').classList.remove('on');
      G.sleeping = false;
    }, 400);
  }, 800);
}

export function interact() {
  if (G.interior) {
    const action = interactInterior();
    if (action === 'sleep') sleep(homeProp());
    else if (action === 'service') {
      const place = G.interior.place;
      if (place.kind === 'bank') emit('phone:open', 'bank');
      else if (['cafe', 'gym', 'mall', 'restaurant', 'school'].includes(place.kind)) openPlace(place);
      else toast(`${place.name} · ${place.profession || place.kind} workshop`);
    }
    return;
  }
  if (G.working || G.sleeping) return;
  if (G.dialog) {
    advanceDialog();
    return;
  }
  const p = pos();
  const s = G.state;
  if (tryCompleteTask()) return;
  if (
    missionAvailable() &&
    !G.task &&
    dist(p, missionPos()) < curMission().r
  ) {
    runMission();
    return;
  }
  const j = jobOf(s.job);
  if (j && dist(p, jobPos(j)) < 9) {
    G.working = { job: j, t: 0 };
    return;
  }
  if (nearHome()) {
    enterBuilding(homeProp(), 'home');
    return;
  }
  if (!G.inCar) {
    if (tryFamilyInteract()) return;
    const crew = nearCrew();
    if (crew) {
      runCrewDialog(crew);
      return;
    }
    const sc = nearStoryContact(4);
    if (sc && contactOf(sc.id)) {
      const missionTalk =
        missionAvailable() &&
        !G.task &&
        dist(pos(), missionPos()) < curMission().r;
      if (!missionTalk) {
        talkToContact(sc.id);
        return;
      }
    }
    const gate = nearGate();
    if (gate) {
      agentDialog(gate);
      return;
    }
    const night = nearNight();
    if (night) {
      hookupDialog(night);
      return;
    }
    if (nearKiosk()) {
      posDialog();
      return;
    }
    if (nearYaba()) {
      petDialog();
      return;
    }
    const building = nearBuilding();
    if (building) {
      enterBuilding(building);
      return;
    }
    const place = nearPlace();
    if (place) {
      openPlace(place);
      return;
    }
    if (nearDealer()) {
      dealerDialog();
      return;
    }
    if (nearRacer()) {
      racerDialog();
      return;
    }
    const bank = nearKind('bank', 11);
    if (bank) {
      emit('phone:open', 'bank');
      return;
    }
    const venue = nearKind('venue', 11);
    if (venue) {
      if (!venueOpen())
        return toast(`${venue.name} opens at ${TIME.venueOpen}:00`);
      if (!pay(venue.cost, `Night out · ${venue.name}`))
        return toast('Not enough money');
      s.stamina = 100;
      s.health = Math.min(100, s.health + 10);
      xp(5);
      toast(`Good vibes at ${venue.name} · stamina restored`);
      emit('hud');
      return;
    }
    const party = nearKind('owambe', 16);
    if (party) {
      if (!owambeOn()) return toast('Owambe starts at 19:00');
      if (s.partyDay === s.day)
        return toast('You don spray enough for tonight');
      if (!pay(party.cost, 'Owambe · spraying'))
        return toast('Not enough money to spray');
      s.partyDay = s.day;
      s.stamina = 100;
      xp(15);
      addRep('social', 8);
      gainSkill('charisma', 3);
      toast('You spray, you dance, you network · +15 XP');
      msg(
        'amaka',
        'Saw you at the owambe. You sabi dance! Call me when you need work.'
      );
      return;
    }
    const worship = nearKind('worship', 12);
    if (worship) {
      if (s.prayedDay === s.day)
        return toast('You already prayed today');
      s.prayedDay = s.day;
      s.stamina = Math.min(100, s.stamina + 30);
      if (s.heat > 0) s.heat--;
      xp(5);
      addRep('public', 3);
      toast(`${worship.name} · peace of mind, heat eased`);
      emit('hud');
      return;
    }
    const hotel = nearKind('hotel', 13);
    if (hotel) {
      if (!pay(hotel.cost, `Room · ${hotel.name}`))
        return toast('Not enough money');
      sleep(null);
      return;
    }
    const police = nearKind('police', 13);
    if (police && s.heat > 0) {
      const fine = s.heat * ECON.fineRate;
      if (!pay(fine, 'Police fine · record cleared'))
        return toast('Not enough money to settle the fine');
      s.heat = 0;
      toast(`Record cleared · ${fmt(fine)} paid`);
      emit('hud');
      return;
    }
    const nepa = nearKind('nepa', 12);
    if (nepa) {
      if (G.outage) {
        if (!pay(5000, 'NEPA · generator diesel'))
          return toast('Not enough money');
        G.outage = 0;
        emit('sky');
        toast('Up NEPA! Light don come back.');
      } else {
        toast('PHCN: "No outage for now. Pay your bill."');
      }
      return;
    }
  }
  if (nearPump()) {
    if (!pay(ECON.refuel, 'Fuel'))
      return toast('Not enough money to refuel');
    s.fuel = 100;
    toast('Tank full');
    emit('hud');
  }
}

export function promptFor() {
  if (G.interior) return interiorPrompt();
  const p = pos();
  const s = G.state;
  if (G.sleeping) return { text: '…' };
  if (G.dialog) return null;

  const crew = nearCrew();
  if (crew) {
    return {
      key: 'E',
      text: `${crew.name} · ${crew.vehType}`,
      sub: `${crew.traitLabel} ${crew.role} · ${fmt(crew.fare)}`,
    };
  }
  if (G.working)
    return {
      text: `Working · ${G.working.job.title}`,
      bar: G.working.t / G.working.job.dur,
    };
  if (G.task && !G.race) {
    const d = missionPos();
    if (
      d &&
      dist(p, d) < 13 &&
      (G.task.type !== 'steal' || G.inCar)
    ) {
      return {
        key: 'E',
        text:
          G.task.type === 'steal'
            ? 'Hand over the sedan'
            : `Deliver ${
                G.task.item === 'coldbox'
                  ? 'the vaccine box'
                  : G.task.item === 'cargo'
                    ? 'the glassware'
                    : 'the package'
              }`,
      };
    }
  }
  if (
    missionAvailable() &&
    !G.task &&
    dist(p, missionPos()) < curMission().r
  ) {
    const who = contactOf(curMission().lines()[0].s)?.name || 'contact';
    return {
      key: 'E',
      text: s.storyPaused ? `Resume with ${who}` : `Talk to ${who}`,
    };
  }
  const j = jobOf(s.job);
  if (j && dist(p, jobPos(j)) < 9)
    return { key: 'E', text: `Start shift as ${j.title}` };
  if (nearHome()) return { key: 'E', text: 'Enter home' };
  if (!G.inCar) {
    const fp = familyPrompt();
    if (fp) return fp;
    const gate = nearGate();
    if (gate)
      return {
        key: 'E',
        text: `Talk to Agent Kunle · ${gate.type}${
          G.state.props.includes(gate.id) ||
          G.state.rented?.id === gate.id
            ? ' (yours)'
            : ' to let'
        }`,
      };
    const building = nearBuilding();
    if (building) return { key: 'E', text: `Enter ${building.name}` };
    const night = nearNight();
    if (night) return { key: 'E', text: `Talk to ${night.name}` };
    if (nearKiosk()) return { key: 'E', text: 'Use POS kiosk' };
    if (nearYaba()) return { key: 'E', text: 'Talk to Mama Nkechi' };
    const place = nearPlace();
    if (place) return { key: 'E', text: placePrompt(place) };
    if (nearDealer()) return { key: 'E', text: 'Talk to Dayo · vehicles' };
    if (nearRacer()) return { key: 'E', text: 'Talk to Speedy · race' };
    const bank = nearKind('bank', 11);
    if (bank) return { key: 'E', text: 'Enter bank' };
    const venue = nearKind('venue', 11);
    if (venue)
      return venueOpen()
        ? { key: 'E', text: `Enter ${venue.name} · ${fmt(venue.cost)}` }
        : { text: `${venue.name} opens ${TIME.venueOpen}:00` };
    const party = nearKind('owambe', 16);
    if (party)
      return owambeOn()
        ? { key: 'E', text: `Join the owambe · ${fmt(party.cost)}` }
        : { text: 'Owambe tonight from 19:00' };
    const worship = nearKind('worship', 12);
    if (worship) return { key: 'E', text: 'Enter and pray' };
    const hotel = nearKind('hotel', 13);
    if (hotel)
      return { key: 'E', text: `Check in · ${fmt(hotel.cost)}` };
    const police = nearKind('police', 13);
    if (police && s.heat > 0)
      return {
        key: 'E',
        text: `Settle fine · ${fmt(s.heat * ECON.fineRate)}`,
      };
    const nepa = nearKind('nepa', 12);
    if (nepa)
      return {
        key: 'E',
        text: G.outage
          ? 'Pay for diesel · ₦5,000'
          : 'Enter PHCN office',
      };
  }
  if (nearPump())
    return { key: 'E', text: `Refuel · ${fmt(ECON.refuel)}` };
  if (G.inCar) {
    const name = VEH[G.car?.userData?.type]?.name || 'Vehicle';
    return { key: 'F', text: `Exit ${name}` };
  }
  const c = nearestCar();
  if (c) {
    const name = VEH[c.userData.type]?.name || 'Vehicle';
    return { key: 'F', text: `Enter ${name}` };
  }
  return null;
}

export function sleep(prop) {
  fadeOut(() => {
    const s = G.state;
    s.clock = 7;
    s.day++;
    s.health = 100;
    s.stamina = 100;
    if (prop?.perk === 'heat0') {
      s.heat = 0;
      s.fuel = 100;
    } else if (prop?.perk === 'heat1') {
      s.heat = Math.max(0, s.heat - 1);
    }
    applySky();
    emit('hud');
    emit('clock');
    saveState(s);
    toast(`Day ${s.day} · Good morning, ${s.name.split(' ')[0]}`);
  });
}

export function setupInteraction() {
  on('key', k => {
    if (k === 'e') interact();
    if (k === 'f') toggleCar();
  });
}