/**
 * Unit tests for dev debug cheat session transforms.
 */
import { describe, expect, it } from 'vitest';
import { applyDebugJumpToLevel, applyDebugSkipLevel } from '../src/ikkeja/logic/debugCheats.js';
import {
  ALLEN_KEY_LEVEL,
  CROSSWORD_LEVEL,
  FIRST_PLAYABLE_LEVEL,
  MAZE_LEVEL,
  VICTORY_LEVEL,
} from '../src/ikkeja/logic/levelProgression.js';

const baseSession = {
  seed: 'TEST1234',
  role: 'p1',
  level: FIRST_PLAYABLE_LEVEL,
};

describe('applyDebugSkipLevel', () => {
  it('jumps from crossword to maze', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: CROSSWORD_LEVEL, levelComplete: true });
    expect(next.level).toBe(MAZE_LEVEL);
  });

  it('jumps from maze to allen key', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: MAZE_LEVEL, levelComplete: true });
    expect(next.level).toBe(ALLEN_KEY_LEVEL);
  });

  it('jumps from allen key to victory', () => {
    const next = applyDebugSkipLevel({ ...baseSession, level: ALLEN_KEY_LEVEL, levelComplete: true });
    expect(next.level).toBe(VICTORY_LEVEL);
  });
});

describe('applyDebugJumpToLevel', () => {
  it('jumps directly to a chosen display level', () => {
    expect(applyDebugJumpToLevel({ ...baseSession, level: CROSSWORD_LEVEL }, 1).level).toBe(
      CROSSWORD_LEVEL,
    );
    expect(applyDebugJumpToLevel({ ...baseSession, level: CROSSWORD_LEVEL }, 2).level).toBe(MAZE_LEVEL);
    expect(applyDebugJumpToLevel({ ...baseSession, level: CROSSWORD_LEVEL }, 3).level).toBe(
      ALLEN_KEY_LEVEL,
    );
    expect(applyDebugJumpToLevel({ ...baseSession, level: CROSSWORD_LEVEL }, 4).level).toBe(
      VICTORY_LEVEL,
    );
  });
});
