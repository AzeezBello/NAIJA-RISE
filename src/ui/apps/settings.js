import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { $, esc } from '../../core/utils.js';
import { saveState, clearSave } from '../../core/state.js';
import { GAME } from '../../data/config.js';
import { Field, Toggle, Row, Btn, Note } from '../components.js';
import { timeStr } from '../../world/daynight.js';
import { gamepadConnected } from '../../core/gamepad.js';

export default {
  id: 'settings', title: 'Settings', tint: '#4a5560',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  render(body) {
    const s = G.state, st = s.settings, touch = st.touch || 'auto';
    body.innerHTML =
      Field('PLAYER NAME', `<input type="text" id="setName" maxlength="24" value="${esc(s.name)}">`) +
      Field(`CAMERA SENSITIVITY · ${st.sens.toFixed(1)}×`, `<input type="range" id="setSens" min="0.3" max="2" step="0.1" value="${st.sens}">`) +
      Toggle('Rotate minimap with camera', 'setRotate', st.rotateMap) +
      Toggle('Shadows', 'setShadows', st.shadows) +
      Toggle('Show control hints', 'setHints', st.hints) +
      Toggle('Sound', 'setAudio', st.audio !== false) +
      Toggle('Mature content (18+)', 'setMature', st.mature !== false) +
      Field('TOUCH CONTROLS', `<select id="setTouch"><option value="auto" ${touch === 'auto' ? 'selected' : ''}>Auto (phones and tablets)</option><option value="on" ${touch === 'on' ? 'selected' : ''}>Always on</option><option value="off" ${touch === 'off' ? 'selected' : ''}>Off</option></select>`) +
      Row(Btn('Reset progress', 'reset', { cls: 'danger sm' })) +
      Note(`${GAME.title} · ${GAME.subtitle} · ${GAME.version} · Day ${s.day}, ${timeStr()}<br>Controller: ${gamepadConnected() ? 'connected' : 'press any button to connect'} · Keyboard: WASD or arrow keys<br>Lagos-inspired district with real place names · Original IP. Progress saves automatically in this browser.`);
    $('setName').addEventListener('input', e => { s.name = e.target.value.trim() || 'Tunde Okafor'; $('pName').textContent = s.name; saveState(s); });
    $('setSens').addEventListener('input', e => { st.sens = +e.target.value; e.target.parentElement.firstChild.textContent = `CAMERA SENSITIVITY · ${st.sens.toFixed(1)}×`; saveState(s); });
    $('setRotate').addEventListener('change', e => { st.rotateMap = e.target.checked; saveState(s); });
    $('setShadows').addEventListener('change', e => { st.shadows = e.target.checked; emit('hud'); });
    $('setHints').addEventListener('change', e => { st.hints = e.target.checked; emit('hud'); });
    $('setMature').addEventListener('change', e => { st.mature = e.target.checked; emit('hud'); });
    $('setAudio').addEventListener('change', e => { st.audio = e.target.checked; emit('hud'); });
    $('setTouch').addEventListener('change', e => { st.touch = e.target.value; emit('hud'); });
  },
  actions: { reset: () => { if (!confirm('Reset all progress?')) return; clearSave(); location.reload(); } },
};
