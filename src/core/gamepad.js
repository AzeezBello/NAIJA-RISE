import { G } from './context.js';
import { emit } from './events.js';

// Standard-mapping gamepad: left stick move/steer, right stick camera, RT gas, LT brake,
// A interact, B vehicle, Y phone, X sprint (hold), LB handbrake (hold), D-pad dialogue choices, Start hints.
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PRESS = { [BTN.A]: 'e', [BTN.B]: 'f', [BTN.Y]: 'j', [BTN.START]: 'h', [BTN.BACK]: 'r', [BTN.UP]: '1', [BTN.RIGHT]: '2', [BTN.DOWN]: '3', [BTN.LEFT]: ' ' };
const dz = (v, d = 0.18) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));
const prev = {};
let connected = false;

export function setupGamepad() {
  G.pad = { gas: 0, brake: 0, sprint: false, hand: false, camX: 0, camY: 0, active: false };
  addEventListener('gamepadconnected', e => { connected = true; emit('gamepad', true, e.gamepad.id); });
  addEventListener('gamepaddisconnected', () => { connected = false; G.pad.active = false; emit('gamepad', false); });
}

export function updateGamepad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = [...pads].find(p => p && p.connected);
  const pad = G.pad;
  if (!gp) { if (pad.active) { pad.active = false; if (G.stick && !G.stick.touch) G.stick.active = false; } return; }
  connected = true;
  const lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
  const b = i => gp.buttons[i] ? (gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0)) : 0;
  pad.gas = b(BTN.RT); pad.brake = b(BTN.LT); pad.sprint = b(BTN.X) > 0.5; pad.hand = b(BTN.LB) > 0.5;
  pad.camX = rx; pad.camY = ry;
  pad.active = !!(lx || ly || rx || ry || pad.gas || pad.brake || pad.sprint);
  if (G.stick && !G.stick.touch) {
    if (lx || ly) { G.stick.x = lx; G.stick.y = ly; G.stick.active = true; }
    else if (G.stick.active) { G.stick.active = false; G.stick.x = G.stick.y = 0; }
  }
  if (rx || ry) { G.camYaw -= rx * 2.4 * dt * G.state.settings.sens; G.camPitch = Math.max(-0.05, Math.min(1.05, G.camPitch + ry * 1.6 * dt)); }
  for (const i in PRESS) {
    const down = b(i) > 0.5;
    if (down && !prev[i]) emit('key', PRESS[i], { gamepad: true });
    prev[i] = down;
  }
}
export const gamepadConnected = () => connected;
