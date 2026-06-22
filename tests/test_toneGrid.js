/**
 * Unit tests for ToneGrid v2 song state, pitch maps, sections, and micro-timing.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ToneGridSongState,
  SequencerState,
  SectionPattern,
  buildPitchMap,
  getTonicRows,
  clampBpm,
  clampTimingOffset,
  advanceSection,
  DEFAULT_SONG_CHAIN,
  NOTE_PITCH_MAP,
  SEQUENCER_CONFIG,
} from '../src/logic/toneGrid.js';
import {
  TONEGRID_BPM_MAX,
  TONEGRID_BPM_MIN,
  TONEGRID_COLS,
  TONEGRID_DEFAULT_BPM,
  TONEGRID_ROWS,
  TONEGRID_SCALE_ROOTS,
  TONEGRID_TIMING_OFFSET_MAX,
} from '../src/constants.js';

describe('buildPitchMap', () => {
  it('maps C pentatonic like legacy NOTE_PITCH_MAP', () => {
    expect(buildPitchMap('C')).toEqual([...NOTE_PITCH_MAP]);
    expect(buildPitchMap('C')).toHaveLength(TONEGRID_ROWS);
    expect(buildPitchMap('C')[0]).toBe('A5');
    expect(buildPitchMap('C')[15]).toBe('A2');
  });

  it('transposes for other roots', () => {
    const dMap = buildPitchMap('D');
    expect(dMap[4]).toBe('D5');
    expect(dMap[9]).toBe('D4');
    expect(dMap).toHaveLength(16);
    for (const root of TONEGRID_SCALE_ROOTS) {
      expect(buildPitchMap(root)).toHaveLength(TONEGRID_ROWS);
    }
  });
});

describe('getTonicRows', () => {
  it('returns rows containing the root pitch class', () => {
    const map = buildPitchMap('C');
    expect(getTonicRows(map, 'C')).toEqual([4, 9, 14]);
    const gMap = buildPitchMap('G');
    expect(getTonicRows(gMap, 'G')).toContain(4);
  });
});

describe('clampTimingOffset', () => {
  it('clamps beyond ±max', () => {
    expect(clampTimingOffset(0.5)).toBe(TONEGRID_TIMING_OFFSET_MAX);
    expect(clampTimingOffset(-0.5)).toBe(-TONEGRID_TIMING_OFFSET_MAX);
  });
});

describe('SectionPattern', () => {
  it('clears offsets when cell toggled off', () => {
    const section = new SectionPattern();
    section.toggleCell(1, 2);
    section.nudgeCellOffset(1, 2, 0.2);
    section.toggleCell(1, 2);
    expect(section.offsets[1][2]).toBe(0);
  });

  it('nudge only affects active cells', () => {
    const section = new SectionPattern();
    expect(section.nudgeCellOffset(0, 0, 0.1)).toBe(0);
    section.toggleCell(0, 0);
    expect(section.nudgeCellOffset(0, 0, 0.15)).toBe(0.15);
  });
});

describe('advanceSection', () => {
  it('walks the chain in order', () => {
    const chain = ['verse', 'chorus', 'break'];
    expect(advanceSection('verse', chain, true)).toBe('chorus');
    expect(advanceSection('chorus', chain, true)).toBe('break');
  });

  it('loops to start when loopSong is true', () => {
    const chain = ['verse', 'chorus'];
    expect(advanceSection('chorus', chain, true)).toBe('verse');
  });

  it('returns null at end when loopSong is false', () => {
    const chain = ['verse', 'chorus'];
    expect(advanceSection('chorus', chain, false)).toBeNull();
  });
});

describe('ToneGridSongState', () => {
  /** @type {ToneGridSongState} */
  let state;

  beforeEach(() => {
    state = new ToneGridSongState();
  });

  it('starts with six empty sections and default chain', () => {
    expect(state.bpm).toBe(TONEGRID_DEFAULT_BPM);
    expect(state.scaleRoot).toBe('C');
    expect(state.editSectionId).toBe('verse');
    expect(state.songChain).toEqual(DEFAULT_SONG_CHAIN);
    expect(state.loopSong).toBe(true);
    for (const section of Object.values(state.sections)) {
      expect(section.matrix.every((row) => row.every((v) => v === 0))).toBe(true);
    }
  });

  it('toggles cells on the edit section only', () => {
    state.setEditSection('chorus');
    state.toggleCell(2, 3);
    expect(state.sections.chorus.matrix[2][3]).toBe(1);
    expect(state.sections.verse.matrix[2][3]).toBe(0);
  });

  it('clears only the edit section', () => {
    state.toggleCell(0, 0);
    state.setEditSection('chorus');
    state.toggleCell(1, 1);
    state.clearEditSection();
    expect(state.sections.chorus.matrix[1][1]).toBe(0);
    expect(state.sections.verse.matrix[0][0]).toBe(1);
  });

  it('advancePlaySection updates playSectionId and resets step', () => {
    state.playSectionId = 'verse';
    state.currentStep = 15;
    const next = state.advancePlaySection();
    expect(next).toBe('chorus');
    expect(state.playSectionId).toBe('chorus');
    expect(state.currentStep).toBe(0);
  });

  it('appendToChain and removeFromChain', () => {
    state.appendToChain('solo');
    expect(state.songChain[state.songChain.length - 1]).toBe('solo');
    while (state.songChain.length > 1) {
      expect(state.removeFromChain(0)).toBe(true);
    }
    expect(state.removeFromChain(0)).toBe(false);
  });

  it('round-trips v2 JSON', () => {
    state.toggleCell(1, 2);
    state.nudgeCellOffset(1, 2, 0.1);
    state.setBpm(140);
    state.setScaleRoot('G');
    state.setEditSection('break');
    state.loopSong = false;
    const json = state.toJSON();
    const restored = ToneGridSongState.fromJSON(json);
    expect(restored).not.toBeNull();
    expect(restored.bpm).toBe(140);
    expect(restored.scaleRoot).toBe('G');
    expect(restored.editSectionId).toBe('break');
    expect(restored.loopSong).toBe(false);
    expect(restored.sections.verse.matrix[1][2]).toBe(1);
    expect(restored.sections.verse.offsets[1][2]).toBe(0.1);
  });

  it('migrates v1 JSON into verse section', () => {
    const matrix = Array(TONEGRID_ROWS)
      .fill(null)
      .map(() => Array(TONEGRID_COLS).fill(0));
    matrix[0][0] = 1;
    const restored = ToneGridSongState.fromJSON({ version: 1, matrix, bpm: 100 });
    expect(restored).not.toBeNull();
    expect(restored.sections.verse.matrix[0][0]).toBe(1);
    expect(restored.sections.chorus.matrix[0][0]).toBe(0);
    expect(restored.bpm).toBe(100);
  });

  it('SequencerState alias works', () => {
    expect(new SequencerState()).toBeInstanceOf(ToneGridSongState);
  });

  it('fromJSON rejects invalid version', () => {
    expect(ToneGridSongState.fromJSON({ version: 99 })).toBeNull();
  });
});

describe('clampBpm', () => {
  it('clamps to range', () => {
    expect(clampBpm(40)).toBe(TONEGRID_BPM_MIN);
    expect(clampBpm(250)).toBe(TONEGRID_BPM_MAX);
  });
});

describe('SEQUENCER_CONFIG', () => {
  it('matches grid constants', () => {
    expect(SEQUENCER_CONFIG.cols).toBe(TONEGRID_COLS);
    expect(SEQUENCER_CONFIG.rows).toBe(TONEGRID_ROWS);
  });
});
