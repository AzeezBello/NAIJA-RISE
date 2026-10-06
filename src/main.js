// NAIJA RISE — Lagos. Entry point: renderer, state, world, scenes, loop.
import { G } from './core/context.js';
import { $ } from './core/utils.js';
import { loadState } from './core/state.js';
import { createRenderer } from './core/renderer.js';
import { setupInput } from './core/input.js';
import { setupGamepad } from './core/gamepad.js';
import { buildDistrict } from './world/district.js';
import { applySky } from './world/daynight.js';
import { spawnParked, spawnTraffic } from './entities/vehicles.js';
import { registerScene, switchScene, updateScene } from './scenes/manager.js';
import { TitleScene } from './scenes/title.js';
import { CityScene } from './scenes/city.js';

G.state = loadState();
const { renderer, scene, camera } = createRenderer($('game'));
setupInput(renderer.domElement);
setupGamepad();

// The district and its traffic exist from the title screen onwards so the menu sits over a living city.
buildDistrict();
spawnParked();
spawnTraffic();
applySky();

registerScene(TitleScene);
registerScene(CityScene);
switchScene(location.hash.includes('play') ? 'city' : 'title');

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(G.clock.getDelta(), 0.05);
  updateScene(dt);
  renderer.render(scene, camera);
}
frame();
