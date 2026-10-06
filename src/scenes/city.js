import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { $ } from '../core/utils.js';
import { WORLD, PERF } from '../data/config.js';
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
import { updateWeather } from '../systems/weather.js';
import { updateMissions } from '../systems/missions.js';
import { updateRace } from '../systems/racing.js';
import { updateTrafficLights } from '../systems/trafficlights.js';
import { setupAudio, updateAudio } from '../ui/audio.js';
import { awayReport } from '../systems/economy.js';
import { startDialog } from '../systems/dialogue.js';
import { spawnOwned } from '../entities/vehicles.js';
import { fmt } from '../core/utils.js';
import { updateGamepad } from '../core/gamepad.js';
import { buildHud, hudFrame } from '../ui/hud.js';
import { buildPhone, phoneOpen } from '../ui/phone.js';
import { buildTouch, updateTouch } from '../ui/touch.js';
import { mapDraw, phoneMapDraw } from '../ui/minimap.js';

// The playable city. World geometry and traffic are built once in main.js; this scene adds the player,
// NPCs, HUD and phone, then runs the per-frame systems.
let built = false, frame = 0, routeT = 0;
export const CityScene = {
  name: 'city',
  enter() {
    const root = G.uiRoot || $('ui');
    if (!built) {
      built = true;
      createPlayer();
      createMarkers();
      spawnNpcs(PERF.lowEnd ? PERF.npcs.low : PERF.npcs.full); spawnAgberos(); spawnServiceNpcs(); spawnExtras(); spawnAnimals();
      buildHud(root); buildPhone(root); buildTouch(root);
      setupDialogue(); setupInteraction(); setupMovement(); setupAudio();
    }
    const h = homeProp();
    if (h) G.player.position.set(h.door.x, 0, h.door.z + 2); else G.player.position.set(WORLD.spawn.x, 0, WORLD.spawn.z);
    G.camYaw = 0; G.camPitch = 0.38;
    if (!G.state.msgs.length) msg('babak', 'Oya, come meet me at Ojuelegba Junction. I get work for you.', true);
    applyLook(); applyPet(); applySky(); spawnOwned(h);
    const away = awayReport();
    if (away) setTimeout(() => startDialog([{ s: 'bank', t: `While you were away (${away.minutes} min): ${away.biz ? `business income ${fmt(away.biz)}` : 'no business income'}${away.rent ? `, rent ${fmt(away.rent)}` : ''}${away.upkeep ? `, maintenance −${fmt(away.upkeep)}` : ''}. Net ${fmt(away.net)} to your account. Lagos no dey sleep.` }], null, null), 600);
    $('hud').classList.add('show');
    emit('mission:refresh'); emit('hud'); emit('clock');
    if (G.debug) import('../systems/weather.js').then(w => { window.__nr = { G, get state() { return G.state; }, startRain: w.startRain, awayReport }; });
  },
  exit() { $('hud')?.classList.remove('show'); },
  update(dt) {
    updateGamepad(dt);
    updateMovement(dt);
    updateTraffic(dt); updateNpcs(dt); updateAnimals(dt); updateMarkers(dt); updateClouds(dt);
    updateVitals(dt); updateEconomy(dt); updateLaw(dt); updateEvents(dt); updateWeather(dt); updateMissions(dt); updateRace(dt); updateTrafficLights(dt); updateClock(dt); updateAudio();
    routeT += dt; if (routeT > 0.25) { routeT = 0; updateRoute(); }   // GPS re-routes 4× a second
    updateCamera(dt);
    frame++; hudFrame(); if (frame % 2 === 0) mapDraw(); updateTouch();
    if (G.app === 'map' && phoneOpen() && frame % 4 === 0) phoneMapDraw();
  },
};
