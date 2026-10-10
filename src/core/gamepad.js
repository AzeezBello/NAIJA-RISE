import { G } from './context.js';
import { emit } from './events.js';

/*
 * NAIJA RISE — DualSense / Gamepad Controls
 *
 * ON FOOT
 * ─────────────────────────────────────────
 * Left Stick       Move
 * Right Stick      Camera
 * L3               Sprint
 * Square / X        Jump
 * Cross / A         Interact / Confirm
 * Circle / B        Enter / Exit Vehicle
 * Triangle / Y      Phone
 * R1               Handbrake
 * Options          Pause
 * Share            Reset Camera
 * D-Pad            Dialogue choices
 *
 * DRIVING
 * ─────────────────────────────────────────
 * Left Stick       Steering
 * Right Stick      Camera
 * R2               Accelerate
 * L2               Brake / Reverse
 * R1               Handbrake
 * L3               Boost
 * Circle / O       Exit Vehicle
 *
 * The game uses the browser Standard Gamepad mapping.
 */

const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,

  LB: 4,
  RB: 5,

  LT: 6,
  RT: 7,

  BACK: 8,
  START: 9,

  L3: 10,
  R3: 11,

  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,

  // Some browsers expose the DualSense touchpad here.
  TOUCHPAD: 17,
};

const PRESS = {
  [BTN.A]: 'e',          // Cross → interact
  [BTN.B]: 'f',          // Circle → vehicle
  [BTN.Y]: 'j',          // Triangle → phone

  [BTN.BACK]: 'r',       // Share → reset camera
  [BTN.R3]: 'r',         // R3 → reset camera

  [BTN.UP]: '1',
  [BTN.RIGHT]: '2',
  [BTN.DOWN]: '3',
  [BTN.LEFT]: '4',
};

const dz = (value, deadzone = 0.16) => {
  const v = Number(value) || 0;

  if (Math.abs(v) <= deadzone) {
    return 0;
  }

  return (
    v -
    Math.sign(v) * deadzone
  ) / (1 - deadzone);
};

/*
 * Camera response curve.
 *
 * Small stick movement = precise camera movement.
 * Full stick = full camera speed.
 */
const curve = value =>
  Math.sign(value) *
  Math.pow(Math.abs(value), 1.25);

const prev = {};

let connected = false;

function buttonValue(gp, index) {
  const button = gp.buttons?.[index];

  if (!button) {
    return 0;
  }

  return (
    button.value ||
    (button.pressed ? 1 : 0)
  );
}

function pressed(gp, index) {
  return buttonValue(gp, index) > 0.5;
}

function clearButtonState() {
  for (const key of Object.keys(prev)) {
    prev[key] = false;
  }
}

export function togglePause() {
  G.paused = !G.paused;
  for (const key of Object.keys(G.keys || {})) G.keys[key] = false;
  if (G.pad) {
    G.pad.gas = 0;
    G.pad.brake = 0;
    G.pad.sprint = false;
    G.pad.hand = false;
    G.pad.jump = false;
    G.pad.camX = 0;
    G.pad.camY = 0;
  }

  emit('pause', G.paused);
}

export function setupGamepad() {
  G.pad = {
    gas: 0,
    brake: 0,

    sprint: false,
    hand: false,
    jump: false,

    camX: 0,
    camY: 0,

    active: false,

    id: '',
  };

  addEventListener(
    'gamepadconnected',
    e => {
      connected = true;

      G.pad.id =
        e.gamepad.id ||
        'DualSense';

      clearButtonState();

      emit(
        'gamepad',
        true,
        e.gamepad.id
      );
    }
  );

  addEventListener(
    'gamepaddisconnected',
    () => {
      connected = false;

      G.pad.active = false;
      G.pad.id = '';

      clearButtonState();

      if (
        G.stick &&
        !G.stick.touch
      ) {
        G.stick.active = false;
        G.stick.x = 0;
        G.stick.y = 0;
      }

      emit(
        'gamepad',
        false
      );
    }
  );
}

