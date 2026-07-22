/**
 * Merges wordlists/*. into src/ikkeja/data/dutchWordCatalog.js for crossword generation.
 */
import fs from 'fs';
import { pathToFileURL } from 'url';

const OUTPUT = 'src/ikkeja/data/dutchWordCatalog.js';
const WORDLIST_DIR = 'wordlists';

/** @typedef {{ id?: number, word: string, clue: string }} RawEntry */

/**
 * @param {string} word
 * @returns {boolean}
 */
function isPlaceholderWord(word) {
  return /^DECORATIE\d+$/.test(word) || /^PRODUCT\d+$/.test(word);
}

/**
 * @param {RawEntry} entry
 * @returns {RawEntry|null}
 */
function normalizeEntry(entry) {
  const word = String(entry.word || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const clue = String(entry.clue || '').trim();

  if (word.length < 3 || word.length > 13 || !clue || isPlaceholderWord(word)) {
    return null;
  }

  return {
    id: typeof entry.id === 'number' ? entry.id : undefined,
    word,
    clue,
  };
}

/**
 * @param {RawEntry[]} entries
 * @param {Map<string, RawEntry>} merged
 */
function mergeEntries(entries, merged) {
  for (const raw of entries) {
    const entry = normalizeEntry(raw);
    if (!entry) {
      continue;
    }
    const existing = merged.get(entry.word);
    if (!existing || (entry.id && !existing.id)) {
      merged.set(entry.word, entry);
    }
  }
}

/**
 * @returns {Promise<RawEntry[]>}
 */
async function loadWordlistFiles() {
  /** @type {Map<string, RawEntry>} */
  const merged = new Map();

  const ikkejaWordlist = await import(pathToFileURL(`${WORDLIST_DIR}/gemini-code-1784549441548.js`));
  mergeEntries(ikkejaWordlist.DUTCH_IKKEJA_WORDLIST, merged);

  const general = await import(pathToFileURL(`${WORDLIST_DIR}/gemini-code-1784549551419.js`));
  mergeEntries(general.GENERAL_DUTCH_WORDLIST, merged);

  for (const file of [
    'gemini-code-1784559141702.json',
    'gemini-code-1784559199310.json',
    'gemini-code-1784559016688.json',
  ]) {
    const json = JSON.parse(fs.readFileSync(`${WORDLIST_DIR}/${file}`, 'utf8'));
    mergeEntries(json.words || json, merged);
  }

  return [...merged.values()].sort((a, b) => {
    const idA = a.id ?? Number.MAX_SAFE_INTEGER;
    const idB = b.id ?? Number.MAX_SAFE_INTEGER;
    if (idA !== idB) {
      return idA - idB;
    }
    return a.word.localeCompare(b.word);
  });
}

/**
 * @param {RawEntry[]} catalog
 */
function writeCatalogModule(catalog) {
  const numbered = catalog.map((entry, index) => ({
    id: entry.id ?? index + 1,
    word: entry.word,
    clue: entry.clue,
  }));

  const body = `/**
 * Unified Dutch crossword word catalog (merged from wordlists/).
 * Regenerate with: node src/build_word_catalog.js
 */

/** @typedef {{ id: number, word: string, clue: string }} DutchWordCatalogEntry */

/** @type {DutchWordCatalogEntry[]} */
export const DUTCH_WORD_CATALOG = ${JSON.stringify(numbered, null, 2)};
`;

  fs.writeFileSync(OUTPUT, body);
  console.log(`Wrote ${numbered.length} entries to ${OUTPUT}`);
}

const catalog = await loadWordlistFiles();
writeCatalogModule(catalog);
