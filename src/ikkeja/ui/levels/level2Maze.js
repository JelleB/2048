/**
 * Level 2 UI: blueprint map (P1), navigation with scene hints (P2), mirrored nav + traps (P3).
 */
import { formatPlayerName, getPlayerByRole } from '../logic/puzzleData.js';
import {
  MAZE_START,
  getBlueprintNodes,
  getSceneHint,
  getTrapWarnings,
  tryMove,
} from '../../logic/levels/maze.js';
import { displayLevelNumber, displayLevelTitle, MAZE_LEVEL } from '../../logic/levelProgression.js';
import { playClick, playSuccess, playError } from '../../audio/ikkejaSynth.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkkeJaSession} session
 * @param {() => void} onComplete
 */
export function renderLevel2(container, session, onComplete) {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikkeja-level ikkeja-level--2';

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

function mazeLevelHeading(suffix = 'Rum-Labyrint') {
  return `Level ${displayLevelNumber(MAZE_LEVEL)}: ${suffix}`;
}

function buildP1View() {
  const nodes = getBlueprintNodes();
  const cells = nodes
    .map((n) => {
      const locked = n.lockedDoors.length
        ? `<span class="ikkeja-locked">🔒 ${n.lockedDoors.join(', ')}</span>`
        : '';
      const shortcut = n.shortcuts.length
        ? `<span class="ikkeja-shortcut">⚡ ${n.shortcuts.join(', ')}</span>`
        : '';
      const exit = n.isExit ? ' ikkeja-room--exit' : '';
      return `<div class="ikkeja-room${exit}" style="grid-column:${n.x + 1};grid-row:${n.y + 1}">
        <strong>${n.label}</strong>${locked}${shortcut}
      </div>`;
    })
    .join('');
  return `
    <h2 class="ikkeja-level-title">${mazeLevelHeading(displayLevelTitle(MAZE_LEVEL))}</h2>
    <p>Vind uit waar ${formatPlayerName(getPlayerByRole('p2'))} is op de kaart en geef instructies om <strong>noord, oost, zuid of west</strong> te gaan.</p>
    <div class="ikkeja-blueprint">${cells}</div>
    <p class="ikkeja-legend"><span class="ikkeja-locked">🔒</span> = valdeur · <span class="ikkeja-shortcut">⚡</span> = korte route</p>
  `;
}

function buildNavPadHtml() {
  return `
    <div class="ikkeja-nav-pad">
      <button type="button" class="ikkeja-btn ikkeja-nav" data-dir="north">Noord</button>
      <div class="ikkeja-nav-row">
        <button type="button" class="ikkeja-btn ikkeja-nav" data-dir="west">West</button>
        <button type="button" class="ikkeja-btn ikkeja-nav" data-dir="east">Oost</button>
      </div>
      <button type="button" class="ikkeja-btn ikkeja-nav" data-dir="south">Zuid</button>
    </div>
  `;
}

function buildP2View() {
  return `
    <h2 class="ikkeja-level-title">${mazeLevelHeading(displayLevelTitle(MAZE_LEVEL))}</h2>
    <p>Ga <strong>N/O/Z/W</strong> en vertel wat je ziet. ${formatPlayerName(getPlayerByRole('p1'))} stuurt je via de kaart.</p>
    <p class="ikkeja-scene-hint"><strong>Wat je ziet:</strong> <span class="ikkeja-scene-hint-val">${getSceneHint(MAZE_START)}</span></p>
    ${buildNavPadHtml()}
    <p class="ikkeja-nav-message"></p>
  `;
}

function buildDaughterView() {
  return `
    <h2 class="ikkeja-level-title">${mazeLevelHeading('Hints')}</h2>
    <p>Volg waar ${formatPlayerName(getPlayerByRole('p2'))} naartoe gaat — waarschuw het team voor vallen! Tik dezelfde richting en roep waarschuwingen.</p>
    <p class="ikkeja-scene-hint"><strong>Waar ${formatPlayerName(getPlayerByRole('p2'))} zou zijn:</strong> <span class="ikkeja-scene-hint-val">${getSceneHint(MAZE_START)}</span></p>
    ${buildNavPadHtml()}
    <div class="ikkeja-maze-trap-panel">
      <p class="ikkeja-maze-trap-heading">Vallen in de buurt</p>
      <ul class="ikkeja-maze-trap-list"></ul>
    </div>
    <p class="ikkeja-nav-message"></p>
  `;
}

/**
 * @param {HTMLElement} listEl
 * @param {string} roomId
 */
function renderTrapWarnings(listEl, roomId) {
  const warnings = getTrapWarnings(roomId);
  if (warnings.length === 0) {
    listEl.innerHTML = '<li class="ikkeja-maze-trap-none">Geen vallen op deze plek.</li>';
    return;
  }
  listEl.innerHTML = warnings
    .map((entry) => `<li class="ikkeja-maze-trap-warn">${entry.warning}</li>`)
    .join('');
}

/**
 * @param {HTMLElement} panel
 * @param {{ trackWin: boolean, onComplete: (() => void)|null }} options
 */
function wireNavigator(panel, options) {
  let roomId = MAZE_START;
  const sceneEl = panel.querySelector('.ikkeja-scene-hint-val');
  const msgEl = panel.querySelector('.ikkeja-nav-message');
  const trapList = panel.querySelector('.ikkeja-maze-trap-list');

  if (trapList instanceof HTMLElement) {
    renderTrapWarnings(trapList, roomId);
  }

  panel.querySelectorAll('.ikkeja-nav').forEach((btn) => {
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
            ? `Oei! Valdeur — vraag ${formatPlayerName(getPlayerByRole('p1'))} om een andere richting.`
            : `Valdeur! Roep hardop dat ${formatPlayerName(getPlayerByRole('p2'))} daar niet naartoe moet.`;
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
          ? `Vertel ${formatPlayerName(getPlayerByRole('p1'))} wat je nu ziet!`
          : `Waarschuw ${formatPlayerName(getPlayerByRole('p2'))} als er een val in de buurt is.`;
      }

      if (options.trackWin && result.won) {
        playSuccess();
        burstConfetti();
        showToast(`FANTASTISKT! Lees je 4CODE voor ${formatPlayerName(getPlayerByRole('p1'))} en ${formatPlayerName(getPlayerByRole('daughter'))}.`);
        options.onComplete?.();
      }
    });
  });
}