export function updateGamepad(dt) {
  const pads =
    navigator.getGamepads
      ? navigator.getGamepads()
      : [];

  const gp = [
    ...pads
  ].find(
    p =>
      p &&
      p.connected
  );

  if (!G.pad) {
    setupGamepad();
  }

  const pad = G.pad;

  if (!gp) {
    if (pad.active) {
      pad.active = false;

      if (
        G.stick &&
        !G.stick.touch
      ) {
        G.stick.active = false;
        G.stick.x = 0;
        G.stick.y = 0;
      }
    }

    return;
  }

  connected = true;

  pad.id =
    gp.id ||
    'DualSense';

  /*
   * ---------------------------------------------------------
   * ANALOG STICKS
   * ---------------------------------------------------------
   */

  const lx =
    dz(gp.axes?.[0]);

  const ly =
    dz(gp.axes?.[1]);

  const rx =
    curve(
      dz(gp.axes?.[2])
    );

  const ry =
    curve(
      dz(gp.axes?.[3])
    );

  /*
   * ---------------------------------------------------------
   * TRIGGERS
   * ---------------------------------------------------------
   */

  pad.gas =
    buttonValue(
      gp,
      BTN.RT
    );

  pad.brake =
    buttonValue(
      gp,
      BTN.LT
    );

  /*
   * ---------------------------------------------------------
   * CONSOLE ACTIONS
   * ---------------------------------------------------------
   *
   * L3 = sprint / boost
   * Square / X = jump (on foot)
   * R1 = handbrake
   */

  pad.sprint =
    pressed(gp, BTN.L3);

  pad.hand =
    pressed(gp, BTN.RB);

  const jumpDown = pressed(gp, BTN.X);
  if (
    jumpDown &&
    !prev[BTN.X] &&
    !G.inCar &&
    !G.vehicleMode &&
    !G.paused
  ) {
    pad.jump = true;
  }
  prev[BTN.X] = jumpDown;

  pad.camX = rx;
  pad.camY = ry;

  pad.active = !!(
    lx ||
    ly ||
    rx ||
    ry ||
    pad.gas ||
    pad.brake ||
    pad.sprint ||
    pad.hand ||
    pad.jump
  );

  /*
   * ---------------------------------------------------------
   * BUTTON EDGE DETECTION
   * ---------------------------------------------------------
   */

  for (
    const index of Object.keys(PRESS)
  ) {
    const i =
      Number(index);

    const down =
      pressed(gp, i);

    if (
      down &&
      !prev[i]
    ) {
      emit(
        'key',
        PRESS[i],
        {
          gamepad: true,
        }
      );
    }

    prev[i] = down;
  }

  /*
   * ---------------------------------------------------------
   * OPTIONS = PAUSE
   * ---------------------------------------------------------
   *
   * Button 9 is handled separately so Options doesn't become
   * an ordinary keyboard event.
   */

  const optionsDown =
    pressed(
      gp,
      BTN.START
    );

  if (
    optionsDown &&
    !prev[BTN.START]
  ) {
    togglePause();
  }

  prev[BTN.START] =
    optionsDown;

  /*
   * ---------------------------------------------------------
   * PAUSED STATE
   * ---------------------------------------------------------
   *
   * Do not allow movement, camera or interaction commands
   * while paused.
   */

  if (G.paused) {
    pad.gas = 0;
    pad.brake = 0;
    pad.sprint = false;
    pad.hand = false;
    pad.jump = false;

    pad.camX = 0;
    pad.camY = 0;

    if (
      G.stick &&
      !G.stick.touch
    ) {
      G.stick.x = 0;
      G.stick.y = 0;
      G.stick.active = false;
    }

    return;
  }

  /*
   * ---------------------------------------------------------
   * LEFT STICK → EXISTING MOVEMENT SYSTEM
   * ---------------------------------------------------------
   */

  if (
    G.stick &&
    !G.stick.touch
  ) {
    if (
      lx ||
      ly
    ) {
      G.stick.x = lx;
      G.stick.y = ly;
      G.stick.active = true;
    } else if (
      G.stick.active
    ) {
      G.stick.active = false;
      G.stick.x = 0;
      G.stick.y = 0;
    }
  }

  /*
   * ---------------------------------------------------------
   * RIGHT STICK → CAMERA
   * ---------------------------------------------------------
   */

  if (
    rx ||
    ry
  ) {
    const sens =
      Number(
        G.state?.settings?.sens
      ) || 1;

    G.camYaw -=
      rx *
      2.65 *
      dt *
      sens;

    G.camPitch =
      Math.max(
        -0.05,
        Math.min(
          1.05,
          G.camPitch +
            ry *
            1.8 *
            dt *
            sens
        )
      );
  }
}

export const gamepadConnected =
  () => connected;