/**
 * Unit tests for 2248-style path-link board logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Board2248 } from '../src/logic/Board2248.js';

describe('Board2248', () => {
  /** @type {Board2248} */
  let board;

  beforeEach(() => {
    board = new Board2248({ rng: () => 0 });
  });

  it('creates empty 5x5 grid', () => {
    expect(board.size).toBe(5);
    expect(board.getGrid().flat().every((c) => c === 0)).toBe(true);
  });

  it('start fills board with values from 2^1 to 2^4', () => {
    board.start();
    const cells = board.getGrid().flat();
    expect(cells).toHaveLength(25);
    expect(cells.every((v) => v > 0)).toBe(true);
    expect(cells.every((v) => [2, 4, 8, 16].includes(v))).toBe(true);
  });

  it('canLink requires same value for adjacent cells', () => {
    expect(board.canLink(2, 2)).toBe(true);
    expect(board.canLink(2, 4)).toBe(false);
    expect(board.canLink(8, 8)).toBe(true);
  });

  it('rejects path shorter than two cells', () => {
    board.setGrid([
      [2, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const ok = board.applyPath([{ row: 0, col: 0 }]);
    expect(ok).toBe(false);
    expect(board.cell(0, 0)).toBe(2);
  });

  it('8 + 8 = 16 on board', () => {
    board.setGrid([
      [8, 8, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    board.applyPath([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(board.cell(4, 1)).toBe(16);
    expect(board.score).toBe(16);
  });

  it('8 + 8 + 8 awards double rounding bonus in score', () => {
    board.setGrid([
      [8, 8, 8, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    board.applyPath([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    expect(board.score).toBe(40);
  });

  it('8 + 8 + 8 = 32 on board', () => {
    board.setGrid([
      [8, 8, 8, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    board.applyPath([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    expect(board.cell(4, 2)).toBe(32);
  });

  it('rejects 4 + 4 + 16 path', () => {
    board.setGrid([
      [4, 4, 16, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(
      board.applyPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    ).toBe(false);
  });

  it('rejects 4 + 8 path', () => {
    board.setGrid([
      [4, 8, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(
      board.applyPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    ).toBe(false);
  });

  it('4 + 4 + 8 + 16 = 32 on board', () => {
    board.setGrid([
      [4, 4, 8, 16, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    board.applyPath([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
    expect(board.cell(4, 3)).toBe(32);
  });

  it('rejects 4 + 4 + 2 path', () => {
    board.setGrid([
      [4, 4, 2, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(
      board.applyPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    ).toBe(false);
  });

  it('rejects path when values differ without valid ladder', () => {
    board.setGrid([
      [2, 4, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(
      board.applyPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    ).toBe(false);
  });

  it('rejects non-adjacent cells in path', () => {
    board.setGrid([
      [2, 0, 2, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(
      board.applyPath([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ]),
    ).toBe(false);
  });

  it('allows diagonal adjacent cells for 2 + 2', () => {
    board.setGrid([
      [2, 0, 0, 0, 0],
      [0, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const ok = board.applyPath([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(ok).toBe(true);
    expect(board.cell(4, 1)).toBe(4);
  });

  it('refills board to full after valid path', () => {
    board = new Board2248({ rng: () => 0 });
    board.setGrid([
      [2, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    board.applyPath([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(board.countTiles()).toBe(25);
    expect(board.emptyCells()).toHaveLength(0);
  });

  it('spawnOneAndFall places tile at bottom of column', () => {
    board.setGrid([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [4, 0, 0, 0, 0],
    ]);
    board.spawnOneAndFall();
    expect(board.cell(4, 0)).toBe(4);
    expect(board.cell(3, 0)).toBe(2);
  });

  it('refillUntilFull spawns one tile at a time until no gaps', () => {
    board = new Board2248({ rng: () => 0 });
    board.setGrid([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [16, 0, 0, 0, 0],
      [4, 0, 0, 0, 0],
    ]);
    board.refillUntilFull();
    expect(board.countTiles()).toBe(25);
    expect(board.cell(3, 0)).toBe(16);
    expect(board.cell(4, 0)).toBe(4);
  });

  it('hasValidMove false when no matching neighbors', () => {
    board.setGrid([
      [2, 4, 8, 16, 32],
      [64, 128, 256, 512, 1024],
      [2, 4, 8, 16, 32],
      [64, 128, 256, 512, 1024],
      [2, 4, 8, 16, 32],
    ]);
    expect(board.hasValidMove()).toBe(false);
    expect(board.isGameOver()).toBe(true);
  });

  it('hasValidMove true when equal neighbors exist', () => {
    board.setGrid([
      [2, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(board.hasValidMove()).toBe(true);
  });

  it('tryRollbackPath shortens chain when pointer returns on a step up', () => {
    const path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ];
    board.setGrid([
      [8, 8, 8, 16, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const rolled = board.tryRollbackPath(path, { row: 0, col: 2 });
    expect(rolled).toHaveLength(3);
    expect(board.pathValues(rolled)).toEqual([8, 8, 8]);
  });

  it('tryRollbackPath rejects jumping back beyond the penultimate cell', () => {
    const path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ];
    expect(board.tryRollbackPath(path, { row: 0, col: 0 })).toBeNull();
    expect(board.tryRollbackPath(path, { row: 0, col: 1 })).toBeNull();
  });

  it('purges unspawnable tiles at tier nine', () => {
    board.setGrid([
      [512, 2, 2, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    board.applySpawnPoolPurge();
    expect(board.score).toBe(4);
    expect(board.cell(0, 1)).toBe(0);
  });

  it('applyPathMerge merges without refilling the board', () => {
    board.setGrid([
      [2, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const ok = board.applyPathMerge([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(ok).toBe(true);
    expect(board.cell(0, 1)).toBe(4);
    expect(board.countTiles()).toBe(1);
  });

  it('rejects reusing a tile already in the chain', () => {
    board.setGrid([
      [2, 2, 0, 0, 0],
      [2, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const partial = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ];
    expect(board.canExtendPath(partial, { row: 0, col: 0 })).toBe(false);
    expect(
      board.isValidPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 0, col: 0 },
      ]),
    ).toBe(false);
    expect(
      board.applyPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 0, col: 0 },
      ]),
    ).toBe(false);
  });

  it('canExtendPath rejects empty cells and invalid ladders', () => {
    board.setGrid([
      [4, 8, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(board.canExtendPath([{ row: 0, col: 0 }], { row: 0, col: 2 })).toBe(false);
    expect(board.canExtendPath([{ row: 0, col: 0 }], { row: 0, col: 1 })).toBe(false);
  });

  it('isValidPath rejects out-of-bounds and empty cells', () => {
    board.setGrid([
      [2, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(
      board.isValidPath([
        { row: 0, col: 0 },
        { row: -1, col: 0 },
      ]),
    ).toBe(false);
    expect(
      board.isValidPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    ).toBe(false);
  });

  it('spawnAtTopRandomColumn returns false when board is full', () => {
    board.start();
    expect(board.spawnAtTopRandomColumn()).toBe(false);
  });

  it('spawnAtTopRandomColumn places below occupied top cells in a column', () => {
    board = new Board2248({ rng: () => 0 });
    board.setGrid([
      [4, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(board.spawnAtTopRandomColumn()).toBe(true);
    expect(board.cell(1, 0)).toBe(2);
    expect(board.cell(0, 0)).toBe(4);
  });

  it('applyTierNineTwosPurge delegates to applySpawnPoolPurge', () => {
    board.setGrid([
      [512, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(board.applyTierNineTwosPurge()).toBe(2);
  });

  it('spawnAtRandom fills a random empty cell', () => {
    board.setGrid([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [4, 0, 0, 0, 0],
    ]);
    expect(board.spawnAtRandom()).toBe(true);
    expect(board.countTiles()).toBe(2);
  });

  it('settleGravity drops tiles within columns', () => {
    board.setGrid([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [8, 0, 0, 0, 0],
      [0, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    board.settleGravity();
    expect(board.cell(4, 0)).toBe(8);
    expect(board.cell(4, 1)).toBe(2);
  });

  it('tryRollbackPath returns null for single-cell paths', () => {
    expect(board.tryRollbackPath([{ row: 0, col: 0 }], { row: 0, col: 0 })).toBeNull();
  });

  it('canLink rejects zero values', () => {
    expect(board.canLink(0, 0)).toBe(false);
  });

  it('pathValues reads tile values along a path', () => {
    board.setGrid([
      [2, 4, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(
      board.pathValues([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    ).toEqual([2, 4]);
  });
});
