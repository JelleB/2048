/**
 * Fills blank clues in dutch_top5000_clues.json using Kaikki (Wiktionary) glosses
 * translated to Dutch crossword-style hints.
 */
import fs from 'fs';
import readline from 'readline';
import { createReadStream } from 'fs';

/** @typedef {{ id: number, word: string, clue: string }} WordEntry */

const INPUT_FILE = 'dutch_top5000_clues.json';
const BATCH_DIR = 'dutch_word_batches';
const CACHE_DIR = '.cache';
const KAIKKI_URL = 'https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl';
const KAIKKI_CACHE = `${CACHE_DIR}/kaikki-dutch.jsonl`;
const TRANSLATION_CACHE = `${CACHE_DIR}/clue-translations.json`;
const BATCH_SIZE = 500;
const BATCH_COUNT = 10;
const TARGET_COUNT = 5000;
const TRANSLATE_DELAY_MS = 220;

/** High-frequency function words where machine translation is poor. */
const MANUAL_CLUES = {
  HET: 'Neutrum lidwoord',
  DE: 'Bepaald lidwoord (de)',
  EEN: 'Onbepaald lidwoord',
  DAT: 'Aanwijzend voornaamwoord',
  DIE: 'Aanwijzend voornaamwoord (meervoud/bijwoord)',
  NIET: 'Woord van ontkenning',
  VAN: 'Voorzetsel van herkomst of bezit',
  MET: 'Voorzetsel: samen met',
  VOOR: 'Voorzetsel: vóór of ten gunste van',
  IN: 'Voorzetsel: binnen',
  OP: 'Voorzetsel: bovenop',
  TE: 'Deel van te + infinitief',
  ER: 'Vorm in er-zinnen',
  MAAR: 'Tegenhanger: echter',
  OOK: 'Bovendien, eveneens',
  ZIJN: 'Koppelwerkwoord: bestaan',
  HEB: 'Vorm van hebben (ik heb)',
  HEBBEN: 'Bezitten',
  WORDEN: 'Koppelwerkwoord: worden',
  KUNNEN: 'Modal werkwoord: in staat zijn',
  MOETEN: 'Modal werkwoord: verplicht zijn',
  WILLEN: 'Modal werkwoord: willen',
  ZULLEN: 'Modal werkwoord: toekomst',
  MAG: 'Vorm van mogen',
  GAAN: 'Zich verplaatsen',
  KOMEN: 'Aankomen',
  DOEN: 'Verrichten',
  ZEGGEN: 'Iets uitspreken',
  ZIEN: 'Met de ogen waarnemen',
  WETEN: 'Kennis hebben van',
  DENKEN: 'In gedachten zijn',
  GEVEN: 'Iets aan iemand overhandigen',
  VINDEN: 'Ontdekken of menen',
  MOGEN: 'Toestemming hebben',
  IK: 'Eerste persoon enkelvoud',
  JE: 'Tweede persoon enkelvoud (informeel)',
  JIJ: 'Tweede persoon enkelvoud (benadrukt)',
  HIJ: 'Derde persoon mannelijk enkelvoud',
  ZIJ: 'Derde persoon vrouwelijk/meervoud',
  WE: 'Eerste persoon meervoud',
  JULLIE: 'Tweede persoon meervoud',
  ME: 'Mij (bez./obj.)',
  MIJ: 'Mij (benadrukt)',
  JOU: 'Jou (bez./obj.)',
  HEM: 'Hem',
  HAAR: 'Haar',
  ONS: 'Ons',
  HUN: 'Hun',
  MIJN: 'Bezittelijk voornaamwoord: van mij',
  JOUW: 'Bezittelijk voornaamwoord: van jou',
  WIJ: 'Eerste persoon meervoud (benadrukt)',
  WAT: 'Vraagwoord: welk ding',
  WAAR: 'Vraagwoord: op welke plaats',
  WANNEER: 'Vraagwoord: op welk moment',
  HOE: 'Vraagwoord: op welke manier',
  WAAROM: 'Vraagwoord: om welke reden',
  ALS: 'Bijwoord/voorwaarde: wanneer',
  DAN: 'Op dat moment',
  TOEN: 'Destijds',
  NU: 'Op dit moment',
  HIER: 'Op deze plaats',
  DAAR: 'Op die plaats',
  AL: 'Reeds',
  NOG: 'Nog steeds',
  ALLEEN: 'Enkel, alleenstaand',
  EENS: 'Een keer',
  STEEDS: 'Voortdurend',
  NOOIT: 'In geen enkel geval',
  ALTIJD: 'Onophoudelijk',
  SOMS: 'Af en toe',
  BIJNA: 'Vrijwel',
  HEEL: 'Zeer',
  MEER: 'Groter aantal',
  MINDER: 'Kleiner aantal',
  VEEl: 'Groot aantal',
  WEINIG: 'Klein aantal',
  ALLE: 'Het geheel van',
  ELKE: 'Ieder afzonderlijk',
  ANDERE: 'Niet dezelfde',
  ZELFDE: 'Identiek',
  GOED: 'Van goede kwaliteit',
  SLECHT: 'Van lage kwaliteit',
  GROOT: 'Van grote omvang',
  KLEIN: 'Van geringe omvang',
  NIEUW: 'Recent',
  OUD: 'Niet nieuw',
  LANG: 'Grote afstand of duur',
  KORT: 'Geringe afstand of duur',
};

