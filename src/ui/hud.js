import { G, pos } from '../core/context.js';
import { on } from '../core/events.js';
import { $, esc, fmt, dist } from '../core/utils.js';
import { saveState } from '../core/state.js';
import { GAME, levelTitle } from '../data/config.js';
import { MISSIONS } from '../data/missions.js';
import { VEH } from '../data/vehicles.js';
import { Key, StatBar } from './components.js';
import { renderApp } from './phone.js';
import { missionActive, curMission, missionPos, gpsTarget } from '../systems/navigation.js';
import { promptFor } from '../systems/interaction.js';
import { wanted } from '../systems/police.js';
import { timeStr } from '../world/daynight.js';
import { LANDMARKS, BUSSTOPS, ROADS, META, roadExtent, roadNameAt, regionAt } from '../data/locations.js';

// Builds the in-game HUD once. Layout: player card + objective (top-left), wallet (top-right),
// minimap + GPS (bottom-left), prompt + hints + dialogue (bottom-centre), vitals / vehicle (bottom-right).
export function buildHud(root) {
  root.insertAdjacentHTML('beforeend', `
  <div class="hud" id="hud">
    <div class="fade"></div>
    <div class="sleepfade" id="sleepfade"></div>
    <div class="brandtag"><b>${GAME.title}</b><span>${GAME.subtitle} · ${GAME.version.toUpperCase()}</span><span class="clk" id="hudClock">08:30</span></div>
    <div class="locale" id="locale"><b>Surulere</b><span>Lagos</span></div>
    <section class="player glass">
      <canvas id="portrait" class="portrait" width="112" height="112"></canvas>
      <div class="pinfo">
        <div class="pname" id="pName"></div>
        <div class="plevel"><span>LVL <b id="pLevel">1</b> · <em id="pTitle">Newcomer</em></span><span id="pXpNum">0 / 100 XP</span></div>
        <div class="xpbar"><i id="pXp"></i></div>
      </div>
    </section>
    <section class="objective glass" id="objCard">
      <div class="objhead"><span class="objkicker">Mission</span><span class="objtitle" id="missionTitle"></span></div>
      <div class="objline"><i class="objdot"></i><span id="objective"></span><span class="objdist" id="objDist"></span></div>
      <div class="objpips" id="objPips"></div>
    </section>
    <section class="wallet glass">
      <div class="wrow"><span class="wl">Cash</span><span class="wv money" id="cash">₦0</span></div>
      <div class="wrow"><span class="wl">Bank</span><span class="wv bankv" id="bank">₦0</span></div>
      <div class="wrow"><span class="wl" id="heatLabel">Heat</span><span class="heatpips" id="heat"></span></div>
    </section>
    <section class="nav">
      <div class="minimap"><canvas id="map" width="300" height="300"></canvas></div>
      <div class="gps glass" id="gps"><b>GPS</b><span class="gt" id="gpsTarget">No route</span><span class="gd" id="gpsDist"></span></div>
    </section>
    <div class="dialog glass" id="dialog"></div>
    <section class="center">
      <div class="prompt" id="prompt"></div>
      <div class="hints" id="hints">
        <span class="foot">${Key('WASD')} / ${Key('↑↓←→')} move ${Key('SHIFT')} sprint ${Key('E')} interact ${Key('F')} vehicle</span>
        <span class="car">${Key('W/S')} gas · brake ${Key('A/D')} steer ${Key('SPACE')} handbrake ${Key('F')} exit</span>
        ${Key('J')} phone <span class="badge" id="hintBadge"></span> ${Key('RMB')} camera ${Key('H')} hide
      </div>
    </section>
    <section class="vitals glass" id="vitals">${StatBar('HP', 'hp', 'hpfill')}${StatBar('STA', 'sta', 'stafill')}</section>
    <section class="vehicle glass" id="vehicle">
      <div class="speedo">
        <svg viewBox="0 0 100 100"><circle class="sbg" cx="50" cy="50" r="40"/><circle id="speedArc" cx="50" cy="50" r="40"/></svg>
        <div class="speednum"><b id="speed">0</b><span>KM/H</span></div>
      </div>
      <div class="fuel"><div class="row"><span class="vname" id="vname">DANFO</span><b id="gear">P</b></div><div class="row"><span>FUEL</span><b id="fuelNum">100%</b></div><div class="row"><span>COND</span><b id="condNum">100%</b></div><div class="track"><i id="fuel" class="fuelfill"></i></div></div>
    </section>
    <div id="toast" class="toast"></div>
    <div id="notif" class="notif glass"></div>
  </div>`);
  on('hud', refreshHud);
  on('key', k => { if (k === 'h') { G.state.settings.hints = !G.state.settings.hints; refreshHud(); } });
  on('clock', () => { $('hudClock').textContent = timeStr(); });
}

