import * as THREE from 'three';
import { G } from '../core/context.js';
import { $ } from '../core/utils.js';
import { hasSave, clearSave, freshState } from '../core/state.js';
import { GAME } from '../data/config.js';
import { placeOf } from '../data/locations.js';
import { switchScene } from './manager.js';
import { updateTraffic } from '../entities/vehicles.js';
import { updateClouds } from '../world/district.js';
import { updateTrafficLights } from '../systems/trafficlights.js';
import { Key } from '../ui/components.js';

// Title screen: the city idles behind a slow orbiting camera while the player chooses Continue / New game.
let t = 0;
export const TitleScene = {
  name: 'title',
  enter() {
    const root = G.uiRoot || $('ui');
    root.insertAdjacentHTML('beforeend', `
    <div id="title" class="title">
      <div class="tcard">
        <div class="tlogo">NAIJA <b>RISE</b><small>${GAME.subtitle} · ${GAME.version.toUpperCase()}</small></div>
        <p class="ttag">Build your life. Build your empire. Survive the city.</p>
        <div class="tbtns">
          ${hasSave() ? '<button class="btn big" data-t="continue">Continue</button>' : ''}
          <button class="btn big ${hasSave() ? 'ghost' : ''}" data-t="new">${hasSave() ? 'New game' : 'Start'}</button>
        </div>
        <p class="tctrl">${Key('WASD')} / ${Key('↑↓←→')} move · ${Key('E')} interact · ${Key('F')} vehicle · ${Key('J')} phone · ${Key('RMB')} camera · controller and touch supported</p>
        <p class="tfine">Lagos-inspired district with real place names · original characters and story · progress saves in this browser</p>
      </div>
    </div>`);
    $('title').addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      if (b.dataset.t === 'new') { if (hasSave() && !confirm('Start a new game? Your saved progress will be deleted.')) return; clearSave(); G.state = freshState(); }
      switchScene('city');
    });
    addEventListener('keydown', e => { if (e.key === 'Enter' && $('title')) switchScene('city'); }, { once: true });
  },
  exit() { $('title')?.remove(); },
  update(dt) {
    t += dt;
    const o = placeOf('ojuelegba');
    G.camera.position.set(o.x + Math.cos(t * 0.08) * 70, 28 + Math.sin(t * 0.05) * 6, o.z + Math.sin(t * 0.08) * 70);
    G.camera.lookAt(new THREE.Vector3(o.x, 4, o.z));
    if (G.sky) G.sky.position.copy(G.camera.position);
    updateTraffic(dt); updateClouds(dt); updateTrafficLights(dt);
  },
};
