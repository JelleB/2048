/**
 * Level 2 UI: blueprint map (P1), navigation with scene hints (P2), mirrored nav + traps (Meike).
 */
import {
  MAZE_START,
  getBlueprintNodes,
  getSceneHint,
  getTrapWarnings,
  tryMove,
} from '../../logic/levels/maze.js';
import { playClick, playSuccess, playError } from '../../audio/ikeaSynth.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {() => void} onComplete
 */
export function renderLevel2(container, session, onComplete) {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikea-level ikea-level--2';

  if (session.role === 'p1') {
    panel.innerHTML = buildP1View();
  } else if (session.role === 'p2') {
    panel.innerHTML = buildP2View();
    wireNavigator(panel, { trackWin: true, onComplete });
  } else {
    panel.innerHTML = buildDaughterView();
    wireNavigator(panel, { trackWin: false, onComplete: null });
  }

  container.appendChild(panel);
}

function buildP1View() {
  const nodes = getBlueprintNodes();
  const cells = nodes
    .map((n) => {
      const locked = n.lockedDoors.length
        ? `<span class="ikea-locked">🔒 ${n.lockedDoors.join(', ')}</span>`
        : '';
      const shortcut = n.shortcuts.length
        ? `<span class="ikea-shortcut">⚡ ${n.shortcuts.join(', ')}</span>`
        : '';
      const exit = n.isExit ? ' ikea-room--exit' : '';
      return `<div class="ikea-room${exit}" style="grid-column:${n.x + 1};grid-row:${n.y + 1}">
        <strong>${n.label}</strong>${locked}${shortcut}
      </div>`;
    })
    .join('');
  return `
    <h2 class="ikea-level-title">Level 2: Rum-Labyrint</h2>
    <p>Vindt uit waar Jelle is op de kaart en geef instructies om <strong>noord, oost, zuid of west</strong> te gaan.</p>
    <div class="ikea-blueprint">${cells}</div>
    <p class="ikea-legend"><span class="ikea-locked">🔒</span> = valdeur · <span class="ikea-shortcut">⚡</span> = korte route</p>
  `;
}

function buildNavPadHtml() {
  return `
    <div class="ikea-nav-pad">
      <button type="button" class="ikea-btn ikea-nav" data-dir="north">Noord</button>
      <div class="ikea-nav-row">
        <button type="button" class="ikea-btn ikea-nav" data-dir="west">West</button>
        <button type="button" class="ikea-btn ikea-nav" data-dir="east">Oost</button>
      </div>
      <button type="button" class="ikea-btn ikea-nav" data-dir="south">Zuid</button>
    </div>
  `;
}

function buildP2View() {
  return `
    <h2 class="ikea-level-title">Level 2: Rum-Labyrint</h2>
    <p>Ga <strong>N/O/Z/W</strong> en vertel wat je ziet. Monique stuurt je via de kaart.</p>
    <p class="ikea-scene-hint"><strong>Wat je ziet:</strong> <span class="ikea-scene-hint-val">${getSceneHint(MAZE_START)}</span></p>
    ${buildNavPadHtml()}
    <p class="ikea-nav-message"></p>
  `;
}

function buildDaughterView() {
  return `
    <h2 class="ikea-level-title">Level 2: Småland-beschermer</h2>
    <p>Volg waar Jelle naartoe gaat — je kunt hem beschermen! Tik dezelfde richting en roep waarschuwingen.</p>
    <p class="ikea-scene-hint"><strong>Waar Jelle zou zijn:</strong> <span class="ikea-scene-hint-val">${getSceneHint(MAZE_START)}</span></p>
    ${buildNavPadHtml()}
    <div class="ikea-maze-trap-panel">
      <p class="ikea-maze-trap-heading">Vallen in de buurt</p>
      <ul class="ikea-maze-trap-list"></ul>
    </div>
    <p class="ikea-nav-message"></p>
  `;
}

/**
 * @param {HTMLElement} listEl
 * @param {string} roomId
 */
function renderTrapWarnings(listEl, roomId) {
  const warnings = getTrapWarnings(roomId);
  if (warnings.length === 0) {
    listEl.innerHTML = '<li class="ikea-maze-trap-none">Geen vallen op deze plek.</li>';
    return;
  }
  listEl.innerHTML = warnings
    .map((entry) => `<li class="ikea-maze-trap-warn">${entry.warning}</li>`)
    .join('');
}

/**
 * @param {HTMLElement} panel
 * @param {{ trackWin: boolean, onComplete: (() => void)|null }} options
 */
function wireNavigator(panel, options) {
  let roomId = MAZE_START;
  const sceneEl = panel.querySelector('.ikea-scene-hint-val');
  const msgEl = panel.querySelector('.ikea-nav-message');
  const trapList = panel.querySelector('.ikea-maze-trap-list');

  if (trapList instanceof HTMLElement) {
    renderTrapWarnings(trapList, roomId);
  }

  panel.querySelectorAll('.ikea-nav').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClick();
      const dir = btn.getAttribute('data-dir');
      if (!dir) return;

      const result = tryMove(roomId, /** @type {'north'|'south'|'east'|'west'} */ (dir));

      if (result.trapped) {
        playError();
        wobbleElement(panel);
        if (msgEl) {
          msgEl.textContent = options.trackWin
            ? 'Oei! Valdeur — vraag Monique om een andere richting.'
            : 'Valdeur! Roep hardop dat Jelle daar niet naartoe moet.';
        }
        if (!options.trackWin && trapList instanceof HTMLElement) {
          renderTrapWarnings(trapList, roomId);
        }
        return;
      }

      if (!result.moved) {
        playError();
        wobbleElement(btn);
        if (msgEl) msgEl.textContent = 'Geen doorgang die kant op.';
        return;
      }

      roomId = result.roomId;
      if (sceneEl) sceneEl.textContent = getSceneHint(roomId);
      if (trapList instanceof HTMLElement) {
        renderTrapWarnings(trapList, roomId);
      }
      if (msgEl) {
        msgEl.textContent = options.trackWin
          ? 'Vertel Monique wat je nu ziet!'
          : 'Waarschuw Jelle als er een val in de buurt is.';
      }

      if (options.trackWin && result.won) {
        playSuccess();
        burstConfetti();
        showToast('FANTASTISKT! Lees je 4CODE voor Monique en Meike.');
        options.onComplete?.();
      }
    });
  });
}