// Re-renders everything derived from state. Cheap enough to call on every state change.
export function refreshHud() {
  const s = G.state;
  $('cash').textContent = fmt(s.cash); $('bank').textContent = fmt(s.bank);
  $('heat').innerHTML = [0, 1, 2, 3, 4].map(i => `<i class="${i < s.heat ? 'on' : ''}"></i>`).join('');
  $('heat').classList.toggle('hot', wanted()); $('heatLabel').textContent = wanted() ? 'Wanted' : 'Heat';
  $('pName').textContent = s.name; $('pLevel').textContent = s.level; $('pTitle').textContent = levelTitle(s.level); $('pXpNum').textContent = `${s.xp} / 100 XP`; $('pXp').style.width = s.xp + '%';
  const m = curMission();
  const paused = s.storyPaused && !s.done;
  $('missionTitle').textContent = s.done ? 'Slice complete' : paused ? 'Free hustle' : m.title;
  $('objective').textContent = s.done ? 'Lagos is yours. Work, bank, build.' : paused ? `Jobs on your phone, courses at the cyber café, the gym, football. ${m.at === 'marina' ? 'Amaka' : 'Baba K'} go wait.` : m.obj();
  $('objPips').innerHTML = MISSIONS.map((_, i) => `<i class="${i < s.mission || s.done ? 'done' : ''}"></i>`).join('');
  const b = s.unread ? String(s.unread) : '';
  $('hintBadge').textContent = b; const mb = $('msgBadge'); if (mb) mb.textContent = b;
  $('hints').classList.toggle('hide', !s.settings.hints);
  G.sun.castShadow = s.settings.shadows;
  renderApp();
  saveState(s);
}

let lastPrompt = '', lastLocale = '', localeT = 0, localeAt = 0;
// Nearest named place, else the street you are on, else the district.
function localeName(p) {
  for (const l of [...LANDMARKS, ...BUSSTOPS]) if (dist(p, l) < (l.stadium ? 32 : 16)) return l.name;
  let best = null, bd = 14;
  for (const z of ROADS.h) { const [a, b] = roadExtent('h', z); if (p.x < a || p.x > b) continue; const d = Math.abs(p.z - z); if (d < bd) { bd = d; best = roadNameAt('h', z, p.x); } }
  for (const x of ROADS.v) { const [a, b] = roadExtent('v', x); if (p.z < a || p.z > b) continue; const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = roadNameAt('v', x, p.z); } }
  return best || regionAt(p.x).name;
}
// Per-frame HUD updates: prompt, distances, bars, speedometer.
export function hudFrame() {
  const s = G.state, p = pos();
  const pr = promptFor(), e = $('prompt');
  const sig = pr ? (pr.key || '') + pr.text + (pr.bar !== undefined ? '#' : '') : '';
  if (sig !== lastPrompt) {
    lastPrompt = sig;
    if (!pr) e.classList.remove('show');
    else { e.innerHTML = (pr.key ? Key(pr.key) : '') + `<span>${esc(pr.text)}</span>` + (pr.bar !== undefined ? '<span class="bar"><i></i></span>' : ''); e.classList.add('show'); }
  }
  if (pr && pr.bar !== undefined) { const i = e.querySelector('.bar i'); if (i) i.style.width = (pr.bar * 100) + '%'; }
  $('objDist').textContent = missionActive() ? Math.round(dist(p, missionPos())) + ' m' : '';
  if (G.race && !G.race.finished && G.race.obj) $('objective').textContent = G.race.obj;
  if (performance.now() - localeAt > 500) { localeAt = performance.now(); const n = localeName(p); if (n !== lastLocale) { lastLocale = n; const e = $('locale'); e.querySelector('b').textContent = n; e.querySelector('span').textContent = regionAt(p.x).name === n ? META.state : regionAt(p.x).name; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); } }
  const t = gpsTarget();
  $('gpsTarget').textContent = t ? t.label : 'No route'; $('gpsDist').textContent = t ? Math.round(G.routeLen) + ' m' : '';
  $('hp').style.width = s.health + '%'; $('sta').style.width = s.stamina + '%';
  $('vitals').classList.toggle('hide', G.inCar); $('vehicle').classList.toggle('show', G.inCar); $('hints').classList.toggle('incar', G.inCar);
  if (G.inCar) {
    const kmh = Math.round(Math.abs(G.carSpeed) * 3.6);
    $('speed').textContent = kmh;
    $('speedArc').style.strokeDasharray = `${Math.min(1, kmh / 130) * 188.5} 251.3`;
    $('fuel').style.width = s.fuel + '%'; $('fuelNum').textContent = Math.round(s.fuel) + '%';
    $('gear').textContent = G.carSpeed < -0.5 ? 'R' : kmh < 2 ? 'P' : kmh < 30 ? '1' : kmh < 60 ? '2' : kmh < 90 ? '3' : '4';
    $('vname').textContent = VEH[G.car.userData.type].name.toUpperCase() + (G.car.userData.owned ? '' : ' ·⚠'); $('condNum').textContent = Math.round(G.car.userData.cond ?? 100) + '%';
  }
}
