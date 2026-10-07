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
import { missionActive, missionAvailable, curMission, missionPos, gpsTarget } from '../systems/navigation.js';
import { promptFor } from '../systems/interaction.js';
import { wanted } from '../systems/police.js';
import { timeStr } from '../world/daynight.js';
import { LANDMARKS, BUSSTOPS, ROADS, META, roadExtent, roadNameAt, regionAt } from '../data/locations.js';

// "The Lagos Experience" HUD, GTA-style: clock, day and the money / level card stacked top-right; street name above the
// minimap and the objective card bottom-left; health, energy and the interaction prompt bottom-centre. No branding in play.
export function buildHud(root) {
  root.insertAdjacentHTML('beforeend', `
  <div class="hud" id="hud">
    <div class="fade"></div>
    <div class="sleepfade" id="sleepfade"></div>
    <header class="topbar">
      <div class="tr">
        <div class="clockrow"><span class="clk" id="hudClock">08:30</span><span class="dayicon" id="dayIcon">☀</span><span class="daynum" id="dayNum">DAY 01</span></div>
        <section class="status glass" id="status">
          <canvas id="portrait" class="portrait" width="112" height="112"></canvas>
          <div class="sinfo">
            <div class="cash" id="cash">₦0</div>
            <div class="srow"><span class="lvl">LVL <b id="pLevel">1</b></span><span class="ltitle" id="pTitle">Newcomer</span><span class="bankv" id="bank">₦0</span></div>
            <div class="xpbar"><i id="pXp"></i></div>
            <div class="srow small"><span id="pName"></span><span id="pXpNum">0 / 100 XP</span></div>
            <div class="heatrow"><span class="wl" id="heatLabel">Heat</span><span class="heatpips" id="heat"></span></div>
          </div>
        </section>
      </div>
    </header>

    <section class="objective glass" id="objCard">
      <div class="objhead"><span class="objkicker">Objective</span><span class="objtitle" id="missionTitle"></span></div>
      <div class="objline"><span id="objective"></span></div>
      <div class="objfoot"><span class="objdist" id="objDist"></span><span class="objarrow" id="objArrow">➜</span><span class="objpips" id="objPips"></span></div>
    </section>

    <section class="nav">
      <div class="locale" id="locale"><b>Surulere</b><span>Lagos</span></div>
      <div class="minimap"><canvas id="map" width="300" height="300"></canvas></div>
      <div class="gps glass" id="gps"><b>GPS</b><span class="gt" id="gpsTarget">No route</span><span class="gd" id="gpsDist"></span></div>
    </section>

    <section class="bottom">
      <div class="vitals glass" id="vitals">${StatBar('❤', 'hp', 'hpfill')}${StatBar('⚡', 'sta', 'stafill')}</div>
      <div class="vehicle glass" id="vehicle">
        <div class="speedo">
          <svg viewBox="0 0 100 100"><circle class="sbg" cx="50" cy="50" r="40"/><circle id="speedArc" cx="50" cy="50" r="40"/></svg>
          <div class="speednum"><b id="speed">0</b><span>KM/H</span></div>
        </div>
        <div class="fuel"><div class="row"><span class="vname" id="vname">DANFO</span><b id="gear">P</b></div><div class="row"><span>FUEL</span><b id="fuelNum">100%</b></div><div class="track"><i id="fuel" class="fuelfill"></i></div><div class="row"><span>COND</span><b id="condNum">100%</b></div></div>
      </div>
      <div class="prompt" id="prompt"></div>
    </section>
    <div class="hints" id="hints">
      <span class="foot">${Key('WASD')} / ${Key('↑↓←→')} move ${Key('SHIFT')} sprint ${Key('E')} interact ${Key('F')} vehicle</span>
      <span class="car">${Key('W/S')} gas · brake ${Key('A/D')} steer ${Key('SPACE')} handbrake ${Key('F')} exit</span>
      ${Key('J')} phone <span class="badge" id="hintBadge"></span> ${Key('RMB')} camera ${Key('H')} hide
    </div>
    <div class="dialog glass" id="dialog"></div>
    <div id="toast" class="toast"></div>
    <div id="toast" class="toast"></div>
      <div class="notif-stack" id="notifStack"></div>
      <div id="notif" class="notif glass" style="display:none"></div>

  </div>`);
  on('hud', refreshHud);
  on('key', k => { if (k === 'h') { G.state.settings.hints = !G.state.settings.hints; refreshHud(); } });
  on('clock', () => { const s = G.state; $('hudClock').textContent = timeStr(); $('dayIcon').textContent = s.clock >= 6 && s.clock < 18.5 ? '☀' : '🌙'; $('dayNum').textContent = `DAY ${String(s.day).padStart(2, '0')}`; });
}

