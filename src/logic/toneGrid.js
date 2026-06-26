/**
 * Pure ToneGrid song state: multi-section 16×16 patterns, scales, micro-timing offsets,
 * and block-based song arrangement with per-section tonics.
 * Shared by Tone.js audio engine and Phaser scene (no framework imports).
 */
import {
  TONEGRID_BPM_MAX,
  TONEGRID_BPM_MIN,
  TONEGRID_COLS,
  TONEGRID_DEFAULT_BPM,
  TONEGRID_ROWS,
  TONEGRID_SCALE_ROOTS,
  TONEGRID_SECTION_IDS,
  TONEGRID_TIMING_OFFSET_MAX,
} from '../constants.js';

/** @typedef {(typeof TONEGRID_SECTION_IDS)[number]} SectionId */
/** @typedef {(typeof TONEGRID_SCALE_ROOTS)[number]} ScaleRoot */

/** Grid dimensions and default musical settings for ToneGrid. */
export const SEQUENCER_CONFIG = {
  cols: TONEGRID_COLS,
  rows: TONEGRID_ROWS,
  defaultBpm: TONEGRID_DEFAULT_BPM,
};

/** Human-readable labels for section tabs. */
export const SECTION_LABELS = /** @type {Record<SectionId, string>} */ ({
  verse: 'Verse',
  chorus: 'Chorus',
  break: 'Break',
  modulation: 'Modulation',
  solo: 'Solo',
  finale: 'Finale',
});

/** Default repeat counts when a block type is added to the arrangement. */
export const SECTION_DEFAULT_REPEATS = /** @type {Record<SectionId, number>} */ ({
  verse: 4,
  chorus: 2,
  break: 1,
  modulation: 4,
  solo: 4,
  finale: 1,
});

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Major pentatonic semitone offsets from root (1–3–5–6–2 degrees). */
const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9];

export const TONEGRID_STATE_VERSION = 3;

/**
 * C-major pentatonic pitch map (legacy export; same as buildPitchMap('C')).
 * @type {readonly string[]}
 */
export const NOTE_PITCH_MAP = buildPitchMap('C');

/**
 * One block in the song arrangement: section type plus how many 16-step bars to repeat.
 */
export class SongBlock {
  /**
   * @param {SectionId} sectionId
   * @param {number} repeats
   */
  constructor(sectionId, repeats) {
    this.sectionId = sectionId;
    this.repeats = Math.max(1, Math.floor(Number(repeats)) || 1);
  }

  /**
   * @param {unknown} data
   * @returns {SongBlock | null}
   */
  static fromJSON(data) {
    if (!data || typeof data !== 'object') return null;
    const obj = /** @type {{ sectionId?: unknown, repeats?: unknown }} */ (data);
    const id = /** @type {SectionId} */ (obj.sectionId);
    if (!TONEGRID_SECTION_IDS.includes(id)) return null;
    return new SongBlock(id, Number(obj.repeats));
  }
}

/** Starting arrangement: one verse block only. */
export const DEFAULT_SONG_BLOCKS = /** @type {SongBlock[]} */ ([
  new SongBlock('verse', SECTION_DEFAULT_REPEATS.verse),
]);

/**
 * Clamps tempo to the allowed ToneGrid BPM range.
 * @param {number} bpm
 * @returns {number}
 */
export function clampBpm(bpm) {
  const n = Math.floor(Number(bpm));
  if (!Number.isFinite(n)) return TONEGRID_DEFAULT_BPM;
  return Math.min(TONEGRID_BPM_MAX, Math.max(TONEGRID_BPM_MIN, n));
}

/**
 * Clamps a micro-timing offset to ±TONEGRID_TIMING_OFFSET_MAX.
 * @param {number} n
 * @returns {number}
 */
export function clampTimingOffset(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(TONEGRID_TIMING_OFFSET_MAX, Math.max(-TONEGRID_TIMING_OFFSET_MAX, v));
}

/**
 * @param {string} name
 * @returns {number}
 */
function noteNameToSemitone(name) {
  const idx = NOTE_NAMES.indexOf(name);
  return idx >= 0 ? idx : 0;
}

/**
 * Builds a note like "C4" from root letter, pentatonic degree index, and octave.
 * @param {ScaleRoot} root
 * @param {number} degreeIndex 0–4 in PENTATONIC_SEMITONES
 * @param {number} octave
 * @returns {string}
 */
