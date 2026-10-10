import { G, pos } from '../core/context.js';
import { on } from '../core/events.js';
import { $, esc, fmt, dist } from '../core/utils.js';
import { saveState } from '../core/state.js';
import { levelTitle } from '../data/config.js';
import { QUALITY } from '../core/quality.js';
import { MISSIONS } from '../data/missions.js';
import { VEH } from '../data/vehicles.js';
import { Key, StatBar } from './components.js';
import { renderApp } from './phone.js';
import {
  missionActive,
  missionAvailable,
  curMission,
  missionPos,
  gpsTarget,
} from '../systems/navigation.js';
import { promptFor } from '../systems/interaction.js';
import { wanted } from '../systems/police.js';
import { timeStr } from '../world/daynight.js';
import {
  LANDMARKS,
  BUSSTOPS,
  ROADS,
  META,
  roadExtent,
  roadNameAt,
  regionAt,
} from '../data/locations.js';

/*
 * NAIJA RISE — Lagos HUD
 *
 * - Player status / money / XP
 * - Wanted / heat
 * - Mission and family objectives
 * - GPS / minimap labels
 * - Health / stamina
 * - Vehicle dashboard (name, commercial, speed, fuel, condition)
 * - Interaction prompts
 * - Controller / keyboard hints
 */

export function buildHud(root) {
  root.insertAdjacentHTML(
    'beforeend',
    `
    <div class="hud" id="hud">
      <div class="fade"></div>
      <div class="sleepfade" id="sleepfade"></div>

      <header class="topbar">
        <div class="tr">
          <div class="clockrow">
            <span class="clk" id="hudClock">08:30</span>
            <span class="dayicon" id="dayIcon">☀</span>
            <span class="daynum" id="dayNum">DAY 01</span>
          </div>

          <section class="status glass" id="status">
            <canvas id="portrait" class="portrait" width="112" height="112"></canvas>
            <div class="sinfo">
              <div class="cash" id="cash">₦0</div>
              <div class="srow">
                <span class="lvl">LVL <b id="pLevel">1</b></span>
                <span class="ltitle" id="pTitle">Newcomer</span>
                <span class="bankv" id="bank">₦0</span>
              </div>
              <div class="xpbar"><i id="pXp"></i></div>
              <div class="srow small">
                <span id="pName"></span>
                <span id="pXpNum">0 / 100 XP</span>
              </div>
              <div class="heatrow">
                <span class="wl" id="heatLabel">Heat</span>
                <span class="heatpips" id="heat"></span>
              </div>
            </div>
          </section>
        </div>
      </header>

      <section class="objective glass" id="objCard">
        <div class="objhead">
          <span class="objkicker">Objective</span>
          <span class="objtitle" id="missionTitle"></span>
        </div>
        <div class="objline"><span id="objective"></span></div>
        <div class="objfoot">
          <span class="objdist" id="objDist"></span>
          <span class="objarrow" id="objArrow">➜</span>
          <span class="objpips" id="objPips"></span>
        </div>
      </section>

      <section class="nav">
        <div class="locale" id="locale">
          <b>Surulere</b>
          <span>Lagos</span>
        </div>
        <div class="minimap">
          <canvas id="map" width="300" height="300"></canvas>
        </div>
        <div class="gps glass" id="gps">
          <b>GPS</b>
          <span class="gt" id="gpsTarget">No route</span>
          <span class="gd" id="gpsDist"></span>
        </div>
      </section>

      <section class="bottom">
        <div class="vitals glass" id="vitals">
          ${StatBar('❤', 'hp', 'hpfill')}
          ${StatBar('⚡', 'sta', 'stafill')}
        </div>

        <div class="vehicle glass" id="vehicle">
          <div class="veh-name" id="vehName">—</div>
          <div class="veh-meta" id="vehMeta"></div>

          <div class="speedo">
            <svg viewBox="0 0 100 100">
              <circle class="sbg" cx="50" cy="50" r="40" />
              <circle id="speedArc" cx="50" cy="50" r="40" />
            </svg>
            <div class="speednum">
              <b id="speed">0</b>
              <span>KM/H</span>
            </div>
          </div>

          <div class="fuel">
            <div class="row">
              <span class="vname" id="vname">—</span>
              <b id="gear">P</b>
            </div>
            <div class="row">
              <span>FUEL</span>
              <b id="fuelNum">100%</b>
            </div>
            <div class="track">
              <i id="fuel" class="fuelfill"></i>
            </div>
            <div class="row">
              <span>COND</span>
              <b id="condNum">100%</b>
            </div>
          </div>
        </div>

        <div class="prompt" id="prompt"></div>
      </section>

      <div class="hints" id="hints">
        <span class="foot">
          ${Key('WASD')} / ${Key('↑↓←→')} move
          ${Key('SHIFT')} sprint
          ${Key('E')} interact
          ${Key('F')} vehicle
        </span>
        <span class="car">
          ${Key('W/S')} gas · brake
          ${Key('A/D')} steer
          ${Key('SPACE')} handbrake
          ${Key('F')} exit
        </span>
        ${Key('J')} phone
        <span class="badge" id="hintBadge"></span>
        ${Key('RMB')} camera
        ${Key('H')} hide
      </div>

      <div class="dialog glass" id="dialog"></div>
      <div id="toast" class="toast"></div>
      <div class="notif-stack" id="notifStack"></div>
      <div id="notif" class="notif glass" style="display:none"></div>
    </div>
    `
  );

  on('hud', refreshHud);

  on('key', key => {
    if (key === 'h') {
      G.state.settings.hints = !G.state.settings.hints;
      refreshHud();
    }
  });

  on('clock', () => {
    const s = G.state;
    const clock = $('hudClock');
    const icon = $('dayIcon');
    const day = $('dayNum');
    if (clock) clock.textContent = timeStr();
    if (icon) {
      icon.textContent =
        s.clock >= 6 && s.clock < 18.5 ? '☀' : '🌙';
    }
    if (day) {
      day.textContent = `DAY ${String(s.day).padStart(2, '0')}`;
    }
  });
}

