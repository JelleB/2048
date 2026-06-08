/**
 * Shared persistence helpers for Game2048Scene and Game2248Scene.
 */
import {
  applySnapshot,
  clearSavedGame,
  createSnapshot,
  getHighScore,
  loadSavedGame,
  saveGame,
  updateHighScore,
} from '../persistence/gameStorage.js';
import { makeButton } from '../ui/buttons.js';

/** @typedef {'2048' | '2248'} GameMode */

/**
 * Restores board state from the cookie save for this mode.
 * Always reads cookies directly — Phaser scene.start data is not reliable
 * (create() may receive an empty object instead of undefined).
 * @param {GameMode} mode
 * @param {{ start: () => void, setGrid: (grid: number[][]) => void, score: number }} board
 * @returns {boolean} gameOver flag after restore.
 */
export function initBoardFromStorage(mode, board) {
  const saved = loadSavedGame(mode);
  if (saved && !saved.gameOver) {
    applySnapshot(board, saved);
    return false;
  }
  board.start();
  return false;
}

/**
 * @param {GameMode} mode
 * @param {number[][]} grid
 * @param {number} score
 * @param {boolean} gameOver
 */
export function persistGameState(mode, grid, score, gameOver) {
  updateHighScore(mode, score);
  saveGame(mode, createSnapshot(mode, grid, score, gameOver));
}

/**
 * @param {GameMode} mode
 * @param {number} score
 * @returns {string}
 */
export function formatScoreLine(mode, score) {
  return `Score: ${score} · Best: ${getHighScore(mode)}`;
}

/**
 * Adds New and Save buttons between the score line and the board.
 * @param {Phaser.Scene} scene
 * @param {number} width
 * @param {number} height
 * @param {{ onNew: () => void, onSave: () => void, disabled?: boolean }} handlers
 */
export function addGameControlButtons(scene, width, height, handlers) {
  const btnW = Math.min(110, width * 0.28);
  const btnH = Math.max(34, height * 0.05);
  const fontSize = Math.max(14, Math.floor(btnH * 0.38));
  const y = height * 0.175;
  const gap = width * 0.06;

  const wrap = (fn) => {
    if (handlers.disabled) return;
    fn();
  };

  makeButton(
    scene,
    width / 2 - btnW / 2 - gap / 2,
    y,
    btnW,
    btnH,
    fontSize,
    'New',
    () => wrap(handlers.onNew),
  );
  makeButton(
    scene,
    width / 2 + btnW / 2 + gap / 2,
    y,
    btnW,
    btnH,
    fontSize,
    'Save',
    () => wrap(handlers.onSave),
  );
}

/**
 * Starts a fresh game and clears the saved slot for the mode.
 * @param {GameMode} mode
 * @param {{ start: () => void }} board
 * @returns {boolean} gameOver (always false).
 */
export function startNewGame(mode, board) {
  clearSavedGame(mode);
  board.start();
  return false;
}
