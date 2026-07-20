/**
 * Unit tests for Level 4 Allen key rhythm sequence.
 */
import { describe, expect, it } from 'vitest';
import {
  RHYTHM_WINDOW_MS,
  generateSequence,
  isPartialMatch,
  isRhythmExpired,
  sequencesMatch,
} from '../src/ikea/logic/levels/allenKey.js';

describe('generateSequence', () => {
  it('returns four valid colors deterministically', () => {
    const a = generateSequence('MYSESSION');
    const b = generateSequence('MYSESSION');
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
    a.forEach((c) => expect(['red', 'blue', 'yellow', 'green']).toContain(c));
  });

  it('differs for different seeds', () => {
    expect(generateSequence('AAA')).not.toEqual(generateSequence('BBB'));
  });
});

describe('sequencesMatch', () => {
  it('requires exact color order', () => {
    expect(sequencesMatch(['red', 'blue'], ['red', 'blue'])).toBe(true);
    expect(sequencesMatch(['red', 'blue'], ['blue', 'red'])).toBe(false);
  });
});

describe('isPartialMatch', () => {
  it('allows incomplete prefix', () => {
    expect(isPartialMatch(['red', 'blue', 'green'], ['red'])).toBe(true);
    expect(isPartialMatch(['red', 'blue'], ['blue'])).toBe(false);
  });
});

describe('isRhythmExpired', () => {
  it('expires after window', () => {
    expect(isRhythmExpired(1000, 1000 + RHYTHM_WINDOW_MS - 1)).toBe(false);
    expect(isRhythmExpired(1000, 1000 + RHYTHM_WINDOW_MS + 1)).toBe(true);
  });
});