export function refreshHud() {
  const s = G.state;
  if (!s) return;

  const obj = $('objCard');
  const paused = !!s.storyPaused && !s.done;
  const m = curMission();
  const missionIsActive = missionActive();
  const isWanted = wanted();

  const cash = $('cash');
  const bank = $('bank');
  if (cash) cash.textContent = fmt(s.cash);
  if (bank) bank.textContent = `Bank ${fmt(s.bank)}`;

  const heat = $('heat');
  const heatLabel = $('heatLabel');
  const status = $('status');

  if (heat) {
    heat.innerHTML = [0, 1, 2, 3, 4]
      .map(i => `<i class="${i < s.heat ? 'on' : ''}"></i>`)
      .join('');
    heat.classList.toggle('hot', isWanted || s.heat >= 3);
  }
  if (heatLabel) {
    heatLabel.textContent = isWanted ? 'Wanted' : 'Heat';
    heatLabel.classList.toggle('wanted', isWanted);
  }
  if (status) {
    status.classList.toggle('heat0', s.heat === 0);
    status.classList.toggle('wanted', isWanted);
  }

  const pName = $('pName');
  const pLevel = $('pLevel');
  const pTitle = $('pTitle');
  const pXpNum = $('pXpNum');
  const pXp = $('pXp');
  if (pName) pName.textContent = s.name || '';
  if (pLevel) pLevel.textContent = s.level ?? 1;
  if (pTitle) pTitle.textContent = levelTitle(s.level ?? 1);
  if (pXpNum) pXpNum.textContent = `${s.xp ?? 0} / 100 XP`;
  if (pXp) {
    const xp = Math.max(0, Math.min(100, Number(s.xp) || 0));
    pXp.style.width = `${xp}%`;
  }

  if (obj) {
    obj.classList.remove(
      'state-active',
      'state-free',
      'state-fail',
      'state-done',
      'state-family',
      'state-job'
    );

    const title = $('missionTitle');
    const objective = $('objective');
    const kicker = obj.querySelector('.objkicker');

    if (s.done) {
      obj.classList.add('state-done');
      if (title) title.textContent = 'Slice complete';
      if (objective) {
        objective.textContent = 'Lagos is yours. Work, bank, build.';
      }
      if (kicker) kicker.textContent = 'Complete';
    } else if (s.missionFailed) {
      obj.classList.add('state-fail');
      if (title) title.textContent = m?.title || 'Mission failed';
      if (objective) {
        objective.textContent =
          m?.failObj?.() || 'Mission failed. Retry from the contact.';
      }
      if (kicker) kicker.textContent = 'Failed';
    } else if (s.familyReq && (paused || !missionIsActive)) {
      obj.classList.add('state-family');
      if (title) title.textContent = 'Family';
      if (objective) {
        objective.textContent =
          'Check your family request and visit the right person.';
      }
      if (kicker) kicker.textContent = 'Family';
    } else if (s.job) {
      obj.classList.add('state-job');
      if (title) title.textContent = 'Work';
      if (objective) {
        objective.textContent =
          'Your current job is active. Follow the objective on your phone.';
      }
      if (kicker) kicker.textContent = 'Job';
    } else if (paused) {
      obj.classList.add('state-free');
      if (title) title.textContent = 'Free hustle';
      if (objective) {
        const destination = m?.at === 'marina' ? 'Amaka' : 'Baba K';
        objective.textContent =
          `Jobs on your phone, courses at the cyber café, the gym, football. ${destination} go wait.`;
      }
      if (kicker) kicker.textContent = 'Open world';
    } else {
      obj.classList.add('state-active');
      if (title) title.textContent = m?.title || 'Objective';
      if (objective) {
        objective.textContent =
          typeof m?.obj === 'function'
            ? m.obj()
            : 'Continue your journey through Lagos.';
      }
      if (kicker) kicker.textContent = 'Objective';
    }
  }

  const objPips = $('objPips');
  if (objPips) {
    objPips.innerHTML = MISSIONS.map(
      (_, i) =>
        `<i class="${i < (s.mission ?? 0) || s.done ? 'done' : ''}"></i>`
    ).join('');
  }

  const unread = s.unread ? String(s.unread) : '';
  const hintBadge = $('hintBadge');
  if (hintBadge) hintBadge.textContent = unread;
  const messageBadge = $('msgBadge');
  if (messageBadge) messageBadge.textContent = unread;

  const hints = $('hints');
  const coarse =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(pointer:coarse)').matches;
  if (hints) {
    hints.classList.toggle('hide', !s.settings?.hints || coarse);
  }

  if (G.sun) {
    G.sun.castShadow =
      !!s.settings?.shadows &&
      (QUALITY[G.quality]?.shadows ?? 1) > 0;
  }

  renderApp();
  saveState(s);
}