function pentatonicNote(root, degreeIndex, octave) {
  const rootSemi = noteNameToSemitone(root);
  const semi = (rootSemi + PENTATONIC_SEMITONES[degreeIndex]) % 12;
  return `${NOTE_NAMES[semi]}${octave}`;
}

/**
 * Builds 16 pitch names top-to-bottom for a major-pentatonic root.
 * @param {ScaleRoot} scaleRoot
 * @returns {string[]}
 */
export function buildPitchMap(scaleRoot) {
  if (!TONEGRID_SCALE_ROOTS.includes(scaleRoot)) {
    return buildPitchMap('C');
  }
  /** @type {string[]} */
  const pitches = [];
  for (const oct of [5, 4, 3]) {
    for (let deg = 4; deg >= 0; deg -= 1) {
      pitches.push(pentatonicNote(scaleRoot, deg, oct));
    }
  }
  pitches.push(pentatonicNote(scaleRoot, 4, 2));
  return pitches;
}

/**
 * Row indices whose pitch letter matches the scale root (tonic highlight).
 * @param {readonly string[]} pitchMap
 * @param {ScaleRoot} scaleRoot
 * @returns {number[]}
 */
export function getTonicRows(pitchMap, scaleRoot) {
  /** @type {number[]} */
  const rows = [];
  pitchMap.forEach((note, row) => {
    const letter = note.replace(/[0-9]/g, '');
    if (letter === scaleRoot) rows.push(row);
  });
  return rows;
}

/**
 * Returns the next selectable scale root, capped at the highest root.
 * @param {ScaleRoot} root
 * @returns {ScaleRoot}
 */
export function nextScaleRoot(root) {
  const idx = TONEGRID_SCALE_ROOTS.indexOf(root);
  if (idx < 0) return 'C';
  return TONEGRID_SCALE_ROOTS[Math.min(idx + 1, TONEGRID_SCALE_ROOTS.length - 1)];
}

/**
 * @param {SectionPattern} section
 * @returns {boolean}
 */
export function isSectionEmpty(section) {
  return section.matrix.every((row) => row.every((v) => v === 0));
}

/**
 * Deep-copies matrix and offsets from one section to another.
 * @param {SectionPattern} from
 * @param {SectionPattern} to
 */
export function copySectionPattern(from, to) {
  for (let r = 0; r < TONEGRID_ROWS; r += 1) {
    to.matrix[r] = [...from.matrix[r]];
    to.offsets[r] = [...from.offsets[r]];
  }
}

/**
 * Generates a sparse break pattern on downbeats when the user has not edited break yet.
 * @param {SectionPattern} section
 * @param {ScaleRoot} tonic
 */
export function composeBreakSection(section, tonic) {
  const pitchMap = buildPitchMap(tonic);
  const tonicRows = getTonicRows(pitchMap, tonic);
  const midRow = tonicRows[Math.floor(tonicRows.length / 2)] ?? 9;
  const hiRow = tonicRows[0] ?? midRow;
  for (let c = 0; c < TONEGRID_COLS; c += 4) {
    section.matrix[midRow][c] = 1;
  }
  for (let c = 2; c < TONEGRID_COLS; c += 8) {
    section.matrix[hiRow][c] = 1;
  }
}

/**
 * Initializes modulation from verse (pattern copy + tonic one step up) when not yet edited.
 * @param {ToneGridSongState} state
 */
export function ensureModulationFromVerse(state) {
  if (state.isSectionEdited('modulation')) return;
  copySectionPattern(state.sections.verse, state.sections.modulation);
  state.setSectionTonic('modulation', nextScaleRoot(state.getSectionTonic('verse')));
}

/**
 * Collapses a flat v2 song chain into block objects with repeat counts.
 * @param {SectionId[]} chain
 * @returns {SongBlock[]}
 */
export function collapseChainToBlocks(chain) {
  /** @type {SongBlock[]} */
  const blocks = [];
  for (const id of chain) {
    if (!TONEGRID_SECTION_IDS.includes(id)) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.sectionId === id) {
      last.repeats += 1;
    } else {
      blocks.push(new SongBlock(id, 1));
    }
  }
  return blocks.length > 0 ? blocks : [...DEFAULT_SONG_BLOCKS];
}

/**
 * @typedef {{ playBlockIndex: number, playRepeatCount: number, playSectionId: SectionId, done: boolean }} BarAdvanceResult
 */

