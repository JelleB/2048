/**
 * Dev-only session mutations for skipping IKEA escape room levels.
 */
import {
  ALLEN_KEY_LEVEL,
  internalLevelFromDisplay,
  nextPlayableLevel,
  normalizeSessionLevel,
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
 * @param {import('./session.js').IkeaSession} session
 * @returns {import('./session.js').IkeaSession}
 */
export function applyDebugSkipLevel(session) {
  if (session.level >= VICTORY_LEVEL) {
    return { ...session, levelComplete: false };
  }

  const level = normalizeSessionLevel(session.level);

  if (level === 1) {
    return {
      ...session,
      level: 2,
      crosswordGridSolved: false,
      levelComplete: false,
    };
  }

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
 * @param {import('./session.js').IkeaSession} session
 * @param {number} displayLevel - Player-facing level 1–3, or 4 for victory.
 * @returns {import('./session.js').IkeaSession}
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