const fmtDist = metres =>
  metres >= 1000
    ? `${(metres / 1000).toFixed(1)} km`
    : `${Math.round(metres)} m`;

let lastPrompt = '';
let lastLocale = '';
let localeAt = 0;

function localeName(p) {
  for (const landmark of [...LANDMARKS, ...BUSSTOPS]) {
    if (dist(p, landmark) < (landmark.stadium ? 32 : 16)) {
      return landmark.name;
    }
  }

  let best = null;
  let bestDistance = 14;

  for (const z of ROADS.h) {
    const [a, b] = roadExtent('h', z);
    if (p.x < a || p.x > b) continue;
    const d = Math.abs(p.z - z);
    if (d < bestDistance) {
      bestDistance = d;
      best = roadNameAt('h', z, p.x);
    }
  }

  for (const x of ROADS.v) {
    const [a, b] = roadExtent('v', x);
    if (p.z < a || p.z > b) continue;
    const d = Math.abs(p.x - x);
    if (d < bestDistance) {
      bestDistance = d;
      best = roadNameAt('v', x, p.z);
    }
  }

  return best || regionAt(p.x, p.z).name;
}

/** Resolve display name + meta line for the current vehicle. */
function vehicleHudInfo(car) {
  const type = car?.userData?.type;
  const def = (type && VEH[type]) || null;
  const name = def?.name || type || 'Vehicle';
  const commercial = !!def?.commercial;

  let meta = '';
  if (commercial && def?.fare != null) {
    meta = `Commercial · fare from ₦${def.fare}`;
  } else if (car?.userData?.owned) {
    meta = 'Yours';
  } else if (car?.userData?.stolen) {
    meta = 'Not yours';
  }

  return { name, meta, commercial, type };
}

