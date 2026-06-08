/**
 * Unit tests for shared game scene persistence helpers (no Phaser).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Board2048 } from '../src/logic/Board2048.js';
import { Board2248 } from '../src/logic/Board2248.js';
import {
  addGameControlButtons,
  initBoardFromStorage,
  persistGameState,
  formatScoreLine,
  startNewGame,
} from '../src/scenes/gamePersistence.js';
import {
  createSnapshot,
  saveGame,
  setStorageAdapter,
  resetStorageAdapter,
} from '../src/persistence/gameStorage.js';

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

/**
 * Minimal Phaser scene stub for button wiring tests.
 * @returns {{ add: object, handlers: (() => void)[] }}
 */
function createMockScene() {
  /** @type {Record<string, () => void>} */
  const handlers = {};
  let rectIndex = 0;
  const makeRect = () => {
    const id = rectIndex;
    rectIndex += 1;
    const obj = {
      setInteractive() {
        return obj;
      },
      setFillStyle() {
        return obj;
      },
      on(event, fn) {
        handlers[`${id}-${event}`] = fn;
      },
    };
    return obj;
  };
  return {
    add: {
      rectangle: () => makeRect(),
      text: () => ({
        setOrigin: () => ({}),
      }),
    },
    handlers,
  };
}

describe('gamePersistence', () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryStorage());
  });

  afterEach(() => {
    resetStorageAdapter();
  });

  it('initBoardFromStorage restores a saved 2048 game', () => {
    const grid = [
      [2, 4, 0, 0],
      [0, 8, 0, 0],
      [0, 0, 16, 0],
      [0, 0, 0, 32],
    ];
    saveGame('2048', createSnapshot('2048', grid, 77, false));

    const board = new Board2048();
    const gameOver = initBoardFromStorage('2048', board);

    expect(gameOver).toBe(false);
    expect(board.score).toBe(77);
    expect(board.cell(0, 0)).toBe(2);
    expect(board.cell(3, 3)).toBe(32);
  });

  it('initBoardFromStorage starts fresh when no save exists', () => {
    const board = new Board2248({ rng: () => 0 });
    initBoardFromStorage('2248', board);
    expect(board.countTiles()).toBe(25);
    expect(board.score).toBe(0);
  });

  it('persistGameState updates high score and saves progress', () => {
    const board = new Board2048();
    board.setGrid([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    board.score = 150;

    persistGameState('2048', board.getGrid(), board.score, false);

    expect(formatScoreLine('2048', 100)).toBe('Score: 100 · Best: 150');
    const restored = new Board2048();
    initBoardFromStorage('2048', restored);
    expect(restored.score).toBe(150);
  });

  it('addGameControlButtons wires New and Save callbacks', () => {
    let saved = false;
    let fresh = false;
    const scene = createMockScene();

    addGameControlButtons(scene, 480, 800, {
      onNew: () => {
        fresh = true;
      },
      onSave: () => {
        saved = true;
      },
    });

    scene.handlers['0-pointerup']();
    scene.handlers['1-pointerup']();
    expect(fresh).toBe(true);
    expect(saved).toBe(true);
  });

  it('addGameControlButtons respects disabled flag', () => {
    let called = false;
    const scene = createMockScene();

    addGameControlButtons(scene, 480, 800, {
      disabled: true,
      onNew: () => {
        called = true;
      },
      onSave: () => {
        called = true;
      },
    });

    scene.handlers['0-pointerup']();
    scene.handlers['1-pointerup']();
    expect(called).toBe(false);
  });

  it('startNewGame clears save and resets the board', () => {
    const board = new Board2048({ rng: () => 0 });
    board.setGrid([
      [64, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    board.score = 99;
    saveGame('2048', createSnapshot('2048', board.getGrid(), board.score, false));

    const gameOver = startNewGame('2048', board);

    expect(gameOver).toBe(false);
    expect(board.score).toBe(0);
    expect(board.countTiles()).toBe(16);
    const again = new Board2048();
    initBoardFromStorage('2048', again);
    expect(again.countTiles()).toBe(16);
  });
});
