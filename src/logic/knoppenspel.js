/**
 * Knoppenspel: pick the right-pane row whose 8-bit value matches the left target.
 */
import {
  KNOPPEN_INITIAL_TIMER_MS,
  KNOPPEN_MIN_TIMER_MS,
  KNOPPEN_ROW_COUNT,
  KNOPPEN_TIMER_FLOOR_ROUND,
} from '../constants.js';

/** @typedef {'idle' | 'playing' | 'reveal' | 'gameOver'} KnopPhase */
/** @typedef {'correct' | 'wrong'} ChoiceResult */

/**
 * @typedef {{ targetByte: number, rows: number[], correctRowIndex: number }} KnopRound
 */

/**
 * @param {() => number} rng
 * @returns {number} Random byte 0–255.
 */
export function randomByte(rng) {
  return Math.floor(rng() * 256) & 0xff;
}

/**
 * @param {number} except
 * @param {() => number} rng
 * @returns {number}
 */
export function randomByteExcept(except, rng) {
  let value = randomByte(rng);
  while (value === except) {
    value = randomByte(rng);
  }
  return value;
}

/**
 * @param {() => number} rng
 * @returns {KnopRound}
 */
export function generateRound(rng) {
  const targetByte = randomByte(rng);
  const correctRowIndex = Math.floor(rng() * KNOPPEN_ROW_COUNT);
  /** @type {number[]} */
  const rows = [];
  for (let i = 0; i < KNOPPEN_ROW_COUNT; i += 1) {
    rows.push(i === correctRowIndex ? targetByte : randomByteExcept(targetByte, rng));
  }
  return { targetByte, rows, correctRowIndex };
}

/**
 * @param {number} roundIndex 1-based round number.
 * @returns {number}
 */
export function timerForRound(roundIndex) {
  const round = Math.max(1, Math.floor(roundIndex));
  if (round >= KNOPPEN_TIMER_FLOOR_ROUND) {
    return KNOPPEN_MIN_TIMER_MS;
  }
  const span = KNOPPEN_TIMER_FLOOR_ROUND - 1;
  const progress = (round - 1) / span;
  const ms = KNOPPEN_INITIAL_TIMER_MS
    - progress * (KNOPPEN_INITIAL_TIMER_MS - KNOPPEN_MIN_TIMER_MS);
  return Math.round(ms);
}

/**
 * Binary matching arcade game state (no Phaser).
 */
export class Knoppenspel {
  /**
   * @param {{ rng?: () => number }} [options]
   */
  constructor(options = {}) {
    /** @type {() => number} */
    this.rng = options.rng ?? Math.random;
    this.score = 0;
    this.roundIndex = 1;
    /** @type {KnopPhase} */
    this.phase = 'idle';
    /** @type {KnopRound | null} */
    this.currentRound = null;
    this.timerMs = KNOPPEN_INITIAL_TIMER_MS;
    /** @type {number | null} */
    this.lastChoice = null;
  }

  /**
   * Begins a new run from score zero.
   */
  start() {
    this.score = 0;
    this.roundIndex = 1;
    this.phase = 'playing';
    this.lastChoice = null;
    this.startRound();
  }

  /**
   * Draws a new target/rows and resets the round timer.
   */
  startRound() {
    this.currentRound = generateRound(this.rng);
    this.timerMs = timerForRound(this.roundIndex);
    this.phase = 'playing';
    this.lastChoice = null;
  }

  /**
   * @param {number} rowIndex
   * @returns {ChoiceResult | null}
   */
  submitChoice(rowIndex) {
    if (this.phase !== 'playing' || !this.currentRound) return null;
    if (rowIndex < 0 || rowIndex >= KNOPPEN_ROW_COUNT) return null;

    this.lastChoice = rowIndex;
    if (rowIndex === this.currentRound.correctRowIndex) {
      this.score += 1;
      this.phase = 'reveal';
      return 'correct';
    }

    this.score = 0;
    this.phase = 'gameOver';
    return 'wrong';
  }

  /**
   * Timer expiry is treated as a wrong answer with reveal for learning.
   */
  handleTimeout() {
    if (this.phase !== 'playing') return;
    this.lastChoice = null;
    this.score = 0;
    this.phase = 'gameOver';
  }

  /**
   * After a correct reveal, advance to the next round.
   */
  continueAfterReveal() {
    if (this.phase !== 'reveal') return;
    this.roundIndex += 1;
    this.startRound();
  }

  /**
   * Restarts the run after game over.
   */
  restart() {
    this.start();
  }
}