/** @type {Record<string, number>} */
const POS_PRIORITY = {
  noun: 6,
  verb: 5,
  adj: 4,
  adv: 3,
  pron: 3,
  prep: 3,
  conj: 2,
  det: 2,
  article: 2,
  intj: 2,
  num: 2,
  name: 0,
  character: 0,
  symbol: 0,
  punctuation: 0,
  prefix: 0,
  suffix: 0,
  phrase: 1,
};

/**
 * @param {string} word
 * @returns {string}
 */
function normalizeWord(word) {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/**
 * @param {string} text
 * @returns {string}
 */
function stripHtml(text) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {unknown} entry
 * @returns {string|null}
 */
function pickGloss(entry) {
  const senses = entry?.senses;
  if (!Array.isArray(senses) || senses.length === 0) {
    return null;
  }

  for (const sense of senses) {
    const glosses = sense.glosses;
    if (!Array.isArray(glosses) || glosses.length === 0) {
      continue;
    }
    const gloss = stripHtml(glosses[0]);
    if (!gloss || /inflection of/i.test(gloss) || /form-of-definition/i.test(gloss)) {
      continue;
    }
    if (/^plural of /i.test(gloss) || /^past tense of /i.test(gloss)) {
      continue;
    }
    return gloss;
  }

  return null;
}

/**
 * @param {unknown} entry
 * @returns {number}
 */
function scoreEntry(entry) {
  const pos = String(entry?.pos || '').toLowerCase();
  let score = POS_PRIORITY[pos] ?? 1;
  const gloss = pickGloss(entry);
  if (!gloss) {
    return -1;
  }
  if (/inflection|participle|plural of|comparative|superlative/i.test(gloss)) {
    score -= 3;
  }
  if (Array.isArray(entry?.tags) && entry.tags.includes('form-of')) {
    score -= 4;
  }
  return score;
}

/**
 * @param {string} path
 * @returns {Promise<void>}
 */
async function ensureKaikkiCache(path) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (fs.existsSync(path)) {
    return;
  }

  console.log(`Downloading Kaikki Dutch dictionary to ${path}...`);
  const res = await fetch(KAIKKI_URL);
  if (!res.ok) {
    throw new Error(`Kaikki download failed: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path, buffer);
  console.log(`Cached ${(buffer.length / 1024 / 1024).toFixed(1)} MB.`);
}

/**
 * @param {Set<string>} targetWords
 * @returns {Promise<Map<string, object>>}
 */
async function buildKaikkiIndex(targetWords) {
  await ensureKaikkiCache(KAIKKI_CACHE);

  /** @type {Map<string, { entry: object, score: number }>} */
  const index = new Map();
  const rl = readline.createInterface({
    input: createReadStream(KAIKKI_CACHE),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry?.lang_code !== 'nl') {
      continue;
    }

    const word = normalizeWord(String(entry.word || ''));
    if (!targetWords.has(word)) {
      continue;
    }

    const score = scoreEntry(entry);
    if (score < 0) {
      continue;
    }

    const existing = index.get(word);
    if (!existing || score > existing.score) {
      index.set(word, { entry, score });
    }
  }

  return new Map([...index.entries()].map(([word, { entry }]) => [word, entry]));
}

/**
 * @returns {Record<string, string>}
 */
function loadTranslationCache() {
  if (!fs.existsSync(TRANSLATION_CACHE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(TRANSLATION_CACHE, 'utf8'));
}

/**
 * @param {Record<string, string>} cache
 */
function saveTranslationCache(cache) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(TRANSLATION_CACHE, JSON.stringify(cache, null, 2));
}

/**
 * @param {string} text
 * @param {Record<string, string>} cache
 * @returns {Promise<string>}
 */
async function translateToDutch(text, cache) {
  const key = text.toLowerCase();
  if (cache[key]) {
    return cache[key];
  }

  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text.slice(0, 500));
  url.searchParams.set('langpair', 'en|nl');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translation failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const translated = String(data?.responseData?.translatedText || text).trim();
  cache[key] = translated;
  await new Promise((resolve) => setTimeout(resolve, TRANSLATE_DELAY_MS));
  return translated;
}

/**
 * @param {string} text
 * @returns {string}
 */
function formatClue(text) {
  let clue = text.replace(/\s+/g, ' ').trim();
  if (!clue) {
    return '';
  }

  clue = clue.charAt(0).toUpperCase() + clue.slice(1);
  if (clue.length > 120) {
    clue = `${clue.slice(0, 117).replace(/\s+\S*$/, '')}…`;
  }
  return clue.replace(/[.;:]+$/g, '');
}

/**
 * @param {string} word
 * @param {object|undefined} kaikkiEntry
 * @param {Record<string, string>} translationCache
 * @returns {Promise<string>}
 */
async function buildClue(word, kaikkiEntry, translationCache) {
  const manualKey = word.toUpperCase();
  if (MANUAL_CLUES[manualKey]) {
    return MANUAL_CLUES[manualKey];
  }

  const gloss = pickGloss(kaikkiEntry);
  if (!gloss) {
    return '';
  }

  const dutch = await translateToDutch(gloss, translationCache);
  return formatClue(dutch);
}

/**
 * @param {WordEntry[]} entries
 */
function writeBatchFiles(entries) {
  fs.mkdirSync(BATCH_DIR, { recursive: true });

  for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
    const start = batch * BATCH_SIZE;
    const chunk = entries.slice(start, start + BATCH_SIZE);
    const filePath = `${BATCH_DIR}/batch_${String(batch + 1).padStart(2, '0')}.json`;

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
  }
}

/**
 * @returns {Promise<void>}
 */
async function fillClues() {
  /** @type {WordEntry[]} */
  const entries = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  if (entries.length !== TARGET_COUNT) {
    throw new Error(`Expected ${TARGET_COUNT} entries in ${INPUT_FILE}`);
  }

  const targetWords = new Set(entries.map((entry) => normalizeWord(entry.word)));
  console.log('Building Kaikki index for target words...');
  const kaikkiIndex = await buildKaikkiIndex(targetWords);
  console.log(`Matched ${kaikkiIndex.size}/${TARGET_COUNT} words in Kaikki.`);

  const translationCache = loadTranslationCache();
  let filled = 0;
  let missing = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.clue?.trim()) {
      filled += 1;
      continue;
    }

    const wordKey = normalizeWord(entry.word);
    const kaikkiEntry = kaikkiIndex.get(wordKey);
    entry.clue = await buildClue(entry.word, kaikkiEntry, translationCache);

    if (entry.clue) {
      filled += 1;
    } else {
      missing += 1;
    }

    if ((i + 1) % 50 === 0) {
      saveTranslationCache(translationCache);
      fs.writeFileSync(INPUT_FILE, JSON.stringify(entries, null, 2));
      console.log(`Progress: ${i + 1}/${TARGET_COUNT} (${filled} filled, ${missing} blank)`);
    }
  }

  saveTranslationCache(translationCache);
  fs.writeFileSync(INPUT_FILE, JSON.stringify(entries, null, 2));
  writeBatchFiles(entries);

  console.log(`Done. ${filled} clues filled, ${missing} still blank.`);
  console.log(`Updated ${INPUT_FILE} and ${BATCH_DIR}/batch_*.json`);
}

fillClues().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
