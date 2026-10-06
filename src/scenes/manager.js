import { emit } from '../core/events.js';

// Minimal scene manager: each scene is {name, enter(), exit(), update(dt)}.
const scenes = {};
let current = null;

export function registerScene(scene) { scenes[scene.name] = scene; }
export function switchScene(name) {
  if (current?.exit) current.exit();
  current = scenes[name];
  if (!current) throw new Error(`Unknown scene ${name}`);
  current.enter?.();
  emit('scene', name);
}
export function updateScene(dt) { current?.update?.(dt); }
export const currentScene = () => current?.name;
