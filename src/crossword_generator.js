/**
 * Crossword grid generator and seed-based puzzle builder for Lost in IKKE-JA Level 1.
 */

/** @typedef {{ word: string, clue: string, id?: number }} WordCluePair */
/** @typedef {'across'|'down'} CrosswordDirection */
/**
 * @typedef {object} PlacedWord
 * @property {string} word
 * @property {string} clue
 * @property {number} row
 * @property {number} col
 * @property {CrosswordDirection} direction
 * @property {number} number
 */
/**
 * @typedef {object} DutchCrosswordPuzzle
 * @property {string} id
 * @property {string} title
 * @property {number} rows
 * @property {number} cols
 * @property {object[]} words
 */

export class CrosswordGenerator {
  /**
   * @param {number} [gridSize=13]
   */
  constructor(gridSize = 13) {
    this.size = gridSize;
  }

  /**
   * @param {WordCluePair[]} wordCluePairs
   * @param {number} [maxWords=6]
   * @returns {{ grid: (string|null)[][], placedWords: PlacedWord[] }}
   */
  generate(wordCluePairs, maxWords = 6) {
    const candidates = [...wordCluePairs]
      .map((item) => ({
        word: item.word.toUpperCase().replace(/[^A-Z]/g, ''),
        clue: item.clue,
      }))
      .filter((item) => item.word.length >= 3 && item.word.length <= this.size && item.clue)
      .sort((a, b) => b.word.length - a.word.length);

    /** @type {(string|null)[][]} */
    let grid = Array(this.size)
      .fill(null)
      .map(() => Array(this.size).fill(null));
    /** @type {PlacedWord[]} */
    const placedWords = [];

    if (candidates.length === 0) {
      return { grid, placedWords };
    }

    const first = candidates.shift();
    const startRow = Math.floor(this.size / 2);
    const startCol = Math.floor((this.size - first.word.length) / 2);

    this._placeWord(grid, first.word, startRow, startCol, 'across');
    placedWords.push({
      ...first,
      row: startRow,
      col: startCol,
      direction: 'across',
      number: 1,
    });

    for (const candidate of candidates) {
      if (placedWords.length >= maxWords) {
        break;
      }

      const placement = this._findBestPlacement(grid, candidate.word);
      if (placement) {
        this._placeWord(grid, candidate.word, placement.row, placement.col, placement.direction);
        placedWords.push({
          ...candidate,
          row: placement.row,
          col: placement.col,
          direction: placement.direction,
          number: placedWords.length + 1,
        });
      }
    }

    return { grid, placedWords };
  }

