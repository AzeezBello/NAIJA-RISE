import { NIGERIA_STATES, stateOf } from '../nigeria-states.js';
import * as lagos from '../districts/lagos.js';
import { STATE_AREA as ogun } from './ogun.js';
import { STATE_AREA as oyo } from './oyo.js';
import { STATE_AREA as fct } from './fct.js';
import { STATE_AREA as rivers } from './rivers.js';
import { STATE_AREA as anambra } from './anambra.js';
import { STATE_AREA as kano } from './kano.js';

export { NIGERIA_STATES, stateOf };

export const STATE_MAPS = {
  lagos,
  ogun,
  oyo,
  fct,
  rivers,
  anambra,
  kano,
};

export const ACTIVE_STATE_MAPS = Object.values(STATE_MAPS);
