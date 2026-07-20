/**
 * Unit tests for Level 3 blues chord progression logic.
 */
import { describe, expect, it } from 'vitest';
import {
  BLUES_PROGRESSION,
  BLUES_SEQUENCE,
  CHORDS_PER_BAR,
  MAX_CHORD_MISTAKES,
  bluesChordCount,
  bluesPositionForIndex,
  isBluesProgressionComplete,
  isExpectedChordAt,
  shouldResetBluesAttempt,
} from '../src/ikea/logic/levels/bluesChords.js';

describe('BLUES_PROGRESSION', () => {
  it('has three bars of four chords (12-bar blues compressed)', () => {
    expect(BLUES_PROGRESSION).toHaveLength(3);
    BLUES_PROGRESSION.forEach((bar) => expect(bar).toHaveLength(CHORDS_PER_BAR));
    expect(BLUES_SEQUENCE).toHaveLength(12);
  });

  it('uses II in bar 3 as the jazz-blues turnaround', () => {
    expect(BLUES_PROGRESSION[2][0]).toBe('II');
    expect(BLUES_PROGRESSION[2].slice(1)).toEqual(['V', 'I', 'V']);
  });
});

describe('isExpectedChordAt', () => {
  it('matches the flat blues sequence', () => {
    expect(isExpectedChordAt(0, 'I')).toBe(true);
    expect(isExpectedChordAt(4, 'IV')).toBe(true);
    expect(isExpectedChordAt(8, 'II')).toBe(true);
    expect(isExpectedChordAt(8, 'V')).toBe(false);
  });
});

describe('bluesPositionForIndex', () => {
  it('maps flat index to bar and slot', () => {
    expect(bluesPositionForIndex(0)).toEqual({ bar: 1, slot: 1 });
    expect(bluesPositionForIndex(4)).toEqual({ bar: 2, slot: 1 });
    expect(bluesPositionForIndex(8)).toEqual({ bar: 3, slot: 1 });
  });
});

describe('mistake handling', () => {
  it('resets after three wrong chords', () => {
    expect(shouldResetBluesAttempt(MAX_CHORD_MISTAKES - 1)).toBe(false);
    expect(shouldResetBluesAttempt(MAX_CHORD_MISTAKES)).toBe(true);
  });

  it('completes after twelve correct chords', () => {
    expect(isBluesProgressionComplete(bluesChordCount() - 1)).toBe(false);
    expect(isBluesProgressionComplete(bluesChordCount())).toBe(true);
  });
});
