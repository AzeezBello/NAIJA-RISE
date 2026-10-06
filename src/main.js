// NAIJA RISE — Lagos. Static-page entry: mounts the engine into #game with UI in #ui.
import { createGame } from './game.js';
import { $ } from './core/utils.js';

createGame({ mount: $('game'), ui: $('ui') });