  /**
   * @param {(string|null)[][]} grid
   * @param {string} word
   * @param {number} row
   * @param {number} col
   * @param {CrosswordDirection} direction
   */
  _placeWord(grid, word, row, col, direction) {
    for (let i = 0; i < word.length; i += 1) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      grid[r][c] = word[i];
    }
  }

  /**
   * @param {(string|null)[][]} grid
   * @param {string} word
   * @returns {{ row: number, col: number, direction: CrosswordDirection }|null}
   */
  _findBestPlacement(grid, word) {
    /** @type {{ row: number, col: number, direction: CrosswordDirection }[]} */
    const validPlacements = [];

    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        const charOnGrid = grid[r][c];
        if (!charOnGrid) {
          continue;
        }

        for (let i = 0; i < word.length; i += 1) {
          if (word[i] !== charOnGrid) {
            continue;
          }

          const startRowVert = r - i;
          if (this._canPlace(grid, word, startRowVert, c, 'down')) {
            validPlacements.push({ row: startRowVert, col: c, direction: 'down' });
          }

          const startColHoriz = c - i;
          if (this._canPlace(grid, word, r, startColHoriz, 'across')) {
            validPlacements.push({ row: r, col: startColHoriz, direction: 'across' });
          }
        }
      }
    }

    return validPlacements.length > 0 ? validPlacements[0] : null;
  }

  /**
   * @param {(string|null)[][]} grid
   * @param {string} word
   * @param {number} row
   * @param {number} col
   * @param {CrosswordDirection} direction
   * @returns {boolean}
   */
  _canPlace(grid, word, row, col, direction) {
    if (row < 0 || col < 0) {
      return false;
    }
    if (direction === 'across' && col + word.length > this.size) {
      return false;
    }
    if (direction === 'down' && row + word.length > this.size) {
      return false;
    }

    for (let i = 0; i < word.length; i += 1) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      const currentCell = grid[r][c];

      if (currentCell && currentCell !== word[i]) {
        return false;
      }

      if (!currentCell) {
        if (direction === 'across') {
          if (r > 0 && grid[r - 1][c]) {
            return false;
          }
          if (r < this.size - 1 && grid[r + 1][c]) {
            return false;
          }
        } else if (c > 0 && grid[r][c - 1]) {
          return false;
        } else if (c < this.size - 1 && grid[r][c + 1]) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Deterministic PRNG from a string seed (xorshift32).
 * @param {string} seed
 * @returns {() => number}
 */
export function seededRng(seed) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  if (state === 0) {
    state = 1;
  }

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * @param {string} seed
 * @returns {string}
 */
export function hashSeed(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

/**
 * Length buckets for balanced crosswords: 2 short, 2 medium, 2 long.
 */
export const WORD_LENGTH_BUCKETS = {
  short: { min: 3, max: 5, count: 2, label: 'kort' },
  medium: { min: 6, max: 8, count: 2, label: 'medium' },
  long: { min: 9, max: 13, count: 2, label: 'lang' },
};

/**
 * @param {number} length
 * @returns {'short'|'medium'|'long'}
 */
export function wordLengthBucket(length) {
  if (length <= WORD_LENGTH_BUCKETS.short.max) {
    return 'short';
  }
  if (length <= WORD_LENGTH_BUCKETS.medium.max) {
    return 'medium';
  }
  return 'long';
}

/**
 * @param {WordCluePair[]} items
 * @param {() => number} rng
 */
function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Picks 2 short, 2 medium, and 2 long words from the catalog.
 * @param {WordCluePair[]} catalog
 * @param {() => number} rng
 * @param {number} [attempt=0] - Shifts which words are picked within each bucket.
 * @returns {WordCluePair[]}
 */
export function selectBalancedCandidates(catalog, rng, attempt = 0) {
  /** @type {Record<'short'|'medium'|'long', WordCluePair[]>} */
  const buckets = { short: [], medium: [], long: [] };

  for (const entry of catalog) {
    const word = entry.word.toUpperCase().replace(/[^A-Z]/g, '');
    if (word.length < 3 || word.length > 13 || !entry.clue?.trim()) {
      continue;
    }
    buckets[wordLengthBucket(word.length)].push({
      word,
      clue: entry.clue,
      id: entry.id,
    });
  }

  for (const bucket of Object.values(buckets)) {
    shuffleInPlace(bucket, rng);
  }

  /** @type {WordCluePair[]} */
  const selected = [];
  const used = new Set();

  for (const key of /** @type {const} */ (['short', 'medium', 'long'])) {
    const { count } = WORD_LENGTH_BUCKETS[key];
    const pool = buckets[key];
    let picked = 0;
    for (let i = 0; i < pool.length && picked < count; i += 1) {
      const entry = pool[(i + attempt) % pool.length];
      if (used.has(entry.word)) {
        continue;
      }
      used.add(entry.word);
      selected.push(entry);
      picked += 1;
    }
  }

  if (selected.length < 6) {
    const fallback = catalog
      .map((entry) => ({
        word: entry.word.toUpperCase().replace(/[^A-Z]/g, ''),
        clue: entry.clue,
        id: entry.id,
      }))
      .filter((entry) => entry.word.length >= 3 && entry.word.length <= 13 && entry.clue?.trim())
      .filter((entry) => !used.has(entry.word));
    shuffleInPlace(fallback, rng);
    while (selected.length < 6 && fallback.length > 0) {
      selected.push(fallback.pop());
    }
  }

  return selected.sort((a, b) => b.word.length - a.word.length);
}

/**
 * @param {PlacedWord[]} placedWords
 * @returns {boolean}
 */
export function hasBalancedLengthMix(placedWords) {
  const counts = { short: 0, medium: 0, long: 0 };
  for (const word of placedWords) {
    counts[wordLengthBucket(word.word.length)] += 1;
  }
  return (
    counts.short >= WORD_LENGTH_BUCKETS.short.count &&
    counts.medium >= WORD_LENGTH_BUCKETS.medium.count &&
    counts.long >= WORD_LENGTH_BUCKETS.long.count
  );
}

/**
 * @param {WordCluePair[]} catalog
 * @param {() => number} rng
 * @param {number} count
 * @returns {WordCluePair[]}
 * @deprecated Use selectBalancedCandidates for Level 1 puzzles.
 */
export function selectCatalogCandidates(catalog, rng, count) {
  const valid = catalog.filter(
    (entry) => entry.word.length >= 3 && entry.word.length <= 13 && entry.clue?.trim(),
  );
  const shuffled = [...valid];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Crops the working grid to the smallest bounding box.
 * @param {(string|null)[][]} grid
 * @param {PlacedWord[]} placedWords
 */
export function trimCrosswordGrid(grid, placedWords) {
  let minRow = grid.length;
  let minCol = grid[0]?.length ?? 0;
  let maxRow = -1;
  let maxCol = -1;

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      if (!grid[row][col]) {
        continue;
      }
      minRow = Math.min(minRow, row);
      minCol = Math.min(minCol, col);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }
  }

  if (maxRow < minRow || maxCol < minCol) {
    return { rows: 0, cols: 0, placedWords: [] };
  }

  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;
  const adjusted = placedWords.map((word) => ({
    ...word,
    row: word.row - minRow,
    col: word.col - minCol,
  }));

  return { rows, cols, placedWords: adjusted };
}

/**
 * @param {string} seed
 * @param {number} wordIndex
 * @param {number} [salt=0]
 * @returns {string}
 */
export function formatWarehouseLocation(seed, wordIndex, salt = 0) {
  const rng = seededRng(`${seed}:loc:${wordIndex}:${salt}`);
  const aisle = String(Math.floor(rng() * 36) + 1).padStart(2, '0');
  const bay = ['A', 'B', 'C', 'D'][Math.floor(rng() * 4)];
  const slot = String(Math.floor(rng() * 180) + 1).padStart(3, '0');
  return `${aisle}-${bay}-${slot}`;
}

/**
 * Assigns unique IKKE-JA-style warehouse locations to placed words.
 * @param {string} seed
 * @param {PlacedWord[]} placedWords
 * @returns {string[]}
 */
export function assignWarehouseLocations(seed, placedWords) {
  const used = new Set();
  return placedWords.map((_word, index) => {
    for (let salt = 0; salt < 64; salt += 1) {
      const location = formatWarehouseLocation(seed, index, salt);
      if (!used.has(location)) {
        used.add(location);
        return location;
      }
    }
    throw new Error(`Could not assign unique warehouse location for word ${index}`);
  });
}

/**
 * @param {string} seed
 * @param {PlacedWord[]} placedWords
 * @param {number} rows
 * @param {number} cols
 * @returns {DutchCrosswordPuzzle}
 */
export function toCrosswordPuzzle(seed, placedWords, rows, cols) {
  const puzzleId = `nl-${hashSeed(seed)}`;
  const locations = assignWarehouseLocations(seed, placedWords);
  return {
    id: puzzleId,
    title: 'Korsord',
    rows,
    cols,
    words: placedWords.map((word, index) => ({
      id: `${puzzleId}-w${index + 1}`,
      number: word.number,
      direction: word.direction,
      row: word.row,
      col: word.col,
      answer: word.word,
      clue: word.clue,
      location: locations[index],
    })),
  };
}

/**
 * Builds a crossword puzzle deterministically from a session seed and word catalog.
 * @param {string} seed
 * @param {WordCluePair[]} catalog
 * @param {{ gridSize?: number, maxWords?: number, minWords?: number }} [options]
 * @returns {DutchCrosswordPuzzle}
 */
export function generateCrosswordFromSeed(seed, catalog, options = {}) {
  const gridSize = options.gridSize ?? 13;
  const maxWords = options.maxWords ?? 6;
  const minWords = options.minWords ?? 6;
  const requireBalancedMix = options.requireBalancedMix ?? true;
  const generator = new CrosswordGenerator(gridSize);

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const rng = seededRng(`${seed}:attempt:${attempt}`);
    const candidates = selectBalancedCandidates(catalog, rng, attempt);
    const { grid, placedWords } = generator.generate(candidates, maxWords);
    if (placedWords.length < minWords) {
      continue;
    }
    if (requireBalancedMix && !hasBalancedLengthMix(placedWords)) {
      continue;
    }

    const trimmed = trimCrosswordGrid(grid, placedWords);
    if (trimmed.rows > 0 && trimmed.cols > 0) {
      return toCrosswordPuzzle(seed, trimmed.placedWords, trimmed.rows, trimmed.cols);
    }
  }

  throw new Error(`Could not generate crossword for seed "${seed}"`);
}
