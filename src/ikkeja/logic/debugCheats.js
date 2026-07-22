/**
 * Dev-only session mutations for skipping IKKE-JA escape room levels.
 */
import {
  FIRST_PLAYABLE_LEVEL,
  internalLevelFromDisplay,
  nextPlayableLevel,
  normalizeSessionLevel,
  ALLEN_KEY_LEVEL,
  VICTORY_LEVEL,
} from './levelProgression.js';

/**
 * Whether debug cheat controls are shown (Vite dev server or ?debug on URL).
 * @returns {boolean}
 */
export function isDebugCheatsEnabled() {
  if (import.meta.env.DEV) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).has('debug');
}

/**
 * @param {import('./session.js').IkkeJaSession} session
 * @returns {import('./session.js').IkkeJaSession}
 */
export function applyDebugSkipLevel(session) {
  if (session.level >= VICTORY_LEVEL) {
    return { ...session, levelComplete: false };
  }

  const level = normalizeSessionLevel(session.level);

  if (level === ALLEN_KEY_LEVEL) {
    return {
      ...session,
      level: VICTORY_LEVEL,
      levelComplete: false,
    };
  }

  return {
    ...session,
    level: nextPlayableLevel(level),
    levelComplete: false,
  };
}

/**
 * @param {import('./session.js').IkkeJaSession} session
 * @param {number} displayLevel - Player-facing level 1–3 puzzle, 4 victory.
 * @returns {import('./session.js').IkkeJaSession}
 */
export function applyDebugJumpToLevel(session, displayLevel) {
  const level = internalLevelFromDisplay(Math.min(4, Math.max(1, Math.floor(displayLevel))));

  return {
    ...session,
    level,
    levelComplete: false,
    crosswordGridSolved: false,
  };
}
