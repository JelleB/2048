/**
 * Unit tests for playable level order (cafeteria level disabled).
 */
import { describe, expect, it } from 'vitest';
import {
  ALLEN_KEY_LEVEL,
  CROSSWORD_LEVEL,
  DISABLED_CAFETERIA_LEVEL,
  displayLevelNumber,
  displayLevelTitle,
  FIRST_PLAYABLE_LEVEL,
  internalLevelFromDisplay,
  MAZE_LEVEL,
  nextPlayableLevel,
  normalizeSession,
  normalizeSessionLevel,
  VICTORY_LEVEL,
} from '../src/ikkeja/logic/levelProgression.js';

describe('normalizeSessionLevel', () => {
  it('keeps crossword as the first playable level', () => {
    expect(normalizeSessionLevel(CROSSWORD_LEVEL)).toBe(CROSSWORD_LEVEL);
    expect(FIRST_PLAYABLE_LEVEL).toBe(CROSSWORD_LEVEL);
  });

  it('keeps maze level unchanged', () => {
    expect(normalizeSessionLevel(MAZE_LEVEL)).toBe(MAZE_LEVEL);
  });

  it('skips disabled cafeteria level', () => {
    expect(normalizeSessionLevel(DISABLED_CAFETERIA_LEVEL)).toBe(ALLEN_KEY_LEVEL);
  });
});

describe('nextPlayableLevel', () => {
  it('goes from crossword to maze', () => {
    expect(nextPlayableLevel(CROSSWORD_LEVEL)).toBe(MAZE_LEVEL);
  });

  it('goes from maze to allen key', () => {
    expect(nextPlayableLevel(MAZE_LEVEL)).toBe(ALLEN_KEY_LEVEL);
  });

  it('goes from allen key to victory', () => {
    expect(nextPlayableLevel(ALLEN_KEY_LEVEL)).toBe(VICTORY_LEVEL);
  });
});

describe('displayLevelNumber', () => {
  it('shows crossword as level 1', () => {
    expect(displayLevelNumber(CROSSWORD_LEVEL)).toBe(1);
  });

  it('shows maze as level 2', () => {
    expect(displayLevelNumber(MAZE_LEVEL)).toBe(2);
  });

  it('shows allen key as level 3', () => {
    expect(displayLevelNumber(ALLEN_KEY_LEVEL)).toBe(3);
  });

  it('shows victory as level 4', () => {
    expect(displayLevelNumber(VICTORY_LEVEL)).toBe(4);
  });
});

describe('internalLevelFromDisplay', () => {
  it('maps display level 1 to crossword', () => {
    expect(internalLevelFromDisplay(1)).toBe(CROSSWORD_LEVEL);
  });

  it('maps display level 2 to maze', () => {
    expect(internalLevelFromDisplay(2)).toBe(MAZE_LEVEL);
  });

  it('maps display level 3 to allen key', () => {
    expect(internalLevelFromDisplay(3)).toBe(ALLEN_KEY_LEVEL);
  });

  it('maps display level 4 to victory', () => {
    expect(internalLevelFromDisplay(4)).toBe(VICTORY_LEVEL);
  });
});

describe('normalizeSession', () => {
  it('preserves crossword progress', () => {
    const session = {
      seed: 'ABC123',
      role: 'p1',
      level: CROSSWORD_LEVEL,
      crosswordGridSolved: true,
    };
    expect(normalizeSession(session)).toEqual(session);
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
  it('returns crossword title for internal level 1', () => {
    expect(displayLevelTitle(CROSSWORD_LEVEL)).toBe('Lager-Korsord');
  });

  it('returns maze title for internal level 2', () => {
    expect(displayLevelTitle(MAZE_LEVEL)).toBe('Rum-Labyrint');
  });

  it('returns allen key title for internal level 4', () => {
    expect(displayLevelTitle(ALLEN_KEY_LEVEL)).toBe('Blues-schema');
  });
});
