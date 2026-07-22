/**
 * Unit tests for crossword_generator.js
 */
import { describe, expect, it } from 'vitest';
import { DUTCH_WORD_CATALOG } from '../src/ikkeja/data/dutchCrosswords.js';
import {
  CrosswordGenerator,
  generateCrosswordFromSeed,
  hasBalancedLengthMix,
  seededRng,
  trimCrosswordGrid,
  wordLengthBucket,
} from '../src/crossword_generator.js';

const SAMPLE_CATALOG = [
  { word: 'BROOD', clue: 'Gebakken in de bakkerij' },
  { word: 'BOOM', clue: 'Groen met takken' },
  { word: 'STOEL', clue: 'Zitmeubel' },
  { word: 'LAMP', clue: 'Geeft licht' },
  { word: 'DEUR', clue: 'Doorgang in een muur' },
  { word: 'KEUKEN', clue: 'Ruimte om te koken' },
  { word: 'SPIEGEL', clue: 'Glas aan de muur' },
  { word: 'KAST', clue: 'Kast met deuren' },
  { word: 'WOONKAMER', clue: 'Grote kamer met bank' },
  { word: 'BOEKENKAST', clue: 'Kast voor boeken' },
  { word: 'FLATPACK', clue: 'Platte verpakking' },
  { word: 'INBUSSLEUTEL', clue: 'Zeskant gereedschap' },
];

describe('CrosswordGenerator', () => {
  it('places intersecting words on a grid', () => {
    const generator = new CrosswordGenerator(13);
    const { placedWords } = generator.generate(SAMPLE_CATALOG, 6);
    expect(placedWords.length).toBeGreaterThanOrEqual(3);
  });
});

describe('seededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = seededRng('TEST123');
    const b = seededRng('TEST123');
    expect(a()).toBe(b());
  });
});

describe('trimCrosswordGrid', () => {
  it('crops empty margins from the working grid', () => {
    /** @type {(string|null)[][]} */
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
    grid[2][1] = 'A';
    grid[2][2] = 'B';
    const trimmed = trimCrosswordGrid(grid, [
      { word: 'AB', clue: 'Test', row: 2, col: 1, direction: 'across', number: 1 },
    ]);
    expect(trimmed.rows).toBe(1);
    expect(trimmed.cols).toBe(2);
    expect(trimmed.placedWords[0].row).toBe(0);
    expect(trimmed.placedWords[0].col).toBe(0);
  });
});

describe('generateCrosswordFromSeed', () => {
  it('returns six words with a balanced length mix', () => {
    const puzzle = generateCrosswordFromSeed('SESSION1', DUTCH_WORD_CATALOG);
    expect(puzzle.words.length).toBe(6);
    expect(puzzle.id).toMatch(/^nl-/);
    expect(puzzle.words.every((word) => word.location)).toBe(true);

    const counts = { short: 0, medium: 0, long: 0 };
    for (const word of puzzle.words) {
      counts[wordLengthBucket(word.answer.length)] += 1;
    }
    expect(counts).toEqual({ short: 2, medium: 2, long: 2 });
    expect(hasBalancedLengthMix(puzzle.words.map((w) => ({ word: w.answer, clue: w.clue })))).toBe(true);
  });
});
