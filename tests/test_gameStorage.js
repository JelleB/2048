/**
 * Unit tests for cookie-backed game persistence helpers.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSnapshot,
  getHighScore,
  updateHighScore,
  saveGame,
  loadSavedGame,
  clearSavedGame,
  parseSavedGame,
  getResumeTarget,
  applySnapshot,
  setStorageAdapter,
  resetStorageAdapter,
} from '../src/persistence/gameStorage.js';
import { Board2048 } from '../src/logic/Board2048.js';
import { Board2248 } from '../src/logic/Board2248.js';

/**
 * In-memory storage adapter for deterministic tests.
 * @returns {import('../src/persistence/gameStorage.js').StorageAdapter}
 */
function createMemoryStorage() {
  /** @type {Map<string, string>} */
  const data = new Map();
  return {
    get: (key) => (data.has(key) ? data.get(key) : null),
    set: (key, value) => {
      data.set(key, value);
    },
    remove: (key) => {
      data.delete(key);
    },
  };
}

describe('gameStorage', () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryStorage());
  });

  afterEach(() => {
    resetStorageAdapter();
  });

  it('tracks per-mode high scores independently', () => {
    updateHighScore('2048', 120);
    updateHighScore('2248', 80);
    expect(getHighScore('2048')).toBe(120);
    expect(getHighScore('2248')).toBe(80);
    updateHighScore('2048', 90);
    expect(getHighScore('2048')).toBe(120);
    updateHighScore('2048', 200);
    expect(getHighScore('2048')).toBe(200);
  });

  it('tracks knoppenspel high score without a save slot', () => {
    updateHighScore('knoppenspel', 7);
    expect(getHighScore('knoppenspel')).toBe(7);
    expect(loadSavedGame('knoppenspel')).toBeNull();
    clearSavedGame('knoppenspel');
    expect(getHighScore('knoppenspel')).toBe(7);
  });

  it('saves and loads an unfinished 2048 game', () => {
    const grid = [
      [2, 4, 0, 0],
      [0, 8, 0, 0],
      [0, 0, 16, 0],
      [0, 0, 0, 32],
    ];
    const snapshot = createSnapshot('2048', grid, 55, false);
    saveGame('2048', snapshot);

    const loaded = loadSavedGame('2048');
    expect(loaded).toEqual(snapshot);
  });

  it('clears saved game when gameOver is true', () => {
    const board = new Board2048();
    board.start();
    saveGame('2048', createSnapshot('2048', board.getGrid(), board.score, false));
    expect(loadSavedGame('2048')).not.toBeNull();

    saveGame('2048', createSnapshot('2048', board.getGrid(), board.score, true));
    expect(loadSavedGame('2048')).toBeNull();
  });

  it('rejects invalid saved JSON', () => {
    expect(parseSavedGame(null)).toBeNull();
    expect(parseSavedGame('not-json')).toBeNull();
    expect(parseSavedGame(JSON.stringify({ version: 99, mode: '2048' }))).toBeNull();
    expect(
      parseSavedGame(
        JSON.stringify({
          version: 1,
          mode: '2048',
          grid: [[2, 2, 2]],
          score: 0,
          gameOver: false,
        }),
      ),
    ).toBeNull();
  });

  it('resumes the last active unfinished mode', () => {
    const board2248 = new Board2248();
    board2248.start();
    saveGame('2248', createSnapshot('2248', board2248.getGrid(), 10, false));

    const resume = getResumeTarget();
    expect(resume?.sceneKey).toBe('Game2248');
    expect(resume?.state.score).toBe(10);
  });

  it('applies snapshots onto board instances', () => {
    const board = new Board2048();
    board.start();
    const grid = board.getGrid();
    grid[0][0] = 64;
    const snapshot = createSnapshot('2048', grid, 999, false);

    applySnapshot(board, snapshot);
    expect(board.score).toBe(999);
    expect(board.cell(0, 0)).toBe(64);
  });

  it('ignores snapshots with a missing grid', () => {
    const board = new Board2248();
    board.start();
    const before = board.getGrid();

    applySnapshot(board, { mode: '2248', score: 50, gameOver: false });
    expect(board.getGrid()).toEqual(before);
    expect(board.score).toBe(0);
  });

  it('createSnapshot deep-copies grid rows', () => {
    const grid = [[2, 0], [0, 4]];
    const snap = createSnapshot('2048', grid, 10, false);
    grid[0][0] = 999;
    expect(snap.grid[0][0]).toBe(2);
  });

  it('rejects invalid tile values in saved grids', () => {
    expect(
      parseSavedGame(
        JSON.stringify({
          version: 1,
          mode: '2048',
          grid: [
            [-1, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          score: 0,
          gameOver: false,
        }),
      ),
    ).toBeNull();
  });

  it('rejects negative scores and wrong grid dimensions', () => {
    expect(
      parseSavedGame(
        JSON.stringify({
          version: 1,
          mode: '2048',
          grid: [[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
          score: -1,
          gameOver: false,
        }),
      ),
    ).toBeNull();

    const grid2248 = Array.from({ length: 5 }, () => Array(5).fill(2));
    saveGame('2248', createSnapshot('2248', grid2248, 5, false));
    expect(loadSavedGame('2048')).toBeNull();
  });

  it('getResumeTarget returns null when only game-over saves exist', () => {
    const board = new Board2048();
    board.start();
    saveGame('2048', createSnapshot('2048', board.getGrid(), 1, true));
    expect(getResumeTarget()).toBeNull();
  });

  it('clearSavedGame removes only the requested mode', () => {
    const board2048 = new Board2048();
    board2048.start();
    const board2248 = new Board2248();
    board2248.start();
    saveGame('2048', createSnapshot('2048', board2048.getGrid(), 1, false));
    saveGame('2248', createSnapshot('2248', board2248.getGrid(), 2, false));

    clearSavedGame('2048');
    expect(loadSavedGame('2048')).toBeNull();
    expect(loadSavedGame('2248')?.score).toBe(2);
  });
});
