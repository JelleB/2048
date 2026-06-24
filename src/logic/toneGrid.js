/**
 * Pure ToneGrid song state: multi-section 16×16 patterns, scales, micro-timing offsets.
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

/** Default song-chain play order. */
export const DEFAULT_SONG_CHAIN = /** @type {SectionId[]} */ ([
  'verse',
  'chorus',
  'verse',
  'chorus',
  'break',
  'chorus',
  'finale',
]);

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Major pentatonic semitone offsets from root (1–3–5–6–2 degrees). */
const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9];

export const TONEGRID_STATE_VERSION = 2;

/**
 * C-major pentatonic pitch map (legacy export; same as buildPitchMap('C')).
 * @type {readonly string[]}
 */
export const NOTE_PITCH_MAP = buildPitchMap('C');

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
 * Computes the next section id after the current one in the song chain.
 * @param {SectionId} playSectionId
 * @param {SectionId[]} songChain
 * @param {boolean} loopSong
 * @returns {SectionId | null}
 */
export function advanceSection(playSectionId, songChain, loopSong) {
  if (!songChain.length) return null;
  const idx = songChain.indexOf(playSectionId);
  if (idx === -1) return loopSong ? songChain[0] : null;
  if (idx < songChain.length - 1) return songChain[idx + 1];
  return loopSong ? songChain[0] : null;
}

/**
 * Full ToneGrid song: sections, scale, arrangement chain, transport metadata.
 */
export class ToneGridSongState {
  constructor() {
    /** @type {Record<SectionId, SectionPattern>} */
    this.sections = createEmptySections();
    this.currentStep = 0;
    this.isPlaying = false;
    this.bpm = TONEGRID_DEFAULT_BPM;
    /** @type {ScaleRoot} */
    this.scaleRoot = 'C';
    /** @type {SectionId} */
    this.editSectionId = 'verse';
    /** @type {SectionId} */
    this.playSectionId = 'verse';
    /** @type {SectionId[]} */
    this.songChain = [...DEFAULT_SONG_CHAIN];
    this.loopSong = true;
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
   */
  setEditSection(id) {
    if (TONEGRID_SECTION_IDS.includes(id)) {
      this.editSectionId = id;
    }
  }

  /**
   * @param {ScaleRoot} root
   */
  setScaleRoot(root) {
    if (TONEGRID_SCALE_ROOTS.includes(root)) {
      this.scaleRoot = root;
    }
  }

  /**
   * @param {number} row
   * @param {number} col
   * @returns {0 | 1}
   */
  toggleCell(row, col) {
    return this.getEditSection().toggleCell(row, col);
  }

  clearEditSection() {
    this.getEditSection().clear();
  }

  /**
   * @param {number} row
   * @param {number} col
   * @param {number} delta
   * @returns {number}
   */
  nudgeCellOffset(row, col, delta) {
    return this.getEditSection().nudgeCellOffset(row, col, delta);
  }

  /**
   * @param {SectionId} id
   */
  appendToChain(id) {
    if (TONEGRID_SECTION_IDS.includes(id)) {
      this.songChain.push(id);
    }
  }

  /**
   * @param {number} index
   * @returns {boolean} False when chain would become empty.
   */
  removeFromChain(index) {
    if (this.songChain.length <= 1) return false;
    if (index < 0 || index >= this.songChain.length) return false;
    this.songChain.splice(index, 1);
    return true;
  }

  /**
   * @returns {SectionId | null}
   */
  advancePlaySection() {
    const next = advanceSection(this.playSectionId, this.songChain, this.loopSong);
    if (next) {
      this.playSectionId = next;
      this.currentStep = 0;
    }
    return next;
  }

  /**
   * @param {number} bpm
   * @returns {number}
   */
  setBpm(bpm) {
    this.bpm = clampBpm(bpm);
    return this.bpm;
  }

  /** @returns {readonly string[]} */
  getPitchMap() {
    return buildPitchMap(this.scaleRoot);
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
      scaleRoot: this.scaleRoot,
      editSectionId: this.editSectionId,
      songChain: [...this.songChain],
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
    if (obj.version !== TONEGRID_STATE_VERSION) return null;

    const state = new ToneGridSongState();
    state.bpm = clampBpm(Number(obj.bpm));
    const root = /** @type {ScaleRoot} */ (obj.scaleRoot);
    if (TONEGRID_SCALE_ROOTS.includes(root)) state.scaleRoot = root;

    const editId = /** @type {SectionId} */ (obj.editSectionId);
    if (TONEGRID_SECTION_IDS.includes(editId)) state.editSectionId = editId;

    if (Array.isArray(obj.songChain) && obj.songChain.length > 0) {
      const chain = obj.songChain.filter((id) => TONEGRID_SECTION_IDS.includes(/** @type {SectionId} */ (id)));
      if (chain.length > 0) state.songChain = /** @type {SectionId[]} */ (chain);
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
    return state;
  }
}

/** @deprecated Alias for ToneGridSongState */
export const SequencerState = ToneGridSongState;
