/**
 * Unit tests for dev debug cheat session transforms.
 */
import { describe, expect, it } from 'vitest';
import { applyDebugJumpToLevel, applyDebugSkipLevel } from '../src/ikea/logic/debugCheats.js';
import { ALLEN_KEY_LEVEL, FIRST_PLAYABLE_LEVEL } from '../src/ikea/logic/levelProgression.js';

const baseSession = {
  seed: 'TEST1234',
  role: 'p1',
  level: FIRST_PLAYABLE_LEVEL,
};

describe('applyDebugSkipLevel', () => {
  it('jumps from maze to allen key', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: FIRST_PLAYABLE_LEVEL, levelComplete: true });
    expect(next.level).toBe(ALLEN_KEY_LEVEL);
  });

  it('jumps from allen key to victory', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: ALLEN_KEY_LEVEL, levelComplete: true });
    expect(next.level).toBe(5);
  });
});

describe('applyDebugJumpToLevel', () => {
  it('jumps directly to a chosen level', () => {
    expect(applyDebugJumpToLevel({ ...baseSession, level: FIRST_PLAYABLE_LEVEL }, 2).level).toBe(
      ALLEN_KEY_LEVEL,
    );
    expect(applyDebugJumpToLevel({ ...baseSession, level: FIRST_PLAYABLE_LEVEL }, 3).level).toBe(5);
  });
});
