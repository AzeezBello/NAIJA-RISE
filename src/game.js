// Engine entry usable from the static page (src/main.js) or from React/Next (web/components/GameCanvas.tsx).
// createGame mounts the renderer into `mount`, builds UI into `ui`, and returns { stop } for cleanup.
import { PERF } from './data/config.js';
import { preloadCharacters } from './entities/character.js';
import { setupPostFx, renderFrame } from './core/postfx.js';
import { G } from './core/context.js';
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

let running = false;

export function createGame({ mount, ui, startScene } = {}) {
  if (running) return { stop: stopGame };
  running = true;
  G.uiRoot = ui;
  G.state = loadState();
  const { renderer, scene, camera } = createRenderer(mount);
  setupInput(renderer.domElement);
  setupGamepad();

  // The district and its traffic exist from the title screen onwards so the menu sits over a living city.
  buildDistrict();
  spawnParked();
  spawnTraffic();
  setupPostFx();
  applySky();
  preloadCharacters(PERF.lowEnd);   // rigs stream in behind the title screen

  registerScene(TitleScene);
  registerScene(CityScene);
  switchScene(startScene || (location.hash.includes('play') ? 'city' : 'title'));

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(G.clock.getDelta(), 0.05);
    updateScene(dt);
    renderFrame();
  }
  frame();
  return { stop: stopGame, G };
}

export function stopGame() {
  running = false;
  G.renderer?.dispose?.();
  G.renderer?.domElement?.remove();
}
