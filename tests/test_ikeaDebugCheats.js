/**
 * Unit tests for dev debug cheat session transforms.
 */
import { describe, expect, it } from 'vitest';
import { applyDebugJumpToLevel, applyDebugSkipLevel } from '../src/ikea/logic/debugCheats.js';

const baseSession = {
  seed: 'TEST1234',
  role: 'p1',
  level: 1,
};

describe('applyDebugSkipLevel', () => {
  it('jumps from level 1 to level 2', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: 1, crosswordGridSolved: true });
    expect(next.level).toBe(2);
    expect(next.crosswordGridSolved).toBe(false);
  });

  it('jumps from level 2 to allen key', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: 2, levelComplete: true });
    expect(next.level).toBe(4);
  });

  it('jumps from allen key to victory', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: 4, levelComplete: true });
    expect(next.level).toBe(5);
  });
});

describe('applyDebugJumpToLevel', () => {
  it('jumps directly to a chosen level', () => {
    expect(applyDebugJumpToLevel({ ...baseSession, level: 1 }, 3).level).toBe(4);
    expect(applyDebugJumpToLevel({ ...baseSession, level: 2 }, 4).level).toBe(5);
  });
});