// Re-renders everything derived from state. Cheap enough to call on every state change.
export function refreshHud() {
  const s = G.state;
  $('cash').textContent = fmt(s.cash); $('bank').textContent = `Bank ${fmt(s.bank)}`;
  $('heat').innerHTML = [0, 1, 2, 3, 4].map(i => `<i class="${i < s.heat ? 'on' : ''}"></i>`).join('');
    const card = $('objCard');
  card.classList.remove('state-active', 'state-free', 'state-fail', 'state-done', 'state-family', 'state-job');
  if (s.done) {
    card.classList.add('state-done');
    $('objkicker') && ($('objkicker').textContent = 'Complete');
  } else if (paused) {
    card.classList.add('state-free');
  } else if (s.familyReq) {
    card.classList.add('state-family');
  } else if (s.job) {
    card.classList.add('state-job');
  } else if (missionActive()) {
    card.classList.add('state-active');
  } else {
    card.classList.add('state-free');
  }

  // Prefer family objective text when a request is active and story is paused/idle
  if (s.familyReq && (paused || !missionActive())) {
    // optional: import requestOf from family data
    // $('missionTitle').textContent = 'Family';
    // $('objective').textContent = request blurb
  }

  $('heatLabel').classList.toggle('wanted', wanted());
  $('heatLabel').textContent = wanted() ? 'Wanted' : 'Heat';



  const isWanted = wanted();
  $('heat').classList.toggle('hot', isWanted || s.heat >= 3);
  $('heatLabel').textContent = isWanted ? 'Wanted' : 'Heat';
  $('heatLabel').classList.toggle('wanted', isWanted);
  $('status').classList.toggle('heat0', s.heat === 0);
  $('status').classList.toggle('wanted', isWanted);

  $('pName').textContent = s.name; $('pLevel').textContent = s.level;
  $('pTitle').textContent = levelTitle(s.level);
  $('pXpNum').textContent = `${s.xp} / 100 XP`; $('pXp').style.width = s.xp + '%';

  const m = curMission(), paused = s.storyPaused && !s.done;
  const obj = $('objCard');
  obj.classList.remove('state-active', 'state-free', 'state-fail', 'state-done');
  if (s.done) {
    obj.classList.add('state-done');
    $('missionTitle').textContent = 'Slice complete';
    $('objective').textContent = 'Lagos is yours. Work, bank, build.';
    obj.querySelector('.objkicker').textContent = 'Complete';
  } else if (s.missionFailed) {
    obj.classList.add('state-fail');
    $('missionTitle').textContent = m.title;
    $('objective').textContent = m.failObj?.() || 'Mission failed. Retry from the contact.';
    obj.querySelector('.objkicker').textContent = 'Failed';
  } else if (paused) {
    obj.classList.add('state-free');
    $('missionTitle').textContent = 'Free hustle';
    $('objective').textContent = `Jobs on your phone, courses at the cyber café, the gym, football. ${m.at === 'marina' ? 'Amaka' : 'Baba K'} go wait.`;
    obj.querySelector('.objkicker').textContent = 'Open world';
  } else {
    obj.classList.add('state-active');
    $('missionTitle').textContent = m.title;
    $('objective').textContent = m.obj();
    obj.querySelector('.objkicker').textContent = 'Objective';
  }
  $('objPips').innerHTML = MISSIONS.map((_, i) => `<i class="${i < s.mission || s.done ? 'done' : ''}"></i>`).join('');

  const b = s.unread ? String(s.unread) : '';
  $('hintBadge').textContent = b; const mb = $('msgBadge'); if (mb) mb.textContent = b;
  // Hints: off by default on coarse pointers
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
  $('hints').classList.toggle('hide', !s.settings.hints || coarse);
  G.sun.castShadow = s.settings.shadows && (QUALITY[G.quality]?.shadows ?? 1) > 0;
  renderApp();
  saveState(s);
}

const fmtDist = m => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
let lastPrompt = '', lastLocale = '', localeAt = 0;
// Nearest named place, else the street you are on, else the region.
function localeName(p) {
  for (const l of [...LANDMARKS, ...BUSSTOPS]) if (dist(p, l) < (l.stadium ? 32 : 16)) return l.name;
  let best = null, bd = 14;
  for (const z of ROADS.h) { const [a, b] = roadExtent('h', z); if (p.x < a || p.x > b) continue; const d = Math.abs(p.z - z); if (d < bd) { bd = d; best = roadNameAt('h', z, p.x); } }
  for (const x of ROADS.v) { const [a, b] = roadExtent('v', x); if (p.z < a || p.z > b) continue; const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = roadNameAt('v', x, p.z); } }
  return best || regionAt(p.x, p.z).name;
}

