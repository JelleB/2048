/**
 * Unit tests for ToneGrid v3 song state, pitch maps, blocks, and micro-timing.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ToneGridSongState,
  SequencerState,
  SectionPattern,
  SongBlock,
  buildPitchMap,
  getTonicRows,
  clampBpm,
  clampTimingOffset,
  advanceAfterBar,
  collapseChainToBlocks,
  composeBreakSection,
  copySectionPattern,
  ensureModulationFromVerse,
  isSectionEmpty,
  nextScaleRoot,
  SECTION_DEFAULT_REPEATS,
  DEFAULT_SONG_BLOCKS,
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
  TONEGRID_SECTION_IDS,
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

describe('SECTION_DEFAULT_REPEATS', () => {
  it('defines defaults for every section type', () => {
    expect(SECTION_DEFAULT_REPEATS.verse).toBe(4);
    expect(SECTION_DEFAULT_REPEATS.chorus).toBe(2);
    expect(SECTION_DEFAULT_REPEATS.break).toBe(1);
    expect(SECTION_DEFAULT_REPEATS.modulation).toBe(4);
    expect(SECTION_DEFAULT_REPEATS.solo).toBe(4);
    expect(SECTION_DEFAULT_REPEATS.finale).toBe(1);
    for (const id of TONEGRID_SECTION_IDS) {
      expect(SECTION_DEFAULT_REPEATS[id]).toBeGreaterThan(0);
    }
  });
});

describe('collapseChainToBlocks', () => {
  it('merges consecutive identical sections into repeat counts', () => {
    expect(collapseChainToBlocks(['verse', 'verse', 'chorus'])).toEqual([
      { sectionId: 'verse', repeats: 2 },
      { sectionId: 'chorus', repeats: 1 },
    ]);
  });
});

describe('nextScaleRoot', () => {
  it('steps up one root in the scale list', () => {
    expect(nextScaleRoot('C')).toBe('D');
    expect(nextScaleRoot('A')).toBe('A');
  });
});

describe('composeBreakSection', () => {
  it('fills a sparse pattern when break is empty', () => {
    const section = new SectionPattern();
    composeBreakSection(section, 'C');
    expect(isSectionEmpty(section)).toBe(false);
    const active = section.matrix.flat().filter((v) => v === 1).length;
    expect(active).toBeGreaterThan(0);
    expect(active).toBeLessThan(TONEGRID_ROWS * TONEGRID_COLS);
  });
});

describe('ensureModulationFromVerse', () => {
  it('copies verse and raises tonic by one step', () => {
    const state = new ToneGridSongState();
    state.toggleCell(2, 3);
    state.setSectionTonic('verse', 'C');
    ensureModulationFromVerse(state);
    expect(state.sections.modulation.matrix[2][3]).toBe(1);
    expect(state.getSectionTonic('modulation')).toBe('D');
  });

  it('does not overwrite an edited modulation', () => {
    const state = new ToneGridSongState();
    state.toggleCell(1, 1);
    state.setEditSection('modulation');
    state.toggleCell(0, 0);
    ensureModulationFromVerse(state);
    expect(state.sections.modulation.matrix[0][0]).toBe(1);
    expect(state.sections.modulation.matrix[1][1]).toBe(0);
  });
});

describe('advanceAfterBar', () => {
  it('repeats the same section until repeat count is met', () => {
    const blocks = [new SongBlock('verse', 2), new SongBlock('chorus', 1)];
    expect(advanceAfterBar('verse', 0, 0, blocks, true)).toEqual({
      playBlockIndex: 0,
      playRepeatCount: 1,
      playSectionId: 'verse',
      done: false,
    });
    expect(advanceAfterBar('verse', 0, 1, blocks, true)).toEqual({
      playBlockIndex: 1,
      playRepeatCount: 0,
      playSectionId: 'chorus',
      done: false,
    });
  });

  it('loops to first block when loopSong is true', () => {
    const blocks = [new SongBlock('verse', 1)];
    expect(advanceAfterBar('verse', 0, 0, blocks, true)).toEqual({
      playBlockIndex: 0,
      playRepeatCount: 0,
      playSectionId: 'verse',
      done: false,
    });
  });

  it('returns done at end when loopSong is false', () => {
    const blocks = [new SongBlock('verse', 1)];
    expect(advanceAfterBar('verse', 0, 0, blocks, false)).toEqual({
      playBlockIndex: 0,
      playRepeatCount: 1,
      playSectionId: 'verse',
      done: true,
    });
  });
});

describe('ToneGridSongState', () => {
  /** @type {ToneGridSongState} */
  let state;

  beforeEach(() => {
    state = new ToneGridSongState();
  });

  it('starts with one verse block and per-section tonics', () => {
    expect(state.bpm).toBe(TONEGRID_DEFAULT_BPM);
    expect(state.editSectionId).toBe('verse');
    expect(state.songBlocks).toHaveLength(DEFAULT_SONG_BLOCKS.length);
    expect(state.songBlocks[0].sectionId).toBe('verse');
    expect(state.songBlocks[0].repeats).toBe(SECTION_DEFAULT_REPEATS.verse);
    expect(state.loopSong).toBe(true);
    expect(state.getSectionTonic('verse')).toBe('C');
    for (const section of Object.values(state.sections)) {
      expect(section.matrix.every((row) => row.every((v) => v === 0))).toBe(true);
    }
  });

  it('toggles cells on the edit section only and marks edited', () => {
    state.setEditSection('chorus');
    state.toggleCell(2, 3);
    expect(state.sections.chorus.matrix[2][3]).toBe(1);
    expect(state.sections.verse.matrix[2][3]).toBe(0);
    expect(state.isSectionEdited('chorus')).toBe(true);
  });

  it('clears only the edit section', () => {
    state.toggleCell(0, 0);
    state.setEditSection('chorus');
    state.toggleCell(1, 1);
    state.clearEditSection();
    expect(state.sections.chorus.matrix[1][1]).toBe(0);
    expect(state.sections.verse.matrix[0][0]).toBe(1);
  });

  it('advancePlaySection repeats block then moves on', () => {
    state.songBlocks = [new SongBlock('verse', 2), new SongBlock('chorus', 1)];
    state.playBlockIndex = 0;
    state.playRepeatCount = 0;
    state.playSectionId = 'verse';
    state.currentStep = 15;

    expect(state.advancePlaySection()).toBe('verse');
    expect(state.playRepeatCount).toBe(1);
    expect(state.playSectionId).toBe('verse');

    expect(state.advancePlaySection()).toBe('chorus');
    expect(state.playBlockIndex).toBe(1);
    expect(state.playRepeatCount).toBe(0);
  });

  it('auto-composes break on playback when unedited', () => {
    state.songBlocks = [new SongBlock('break', 1)];
    state.prepareSectionForPlayback('break');
    expect(isSectionEmpty(state.sections.break)).toBe(false);
  });

  it('addBlock uses default repeats and prepares modulation', () => {
    state.toggleCell(1, 1);
    state.addBlock('modulation');
    expect(state.songBlocks[state.songBlocks.length - 1]).toEqual(
      new SongBlock('modulation', SECTION_DEFAULT_REPEATS.modulation),
    );
    expect(state.sections.modulation.matrix[1][1]).toBe(1);
    expect(state.getSectionTonic('modulation')).toBe('D');
  });

  it('setSectionTonic updates tonic for that section type', () => {
    state.setSectionTonic('chorus', 'G');
    expect(state.getSectionTonic('chorus')).toBe('G');
    expect(state.scaleRoot).toBe('C');
    state.setEditSection('chorus');
    expect(state.scaleRoot).toBe('G');
  });

  it('addBlock removeBlock and setBlockRepeats', () => {
    state.addBlock('chorus');
    expect(state.songBlocks).toHaveLength(2);
    expect(state.setBlockRepeats(0, 8)).toBe(8);
    expect(state.removeBlock(1)).toBe(true);
    expect(state.songBlocks).toHaveLength(1);
    expect(state.removeBlock(0)).toBe(false);
  });

  it('round-trips v3 JSON', () => {
    state.toggleCell(1, 2);
    state.nudgeCellOffset(1, 2, 0.1);
    state.setBpm(140);
    state.setSectionTonic('break', 'G');
    state.setEditSection('break');
    state.loopSong = false;
    state.addBlock('chorus');
    const json = state.toJSON();
    const restored = ToneGridSongState.fromJSON(json);
    expect(restored).not.toBeNull();
    expect(restored.bpm).toBe(140);
    expect(restored.getSectionTonic('break')).toBe('G');
    expect(restored.editSectionId).toBe('break');
    expect(restored.loopSong).toBe(false);
    expect(restored.sections.verse.matrix[1][2]).toBe(1);
    expect(restored.sections.verse.offsets[1][2]).toBe(0.1);
    expect(restored.songBlocks.length).toBeGreaterThan(1);
  });

  it('migrates v2 flat songChain into blocks', () => {
    const restored = ToneGridSongState.fromJSON({
      version: 2,
      bpm: 100,
      scaleRoot: 'F',
      editSectionId: 'verse',
      songChain: ['verse', 'verse', 'chorus'],
      loopSong: true,
      sections: Object.fromEntries(
        TONEGRID_SECTION_IDS.map((id) => [id, { matrix: Array(16).fill(null).map(() => Array(16).fill(0)), offsets: Array(16).fill(null).map(() => Array(16).fill(0)) }]),
      ),
    });
    expect(restored).not.toBeNull();
    expect(restored.songBlocks).toEqual([
      { sectionId: 'verse', repeats: 2 },
      { sectionId: 'chorus', repeats: 1 },
    ]);
    expect(restored.getSectionTonic('verse')).toBe('F');
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