/**
 * Computes playback position after one 16-step bar completes.
 * @param {SectionId} playSectionId
 * @param {number} playBlockIndex
 * @param {number} playRepeatCount Completed bars in the current block before this bar.
 * @param {SongBlock[]} songBlocks
 * @param {boolean} loopSong
 * @returns {BarAdvanceResult}
 */
export function advanceAfterBar(playSectionId, playBlockIndex, playRepeatCount, songBlocks, loopSong) {
  if (!songBlocks.length) {
    return { playBlockIndex: 0, playRepeatCount: 0, playSectionId, done: true };
  }

  const block = songBlocks[playBlockIndex];
  if (!block || block.sectionId !== playSectionId) {
    return {
      playBlockIndex: 0,
      playRepeatCount: 0,
      playSectionId: songBlocks[0].sectionId,
      done: false,
    };
  }

  const nextRepeatCount = playRepeatCount + 1;
  if (nextRepeatCount < block.repeats) {
    return {
      playBlockIndex,
      playRepeatCount: nextRepeatCount,
      playSectionId,
      done: false,
    };
  }

  if (playBlockIndex < songBlocks.length - 1) {
    const nextBlock = songBlocks[playBlockIndex + 1];
    return {
      playBlockIndex: playBlockIndex + 1,
      playRepeatCount: 0,
      playSectionId: nextBlock.sectionId,
      done: false,
    };
  }

  if (loopSong) {
    const first = songBlocks[0];
    return {
      playBlockIndex: 0,
      playRepeatCount: 0,
      playSectionId: first.sectionId,
      done: false,
    };
  }

  return { playBlockIndex, playRepeatCount: nextRepeatCount, playSectionId, done: true };
}

/**
 * One song section: binary matrix plus per-cell micro-timing offsets.
 */
export class SectionPattern {
  constructor() {
    /** @type {number[][]} */
    this.matrix = Array(TONEGRID_ROWS)
      .fill(null)
      .map(() => Array(TONEGRID_COLS).fill(0));
    /** @type {number[][]} */
    this.offsets = Array(TONEGRID_ROWS)
      .fill(null)
      .map(() => Array(TONEGRID_COLS).fill(0));
  }

  /**
   * @param {number} row
   * @param {number} col
   * @returns {0 | 1}
   */
  toggleCell(row, col) {
    this.matrix[row][col] = this.matrix[row][col] === 0 ? 1 : 0;
    if (this.matrix[row][col] === 0) {
      this.offsets[row][col] = 0;
    }
    return /** @type {0 | 1} */ (this.matrix[row][col]);
  }

  clear() {
    for (let r = 0; r < TONEGRID_ROWS; r += 1) {
      this.matrix[r].fill(0);
      this.offsets[r].fill(0);
    }
  }

  /**
   * @param {number} row
   * @param {number} col
   * @param {number} delta
   * @returns {number} New offset after nudge, or 0 if cell inactive.
   */
  nudgeCellOffset(row, col, delta) {
    if (this.matrix[row][col] !== 1) return 0;
    this.offsets[row][col] = clampTimingOffset(this.offsets[row][col] + delta);
    return this.offsets[row][col];
  }

  /**
   * @returns {{ matrix: number[][], offsets: number[][] }}
   */
  toJSON() {
    return {
      matrix: this.matrix.map((row) => [...row]),
      offsets: this.offsets.map((row) => [...row]),
    };
  }

  /**
   * @param {unknown} data
   * @returns {SectionPattern | null}
   */
  static fromJSON(data) {
    if (!data || typeof data !== 'object') return null;
    const obj = /** @type {{ matrix?: unknown, offsets?: unknown }} */ (data);
    if (!Array.isArray(obj.matrix) || obj.matrix.length !== TONEGRID_ROWS) return null;
    for (const row of obj.matrix) {
      if (!Array.isArray(row) || row.length !== TONEGRID_COLS) return null;
      if (!row.every((v) => v === 0 || v === 1)) return null;
    }
    const section = new SectionPattern();
    section.matrix = obj.matrix.map((row) => [...row]);
    if (Array.isArray(obj.offsets) && obj.offsets.length === TONEGRID_ROWS) {
      for (let r = 0; r < TONEGRID_ROWS; r += 1) {
        const row = obj.offsets[r];
        if (Array.isArray(row) && row.length === TONEGRID_COLS) {
          section.offsets[r] = row.map((v) => clampTimingOffset(Number(v)));
        }
      }
    }
    return section;
  }
}

