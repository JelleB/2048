/**
 * Unit tests for playable level order (crossword and cafeteria levels disabled).
 */
import { describe, expect, it } from 'vitest';
import {
  ALLEN_KEY_LEVEL,
  DISABLED_CAFETERIA_LEVEL,
  DISABLED_CROSSWORD_LEVEL,
  displayLevelNumber,
  displayLevelTitle,
  FIRST_PLAYABLE_LEVEL,
  internalLevelFromDisplay,
  nextPlayableLevel,
  normalizeSession,
  normalizeSessionLevel,
  VICTORY_LEVEL,
} from '../src/ikea/logic/levelProgression.js';

describe('normalizeSessionLevel', () => {
  it('skips disabled crossword level', () => {
    expect(normalizeSessionLevel(DISABLED_CROSSWORD_LEVEL)).toBe(FIRST_PLAYABLE_LEVEL);
  });

  it('skips disabled cafeteria level', () => {
    expect(normalizeSessionLevel(DISABLED_CAFETERIA_LEVEL)).toBe(ALLEN_KEY_LEVEL);
  });
});

describe('nextPlayableLevel', () => {
  it('goes from maze directly to allen key', () => {
    expect(nextPlayableLevel(FIRST_PLAYABLE_LEVEL)).toBe(ALLEN_KEY_LEVEL);
  });

  it('goes from allen key to victory', () => {
    expect(nextPlayableLevel(ALLEN_KEY_LEVEL)).toBe(VICTORY_LEVEL);
  });
});

describe('displayLevelNumber', () => {
  it('shows maze as level 1', () => {
    expect(displayLevelNumber(FIRST_PLAYABLE_LEVEL)).toBe(1);
  });

  it('shows allen key as level 2', () => {
    expect(displayLevelNumber(ALLEN_KEY_LEVEL)).toBe(2);
  });

  it('shows victory as level 3', () => {
    expect(displayLevelNumber(VICTORY_LEVEL)).toBe(3);
  });
});

describe('internalLevelFromDisplay', () => {
  it('maps display level 1 to maze', () => {
    expect(internalLevelFromDisplay(1)).toBe(FIRST_PLAYABLE_LEVEL);
  });

  it('maps display level 2 to allen key', () => {
    expect(internalLevelFromDisplay(2)).toBe(ALLEN_KEY_LEVEL);
  });

  it('maps display level 3 to victory', () => {
    expect(internalLevelFromDisplay(3)).toBe(VICTORY_LEVEL);
  });
});

describe('normalizeSession', () => {
  it('migrates saved crossword progress to maze', () => {
    const migrated = normalizeSession({
      seed: 'ABC123',
      role: 'p1',
      level: DISABLED_CROSSWORD_LEVEL,
      crosswordGridSolved: true,
    });
    expect(migrated.level).toBe(FIRST_PLAYABLE_LEVEL);
    expect(migrated.levelComplete).toBe(false);
    expect(migrated.crosswordGridSolved).toBe(false);
  });

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
  it('returns maze title for internal level 2', () => {
    expect(displayLevelTitle(FIRST_PLAYABLE_LEVEL)).toBe('Rum-Labyrint');
  });

  it('returns allen key title for internal level 4', () => {
    expect(displayLevelTitle(ALLEN_KEY_LEVEL)).toBe('Blues-schema');
  });
});
