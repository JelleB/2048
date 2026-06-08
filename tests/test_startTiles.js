/**
 * Unit tests for exponent-based weighted spawn pools and tier purges.
 */
import { describe, it, expect } from 'vitest';
import {
  buildSpawnExponentPool,
  buildSpawnValuePool,
  pickSpawnValue,
  spawnWeightsForTierCount,
  randomSpawnTileValue,
  roundUpToPowerOfTwo,
  purgeUnspawnableTiles,
  purgeTwosAtTierNine,
  minSpawnExpForTier,
  maxTileOnGrid,
  tileExponent,
  boardTier,
  valueFromExponent,
  fillGridWithStartValues,
} from '../src/logic/startTiles.js';

describe('spawn pool', () => {
  it('builds four exponent tiers up to max 16', () => {
    expect(buildSpawnExponentPool(16)).toEqual([1, 2, 3, 4]);
    expect(buildSpawnValuePool(16)).toEqual([2, 4, 8, 16]);
    expect(spawnWeightsForTierCount(4)[0] / spawnWeightsForTierCount(4)[3]).toBeCloseTo(256);
  });

  it('builds eight exponent tiers up to max 256', () => {
    expect(buildSpawnExponentPool(256)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(buildSpawnValuePool(256)).toEqual([
      2, 4, 8, 16, 32, 64, 128, 256,
    ]);
  });

  it('uses exponents 2 through 9 at tier nine', () => {
    expect(buildSpawnExponentPool(512)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(buildSpawnValuePool(512)).toEqual([
      4, 8, 16, 32, 64, 128, 256, 512,
    ]);
  });

  it('uses exponents 5 through 10 at tier ten', () => {
    expect(minSpawnExpForTier(10)).toBe(5);
    expect(buildSpawnExponentPool(1024)).toEqual([5, 6, 7, 8, 9, 10]);
    expect(buildSpawnValuePool(1024)).toEqual([
      32, 64, 128, 256, 512, 1024,
    ]);
    const weights = spawnWeightsForTierCount(6);
    expect(weights[0] / weights[5]).toBeCloseTo(256);
  });

  it('uses exponents 4 through 11 at tier eleven', () => {
    expect(minSpawnExpForTier(11)).toBe(4);
    expect(buildSpawnValuePool(2048)).toEqual([
      16, 32, 64, 128, 256, 512, 1024, 2048,
    ]);
  });

  it('uses 256:1 weight ratio for any pool size', () => {
    for (const count of [2, 4, 6, 8]) {
      const weights = spawnWeightsForTierCount(count);
      expect(weights[0] / weights[count - 1]).toBeCloseTo(256);
    }
  });

  it('favors low exponents with rng near zero', () => {
    expect(pickSpawnValue(512, () => 0)).toBe(4);
    expect(pickSpawnValue(1024, () => 0)).toBe(32);
  });

  it('can pick top exponent with rng near one', () => {
    expect(pickSpawnValue(16, () => 0.9999)).toBe(16);
    expect(pickSpawnValue(512, () => 0.9999)).toBe(512);
    expect(pickSpawnValue(1024, () => 0.9999)).toBe(1024);
  });
});

describe('purgeUnspawnableTiles', () => {
  it('does nothing below tier nine', () => {
    const grid = [
      [2, 256],
      [2, 128],
    ];
    expect(purgeUnspawnableTiles(grid)).toBe(0);
  });

  it('purges 2 at tier nine', () => {
    const grid = [
      [512, 2],
      [2, 4],
    ];
    expect(purgeUnspawnableTiles(grid)).toBe(4);
    expect(grid).toEqual([
      [512, 0],
      [0, 4],
    ]);
  });

  it('purges 2^4 at tier ten', () => {
    const grid = [
      [1024, 16, 32],
      [2, 4, 8],
    ];
    expect(purgeUnspawnableTiles(grid)).toBe(30);
    expect(grid).toEqual([
      [1024, 0, 32],
      [0, 0, 0],
    ]);
  });

  it('purges 2^3 at tier eleven', () => {
    const grid = [
      [2048, 8, 16],
      [4, 32, 64],
    ];
    expect(purgeUnspawnableTiles(grid)).toBe(12);
    expect(grid).toEqual([
      [2048, 0, 16],
      [0, 32, 64],
    ]);
  });
});

describe('roundUpToPowerOfTwo', () => {
  it('rounds 12 up to 16', () => {
    expect(roundUpToPowerOfTwo(12)).toBe(16);
  });

  it('returns zero for non-positive values', () => {
    expect(roundUpToPowerOfTwo(0)).toBe(0);
    expect(roundUpToPowerOfTwo(-3)).toBe(0);
  });

  it('returns exact powers unchanged', () => {
    expect(roundUpToPowerOfTwo(8)).toBe(8);
  });
});

describe('tile helpers', () => {
  it('maxTileOnGrid finds the highest tile', () => {
    expect(maxTileOnGrid([[2, 16], [4, 8]])).toBe(16);
    expect(maxTileOnGrid([[0, 0], [0, 0]])).toBe(0);
  });

  it('tileExponent and boardTier derive tier from values', () => {
    expect(tileExponent(16)).toBe(4);
    expect(boardTier(512)).toBe(9);
    expect(boardTier(0)).toBe(0);
  });

  it('valueFromExponent converts exponents to tile values', () => {
    expect(valueFromExponent(3)).toBe(8);
  });

  it('minSpawnExpForTier uses default below tier nine', () => {
    expect(minSpawnExpForTier(4)).toBe(1);
  });

  it('fillGridWithStartValues fills every cell', () => {
    const grid = [
      [0, 0],
      [0, 0],
    ];
    fillGridWithStartValues(grid, () => 0);
    expect(grid.flat().every((v) => v > 0)).toBe(true);
  });

  it('randomSpawnTileValue uses current board max', () => {
    const grid = [
      [16, 0],
      [0, 0],
    ];
    expect(randomSpawnTileValue(grid, () => 0)).toBe(2);
  });

  it('spawnWeightsForTierCount handles edge counts', () => {
    expect(spawnWeightsForTierCount(0)).toEqual([]);
    expect(spawnWeightsForTierCount(1)).toEqual([1]);
  });

  it('pickSpawnValue falls back to top tier when rng is 1', () => {
    expect(pickSpawnValue(16, () => 1)).toBe(16);
  });

  it('purgeTwosAtTierNine is an alias for purgeUnspawnableTiles', () => {
    const grid = [[512, 2]];
    expect(purgeTwosAtTierNine(grid)).toBe(2);
    expect(grid[0][1]).toBe(0);
  });
});
