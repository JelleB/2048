/**
 * Unit tests for Knoppenspel binary-matching game logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRound,
  timerForRound,
  Knoppenspel,
} from '../src/logic/knoppenspel.js';
import {
  KNOPPEN_INITIAL_TIMER_MS,
  KNOPPEN_MIN_TIMER_MS,
  KNOPPEN_ROW_COUNT,
  KNOPPEN_TIMER_FLOOR_ROUND,
} from '../src/constants.js';

/** Deterministic RNG queue. */
function queueRng(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('generateRound', () => {
  it('places the target on exactly one row', () => {
    const round = generateRound(queueRng([100 / 255, 3 / 7, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]));
    const matches = round.rows.filter((v) => v === round.targetByte);
    expect(matches).toHaveLength(1);
    expect(round.rows[round.correctRowIndex]).toBe(round.targetByte);
    expect(round.rows).toHaveLength(KNOPPEN_ROW_COUNT);
  });

  it('never duplicates the target on incorrect rows', () => {
    for (let i = 0; i < 50; i += 1) {
      const round = generateRound(Math.random);
      round.rows.forEach((value, index) => {
        if (index !== round.correctRowIndex) {
          expect(value).not.toBe(round.targetByte);
        }
      });
    }
  });
});

describe('timerForRound', () => {
  it('starts at the initial duration', () => {
    expect(timerForRound(1)).toBe(KNOPPEN_INITIAL_TIMER_MS);
  });

  it('decreases linearly until one second remains at turn 100', () => {
    expect(timerForRound(2)).toBe(
      Math.round(KNOPPEN_INITIAL_TIMER_MS - (KNOPPEN_INITIAL_TIMER_MS - KNOPPEN_MIN_TIMER_MS) / 99),
    );
    expect(timerForRound(50)).toBe(
      Math.round(KNOPPEN_INITIAL_TIMER_MS - 49 * (KNOPPEN_INITIAL_TIMER_MS - KNOPPEN_MIN_TIMER_MS) / 99),
    );
    expect(timerForRound(100)).toBe(KNOPPEN_MIN_TIMER_MS);
    expect(timerForRound(KNOPPEN_TIMER_FLOOR_ROUND)).toBe(KNOPPEN_MIN_TIMER_MS);
    expect(timerForRound(200)).toBe(KNOPPEN_MIN_TIMER_MS);
  });

  it('never drops below the minimum before the floor round', () => {
    for (let round = 1; round < KNOPPEN_TIMER_FLOOR_ROUND; round += 1) {
      expect(timerForRound(round)).toBeGreaterThanOrEqual(KNOPPEN_MIN_TIMER_MS);
    }
  });
});

describe('Knoppenspel', () => {
  /** @type {Knoppenspel} */
  let game;

  beforeEach(() => {
    game = new Knoppenspel({
      rng: queueRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.15, 0.25, 0.35]),
    });
  });

  it('begins idle until start is called', () => {
    expect(game.phase).toBe('idle');
    expect(game.currentRound).toBeNull();
  });

  it('starts at score zero in playing phase', () => {
    game.start();
    expect(game.score).toBe(0);
    expect(game.phase).toBe('playing');
    expect(game.roundIndex).toBe(1);
    expect(game.currentRound).not.toBeNull();
    expect(game.timerMs).toBe(KNOPPEN_INITIAL_TIMER_MS);
  });

  it('increments score on correct choice and enters reveal', () => {
    game.start();
    const { correctRowIndex } = game.currentRound;
    const result = game.submitChoice(correctRowIndex);
    expect(result).toBe('correct');
    expect(game.score).toBe(1);
    expect(game.phase).toBe('reveal');
    expect(game.lastChoice).toBe(correctRowIndex);
  });

  it('advances to a shorter timer after continue from correct reveal', () => {
    game.start();
    game.submitChoice(game.currentRound.correctRowIndex);
    game.continueAfterReveal();
    expect(game.phase).toBe('playing');
    expect(game.roundIndex).toBe(2);
    expect(game.timerMs).toBe(timerForRound(2));
  });

  it('resets score and game overs on wrong choice', () => {
    game.start();
    const wrongIndex = game.currentRound.correctRowIndex === 0 ? 1 : 0;
    game.score = 5;
    game.submitChoice(wrongIndex);
    expect(game.score).toBe(0);
    expect(game.phase).toBe('gameOver');
    expect(game.lastChoice).toBe(wrongIndex);
  });

  it('game overs on timeout like a wrong choice', () => {
    game.start();
    game.score = 4;
    game.handleTimeout();
    expect(game.score).toBe(0);
    expect(game.phase).toBe('gameOver');
    expect(game.lastChoice).toBeNull();
  });

  it('restarts from score zero after game over', () => {
    game.start();
    game.handleTimeout();
    game.restart();
    expect(game.score).toBe(0);
    expect(game.phase).toBe('playing');
    expect(game.roundIndex).toBe(1);
  });

  it('ignores input outside playing phase', () => {
    game.start();
    game.submitChoice(game.currentRound.correctRowIndex);
    const result = game.submitChoice(0);
    expect(result).toBeNull();
  });
});
