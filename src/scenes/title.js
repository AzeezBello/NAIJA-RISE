import * as THREE from 'three';
import { G } from '../core/context.js';
import { $ } from '../core/utils.js';
import { on } from '../core/events.js';
import { hasSave, clearSave, freshState } from '../core/state.js';
import { GAME } from '../data/config.js';
import { placeOf } from '../data/locations.js';
import { switchScene } from './manager.js';
import { updateTraffic } from '../entities/vehicles.js';
import { updateClouds } from '../world/district.js';
import { updateTrafficLights } from '../systems/trafficlights.js';
import { Key } from '../ui/components.js';

let t = 0;
let offKey = null;

function startGame(type = 'continue') {
  if (type === 'new') {
    if (
      hasSave() &&
      !confirm(
        'Start a new game? Your saved progress will be deleted.'
      )
    ) {
      return;
    }

    clearSave();
    G.state = freshState();
  }

  switchScene('city');
}

export const TitleScene = {
  name: 'title',

  enter() {
    const root = G.uiRoot || $('ui');

    root.insertAdjacentHTML(
      'beforeend',
      `
      <div id="title" class="title">

        <!-- Cinematic overlays -->
        <div class="title-grid"></div>
        <div class="title-scan"></div>
        <div class="title-vignette"></div>
        <div class="title-noise"></div>

        <!-- Top status -->
        <div class="title-top">
          <div class="title-location">
            <span class="status-dot"></span>
            <span>NAIJA RISE WORLD</span>
            <span class="separator">/</span>
            <span>LAGOS</span>
          </div>

          <div class="title-version">
            ${GAME.version.toUpperCase()}
          </div>
        </div>

        <!-- Main cover -->
        <main class="title-main">

          <div class="title-kicker">
            <span>01</span>
            <i></i>
            <span>THE LAGOS EXPERIENCE</span>
          </div>

          <div class="title-brand">
            <div class="title-name">
              NAIJA
              <b>RISE</b>
            </div>

            <div class="title-city">
              LAGOS
            </div>
          </div>

          <div class="title-rule"></div>

          <p class="title-tagline">
            YOUR LIFE.
            <span>YOUR HUSTLE.</span>
            YOUR LAGOS.
          </p>

          <p class="title-description">
            Step into a living Lagos. Work, learn, make connections,
            find opportunities, build your reputation and rise from
            a newcomer into somebody.
          </p>

          <!-- Gameplay pillars -->
          <div class="title-pillars">

            <div class="title-pillar">
              <strong>01</strong>
              <span>EXPLORE</span>
              <small>DISCOVER THE CITY</small>
            </div>

            <div class="title-pillar">
              <strong>02</strong>
              <span>HUSTLE</span>
              <small>MAKE YOUR MONEY</small>
            </div>

            <div class="title-pillar">
              <strong>03</strong>
              <span>BUILD</span>
              <small>CREATE YOUR LIFE</small>
            </div>

            <div class="title-pillar">
              <strong>04</strong>
              <span>RISE</span>
              <small>MAKE YOUR NAME</small>
            </div>

          </div>

          <!-- Main actions -->
          <div class="title-actions">

            ${
              hasSave()
                ? `
                  <button
                    class="title-button title-primary"
                    data-t="continue"
                  >
                    <span class="button-index">01</span>

                    <span class="button-copy">
                      <strong>CONTINUE</strong>
                      <small>RESUME YOUR LIFE</small>
                    </span>

                    <span class="button-arrow">→</span>
                  </button>
                `
                : ''
            }

            <button
              class="title-button ${
                hasSave() ? 'title-secondary' : 'title-primary'
              }"
              data-t="new"
            >
              <span class="button-index">
                ${hasSave() ? '02' : '01'}
              </span>

              <span class="button-copy">
                <strong>
                  ${hasSave() ? 'NEW LIFE' : 'ENTER LAGOS'}
                </strong>

                <small>
                  ${hasSave() ? 'START FRESH' : 'BEGIN YOUR STORY'}
                </small>
              </span>

              <span class="button-arrow">→</span>
            </button>

          </div>

          <!-- Controls -->
          <div class="title-controls">

            <div class="control">
              ${Key('WASD')}
              <span>MOVE</span>
            </div>

            <div class="control">
              ${Key('E')}
              <span>INTERACT</span>
            </div>

            <div class="control">
              ${Key('F')}
              <span>VEHICLE</span>
            </div>

            <div class="control">
              ${Key('RMB')}
              <span>CAMERA</span>
            </div>

            <div class="control">
              ${Key('✕')}
              <span>SELECT</span>
            </div>

          </div>

          <div class="title-footer">
            SURULERE DISTRICT
            <span>•</span>
            OPEN-WORLD LIFE SIMULATION
            <span>•</span>
            PROGRESS SAVES AUTOMATICALLY
          </div>

        </main>

        <!-- Decorative corners -->
        <div class="title-corner title-corner-tl">
          <span>NR</span>
          <i></i>
          <small>01</small>
        </div>

        <div class="title-corner title-corner-br">
          <small>LIVE CITY</small>
          <i></i>
          <span>●</span>
        </div>

        <!-- Side city indicator -->
        <div class="city-indicator">
          <span class="city-line"></span>

          <div>
            <strong>SURULERE</strong>
            <small>LAGOS, NIGERIA</small>
          </div>
        </div>

      </div>
      `
    );

    const title = $('title');

    if (!title) return;

    title.addEventListener('click', event => {
      const button = event.target.closest('[data-t]');

      if (!button) return;

      startGame(button.dataset.t);
    });

    /*
     * Keyboard / controller start.
     *
     * E is already the interaction button in-game.
     * Enter and Space are also accepted on the title screen.
     */
    const handleStartKey = key => {
      if (!$('title')) return;

      if (
        key === 'e' ||
        key === 'Enter' ||
        key === ' '
      ) {
        startGame(
          hasSave()
            ? 'continue'
            : 'new'
        );
      }
    };

    title.addEventListener('keydown', event => {
      handleStartKey(event.key);
    });

    offKey = on('key', handleStartKey);
  },

  exit() {
    offKey?.();
    offKey = null;

    $('title')?.remove();
  },

  update(dt) {
    t += dt;

    /*
     * Keep the Lagos environment alive behind the title screen.
     */
    const o = placeOf('ojuelegba');

    G.camera.position.set(
      o.x + Math.cos(t * 0.08) * 70,
      28 + Math.sin(t * 0.05) * 6,
      o.z + Math.sin(t * 0.08) * 70
    );

    G.camera.lookAt(
      new THREE.Vector3(
        o.x,
        4,
        o.z
      )
    );

    if (G.sky) {
      G.sky.position.copy(
        G.camera.position
      );
    }

    updateTraffic(dt);
    updateClouds(dt);
    updateTrafficLights(dt);
  },
};