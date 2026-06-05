/**
 * Unit tests for classic 2048 board logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Board2048 } from '../src/logic/Board2048.js';

/** Deterministic RNG: always returns values from queue. */
function queueRng(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('Board2048', () => {
  /** @type {Board2048} */
  let board;

  beforeEach(() => {
    board = new Board2048({ rng: () => 0.5 });
  });

  it('creates empty 4x4 grid', () => {
    expect(board.size).toBe(4);
    expect(board.getGrid().flat().every((c) => c === 0)).toBe(true);
  });

  it('start fills board with values from 2^1 to 2^4', () => {
    board.start();
    const cells = board.getGrid().flat();
    expect(cells).toHaveLength(16);
    expect(cells.every((v) => v > 0)).toBe(true);
    expect(cells.every((v) => [2, 4, 8, 16].includes(v))).toBe(true);
  });

  it('spawn places 2 when rng is 0 and board max is 16', () => {
    board = new Board2048({ rng: () => 0 });
    board.setGrid([
      [16, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    board.spawnAt(0, 1);
    expect(board.cell(0, 1)).toBe(2);
  });

  it('spawn places 16 when rng approaches 1 and board max is 16', () => {
    board = new Board2048({ rng: () => 0.9999 });
    board.setGrid([
      [16, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    board.spawnAt(0, 1);
    expect(board.cell(0, 1)).toBe(16);
  });

  it('move left slides tiles without merge', () => {
    board.setGrid([
      [0, 0, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const moved = board.move('left');
    expect(moved).toBe(true);
    expect(board.cell(0, 0)).toBe(2);
    expect(board.cell(0, 1)).toBe(0);
  });

  it('move left merges equal neighbors once', () => {
    board.setGrid([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    board.move('left');
    expect(board.cell(0, 0)).toBe(4);
    expect(board.cell(0, 1)).toBe(0);
    expect(board.score).toBe(4);
  });

  it('does not double-merge in one line per move', () => {
    board.setGrid([
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    board.move('left');
    expect(board.getGrid()[0]).toEqual([4, 4, 0, 0]);
  });

  it('returns false when move changes nothing', () => {
    board.setGrid([
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(board.move('left')).toBe(false);
  });

  it('spawns after successful move only', () => {
    board = new Board2048({ rng: queueRng([0.1, 0.1, 0.5, 0.5]) });
    board.setGrid([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const before = board.countTiles();
    board.move('left');
    expect(board.countTiles()).toBe(before);
    board.setGrid([
      [0, 0, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    board.move('left');
    expect(board.countTiles()).toBe(2);
  });

  it('canMove is false when grid full and no merges possible', () => {
    board.setGrid([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(board.canMove()).toBe(false);
    expect(board.isGameOver()).toBe(true);
  });

  it('canMove is true when empty cell exists', () => {
    board.setGrid([
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(board.canMove()).toBe(true);
  });
});
