/**
 * Shared constants for grid sizes, directions, and tile value ranges.
 */

/** @type {4} Classic 2048 board size. */
export const GRID_2048 = 4;

/** @type {5} 2248-style board size. */
export const GRID_2248 = 5;

/** @type {readonly string[]} Cardinal directions for 2048 moves. */
export const DIRECTIONS = /** @type {const} */ (['up', 'down', 'left', 'right']);

/** Minimum exponent for start tiles (2^1 = 2). */
export const START_TILE_MIN_EXP = 1;

/** Maximum exponent for start tiles (2^4 = 16). */
export const START_TILE_MAX_EXP = 4;

/** Allowed values when filling the board at game start (minimum range). */
export const START_TILE_VALUES = [2, 4, 8, 16];

/** Ratio of spawn weight: lowest tile in range vs highest (always 256:1). */
export const SPAWN_LOWEST_TO_HIGHEST_WEIGHT_RATIO = 256;

/** Minimum board max used to build the initial spawn pool (2^4 = 16). */
export const SPAWN_RANGE_FLOOR = 16;

/** Maximum distinct spawn tiers (matches weight list length). */
export const SPAWN_RANGE_MAX_TIERS = 8;

/** Board tier (2^9) when spawn/purge rules change from early-game pools. */
export const TIER_NINE_PURGE_TILE = 512;

/** Lowest spawn exponent before tier nine. */
export const SPAWN_MIN_EXP = 1;

/** Minimum swipe distance in pixels for a move. */
export const SWIPE_THRESHOLD_PX = 30;

/** Milliseconds per one-row gravity step in 2248 animations. */
export const GRAVITY_STEP_MS = 90;

/** Pause between each new spawn before it falls (2248). */
export const SPAWN_PAUSE_MS = 120;
