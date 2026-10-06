import { G } from '../core/context.js';
import { on, emit } from '../core/events.js';
import { $ } from '../core/utils.js';
import { GAME } from '../data/config.js';
import { APPS } from './apps/index.js';
import { bindPhoneMap } from './minimap.js';
import { timeStr } from '../world/daynight.js';

// The smartphone overlay. Apps register themselves in ui/apps/index.js with {id,title,tint,icon,render,actions}.
import { toast } from './feedback.js';
const locked = a => a.minLevel && G.state.level < a.minLevel;
const ACTIONS = { open: id => { const a = APPS.find(a => a.id === id); if (locked(a)) return toast(`Reach Level ${a.minLevel} to unlock ${a.title}`); openApp(id); }, home: () => openApp('home') };
for (const a of APPS) Object.assign(ACTIONS, a.actions || {});

export function buildPhone(root) {
  const grid = APPS.map(a => `<button data-act="open" data-id="${a.id}" data-min="${a.minLevel || 1}" style="--tint:${a.tint}"><i>${a.icon}</i>${a.title}${a.id === 'messages' ? '<span class="badge" id="msgBadge"></span>' : ''}</button>`).join('');
  const screens = APPS.map(a => `<div class="papp" id="app-${a.id}"><header><button class="back" data-act="home">‹</button><h5>${a.header || a.title}</h5>${a.headerExtra || ''}</header><div class="pbody" id="body-${a.id}"></div></div>`).join('');
  root.insertAdjacentHTML('beforeend', `
  <div id="phone" class="phone"><div class="pframe"><div class="pnotch"></div>
    <div class="pstatus"><span id="pTime">00:00</span><span class="sig">5G ▂▄▆ <i class="batt"></i></span></div>
    <div class="pscreen">
      <div class="papp home show" id="app-home">
        <div class="ptop"><div class="plogo">NAIJA <b>RISE</b><small>${GAME.subtitle}</small></div><div class="pclock" id="pClock">00:00</div><div class="pdate" id="pDate"></div></div>
        <div class="pgrid">${grid}</div>
      </div>
      ${screens}
    </div>
    <div class="phomebar"><i></i></div>
  </div></div>`);
  $('phone').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; ACTIONS[b.dataset.act]?.(b.dataset.id, b); });
  bindPhoneMap();
  on('key', k => { if (k === 'j') togglePhone(); if (k === 'escape') togglePhone(false); });
  on('clock', phoneClock);
  on('phone:open', id => { togglePhone(true); openApp(id); });
  phoneClock();
}

export function openApp(id) {
  G.app = id;
  document.querySelectorAll('.papp').forEach(e => e.classList.toggle('show', e.id === 'app-' + id));
  if (id === 'messages') { G.state.msgs.forEach(m => { m.read = true; }); G.state.unread = 0; }
  emit('hud');
}
export function refreshLocks() {
  for (const b of document.querySelectorAll('.pgrid [data-min]')) { const ml = +b.dataset.min, lk = G.state.level < ml; b.classList.toggle('locked', lk); b.title = lk ? `Unlocks at Level ${ml}` : ''; }
}
export function renderApp() {
  refreshLocks();
  const a = APPS.find(a => a.id === G.app); if (!a) return;
  const body = $('body-' + a.id); if (body) a.render(body);
}
export const phoneOpen = () => $('phone')?.classList.contains('show');
export function togglePhone(force) {
  const ph = $('phone'), show = force !== undefined ? force : !ph.classList.contains('show');
  ph.classList.toggle('show', show);
  if (show) openApp('home'); else document.activeElement?.blur();
}
function phoneClock() {
  const t = timeStr();
  $('pTime').textContent = t; $('pClock').textContent = t; $('pDate').textContent = `Day ${G.state.day} · Lagos`;
}