/**
 * Creates empty sections for every fixed section id.
 * @returns {Record<SectionId, SectionPattern>}
 */
export function createEmptySections() {
  /** @type {Record<SectionId, SectionPattern>} */
  const sections = /** @type {Record<SectionId, SectionPattern>} */ ({});
  for (const id of TONEGRID_SECTION_IDS) {
    sections[id] = new SectionPattern();
  }
  return sections;
}

/**
 * Creates default per-section tonics (all C).
 * @returns {Record<SectionId, ScaleRoot>}
 */
export function createDefaultSectionTonics() {
  /** @type {Record<SectionId, ScaleRoot>} */
  const tonics = /** @type {Record<SectionId, ScaleRoot>} */ ({});
  for (const id of TONEGRID_SECTION_IDS) {
    tonics[id] = 'C';
  }
  return tonics;
}

/**
 * Full ToneGrid song: sections, per-section tonics, block arrangement, transport metadata.
 */
export class ToneGridSongState {
  constructor() {
    /** @type {Record<SectionId, SectionPattern>} */
    this.sections = createEmptySections();
    /** @type {Record<SectionId, ScaleRoot>} */
    this.sectionTonics = createDefaultSectionTonics();
    /** @type {Record<SectionId, boolean>} */
    this.sectionEdited = /** @type {Record<SectionId, boolean>} */ ({});
    for (const id of TONEGRID_SECTION_IDS) {
      this.sectionEdited[id] = false;
    }
    this.currentStep = 0;
    this.isPlaying = false;
    this.bpm = TONEGRID_DEFAULT_BPM;
    /** @type {SectionId} */
    this.editSectionId = 'verse';
    /** @type {SectionId} */
    this.playSectionId = 'verse';
    /** @type {SongBlock[]} */
    this.songBlocks = DEFAULT_SONG_BLOCKS.map((b) => new SongBlock(b.sectionId, b.repeats));
    this.playBlockIndex = 0;
    this.playRepeatCount = 0;
    this.loopSong = true;
  }

  /** Tonic of the section currently being edited (legacy alias for scale picker). */
  get scaleRoot() {
    return this.getSectionTonic(this.editSectionId);
  }

  /** @returns {SectionPattern} */
  getEditSection() {
    return this.sections[this.editSectionId];
  }

  /** @returns {SectionPattern} */
  getPlaySection() {
    return this.sections[this.playSectionId];
  }

  /**
   * @param {SectionId} id
   * @returns {ScaleRoot}
   */
  getSectionTonic(id) {
    return this.sectionTonics[id] ?? 'C';
  }

  /**
   * @param {SectionId} id
   * @param {ScaleRoot} root
   */
  setSectionTonic(id, root) {
    if (TONEGRID_SCALE_ROOTS.includes(root) && TONEGRID_SECTION_IDS.includes(id)) {
      this.sectionTonics[id] = root;
    }
  }

  /**
   * @param {SectionId} id
   * @returns {boolean}
   */
  isSectionEdited(id) {
    return Boolean(this.sectionEdited[id]);
  }

  /**
   * @param {SectionId} id
   */
  markSectionEdited(id) {
    if (TONEGRID_SECTION_IDS.includes(id)) {
      this.sectionEdited[id] = true;
    }
  }

  /**
   * @param {SectionId} id
   */
  setEditSection(id) {
    if (TONEGRID_SECTION_IDS.includes(id)) {
      this.editSectionId = id;
    }
  }

  /**
   * @param {ScaleRoot} root Sets tonic for the edit section.
   */
  setScaleRoot(root) {
    this.setSectionTonic(this.editSectionId, root);
  }

  /**
   * @param {number} row
   * @param {number} col
   * @returns {0 | 1}
   */
  toggleCell(row, col) {
    this.markSectionEdited(this.editSectionId);
    return this.getEditSection().toggleCell(row, col);
  }

  clearEditSection() {
    this.getEditSection().clear();
    this.markSectionEdited(this.editSectionId);
  }

  /**
   * @param {number} row
   * @param {number} col
   * @param {number} delta
   * @returns {number}
   */
  nudgeCellOffset(row, col, delta) {
    this.markSectionEdited(this.editSectionId);
    return this.getEditSection().nudgeCellOffset(row, col, delta);
  }

