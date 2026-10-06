import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { $ } from '../core/utils.js';
import { WORLD } from '../data/config.js';
import { createPlayer, applyLook } from '../entities/player.js';
import { spawnNpcs, spawnAgberos, spawnServiceNpcs, spawnExtras, updateNpcs } from '../entities/npcs.js';
import { spawnAnimals, applyPet, updateAnimals } from '../entities/animals.js';
import { updateTraffic } from '../entities/vehicles.js';
import { updateClouds } from '../world/district.js';
import { applySky, updateClock } from '../world/daynight.js';
import { createMarkers, updateMarkers, updateRoute, homeProp } from '../systems/navigation.js';
import { setupDialogue } from '../systems/dialogue.js';
import { setupInteraction } from '../systems/interaction.js';
import { setupMovement, updateMovement, updateCamera } from '../systems/movement.js';
import { updateVitals } from '../systems/vitals.js';
import { updateEconomy, msg } from '../systems/economy.js';
import { updateLaw } from '../systems/police.js';
import { updateEvents } from '../systems/events.js';
import { updateGamepad } from '../core/gamepad.js';
import { buildHud, hudFrame } from '../ui/hud.js';
import { buildPhone, phoneOpen } from '../ui/phone.js';
import { buildTouch, updateTouch } from '../ui/touch.js';
import { mapDraw, phoneMapDraw } from '../ui/minimap.js';

// The playable city. World geometry and traffic are built once in main.js; this scene adds the player,
// NPCs, HUD and phone, then runs the per-frame systems.
let built = false;
export const CityScene = {
  name: 'city',
  enter() {
    const root = $('ui');
    if (!built) {
      built = true;
      createPlayer();
      createMarkers();
      spawnNpcs(); spawnAgberos(); spawnServiceNpcs(); spawnExtras(); spawnAnimals();
      buildHud(root); buildPhone(root); buildTouch(root);
      setupDialogue(); setupInteraction(); setupMovement();
    }
    const h = homeProp();
    if (h) G.player.position.set(h.door.x, 0, h.door.z + 2); else G.player.position.set(WORLD.spawn.x, 0, WORLD.spawn.z);
    G.camYaw = 0; G.camPitch = 0.38;
    if (!G.state.msgs.length) msg('babak', 'Oya, come meet me at Ojuelegba Junction. I get work for you.', true);
    applyLook(); applyPet(); applySky();
    $('hud').classList.add('show');
    emit('mission:refresh'); emit('hud'); emit('clock');
    if (G.debug) window.__nr = { G, get state() { return G.state; } };
  },
  exit() { $('hud')?.classList.remove('show'); },
  update(dt) {
    updateGamepad(dt);
    updateMovement(dt);
    updateTraffic(dt); updateNpcs(dt); updateAnimals(dt); updateMarkers(dt); updateClouds(dt);
    updateVitals(dt); updateEconomy(dt); updateLaw(dt); updateEvents(dt); updateClock(dt);
    updateRoute(); updateCamera(dt);
    hudFrame(); mapDraw(); updateTouch();
    if (G.app === 'map' && phoneOpen()) phoneMapDraw();
  },
};
