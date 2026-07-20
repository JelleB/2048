/**
 * Unit tests for Level 1 Dutch crossword logic and warehouse lookup.
 */
import { describe, expect, it } from 'vitest';
import { DUTCH_WORD_CATALOG } from '../src/ikea/data/dutchCrosswords.js';
import {
  crosswordCompletionCode,
  isCrosswordGridComplete,
  selectCrosswordBySeed,
  selectCrosswordIndex,
  validateAllCrosswordLayouts,
} from '../src/ikea/logic/crosswordLayout.js';
import {
  buildWarehouseLookupCatalog,
  filterWarehouseLocations,
  resolveWarehouseFlashEntry,
  validateCrosswordCompletionCode,
  warehouseLocationCount,
} from '../src/ikea/logic/levels/crossword.js';
import { generateCrosswordFromSeed } from '../src/crossword_generator.js';

describe('selectCrosswordBySeed', () => {
  it('picks deterministically from session seed', () => {
    const a = selectCrosswordBySeed('GAME1234');
    const b = selectCrosswordBySeed('GAME1234');
    const c = selectCrosswordBySeed('OTHER999');
    expect(a).toBe(b);
    expect(a.words.length).toBe(6);
    expect(selectCrosswordIndex('GAME1234')).toBeGreaterThanOrEqual(0);
    expect(a.id).not.toBe(c.id);
  });

  it('uses two short, two medium, and two long answers', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    const counts = { short: 0, medium: 0, long: 0 };
    for (const word of puzzle.words) {
      const len = word.answer.length;
      if (len <= 5) counts.short += 1;
      else if (len <= 8) counts.medium += 1;
      else counts.long += 1;
    }
    expect(counts).toEqual({ short: 2, medium: 2, long: 2 });
  });

  it('assigns unique warehouse locations per word', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    const locations = puzzle.words.map((word) => word.location);
    expect(locations.every((loc) => /^\d{2}-[A-D]-\d{3}$/.test(loc))).toBe(true);
    expect(new Set(locations).size).toBe(locations.length);
  });
});

describe('generateCrosswordFromSeed', () => {
  it('builds a valid puzzle from the unified catalog', () => {
    const puzzle = generateCrosswordFromSeed('IKEA2026', DUTCH_WORD_CATALOG);
    expect(puzzle.rows).toBeGreaterThan(0);
    expect(puzzle.cols).toBeGreaterThan(0);
    expect(puzzle.words.length).toBe(6);
    expect(puzzle.words.every((word) => word.clue && word.answer && word.location)).toBe(true);
  });
});

describe('validateAllCrosswordLayouts', () => {
  it('validates generated puzzles for sample seeds', () => {
    expect(validateAllCrosswordLayouts()).toBe(true);
  });
});

describe('isCrosswordGridComplete', () => {
  it('accepts a fully correct grid fill', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    /** @type {Record<string, string>} */
    const fills = {};
    for (const word of puzzle.words) {
      for (let i = 0; i < word.answer.length; i += 1) {
        const row = word.direction === 'across' ? word.row : word.row + i;
        const col = word.direction === 'across' ? word.col + i : word.col;
        fills[`${row},${col}`] = word.answer[i];
      }
    }
    expect(isCrosswordGridComplete(puzzle, fills)).toBe(true);
  });
});

describe('crosswordCompletionCode', () => {
  it('is stable for seed and puzzle', async () => {
    const puzzle = selectCrosswordBySeed('TESTSEED');
    const a = await crosswordCompletionCode('TESTSEED', puzzle.id);
    const b = await crosswordCompletionCode('TESTSEED', puzzle.id);
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-Z0-9]{4}$/);
  });

  it('validates via validateCrosswordCompletionCode', async () => {
    const puzzle = selectCrosswordBySeed('ABCD');
    const code = await crosswordCompletionCode('ABCD', puzzle.id);
    expect(await validateCrosswordCompletionCode('ABCD', puzzle.id, code)).toBe(true);
    expect(await validateCrosswordCompletionCode('ABCD', puzzle.id, 'ZZZZ')).toBe(false);
  });
});

describe('filterWarehouseLocations', () => {
  it('includes decoys from the full word catalog', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    const catalog = buildWarehouseLookupCatalog('GAME1234', puzzle);
    expect(catalog.length).toBeGreaterThan(puzzle.words.length);
    expect(catalog.length).toBeGreaterThan(500);
  });

  it('returns nothing until the player searches', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    expect(filterWarehouseLocations('GAME1234', puzzle, '')).toEqual([]);
  });

  it('finds the active location among decoys', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    const target = puzzle.words[0].location;
    const partial = target.slice(0, 5);
    const hits = filterWarehouseLocations('GAME1234', puzzle, partial);
    expect(hits.some((entry) => entry.location === target)).toBe(true);
    expect(hits.length).toBeGreaterThan(1);
  });
});

describe('resolveWarehouseFlashEntry', () => {
  it('returns the puzzle answer for an exact location search', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    const target = puzzle.words[0];
    const entry = resolveWarehouseFlashEntry('GAME1234', puzzle, target.location);
    expect(entry?.location).toBe(target.location);
    expect(entry?.answer).toBe(target.answer);
  });

  it('returns null when multiple partial matches remain', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    const partial = puzzle.words[0].location.slice(0, 5);
    expect(filterWarehouseLocations('GAME1234', puzzle, partial).length).toBeGreaterThan(1);
    expect(resolveWarehouseFlashEntry('GAME1234', puzzle, partial)).toBeNull();
  });

  it('includes answers on every warehouse catalog row', () => {
    const puzzle = selectCrosswordBySeed('GAME1234');
    const catalog = buildWarehouseLookupCatalog('GAME1234', puzzle);
    expect(catalog.every((entry) => entry.answer && entry.answer.length === entry.length)).toBe(true);
  });
});
