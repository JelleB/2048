/**
 * Dutch crossword selection, grid building, and completion codes.
 */
import { DUTCH_WORD_CATALOG } from '../data/dutchWordCatalog.js';
import { generateCrosswordFromSeed, hashSeed } from '../../crossword_generator.js';
import { syncCodeForSeed } from './syncEngine.js';

/** @typedef {import('../data/dutchCrosswords.js').DutchCrosswordPuzzle} DutchCrosswordPuzzle */
/** @typedef {'across'|'down'} CrosswordDirection */

/**
 * @typedef {object} CrosswordCell
 * @property {string} letter
 * @property {number} [number]
 * @property {string[]} wordIds
 */

/** @type {Map<string, DutchCrosswordPuzzle>} */
const puzzleCache = new Map();

/**
 * Deterministic puzzle index from session seed (legacy helper for tests).
 * @param {string} seed
 * @returns {number}
 */
export function selectCrosswordIndex(seed) {
  return Number.parseInt(hashSeed(seed), 36) % 1000;
}

/**
 * Generates the active Dutch crossword for a game session.
 * @param {string} seed
 * @returns {DutchCrosswordPuzzle}
 */
export function selectCrosswordBySeed(seed) {
  const normalized = (seed || '').trim().toUpperCase();
  if (!normalized) {
    throw new Error('Session seed is required');
  }

  const cached = puzzleCache.get(normalized);
  if (cached) {
    return cached;
  }

  const puzzle = generateCrosswordFromSeed(normalized, DUTCH_WORD_CATALOG);
  puzzleCache.set(normalized, puzzle);
  return puzzle;
}

/**
 * Builds a letter grid for any bundled puzzle.
 * @param {DutchCrosswordPuzzle} puzzle
 * @returns {(CrosswordCell|null)[][]}
 */
export function buildCrosswordGrid(puzzle) {
  const { rows, cols, words } = puzzle;
  /** @type {(CrosswordCell|null)[][]} */
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

  for (const word of words) {
    for (let i = 0; i < word.answer.length; i += 1) {
      const row = word.direction === 'across' ? word.row : word.row + i;
      const col = word.direction === 'across' ? word.col + i : word.col;
      const letter = word.answer[i];
      const existing = grid[row][col];

      if (existing && existing.letter !== letter) {
        throw new Error(`Crossword mismatch at ${row},${col} in ${puzzle.id}`);
      }

      if (!existing) {
        grid[row][col] = {
          letter,
          wordIds: [word.id],
          number: i === 0 ? word.number : undefined,
        };
      } else {
        existing.wordIds.push(word.id);
        if (i === 0) {
          existing.number = existing.number
            ? Math.min(existing.number, word.number)
            : word.number;
        }
      }
    }
  }

  return grid;
}

/**
 * Dutch clue list for Player 1 (numbers only — no clue text).
 * @param {DutchCrosswordPuzzle} puzzle
 */
export function getCrosswordClueNumbers(puzzle) {
  return puzzle.words.map((word) => ({
    number: word.number,
    direction: word.direction,
    length: word.answer.length,
    directionLabel: word.direction === 'across' ? 'Horizontaal' : 'Verticaal',
  }));
}

/**
 * Normalizes a typed crossword letter.
 * @param {string} value
 * @returns {string}
 */
export function normalizeCrosswordLetter(value) {
  return (value || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Checks whether Player 1 filled the entire grid correctly.
 * @param {DutchCrosswordPuzzle} puzzle
 * @param {Record<string, string>} fills - Keys `"row,col"`.
 * @returns {boolean}
 */
export function isCrosswordGridComplete(puzzle, fills) {
  const grid = buildCrosswordGrid(puzzle);
  for (let row = 0; row < puzzle.rows; row += 1) {
    for (let col = 0; col < puzzle.cols; col += 1) {
      const cell = grid[row][col];
      if (!cell) continue;
      const key = `${row},${col}`;
      if (normalizeCrosswordLetter(fills[key]) !== cell.letter) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Counts filled cells that match the solution (for progress feedback).
 * @param {DutchCrosswordPuzzle} puzzle
 * @param {Record<string, string>} fills
 * @returns {{ filled: number, total: number }}
 */
export function crosswordGridProgress(puzzle, fills) {
  const grid = buildCrosswordGrid(puzzle);
  let total = 0;
  let filled = 0;
  for (let row = 0; row < puzzle.rows; row += 1) {
    for (let col = 0; col < puzzle.cols; col += 1) {
      const cell = grid[row][col];
      if (!cell) continue;
      total += 1;
      const key = `${row},${col}`;
      if (normalizeCrosswordLetter(fills[key]) === cell.letter) {
        filled += 1;
      }
    }
  }
  return { filled, total };
}

/**
 * Fixed 4CODE shown when Player 1 completes the grid (derived from seed + puzzle).
 * @param {string} sessionSeed
 * @param {string} puzzleId
 * @returns {Promise<string>}
 */
export async function crosswordCompletionCode(sessionSeed, puzzleId) {
  return syncCodeForSeed(`${sessionSeed}:${puzzleId}:L1complete`, 0);
}

/**
 * Validates the Level 1 completion code from Player 2 / Specialist.
 * @param {string} sessionSeed
 * @param {string} puzzleId
 * @param {string} input
 * @returns {Promise<boolean>}
 */
export async function validateCrosswordCompletionCode(sessionSeed, puzzleId, input) {
  const expected = await crosswordCompletionCode(sessionSeed, puzzleId);
  return input.trim().toUpperCase() === expected;
}

/**
 * Validates generated crossword layouts for a sample of seeds.
 * @returns {boolean}
 */
export function validateAllCrosswordLayouts() {
  const sampleSeeds = ['GAME1234', 'TESTSEED', 'ABCD', 'ZYXW9876', 'IKEA2026'];
  return sampleSeeds.every((seed) => {
    try {
      buildCrosswordGrid(selectCrosswordBySeed(seed));
      return true;
    } catch {
      return false;
    }
  });
}