export function hudFrame() {
  const s = G.state;
  const p = pos();
  if (!s || !p) return;

  /* ---- interaction prompt ---- */
  const prompt = promptFor();
  const promptElement = $('prompt');

  if (promptElement) {
    const signature = prompt
      ? (prompt.key || '') +
        prompt.text +
        (prompt.sub || '') +
        (prompt.bar !== undefined ? '#' : '')
      : '';

    if (signature !== lastPrompt) {
      lastPrompt = signature;
      if (!prompt) {
        promptElement.classList.remove('show');
        promptElement.innerHTML = '';
      } else {
        promptElement.innerHTML =
          `<div class="prow">` +
          (prompt.key ? Key(prompt.key) : '') +
          `<span class="ptext">${esc(prompt.text)}</span>` +
          (prompt.bar !== undefined ? '<span class="bar"><i></i></span>' : '') +
          `</div>` +
          (prompt.sub ? `<div class="psub">${esc(prompt.sub)}</div>` : '');
        promptElement.classList.add('show');
      }
    }

    if (prompt && prompt.bar !== undefined) {
      const bar = promptElement.querySelector('.bar i');
      if (bar) {
        const progress = Math.max(0, Math.min(1, Number(prompt.bar) || 0));
        bar.style.width = `${progress * 100}%`;
      }
    }
  }

  /* ---- race objective ---- */
  if (G.race && !G.race.finished && G.race.obj) {
    const objective = $('objective');
    if (objective) objective.textContent = G.race.obj;
  }

  /* ---- GPS / objective distance ---- */
  const target =
    G.race && !G.race.finished
      ? gpsTarget()
      : missionActive()
        ? missionPos()
        : missionAvailable() && s.storyPaused
          ? null
          : gpsTarget();

  const objDist = $('objDist');
  const objArrow = $('objArrow');

  if (target) {
    if (objDist) objDist.textContent = fmtDist(dist(p, target));
    if (objArrow) {
      const angle =
        Math.atan2(target.x - p.x, -(target.z - p.z)) + G.camYaw;
      objArrow.style.transform = `rotate(${(
        (angle * 180) / Math.PI -
        90
      ).toFixed(0)}deg)`;
      objArrow.style.opacity = '1';
    }
  } else {
    if (objDist) objDist.textContent = '';
    if (objArrow) objArrow.style.opacity = '0';
  }

  /* ---- location label ---- */
  if (performance.now() - localeAt > 500) {
    localeAt = performance.now();
    const name = localeName(p);
    if (name !== lastLocale) {
      lastLocale = name;
      const locale = $('locale');
      if (locale) {
        const primary = locale.querySelector('b');
        const secondary = locale.querySelector('span');
        const region = regionAt(p.x, p.z);
        if (primary) primary.textContent = name;
        if (secondary) {
          secondary.textContent =
            region.name === name ? META.state : region.name;
        }
        locale.classList.remove('flash');
        void locale.offsetWidth;
        locale.classList.add('flash');
      }
    }
  }

  /* ---- GPS panel ---- */
  const gps = gpsTarget();
  const gpsTargetElement = $('gpsTarget');
  const gpsDistanceElement = $('gpsDist');
  if (gpsTargetElement) {
    gpsTargetElement.textContent = gps ? gps.label : 'No route';
  }
  if (gpsDistanceElement) {
    gpsDistanceElement.textContent = gps ? fmtDist(G.routeLen || 0) : '';
  }

  /* ---- health / stamina ---- */
  const hp = $('hp');
  const stamina = $('sta');
  if (hp) {
    hp.style.width = `${Math.max(0, Math.min(100, Number(s.health) || 0))}%`;
  }
  if (stamina) {
    stamina.style.width = `${Math.max(
      0,
      Math.min(100, Number(s.stamina) || 0)
    )}%`;
  }

  /* ---- vehicle panel visibility ---- */
  const vitals = $('vitals');
  const vehicle = $('vehicle');
  const hints = $('hints');

  if (vitals) vitals.classList.toggle('hide', !!G.inCar);
  if (vehicle) vehicle.classList.toggle('show', !!G.inCar);
  if (hints) hints.classList.toggle('incar', !!G.inCar);

  /* ---- vehicle dashboard ---- */
  if (G.inCar && G.car) {
    const info = vehicleHudInfo(G.car);

    const vehName = $('vehName');
    if (vehName) vehName.textContent = info.name.toUpperCase();

    const vehMeta = $('vehMeta');
    if (vehMeta) {
      vehMeta.textContent = info.meta;
      vehMeta.style.display = info.meta ? '' : 'none';
    }

    if (vehicle) {
      vehicle.classList.toggle('commercial', info.commercial);
      vehicle.classList.toggle(
        `veh-${info.type || 'unknown'}`,
        !!info.type
      );
    }

    const kmh = Math.round(Math.abs(G.carSpeed || 0) * 3.6);

    const speed = $('speed');
    if (speed) speed.textContent = kmh;

    const speedArc = $('speedArc');
    if (speedArc) {
      const amount = Math.min(1, kmh / 130) * 188.5;
      speedArc.style.strokeDasharray = `${amount} 251.3`;
    }

    const fuel = Number(s.fuel) || 0;
    const condition = Number(G.car.userData?.cond ?? 100);

    const fuelElement = $('fuel');
    const fuelNumber = $('fuelNum');
    const conditionNumber = $('condNum');

    if (fuelElement) {
      fuelElement.style.width = `${Math.max(0, Math.min(100, fuel))}%`;
      fuelElement.classList.toggle('low', fuel < 20);
    }
    if (fuelNumber) fuelNumber.textContent = `${Math.round(fuel)}%`;
    if (conditionNumber) {
      conditionNumber.textContent = `${Math.round(condition)}%`;
    }

    const gear = $('gear');
    if (gear) {
      gear.textContent =
        G.carSpeed < -0.5
          ? 'R'
          : kmh < 2
            ? 'P'
            : kmh < 30
              ? '1'
              : kmh < 60
                ? '2'
                : kmh < 90
                  ? '3'
                  : '4';
    }

    // Compact name in fuel column (kept in sync with header)
    const vehicleName = $('vname');
    if (vehicleName) {
      vehicleName.textContent =
        info.name.toUpperCase() +
        (G.car.userData?.owned ? '' : info.commercial ? '' : ' ·⚠');
    }

    if (vehicle) {
      vehicle.classList.toggle('warn-fuel', fuel < 20);
      vehicle.classList.toggle('warn-cond', condition < 35);

      if (
        G._lastCond !== undefined &&
        condition < G._lastCond - 0.5
      ) {
        vehicle.classList.remove('flash-damage');
        void vehicle.offsetWidth;
        vehicle.classList.add('flash-damage');
      }
    }

    G._lastCond = condition;
  } else {
    G._lastCond = undefined;
    if (vehicle) {
      vehicle.classList.remove('commercial', 'warn-fuel', 'warn-cond');
    }
  }
}