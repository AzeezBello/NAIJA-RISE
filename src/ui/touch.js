import { G } from '../core/context.js';
import { emit, on } from '../core/events.js';
import { $ } from '../core/utils.js';
import { isTouchDevice } from '../core/input.js';

// Virtual joystick (left) and action buttons (right) for phones and tablets.
export function buildTouch(root) {
  root.insertAdjacentHTML('beforeend', `
  <div id="touch" class="touch">
    <div class="stick" id="stick"><div class="knob" id="knob"></div></div>
    <div class="tbtns">
      <button class="tb tb-hold foot" data-hold="shift">RUN</button>
      <button class="tb tb-hold car" data-hold="gas">GAS</button>
      <button class="tb tb-hold car" data-hold="brake">BRAKE</button>
      <button class="tb" data-key="e">E</button>
      <button class="tb" data-key="f">F</button>
      <button class="tb foot" data-jump>JUMP</button>
      <button class="tb small" data-key="j">☎</button>
    </div>
  </div>`);
  const stick = $('stick'), knob = $('knob'), R = 44;
  let id = null, cx = 0, cy = 0;
  const set = (dx, dy) => {
    const d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    G.stick.x = (dx * k) / R; G.stick.y = (dy * k) / R; G.stick.active = d > 4; G.stick.touch = true;
  };
  stick.addEventListener('pointerdown', e => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); set(e.clientX - cx, e.clientY - cy); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
  const release = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; G.stick.x = G.stick.y = 0; G.stick.active = false; G.stick.touch = false; };
  stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release);

  for (const b of root.querySelectorAll('.tb')) {
    b.addEventListener('contextmenu', e => e.preventDefault());
    if (b.dataset.key) b.addEventListener('pointerdown', e => { e.preventDefault(); emit('key', b.dataset.key, { touch: true }); });
    if (b.dataset.jump) b.addEventListener('pointerdown', e => { e.preventDefault(); if (!G.inCar && !G.vehicleMode) G.keys.jumpPressed = true; });
    if (b.dataset.hold) {
      const h = b.dataset.hold, down = e => { e.preventDefault(); b.classList.add('on'); if (h === 'shift') G.keys.shift = true; else G.touchHold[h] = true; };
      const up = () => { b.classList.remove('on'); if (h === 'shift') G.keys.shift = false; else G.touchHold[h] = false; };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    }
  }
  G.touchHold = { gas: false, brake: false };
  applyTouchVisibility();
  on('hud', applyTouchVisibility);
}

export function applyTouchVisibility() {
  const el = $('touch'); if (!el) return;
  const pref = G.state.settings.touch || 'auto';
  const show = pref === 'on' || (pref === 'auto' && isTouchDevice());
  el.classList.toggle('show', show);
  document.body.classList.toggle('touch-ui', show);
}
export function updateTouch() { const el = $('touch'); if (el) el.classList.toggle('incar', G.inCar); }
