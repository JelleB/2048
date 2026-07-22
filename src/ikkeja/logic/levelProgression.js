/**
 * Playable level order for Lost in IKKE-JA (Level 3 cafeteria disabled).
 */

/** @type {1} Internal session level for the Dutch crossword puzzle. */
export const CROSSWORD_LEVEL = 1;

/** @type {2} Internal session level for the showroom maze. */
export const MAZE_LEVEL = 2;

/** @type {3} Internal session level that is skipped in gameplay. */
export const DISABLED_CAFETERIA_LEVEL = 3;

/** @type {4} Internal session level for the blues chord puzzle. */
export const ALLEN_KEY_LEVEL = 4;

/** @type {5} Internal session level for victory screen. */
export const VICTORY_LEVEL = 5;

/** First internal level shown when starting or joining a session. */
export const FIRST_PLAYABLE_LEVEL = CROSSWORD_LEVEL;

/** @type {number[]} */
export const PLAYABLE_LEVELS = [CROSSWORD_LEVEL, MAZE_LEVEL, ALLEN_KEY_LEVEL];

const DISPLAY_TITLES = {
  [CROSSWORD_LEVEL]: 'Lager-Korsord',
  [MAZE_LEVEL]: 'Rum-Labyrint',
  [ALLEN_KEY_LEVEL]: 'Blues-schema',
};

/**
 * Maps legacy/disabled levels to the next playable internal level.
 * @param {number|string} level
 * @returns {number}
 */
export function normalizeSessionLevel(level) {
  const n = Number(level);
  if (!Number.isFinite(n)) {
    return FIRST_PLAYABLE_LEVEL;
  }
  if (n === DISABLED_CAFETERIA_LEVEL) {
    return ALLEN_KEY_LEVEL;
  }
  return n;
}

/**
 * @param {number} currentLevel - Current internal session level.
 * @returns {number} Next internal session level (5 = victory).
 */
export function nextPlayableLevel(currentLevel) {
  const level = normalizeSessionLevel(currentLevel);
  if (level === CROSSWORD_LEVEL) {
    return MAZE_LEVEL;
  }
  if (level === MAZE_LEVEL) {
    return ALLEN_KEY_LEVEL;
  }
  if (level === ALLEN_KEY_LEVEL) {
    return VICTORY_LEVEL;
  }
  return level;
}

/**
 * Player-facing level number shown in the UI (3 puzzle levels total).
 * @param {number} internalLevel
 * @returns {number}
 */
export function displayLevelNumber(internalLevel) {
  const level = normalizeSessionLevel(internalLevel);
  if (level >= VICTORY_LEVEL) {
    return 4;
  }
  if (level === ALLEN_KEY_LEVEL) {
    return 3;
  }
  return level;
}

/**
 * @param {number} internalLevel
 * @returns {string}
 */
export function displayLevelTitle(internalLevel) {
  const level = normalizeSessionLevel(internalLevel);
  return DISPLAY_TITLES[level] || '';
}

/**
 * Converts a player-facing debug/menu level to internal session level.
 * @param {number} displayLevel - 1–3 puzzle, 4 victory.
 * @returns {number}
 */
export function internalLevelFromDisplay(displayLevel) {
  if (displayLevel >= 4) {
    return VICTORY_LEVEL;
  }
  if (displayLevel === 3) {
    return ALLEN_KEY_LEVEL;
  }
  if (displayLevel === 2) {
    return MAZE_LEVEL;
  }
  if (displayLevel === 1) {
    return CROSSWORD_LEVEL;
  }
  return displayLevel;
}

/**
 * @param {import('./session.js').IkkeJaSession} session
 * @returns {import('./session.js').IkkeJaSession}
 */
export function normalizeSession(session) {
  const level = normalizeSessionLevel(session.level);
  if (level === session.level) {
    return session;
  }
  return {
    ...session,
    level,
    levelComplete: false,
  };
}
