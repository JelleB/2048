/**
 * Dev-only debug controls for skipping IKEA levels during local QA.
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
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {DebugCheatsHandlers} handlers
 */
export function renderDebugCheats(parent, session, handlers) {
  if (!isDebugCheatsEnabled() || session.level >= VICTORY_LEVEL) {
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'ikea-debug-bar';
  bar.setAttribute('aria-label', 'Debug cheats');

  const nextInternal = nextPlayableLevel(session.level);
  const nextDisplay = displayLevelNumber(nextInternal);
  const nextLabel = nextInternal >= VICTORY_LEVEL ? 'Victory' : `Level ${nextDisplay}`;
  const currentDisplay = displayLevelNumber(session.level);

  bar.innerHTML = `
    <p class="ikea-debug-label">Debug</p>
    <button type="button" class="ikea-btn ikea-btn--debug ikea-debug-skip">Skip → ${nextLabel}</button>
    <label class="ikea-debug-jump">
      <span>Jump</span>
      <select class="ikea-input ikea-debug-level-select">
        <option value="1" ${currentDisplay === 1 ? 'selected' : ''}>Level 1</option>
        <option value="2" ${currentDisplay === 2 ? 'selected' : ''}>Level 2</option>
        <option value="3">Victory</option>
      </select>
      <button type="button" class="ikea-btn ikea-btn--debug ikea-debug-go">Go</button>
    </label>
  `;

  bar.querySelector('.ikea-debug-skip')?.addEventListener('click', () => {
    handlers.onSkipLevel();
  });

  bar.querySelector('.ikea-debug-go')?.addEventListener('click', () => {
    const select = bar.querySelector('.ikea-debug-level-select');
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    handlers.onJumpToLevel(Number(select.value));
  });

  parent.appendChild(bar);
}
