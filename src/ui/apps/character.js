import { G } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { esc } from '../../core/utils.js';
import { LOOK } from '../../data/characters.js';
import { Sect, Swatches, Chips } from '../components.js';
import { applyLook } from '../../entities/player.js';

export default {
  id: 'character', title: 'Character', tint: '#8a3f6b',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M6 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3M9 14l3 3 3-3"/></svg>',
  render(body) {
    const L = G.state.look;
    body.innerHTML = `<div class="card preview"><canvas id="charPreview" width="144" height="144"></canvas><div><h6>${esc(G.state.name)}</h6><p>Changes apply to your character and HUD portrait instantly.</p></div></div>` +
      Sect('Skin') + Swatches('skin', LOOK.skin, L.skin) + Sect('Hair') + Chips('hair', LOOK.hair, L.hair) + Sect('Shirt') + Swatches('shirt', LOOK.shirt, L.shirt) + Sect('Trousers') + Swatches('pants', LOOK.pants, L.pants);
    applyLook();
  },
  actions: { look: id => { const [k, v] = id.split(':'); G.state.look[k] = +v; applyLook(); emit('hud'); } },
};
