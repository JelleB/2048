/**
 * Unit tests for alternating flute arpeggio direction in Level 3 blues audio.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  nextFluteArpeggioOrder,
  peekNextFluteArpeggioDirection,
  resetFluteAlternation,
} from '../src/ikea/audio/ikeaSynth.js';

describe('nextFluteArpeggioOrder', () => {
  afterEach(() => {
    resetFluteAlternation();
  });

  it('starts ascending then alternates to descending', () => {
    const triad = [261.63, 329.63, 392.0];
    expect(nextFluteArpeggioOrder(triad)).toEqual(triad);
    expect(nextFluteArpeggioOrder(triad)).toEqual([392.0, 329.63, 261.63]);
    expect(nextFluteArpeggioOrder(triad)).toEqual(triad);
  });

  it('uses a global toggle across chords', () => {
    const a = [100, 200, 300];
    const b = [110, 220, 330];
    expect(nextFluteArpeggioOrder(a)).toEqual(a);
    expect(nextFluteArpeggioOrder(b)).toEqual([330, 220, 110]);
  });

  it('peekNextFluteArpeggioDirection reflects the upcoming order', () => {
    resetFluteAlternation();
    expect(peekNextFluteArpeggioDirection()).toBe('ascending');
    nextFluteArpeggioOrder([1, 2, 3]);
    expect(peekNextFluteArpeggioDirection()).toBe('descending');
  });
});
