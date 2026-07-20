/**
 * Builds dutch_top5000_clues.json for crossword tooling.
 *
 * Sources:
 * - HermitDave nl_50k: Dutch word frequencies from subtitle corpora
 * - OpenTaal basiswoorden-gekeurd: spell-check approved base words (Stichting OpenTaal)
 *
 * Words are ranked by frequency, validated against OpenTaal, and written with blank clues.
 */
import fs from 'fs';

/** @typedef {{ id: number, word: string, clue: string }} WordEntry */

const FREQ_URL =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/nl/nl_50k.txt';
const OPENTAAL_URL =
  'https://raw.githubusercontent.com/OpenTaal/opentaal-wordlist/master/elements/basiswoorden-gekeurd.txt';
const OUTPUT_FILE = 'dutch_top5000_clues.json';
const BATCH_DIR = 'dutch_word_batches';
const TARGET_COUNT = 5000;
const BATCH_SIZE = 500;
const BATCH_COUNT = TARGET_COUNT / BATCH_SIZE;

/**
 * Strips diacritics so crossword answers stay plain A–Z.
 * @param {string} word
 * @returns {string}
 */
function normalizeWord(word) {
  return word
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * @param {string} word - Lowercase, diacritic-stripped word.
 * @returns {boolean}
 */
function isCrosswordWord(word) {
  return /^[a-z]{3,12}$/.test(word);
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  return res.text();
}

/**
 * Loads OpenTaal approved words suitable for single-word crossword answers.
 * @returns {Promise<Set<string>>}
 */
async function loadApprovedWords() {
  const text = await fetchText(OPENTAAL_URL);
  const approved = new Set();

  for (const line of text.split('\n')) {
    const word = normalizeWord(line);
    if (isCrosswordWord(word)) {
      approved.add(word);
    }
  }

  return approved;
}

/**
 * Picks the most frequent Dutch words that appear in OpenTaal.
 * @param {string} freqText
 * @param {Set<string>} approved
 * @returns {string[]} Uppercase words, length <= TARGET_COUNT
 */
function selectTopWords(freqText, approved) {
  /** @type {string[]} */
  const words = [];

  for (const line of freqText.split('\n')) {
    if (words.length >= TARGET_COUNT) {
      break;
    }

    const raw = line.split(/\s+/)[0];
    const word = normalizeWord(raw);
    if (!isCrosswordWord(word) || !approved.has(word)) {
      continue;
    }

    words.push(word.toUpperCase());
  }

  return words;
}

/**
 * Writes LLM-sized batch files (500 words each) from the full entry list.
 * @param {WordEntry[]} entries
 * @returns {void}
 */
function writeBatchFiles(entries) {
  if (entries.length !== TARGET_COUNT) {
    throw new Error(`Expected ${TARGET_COUNT} entries, got ${entries.length}`);
  }

  fs.mkdirSync(BATCH_DIR, { recursive: true });

  for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
    const start = batch * BATCH_SIZE;
    const chunk = entries.slice(start, start + BATCH_SIZE);
    const fileName = `batch_${String(batch + 1).padStart(2, '0')}.json`;
    const filePath = `${BATCH_DIR}/${fileName}`;

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          batch: batch + 1,
          batchCount: BATCH_COUNT,
          rankFrom: start + 1,
          rankTo: start + BATCH_SIZE,
          words: chunk,
        },
        null,
        2,
      ),
    );
    console.log(`Saved ${chunk.length} entries to ${filePath}`);
  }
}

/**
 * Fetches Dutch word lists and writes JSON with blank clues.
 * @returns {Promise<void>}
 */
async function generateCluedList() {
  console.log('Fetching Dutch frequency list and OpenTaal approved words...');

  const [freqText, approved] = await Promise.all([fetchText(FREQ_URL), loadApprovedWords()]);

  const topWords = selectTopWords(freqText, approved);
  console.log(`Selected ${topWords.length} validated words (target ${TARGET_COUNT}).`);

  /** @type {WordEntry[]} */
  const entries = topWords.map((word, index) => ({
    id: index + 1,
    word,
    clue: '',
  }));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
  console.log(`Saved ${entries.length} entries to ${OUTPUT_FILE}`);

  writeBatchFiles(entries);
}

generateCluedList().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
