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

/** LEDs per row in Knoppenspel. */
export const KNOPPEN_BIT_COUNT = 8;

/** Candidate rows on the right pane in Knoppenspel. */
export const KNOPPEN_ROW_COUNT = 8;

/** First-round timer duration (ms). */
export const KNOPPEN_INITIAL_TIMER_MS = 3000;

/** Minimum round timer at the difficulty floor (ms). */
export const KNOPPEN_MIN_TIMER_MS = 1000;

/** Round index at which the timer reaches the minimum (turn 100 → 1s left). */
export const KNOPPEN_TIMER_FLOOR_ROUND = 100;

/** Pause before auto-continue to the next round after a correct reveal (ms). */
export const KNOPPEN_REVEAL_PAUSE_MS = 5000;

/** ToneGrid matrix columns (time steps per measure). */
export const TONEGRID_COLS = 16;

/** ToneGrid matrix rows (pitch lanes). */
export const TONEGRID_ROWS = 16;

/** Default tempo for ToneGrid playback. */
export const TONEGRID_DEFAULT_BPM = 120;

/** Minimum allowed ToneGrid tempo. */
export const TONEGRID_BPM_MIN = 60;

/** Maximum allowed ToneGrid tempo. */
export const TONEGRID_BPM_MAX = 200;

/** Max micro-timing offset as a fraction of one 16th note (±40%). */
export const TONEGRID_TIMING_OFFSET_MAX = 0.4;

/** Fixed section ids for multi-part arrangements. */
export const TONEGRID_SECTION_IDS = /** @type {const} */ ([
  'verse',
  'chorus',
  'break',
  'modulation',
  'solo',
  'finale',
]);

/** Selectable major-pentatonic roots. */
export const TONEGRID_SCALE_ROOTS = /** @type {const} */ (['C', 'D', 'E', 'F', 'G', 'A']);
