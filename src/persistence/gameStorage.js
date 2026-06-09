/**
 * Cookie-backed persistence for per-mode high scores and unfinished games.
 * Supports injectable storage for unit tests (no document.cookie in Vitest).
 */
import { deleteCookie, getCookie, setCookie } from './cookies.js';
import { GRID_2048, GRID_2248 } from '../constants.js';

/** @typedef {'2048' | '2248' | 'knoppenspel'} GameMode */

export const STORAGE_VERSION = 1;

/**
 * @typedef {object} ModeConfig
 * @property {number} [gridSize] Grid dimension for puzzle modes.
 * @property {string} sceneKey Phaser scene key.
 * @property {string} highScoreKey Cookie key for best score.
 * @property {string} [saveKey] Cookie key for in-progress save (arcade modes omit).
 */

/** @type {Record<GameMode, ModeConfig>} */
export const MODE_CONFIG = {
  '2048': {
    gridSize: GRID_2048,
    sceneKey: 'Game2048',
    highScoreKey: 'game2048_highscore',
    saveKey: 'game2048_save',
  },
  '2248': {
    gridSize: GRID_2248,
    sceneKey: 'Game2248',
    highScoreKey: 'game2248_highscore',
    saveKey: 'game2248_save',
  },
  knoppenspel: {
    sceneKey: 'GameKnoppenspel',
    highScoreKey: 'game_knoppenspel_highscore',
  },
};

const LAST_ACTIVE_MODE_KEY = 'last_active_mode';

/**
 * @typedef {{ get: (key: string) => string | null, set: (key: string, value: string) => void, remove: (key: string) => void }} StorageAdapter
 */

/** Default adapter backed by browser cookies. */
export const cookieStorage = {
  get: getCookie,
  set: setCookie,
  remove: deleteCookie,
};

/** @type {StorageAdapter} */
let storageAdapter = cookieStorage;

/**
 * Swaps persistence backend (used by tests).
 * @param {StorageAdapter} adapter
 */
export function setStorageAdapter(adapter) {
  storageAdapter = adapter;
}

/**
 * Restores the default cookie adapter after tests.
 */
export function resetStorageAdapter() {
  storageAdapter = cookieStorage;
}

/**
 * @typedef {{ version: number, mode: GameMode, grid: number[][], score: number, gameOver: boolean }} SavedGameState
 */

/**
 * @param {GameMode} mode
 * @param {number[][]} grid
 * @param {number} score
 * @param {boolean} gameOver
 * @returns {SavedGameState}
 */
export function createSnapshot(mode, grid, score, gameOver) {
  return {
    version: STORAGE_VERSION,
    mode,
    grid: grid.map((row) => [...row]),
    score,
    gameOver,
  };
}

/**
 * Validates and parses saved JSON.
 * @param {string | null} raw
 * @returns {SavedGameState | null}
 */
export function parseSavedGame(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    if (data.version !== STORAGE_VERSION) return null;
    if (data.mode !== '2048' && data.mode !== '2248') return null;
    const { gridSize } = MODE_CONFIG[data.mode];
    if (!Array.isArray(data.grid) || data.grid.length !== gridSize) return null;
    for (const row of data.grid) {
      if (!Array.isArray(row) || row.length !== gridSize) return null;
      if (!row.every((v) => typeof v === 'number' && v >= 0 && Number.isFinite(v))) {
        return null;
      }
    }
    if (typeof data.score !== 'number' || data.score < 0 || !Number.isFinite(data.score)) {
      return null;
    }
    if (typeof data.gameOver !== 'boolean') return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {GameMode} mode
 * @returns {number}
 */
export function getHighScore(mode) {
  const raw = storageAdapter.get(MODE_CONFIG[mode].highScoreKey);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/**
 * Stores a high score when it beats the previous record.
 * @param {GameMode} mode
 * @param {number} score
 * @returns {number} Current best score after update.
 */
export function updateHighScore(mode, score) {
  const current = getHighScore(mode);
  const next = Math.max(current, Math.floor(score));
  if (next > current) {
    storageAdapter.set(MODE_CONFIG[mode].highScoreKey, String(next));
  }
  return next;
}

/**
 * @param {GameMode} mode
 * @returns {SavedGameState | null}
 */
export function loadSavedGame(mode) {
  const { saveKey } = MODE_CONFIG[mode];
  if (!saveKey) return null;
  const raw = storageAdapter.get(saveKey);
  const parsed = parseSavedGame(raw);
  if (!parsed || parsed.mode !== mode) return null;
  return parsed;
}

/**
 * Persists an unfinished game; clears the slot when gameOver is true.
 * @param {GameMode} mode
 * @param {SavedGameState} state
 */
export function saveGame(mode, state) {
  const { saveKey } = MODE_CONFIG[mode];
  if (!saveKey) return;
  storageAdapter.set(LAST_ACTIVE_MODE_KEY, mode);
  if (state.gameOver) {
    storageAdapter.remove(saveKey);
    return;
  }
  storageAdapter.set(saveKey, JSON.stringify(state));
}

/**
 * Removes the saved in-progress game for a mode.
 * @param {GameMode} mode
 */
export function clearSavedGame(mode) {
  const { saveKey } = MODE_CONFIG[mode];
  if (!saveKey) return;
  storageAdapter.remove(saveKey);
}

/**
 * Applies a saved snapshot onto a board instance.
 * @param {{ setGrid: (grid: number[][]) => void, score: number }} board
 * @param {SavedGameState} state
 */
export function applySnapshot(board, state) {
  if (!state?.grid) return;
  board.setGrid(state.grid);
  board.score = state.score ?? 0;
}

/**
 * Returns scene resume info for the last unfinished game, if any.
 * @returns {{ sceneKey: string, state: SavedGameState } | null}
 */
export function getResumeTarget() {
  const lastMode = storageAdapter.get(LAST_ACTIVE_MODE_KEY);
  /** @type {GameMode[]} */
  const modes = lastMode === '2048' || lastMode === '2248'
    ? [lastMode, lastMode === '2048' ? '2248' : '2048']
    : ['2048', '2248'];

  for (const mode of modes) {
    const saved = loadSavedGame(mode);
    if (saved && !saved.gameOver) {
      return { sceneKey: MODE_CONFIG[mode].sceneKey, state: saved };
    }
  }
  return null;
}