  /**
   * Prepares a section before playback (auto-compose break, init modulation).
   * @param {SectionId} id
   */
  prepareSectionForPlayback(id) {
    if (id === 'break' && !this.isSectionEdited('break') && isSectionEmpty(this.sections.break)) {
      composeBreakSection(this.sections.break, this.getSectionTonic('break'));
    }
    if (id === 'modulation') {
      ensureModulationFromVerse(this);
    }
  }

  /**
   * @param {SectionId} id
   */
  addBlock(id) {
    if (!TONEGRID_SECTION_IDS.includes(id)) return;
    if (id === 'modulation') {
      ensureModulationFromVerse(this);
    }
    this.songBlocks.push(new SongBlock(id, SECTION_DEFAULT_REPEATS[id]));
  }

  /**
   * @param {number} index
   * @returns {boolean} False when arrangement would become empty.
   */
  removeBlock(index) {
    if (this.songBlocks.length <= 1) return false;
    if (index < 0 || index >= this.songBlocks.length) return false;
    this.songBlocks.splice(index, 1);
    return true;
  }

  /**
   * @param {number} index
   * @param {SectionId} id
   */
  setBlockType(index, id) {
    if (index < 0 || index >= this.songBlocks.length) return;
    if (!TONEGRID_SECTION_IDS.includes(id)) return;
    if (id === 'modulation') {
      ensureModulationFromVerse(this);
    }
    this.songBlocks[index].sectionId = id;
    this.songBlocks[index].repeats = SECTION_DEFAULT_REPEATS[id];
  }

  /**
   * @param {number} index
   * @param {number} repeats
   * @returns {number}
   */
  setBlockRepeats(index, repeats) {
    if (index < 0 || index >= this.songBlocks.length) return 1;
    const n = Math.max(1, Math.floor(Number(repeats)) || 1);
    this.songBlocks[index].repeats = n;
    return n;
  }

  /**
   * Resets playback cursors to the first block.
   */
  resetPlaybackPosition() {
    this.playBlockIndex = 0;
    this.playRepeatCount = 0;
    const first = this.songBlocks[0];
    if (first) {
      this.playSectionId = first.sectionId;
      this.prepareSectionForPlayback(first.sectionId);
    }
    this.currentStep = 0;
  }

  /**
   * @returns {SectionId | null} Next section id, or null when song ends.
   */
  advancePlaySection() {
    const result = advanceAfterBar(
      this.playSectionId,
      this.playBlockIndex,
      this.playRepeatCount,
      this.songBlocks,
      this.loopSong,
    );
    this.playBlockIndex = result.playBlockIndex;
    this.playRepeatCount = result.playRepeatCount;
    if (result.done) {
      this.currentStep = 0;
      return null;
    }
    if (result.playSectionId !== this.playSectionId) {
      this.prepareSectionForPlayback(result.playSectionId);
    }
    this.playSectionId = result.playSectionId;
    this.currentStep = 0;
    return this.playSectionId;
  }

  /**
   * @param {number} bpm
   * @returns {number}
   */
  setBpm(bpm) {
    this.bpm = clampBpm(bpm);
    return this.bpm;
  }

  /** Pitch map for the section currently playing. */
  getPlayPitchMap() {
    return buildPitchMap(this.getSectionTonic(this.playSectionId));
  }

  /** Pitch map for the section currently being edited. */
  getPitchMap() {
    return buildPitchMap(this.getSectionTonic(this.editSectionId));
  }

  /**
   * @returns {object}
   */
  toJSON() {
    /** @type {Record<string, ReturnType<SectionPattern['toJSON']>>} */
    const sections = {};
    for (const id of TONEGRID_SECTION_IDS) {
      sections[id] = this.sections[id].toJSON();
    }
    return {
      version: TONEGRID_STATE_VERSION,
      bpm: this.bpm,
      sectionTonics: { ...this.sectionTonics },
      sectionEdited: { ...this.sectionEdited },
      editSectionId: this.editSectionId,
      songBlocks: this.songBlocks.map((b) => ({ sectionId: b.sectionId, repeats: b.repeats })),
      loopSong: this.loopSong,
      sections,
    };
  }

