/**
 * Unit tests for playable level order (cafeteria level disabled).
 */
import { describe, expect, it } from 'vitest';
import {
  ALLEN_KEY_LEVEL,
  DISABLED_CAFETERIA_LEVEL,
  displayLevelNumber,
  displayLevelTitle,
  internalLevelFromDisplay,
  nextPlayableLevel,
  normalizeSession,
  normalizeSessionLevel,
  VICTORY_LEVEL,
} from '../src/ikea/logic/levelProgression.js';

describe('normalizeSessionLevel', () => {
  it('skips disabled cafeteria level', () => {
    expect(normalizeSessionLevel(DISABLED_CAFETERIA_LEVEL)).toBe(ALLEN_KEY_LEVEL);
  });
});

describe('nextPlayableLevel', () => {
  it('goes from maze directly to allen key', () => {
    expect(nextPlayableLevel(2)).toBe(ALLEN_KEY_LEVEL);
  });

  it('goes from allen key to victory', () => {
    expect(nextPlayableLevel(ALLEN_KEY_LEVEL)).toBe(VICTORY_LEVEL);
  });
});

describe('displayLevelNumber', () => {
  it('shows allen key as level 3', () => {
    expect(displayLevelNumber(ALLEN_KEY_LEVEL)).toBe(3);
  });
});

describe('internalLevelFromDisplay', () => {
  it('maps display level 3 to allen key', () => {
    expect(internalLevelFromDisplay(3)).toBe(ALLEN_KEY_LEVEL);
  });

  it('maps display level 4 to victory', () => {
    expect(internalLevelFromDisplay(4)).toBe(VICTORY_LEVEL);
  });
});

describe('normalizeSession', () => {
  it('migrates saved cafeteria progress to allen key', () => {
    const migrated = normalizeSession({
      seed: 'ABC123',
      role: 'p2',
      level: DISABLED_CAFETERIA_LEVEL,
      levelComplete: true,
    });
    expect(migrated.level).toBe(ALLEN_KEY_LEVEL);
    expect(migrated.levelComplete).toBe(false);
  });
});

describe('displayLevelTitle', () => {
  it('returns allen key title for internal level 4', () => {
    expect(displayLevelTitle(ALLEN_KEY_LEVEL)).toBe('Unbrakonyckel');
  });
});
