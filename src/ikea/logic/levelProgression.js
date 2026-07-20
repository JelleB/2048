/**
 * Playable level order for Lost in IKEA (Level 3 cafeteria disabled).
 */

/** @type {3} Internal session level that is skipped in gameplay. */
export const DISABLED_CAFETERIA_LEVEL = 3;

/** @type {4} Internal session level for the Allen key puzzle. */
export const ALLEN_KEY_LEVEL = 4;

/** @type {5} Internal session level for victory screen. */
export const VICTORY_LEVEL = 5;

/** @type {number[]} */
export const PLAYABLE_LEVELS = [1, 2, ALLEN_KEY_LEVEL];

const DISPLAY_TITLES = {
  1: 'Lager-Korsord',
  2: 'Rum-Labyrint',
  [ALLEN_KEY_LEVEL]: 'Unbrakonyckel',
};

/**
 * Maps legacy/disabled levels to the next playable internal level.
 * @param {number} level
 * @returns {number}
 */
export function normalizeSessionLevel(level) {
  if (level === DISABLED_CAFETERIA_LEVEL) {
    return ALLEN_KEY_LEVEL;
  }
  return level;
}

/**
 * @param {number} currentLevel - Current internal session level.
 * @returns {number} Next internal session level (5 = victory).
 */
export function nextPlayableLevel(currentLevel) {
  const level = normalizeSessionLevel(currentLevel);
  if (level === 1) {
    return 2;
  }
  if (level === 2) {
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
  return displayLevel;
}

/**
 * @param {import('./session.js').IkeaSession} session
 * @returns {import('./session.js').IkeaSession}
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