  /**
   * @param {unknown} data
   * @returns {ToneGridSongState | null}
   */
  static fromJSON(data) {
    if (!data || typeof data !== 'object') return null;
    const obj = /** @type {Record<string, unknown>} */ (data);

    if (obj.version === 1) {
      return ToneGridSongState.fromV1(obj);
    }
    if (obj.version === 2) {
      return ToneGridSongState.fromV2(obj);
    }
    if (obj.version !== TONEGRID_STATE_VERSION) return null;

    const state = new ToneGridSongState();
    state.bpm = clampBpm(Number(obj.bpm));

    const tonics = obj.sectionTonics;
    if (tonics && typeof tonics === 'object') {
      for (const id of TONEGRID_SECTION_IDS) {
        const root = /** @type {ScaleRoot} */ (/** @type {Record<string, unknown>} */ (tonics)[id]);
        if (TONEGRID_SCALE_ROOTS.includes(root)) state.sectionTonics[id] = root;
      }
    }

    const edited = obj.sectionEdited;
    if (edited && typeof edited === 'object') {
      for (const id of TONEGRID_SECTION_IDS) {
        if (typeof /** @type {Record<string, unknown>} */ (edited)[id] === 'boolean') {
          state.sectionEdited[id] = /** @type {boolean} */ (/** @type {Record<string, unknown>} */ (edited)[id]);
        }
      }
    }

    const editId = /** @type {SectionId} */ (obj.editSectionId);
    if (TONEGRID_SECTION_IDS.includes(editId)) state.editSectionId = editId;

    if (Array.isArray(obj.songBlocks) && obj.songBlocks.length > 0) {
      const blocks = obj.songBlocks
        .map((b) => SongBlock.fromJSON(b))
        .filter((b) => b !== null);
      if (blocks.length > 0) state.songBlocks = /** @type {SongBlock[]} */ (blocks);
    }
    if (typeof obj.loopSong === 'boolean') state.loopSong = obj.loopSong;

    const sectionsObj = obj.sections;
    if (sectionsObj && typeof sectionsObj === 'object') {
      for (const id of TONEGRID_SECTION_IDS) {
        const parsed = SectionPattern.fromJSON(/** @type {object} */ (sectionsObj)[id]);
        if (parsed) state.sections[id] = parsed;
      }
    }
    return state;
  }

  /**
   * Migrates v1 flat matrix into verse section.
   * @param {Record<string, unknown>} obj
   * @returns {ToneGridSongState | null}
   */
  static fromV1(obj) {
    if (!Array.isArray(obj.matrix) || obj.matrix.length !== TONEGRID_ROWS) return null;
    for (const row of obj.matrix) {
      if (!Array.isArray(row) || row.length !== TONEGRID_COLS) return null;
      if (!row.every((v) => v === 0 || v === 1)) return null;
    }
    const state = new ToneGridSongState();
    state.bpm = clampBpm(Number(obj.bpm));
    state.sections.verse.matrix = obj.matrix.map((row) => [...row]);
    state.sectionEdited.verse = true;
    return state;
  }

  /**
   * Migrates v2 flat songChain into v3 blocks.
   * @param {Record<string, unknown>} obj
   * @returns {ToneGridSongState | null}
   */
  static fromV2(obj) {
    const state = new ToneGridSongState();
    state.bpm = clampBpm(Number(obj.bpm));

    const root = /** @type {ScaleRoot} */ (obj.scaleRoot);
    if (TONEGRID_SCALE_ROOTS.includes(root)) {
      for (const id of TONEGRID_SECTION_IDS) {
        state.sectionTonics[id] = root;
      }
    }

    const editId = /** @type {SectionId} */ (obj.editSectionId);
    if (TONEGRID_SECTION_IDS.includes(editId)) state.editSectionId = editId;

    if (Array.isArray(obj.songChain) && obj.songChain.length > 0) {
      const chain = obj.songChain.filter((id) => TONEGRID_SECTION_IDS.includes(/** @type {SectionId} */ (id)));
      if (chain.length > 0) {
        state.songBlocks = collapseChainToBlocks(/** @type {SectionId[]} */ (chain));
      }
    }
    if (typeof obj.loopSong === 'boolean') state.loopSong = obj.loopSong;

    const sectionsObj = obj.sections;
    if (sectionsObj && typeof sectionsObj === 'object') {
      for (const id of TONEGRID_SECTION_IDS) {
        const parsed = SectionPattern.fromJSON(/** @type {object} */ (sectionsObj)[id]);
        if (parsed) {
          state.sections[id] = parsed;
          if (!isSectionEmpty(parsed)) state.sectionEdited[id] = true;
        }
      }
    }
    return state;
  }
}

/** @deprecated Alias for ToneGridSongState */
export const SequencerState = ToneGridSongState;
