/**
 * Role selection: pick Monique, Jelle, or Meike from one dropdown.
 */
import {
  defaultSessionNames,
  getPlayerByRole,
  PLAYER_ROSTER,
  playerSelectLabel,
} from '../logic/puzzleData.js';
import {
  generateSessionCode,
  loadPendingP1Session,
  normalizeSessionCode,
  savePendingP1Session,
  clearPendingP1Session,
  validateSessionJoin,
  SESSION_CODE_LENGTH,
} from '../logic/session.js';
import { playClick, playError, initAudio } from '../audio/ikeaSynth.js';
import { wobbleElement } from './feedback.js';

/**
 * @typedef {import('../logic/session.js').IkeaSession} IkeaSession
 * @callback SessionStartFn
 * @param {IkeaSession} session
 */

/**
 * Returns which role-select panels should be visible.
 * @param {'p1'|'p2'|'daughter'} role
 * @returns {{ showP1: boolean, showJoin: boolean }}
 */
export function rolePanelVisibility(role) {
  return {
    showP1: role === 'p1',
    showJoin: role === 'p2' || role === 'daughter',
  };
}

/**
 * Renders role selection screen.
 * @param {HTMLElement} main
 * @param {SessionStartFn} onStart
 */
export function renderRoleSelect(main, onStart) {
  const options = PLAYER_ROSTER.map(
    (player) =>
      `<option value="${player.role}">${playerSelectLabel(player)}</option>`,
  ).join('');

  main.innerHTML = `
    <section class="ikea-role-select">
      <p class="ikea-intro">Kies wie je bent. Monique start de sessie; Jelle en Meike joinen met de code.</p>
      <div class="ikea-role-form">
        <label class="ikea-field-label" for="ikea-player-select">Speler</label>
        <select id="ikea-player-select" class="ikea-input ikea-player-select">
          ${options}
        </select>

        <div class="ikea-role-panel ikea-role-panel--p1 is-visible">
          <div class="ikea-sprite ikea-sprite--p1" aria-hidden="true"></div>
          <h2 class="ikea-role-panel-title">${playerSelectLabel(getPlayerByRole('p1'))}</h2>
          <p>${getPlayerByRole('p1').description}</p>
          <button type="button" class="ikea-btn ikea-btn--blue ikea-start-p1">Start sessie</button>
          <div class="ikea-session-code-display" hidden>
            <p class="ikea-label">Sessiecode — hardop voorlezen:</p>
            <p class="ikea-session-code-value"></p>
            <button type="button" class="ikea-btn ikea-btn--yellow ikea-copy-code">Kopieer code</button>
            <button type="button" class="ikea-btn ikea-btn--green ikea-enter-game">Start spel</button>
          </div>
        </div>

        <div class="ikea-role-panel ikea-role-panel--join">
          <div class="ikea-sprite ikea-join-sprite" aria-hidden="true"></div>
          <h2 class="ikea-role-panel-title ikea-join-title"></h2>
          <p class="ikea-join-description"></p>
          <label class="ikea-field-label" for="ikea-join-code">Sessiecode</label>
          <input
            id="ikea-join-code"
            type="text"
            class="ikea-input ikea-join-input"
            placeholder="Bijv. ABCD42"
            maxlength="${SESSION_CODE_LENGTH}"
            autocapitalize="characters"
          />
          <button type="button" class="ikea-btn ikea-btn--yellow ikea-join-btn">Join sessie</button>
        </div>
      </div>
    </section>
  `;

  /** @type {string|null} */
  let generatedCode = null;

  const playerSelect = main.querySelector('#ikea-player-select');
  const p1Panel = main.querySelector('.ikea-role-panel--p1');
  const joinPanel = main.querySelector('.ikea-role-panel--join');
  const startBtn = main.querySelector('.ikea-start-p1');
  const codeDisplay = main.querySelector('.ikea-session-code-display');
  const codeValue = main.querySelector('.ikea-session-code-value');
  const copyBtn = main.querySelector('.ikea-copy-code');
  const enterBtn = main.querySelector('.ikea-enter-game');
  const joinBtn = main.querySelector('.ikea-join-btn');
  const joinInput = main.querySelector('#ikea-join-code');
  const joinSprite = main.querySelector('.ikea-join-sprite');
  const joinTitle = main.querySelector('.ikea-join-title');
  const joinDescription = main.querySelector('.ikea-join-description');

  /**
   * @returns {'p1'|'p2'|'daughter'}
   */
  function selectedRole() {
    const value = playerSelect instanceof HTMLSelectElement ? playerSelect.value : 'p1';
    if (value === 'p2' || value === 'daughter') {
      return value;
    }
    return 'p1';
  }

  function updatePanels() {
    const role = selectedRole();
    const { showP1, showJoin } = rolePanelVisibility(role);

    if (p1Panel instanceof HTMLElement) {
      p1Panel.classList.toggle('is-visible', showP1);
    }
    if (joinPanel instanceof HTMLElement) {
      joinPanel.classList.toggle('is-visible', showJoin);
    }

    if (showJoin) {
      const player = getPlayerByRole(role);
      if (joinSprite instanceof HTMLElement) {
        joinSprite.className = `ikea-sprite ikea-sprite--${player.role} ikea-join-sprite`;
      }
      if (joinTitle) {
        joinTitle.textContent = playerSelectLabel(player);
      }
      if (joinDescription) {
        joinDescription.textContent = player.description;
      }
      if (joinBtn instanceof HTMLButtonElement) {
        joinBtn.className =
          role === 'p2'
            ? 'ikea-btn ikea-btn--yellow ikea-join-btn'
            : 'ikea-btn ikea-btn--blue ikea-join-btn';
      }
    }
  }

  playerSelect?.addEventListener('change', () => {
    playClick();
    updatePanels();
  });

  const pending = loadPendingP1Session();
  if (pending?.seed) {
    showGeneratedSession(pending.seed);
  }
  updatePanels();

  startBtn?.addEventListener('click', () => {
    if (generatedCode && !confirmStartNewSession(generatedCode)) {
      return;
    }
    initAudio();
    playClick();
    showGeneratedSession(generateSessionCode());
    showToast('Sessie gestart! Deel de code.');
  });

  /**
   * Displays a generated session code in the P1 panel.
   * @param {string} code
   */
  function showGeneratedSession(code) {
    generatedCode = code;
    savePendingP1Session(code);
    if (codeValue) codeValue.textContent = code;
    if (codeDisplay instanceof HTMLElement) codeDisplay.hidden = false;
  }

  /**
   * @param {string} existingCode
   * @returns {boolean}
   */
  function confirmStartNewSession(existingCode) {
    return window.confirm(
      `Je hebt al sessie ${existingCode} gestart. Nieuwe sessie beginnen? ` +
        'Spelers met de oude code syncen dan niet meer.',
    );
  }

  copyBtn?.addEventListener('click', async () => {
    if (!generatedCode) return;
    playClick();
    try {
      await navigator.clipboard.writeText(generatedCode);
      showToast('Code gekopieerd!');
    } catch {
      showToast('Kopieer: ' + generatedCode);
    }
  });

  enterBtn?.addEventListener('click', () => {
    if (!generatedCode || selectedRole() !== 'p1') return;
    playClick();
    clearPendingP1Session();
    onStart({
      seed: generatedCode,
      role: 'p1',
      level: 1,
      ...defaultSessionNames(),
    });
  });

  joinBtn?.addEventListener('click', () => {
    const role = selectedRole();
    if (role === 'p1') return;

    initAudio();
    playClick();
    const code = normalizeSessionCode(joinInput instanceof HTMLInputElement ? joinInput.value : '');
    if (!validateSessionJoin(code)) {
      playError();
      if (joinInput instanceof HTMLElement) wobbleElement(joinInput);
      showToast('Ongeldige code.');
      return;
    }

    onStart({
      seed: code,
      role,
      level: 1,
      ...defaultSessionNames(),
    });
  });
}

function showToast(msg) {
  const el = document.getElementById('ikea-toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('ikea-toast--visible');
  window.setTimeout(() => {
    el.classList.remove('ikea-toast--visible');
    el.hidden = true;
  }, 2000);
}
