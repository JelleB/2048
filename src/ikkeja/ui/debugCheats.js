/**
 * Dev-only debug controls for skipping IKKE-JA levels during local QA.
 */
import { isDebugCheatsEnabled } from '../logic/debugCheats.js';
import {
  displayLevelNumber,
  nextPlayableLevel,
  VICTORY_LEVEL,
} from '../logic/levelProgression.js';

/**
 * @typedef {object} DebugCheatsHandlers
 * @property {() => void} onSkipLevel
 * @property {(level: number) => void} onJumpToLevel
 */

/**
 * Renders a compact debug bar when cheats are enabled.
 * @param {HTMLElement} parent
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {DebugCheatsHandlers} handlers
 */
export function renderDebugCheats(parent, session, handlers) {
  if (!isDebugCheatsEnabled() || session.level >= VICTORY_LEVEL) {
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'ikkeja-debug-bar';
  bar.setAttribute('aria-label', 'Debug cheats');

  const nextInternal = nextPlayableLevel(session.level);
  const nextDisplay = displayLevelNumber(nextInternal);
  const nextLabel = nextInternal >= VICTORY_LEVEL ? 'Victory' : `Level ${nextDisplay}`;
  const currentDisplay = displayLevelNumber(session.level);

  bar.innerHTML = `
    <p class="ikkeja-debug-label">Debug</p>
    <button type="button" class="ikkeja-btn ikkeja-btn--debug ikkeja-debug-skip">Skip → ${nextLabel}</button>
    <label class="ikkeja-debug-jump">
      <span>Jump</span>
      <select class="ikkeja-input ikkeja-debug-level-select">
        <option value="1" ${currentDisplay === 1 ? 'selected' : ''}>Level 1</option>
        <option value="2" ${currentDisplay === 2 ? 'selected' : ''}>Level 2</option>
        <option value="3" ${currentDisplay === 3 ? 'selected' : ''}>Level 3</option>
        <option value="4">Victory</option>
      </select>
      <button type="button" class="ikkeja-btn ikkeja-btn--debug ikkeja-debug-go">Go</button>
    </label>
  `;

  bar.querySelector('.ikkeja-debug-skip')?.addEventListener('click', () => {
    handlers.onSkipLevel();
  });

  bar.querySelector('.ikkeja-debug-go')?.addEventListener('click', () => {
    const select = bar.querySelector('.ikkeja-debug-level-select');
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    handlers.onJumpToLevel(Number(select.value));
  });

  parent.appendChild(bar);
}
