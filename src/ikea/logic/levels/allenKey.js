/**
 * Level 4: seeded Allen key color sequence and rhythm validation.
 */
import { ALLEN_KEY_COLORS } from '../puzzleData.js';

/** Input window for Player 2 rhythm keypad (ms). */
export const RHYTHM_WINDOW_MS = 5000;

/**
 * Simple deterministic PRNG from a string seed (Mulberry32-style).
 * @param {string} seed
 * @returns {() => number} Returns floats in [0, 1).
 */
export function createSeededRng(seed) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * Generates a 4-color Allen key sequence from session seed.
 * @param {string} sessionSeed
 * @returns {string[]}
 */
export function generateSequence(sessionSeed) {
  const rng = createSeededRng(`${sessionSeed}:L4`);
  const seq = [];
  for (let i = 0; i < 4; i += 1) {
    const idx = Math.floor(rng() * ALLEN_KEY_COLORS.length);
    seq.push(ALLEN_KEY_COLORS[idx]);
  }
  return seq;
}

/**
 * Checks whether Player 2 input matches the expected sequence.
 * @param {string[]} expected
 * @param {string[]} input
 * @returns {boolean}
 */
export function sequencesMatch(expected, input) {
  if (expected.length !== input.length) {
    return false;
  }
  return expected.every((color, i) => color === input[i]);
}

/**
 * Validates partial input during rhythm window.
 * @param {string[]} expected
 * @param {string[]} input
 * @returns {boolean} False if input cannot still match.
 */
export function isPartialMatch(expected, input) {
  return input.every((color, i) => color === expected[i]);
}

/**
 * Whether the rhythm input window has expired.
 * @param {number} startedAt - performance.now() or Date.now().
 * @param {number} [now]
 * @returns {boolean}
 */
export function isRhythmExpired(startedAt, now = Date.now()) {
  return now - startedAt > RHYTHM_WINDOW_MS;
}
