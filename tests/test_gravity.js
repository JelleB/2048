/**
 * Unit tests for column gravity.
 */
import { describe, it, expect } from 'vitest';
import { applyGravity, isGravitySettled, applyGravityOneStep, previewGravityOneStepMoves } from '../src/logic/gravity.js';

describe('applyGravity', () => {
  it('drops tiles to the bottom of each column', () => {
    const grid = [
      [4, 0, 0, 0],
      [0, 2, 0, 0],
      [8, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    applyGravity(grid);
    expect(grid).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
      [8, 2, 0, 0],
    ]);
  });

  it('preserves top-to-bottom order within a column', () => {
    const grid = [
      [2, 0],
      [0, 0],
      [4, 0],
      [0, 8],
      [0, 0],
    ];
    applyGravity(grid);
    expect(grid[3][0]).toBe(2);
    expect(grid[4][0]).toBe(4);
    expect(grid[4][1]).toBe(8);
  });

  it('leaves full columns unchanged', () => {
    const grid = [
      [2, 4],
      [8, 16],
    ];
    applyGravity(grid);
    expect(grid).toEqual([
      [2, 4],
      [8, 16],
    ]);
  });

  it('results in a settled grid', () => {
    const grid = [
      [0, 16, 0],
      [2, 0, 0],
      [0, 8, 4],
      [0, 0, 0],
      [0, 0, 0],
    ];
    applyGravity(grid);
    expect(isGravitySettled(grid)).toBe(true);
  });

  it('applyGravityOneStep moves tiles down one row', () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
      [0, 2, 0, 0],
    ];
    const moves = previewGravityOneStepMoves(grid);
    expect(moves.length).toBeGreaterThan(0);
    applyGravityOneStep(grid);
    expect(grid[3][0]).toBe(4);
    expect(grid[3][1]).toBe(2);
  });

  it('one-step preview matches apply', () => {
    const before = [
      [2, 0],
      [0, 0],
      [0, 0],
      [0, 4],
    ];
    const moves = previewGravityOneStepMoves(before);
    applyGravityOneStep(before);
    for (const move of moves) {
      expect(before[move.toRow][move.toCol]).toBe(move.value);
    }
  });
});

describe('isGravitySettled', () => {
  it('is false when a tile floats above an empty cell', () => {
    expect(
      isGravitySettled([
        [2, 0],
        [0, 0],
      ]),
    ).toBe(false);
  });

  it('is true when all tiles rest on the bottom or other tiles', () => {
    expect(
      isGravitySettled([
        [0, 0],
        [2, 4],
      ]),
    ).toBe(true);
  });
});

describe('applyGravityOneStep return value', () => {
  it('returns false when no tile can move', () => {
    const grid = [
      [0, 0],
      [2, 4],
    ];
    expect(applyGravityOneStep(grid)).toBe(false);
  });

  it('returns true when a tile moves', () => {
    const grid = [
      [2, 0],
      [0, 0],
    ];
    expect(applyGravityOneStep(grid)).toBe(true);
  });
});