// Per-frame HUD updates: prompt, distances, bars, speedometer.
export function hudFrame() {
  const s = G.state, p = pos();
  
    // Prompt with optional sub
  const pr = promptFor(), e = $('prompt');
  const sig = pr ? (pr.key || '') + pr.text + (pr.sub || '') + (pr.bar !== undefined ? '#' : '') : '';
  if (sig !== lastPrompt) {
    lastPrompt = sig;
    if (!pr) e.classList.remove('show');
    else {
      e.innerHTML =
        `<div class="prow">${pr.key ? Key(pr.key) : ''}<span class="ptext">${esc(pr.text)}</span>` +
        (pr.bar !== undefined ? '<span class="bar"><i></i></span>' : '') +
        `</div>` +
        (pr.sub ? `<div class="psub">${esc(pr.sub)}</div>` : '');
      e.classList.add('show');
    }
  }
  if (pr && pr.bar !== undefined) {
    const i = e.querySelector('.bar i');
    if (i) i.style.width = (pr.bar * 100) + '%';
  }

  // … existing target / locale / gps / vitals …

  if (G.inCar) {
    // … existing speed / fuel / gear …

    const veh = $('vehicle');
    const fuelLow = s.fuel < 20;
    const cond = G.car.userData.cond ?? 100;
    const condLow = cond < 35;
    veh.classList.toggle('warn-fuel', fuelLow);
    veh.classList.toggle('warn-cond', condLow);

    // One-shot flash when condition drops (track previous)
    if (G._lastCond != null && cond < G._lastCond - 0.5) {
      veh.classList.remove('dmgFlash');
      void veh.offsetWidth;
      veh.classList.add('dmgFlash');
    }
    G._lastCond = cond;
  }


  if (pr && pr.bar !== undefined) { const i = e.querySelector('.bar i'); if (i) i.style.width = (pr.bar * 100) + '%'; }
  if (G.race && !G.race.finished && G.race.obj) $('objective').textContent = G.race.obj;
  const target = (G.race && !G.race.finished) ? gpsTarget() : missionActive() ? missionPos() : missionAvailable() && s.storyPaused ? null : gpsTarget();
  if (target) {
    $('objDist').textContent = fmtDist(dist(p, target));
    const ang = Math.atan2(target.x - p.x, -(target.z - p.z)) + G.camYaw;   // bearing relative to the camera
    $('objArrow').style.transform = `rotate(${(ang * 180 / Math.PI - 90).toFixed(0)}deg)`; $('objArrow').style.opacity = 1;
  } else { $('objDist').textContent = ''; $('objArrow').style.opacity = 0; }
  if (performance.now() - localeAt > 500) { localeAt = performance.now(); const n = localeName(p); if (n !== lastLocale) { lastLocale = n; const el = $('locale'); el.querySelector('b').textContent = n; el.querySelector('span').textContent = regionAt(p.x, p.z).name === n ? META.state : regionAt(p.x, p.z).name; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } }
  const t = gpsTarget();
  $('gpsTarget').textContent = t ? t.label : 'No route'; $('gpsDist').textContent = t ? fmtDist(G.routeLen) : '';
  $('hp').style.width = s.health + '%'; $('sta').style.width = s.stamina + '%';
  $('vitals').classList.toggle('hide', G.inCar); $('vehicle').classList.toggle('show', G.inCar); $('hints').classList.toggle('incar', G.inCar);
    if (G.inCar) {
    const kmh = Math.round(Math.abs(G.carSpeed) * 3.6);
    $('speed').textContent = kmh;
    $('speedArc').style.strokeDasharray = `${Math.min(1, kmh / 130) * 188.5} 251.3`;
    const fuel = s.fuel, cond = G.car.userData.cond ?? 100;
    $('fuel').style.width = fuel + '%'; $('fuelNum').textContent = Math.round(fuel) + '%';
    $('fuel').classList.toggle('low', fuel < 20);
    $('gear').textContent = G.carSpeed < -0.5 ? 'R' : kmh < 2 ? 'P' : kmh < 30 ? '1' : kmh < 60 ? '2' : kmh < 90 ? '3' : '4';
    $('vname').textContent = VEH[G.car.userData.type].name.toUpperCase() + (G.car.userData.owned ? '' : ' ·⚠');
    $('condNum').textContent = Math.round(cond) + '%';

    const veh = $('vehicle');
    veh.classList.toggle('warn-fuel', fuel < 20);
    veh.classList.toggle('warn-cond', cond < 35);
    // one-shot damage flash when condition drops
    if (G._lastCond !== undefined && cond < G._lastCond - 0.5) {
      veh.classList.remove('flash-damage');
      void veh.offsetWidth;
      veh.classList.add('flash-damage');
    }
    G._lastCond = cond;
  } else {
    G._lastCond = undefined;
  }
  
}

