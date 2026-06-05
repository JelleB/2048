/**
 * Tile spawning: exponent ranges scale with board tier; purge tiles no longer spawnable.
 */
import {
  SPAWN_LOWEST_TO_HIGHEST_WEIGHT_RATIO,
  SPAWN_RANGE_FLOOR,
  SPAWN_RANGE_MAX_TIERS,
  TIER_NINE_PURGE_TILE,
  SPAWN_MIN_EXP,
} from '../constants.js';

/**
 * @param {number[][]} grid
 * @returns {number}
 */
export function maxTileOnGrid(grid) {
  let max = 0;
  for (const row of grid) {
    for (const value of row) {
      if (value > max) max = value;
    }
  }
  return max;
}

/**
 * @param {number} value Power-of-two tile value.
 * @returns {number}
 */
export function tileExponent(value) {
  return Math.round(Math.log2(value));
}

/**
 * Board tier from the highest tile (2^tier).
 * @param {number} maxTile
 * @returns {number}
 */
export function boardTier(maxTile) {
  if (maxTile <= 0) return 0;
  return tileExponent(maxTile);
}

/**
 * @param {number} exponent
 * @returns {number}
 */
export function valueFromExponent(exponent) {
  return 2 ** exponent;
}

/**
 * Lowest spawn exponent for a given board tier (2^tier on board).
 * @param {number} tier
 * @returns {number}
 */
export function minSpawnExpForTier(tier) {
  if (tier < 9) return SPAWN_MIN_EXP;
  if (tier === 9) return 2;
  if (tier === 10) return 5;
  return tier - 7;
}

/**
 * @param {number} maxTile
 * @returns {number[]}
 */
export function buildSpawnExponentPool(maxTile) {
  const tier = boardTier(Math.max(maxTile, 2));

  if (tier < 9) {
    const maxExp = tier;
    let minExp = SPAWN_MIN_EXP;
    if (maxExp - minExp + 1 > SPAWN_RANGE_MAX_TIERS) {
      minExp = maxExp - SPAWN_RANGE_MAX_TIERS + 1;
    }
    /** @type {number[]} */
    const exponents = [];
    for (let exp = minExp; exp <= maxExp; exp += 1) {
      exponents.push(exp);
    }
    return exponents;
  }

  const minExp = minSpawnExpForTier(tier);
  const maxExp = tier;
  /** @type {number[]} */
  const exponents = [];
  for (let exp = minExp; exp <= maxExp; exp += 1) {
    exponents.push(exp);
  }
  return exponents;
}

/**
 * @param {number} maxTile
 * @returns {number[]}
 */
export function buildSpawnValuePool(maxTile) {
  return buildSpawnExponentPool(maxTile).map(valueFromExponent);
}

/**
 * Weights for `tierCount` spawn tiers: lowest weight / highest = 256.
 * @param {number} tierCount
 * @returns {number[]}
 */
export function spawnWeightsForTierCount(tierCount) {
  if (tierCount <= 0) return [];
  if (tierCount === 1) return [1];
  /** @type {number[]} */
  const weights = [];
  for (let i = 0; i < tierCount; i += 1) {
    const exponent = (tierCount - 1 - i) / (tierCount - 1);
    weights.push(SPAWN_LOWEST_TO_HIGHEST_WEIGHT_RATIO ** exponent);
  }
  return weights;
}

/**
 * @param {number} maxTile
 * @param {() => number} rng
 * @returns {number}
 */
export function pickSpawnValue(maxTile, rng) {
  const exponents = buildSpawnExponentPool(maxTile);
  const weights = spawnWeightsForTierCount(exponents.length);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;
  for (let i = 0; i < exponents.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return valueFromExponent(exponents[i]);
  }
  return valueFromExponent(exponents[exponents.length - 1]);
}

/**
 * @param {number[][]} grid
 * @param {() => number} rng
 * @returns {number}
 */
export function randomSpawnTileValue(grid, rng) {
  return pickSpawnValue(maxTileOnGrid(grid), rng);
}

/**
 * @param {number} value
 * @returns {number}
 */
export function roundUpToPowerOfTwo(value) {
  if (value <= 0) return 0;
  if ((value & (value - 1)) === 0) return value;
  let power = 1;
  while (power < value) power <<= 1;
  return power;
}

/**
 * @param {number[][]} grid
 * @param {() => number} rng
 */
export function fillGridWithStartValues(grid, rng) {
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      const maxTile = Math.max(maxTileOnGrid(grid), SPAWN_RANGE_FLOOR);
      grid[r][c] = pickSpawnValue(maxTile, rng);
    }
  }
}

/**
 * Removes tiles that cannot spawn at the current board tier; returns raw score gained.
 * @param {number[][]} grid
 * @returns {number}
 */
export function purgeUnspawnableTiles(grid) {
  const maxTile = maxTileOnGrid(grid);
  if (maxTile < TIER_NINE_PURGE_TILE) return 0;

  const allowed = new Set(buildSpawnValuePool(maxTile));
  let points = 0;
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const value = grid[row][col];
      if (value > 0 && !allowed.has(value)) {
        points += value;
        grid[row][col] = 0;
      }
    }
  }
  return points;
}

/** @deprecated Alias for {@link purgeUnspawnableTiles}. */
export const purgeTwosAtTierNine = purgeUnspawnableTiles;
