/**
 * Level 1 crossword: warehouse location lookup with decoy locations.
 */
import { DUTCH_WORD_CATALOG } from '../../data/dutchWordCatalog.js';
import { formatWarehouseLocation, seededRng } from '../../../crossword_generator.js';
import {
  selectCrosswordBySeed,
  validateCrosswordCompletionCode,
} from '../crosswordLayout.js';

export { selectCrosswordBySeed, validateCrosswordCompletionCode };

/**
 * @typedef {import('../../data/dutchCrosswords.js').DutchCrosswordPuzzle} DutchCrosswordPuzzle
 * @typedef {import('../../data/dutchCrosswords.js').WarehouseClueEntry} WarehouseClueEntry
 */

/** @type {Map<string, WarehouseClueEntry[]>} */
const warehouseCatalogCache = new Map();

/**
 * Normalizes a warehouse location for search/compare.
 * @param {string} value
 * @returns {string}
 */
export function normalizeWarehouseLocation(value) {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * @param {WarehouseClueEntry[]} items
 * @param {() => number} rng
 */
function shuffleEntries(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Builds the full magazijn lookup: 6 active puzzle rows + decoys from the word catalog.
 * @param {string} sessionSeed
 * @param {DutchCrosswordPuzzle} puzzle
 * @returns {WarehouseClueEntry[]}
 */
export function buildWarehouseLookupCatalog(sessionSeed, puzzle) {
  const cacheKey = `${sessionSeed}:${puzzle.id}`;
  const cached = warehouseCatalogCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const activeAnswers = new Set(puzzle.words.map((word) => word.answer));
  const usedLocations = new Set(puzzle.words.map((word) => word.location));

  /** @type {WarehouseClueEntry[]} */
  const realEntries = puzzle.words.map((word) => ({
    location: word.location,
    clue: word.clue,
    length: word.answer.length,
    directionLabel: word.direction === 'across' ? 'Horizontaal' : 'Verticaal',
    number: word.number,
  }));

  const decoySource = DUTCH_WORD_CATALOG.filter((entry) => !activeAnswers.has(entry.word));
  const rng = seededRng(`${sessionSeed}:warehouse-decoys`);
  shuffleEntries(decoySource, rng);

  /** @type {WarehouseClueEntry[]} */
  const decoyEntries = [];
  for (let index = 0; index < decoySource.length; index += 1) {
    const entry = decoySource[index];
    let location = '';
    for (let salt = 0; salt < 64; salt += 1) {
      const candidate = formatWarehouseLocation(sessionSeed, index + 1000, salt);
      if (!usedLocations.has(candidate)) {
        location = candidate;
        break;
      }
    }
    if (!location) {
      continue;
    }
    usedLocations.add(location);
    decoyEntries.push({
      location,
      clue: entry.clue,
      length: entry.word.length,
      directionLabel: 'Magazijn',
      number: 0,
    });
  }

  const catalog = [...realEntries, ...decoyEntries].sort((a, b) =>
    a.location.localeCompare(b.location),
  );
  warehouseCatalogCache.set(cacheKey, catalog);
  return catalog;
}

/**
 * Lookup rows for the active puzzle only (Player 1 sidebar).
 * @param {DutchCrosswordPuzzle} puzzle
 * @returns {WarehouseClueEntry[]}
 */
export function getWarehouseClueEntries(puzzle) {
  return puzzle.words
    .map((word) => ({
      location: word.location,
      clue: word.clue,
      length: word.answer.length,
      directionLabel: word.direction === 'across' ? 'Horizontaal' : 'Verticaal',
      number: word.number,
    }))
    .sort((a, b) => a.location.localeCompare(b.location));
}

/**
 * Filters warehouse locations for Player 2 / Meike (includes decoys).
 * Empty query returns nothing — players must search.
 * @param {string} sessionSeed
 * @param {DutchCrosswordPuzzle} puzzle
 * @param {string} query
 * @returns {WarehouseClueEntry[]}
 */
export function filterWarehouseLocations(sessionSeed, puzzle, query) {
  const q = normalizeWarehouseLocation(query);
  if (!q) {
    return [];
  }

  return buildWarehouseLookupCatalog(sessionSeed, puzzle).filter(
    (entry) =>
      normalizeWarehouseLocation(entry.location).includes(q) ||
      entry.clue.toLowerCase().includes(q.toLowerCase()) ||
      (entry.number > 0 && String(entry.number).includes(q)),
  );
}

/**
 * @param {string} sessionSeed
 * @param {DutchCrosswordPuzzle} puzzle
 * @returns {number}
 */
export function warehouseLookupSize(sessionSeed, puzzle) {
  return buildWarehouseLookupCatalog(sessionSeed, puzzle).length;
}

/**
 * Active puzzle locations only (for copy — do not reveal to P2/P3).
 * @param {DutchCrosswordPuzzle} puzzle
 * @returns {number}
 */
export function warehouseLocationCount(puzzle) {
  return puzzle.words.length;
}
