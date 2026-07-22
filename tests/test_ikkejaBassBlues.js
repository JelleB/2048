/**
 * Unit tests for bass alternation in Level 3 blues audio.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  nextBassBluesFrequency,
  peekNextBassBluesRole,
  resetBassAlternation,
} from '../src/ikkeja/audio/ikkejaSynth.js';

describe('nextBassBluesFrequency', () => {
  afterEach(() => {
    resetBassAlternation();
  });

  it('alternates root and fifth on repeated presses', () => {
    expect(nextBassBluesFrequency('I')).toBeCloseTo(130.81, 1);
    expect(nextBassBluesFrequency('I')).toBeCloseTo(196.0, 1);
    expect(nextBassBluesFrequency('I')).toBeCloseTo(130.81, 1);
  });

  it('uses a global toggle across chords', () => {
    expect(nextBassBluesFrequency('I')).toBeCloseTo(130.81, 1);
    expect(nextBassBluesFrequency('V')).toBeCloseTo(293.66, 1);
  });

  it('peekNextBassBluesRole reflects the upcoming note', () => {
    resetBassAlternation();
    expect(peekNextBassBluesRole()).toBe('root');
    nextBassBluesFrequency('I');
    expect(peekNextBassBluesRole()).toBe('fifth');
  });
});
