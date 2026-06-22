/**
 * Unit tests for ToneGrid pattern cookie persistence.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveToneGridPattern,
  loadToneGridPattern,
  clearToneGridPattern,
  setToneGridStorageAdapter,
  resetToneGridStorageAdapter,
} from '../src/persistence/toneGridStorage.js';
import { ToneGridSongState } from '../src/logic/toneGrid.js';

/**
 * In-memory storage adapter for deterministic tests.
 * @returns {import('../src/persistence/toneGridStorage.js').StorageAdapter}
 */
function createMemoryStorage() {
  /** @type {Map<string, string>} */
  const data = new Map();
  return {
    get: (key) => (data.has(key) ? data.get(key) : null),
    set: (key, value) => {
      data.set(key, value);
    },
    remove: (key) => {
      data.delete(key);
    },
  };
}

describe('toneGridStorage', () => {
  beforeEach(() => {
    setToneGridStorageAdapter(createMemoryStorage());
  });

  afterEach(() => {
    resetToneGridStorageAdapter();
  });

  it('saves and loads a v2 song state', () => {
    const state = new ToneGridSongState();
    state.toggleCell(0, 1);
    state.setEditSection('chorus');
    state.toggleCell(3, 7);
    state.setBpm(95);
    state.setScaleRoot('F');
    saveToneGridPattern(state);

    const loaded = loadToneGridPattern();
    expect(loaded).not.toBeNull();
    expect(loaded.sections.chorus.matrix[3][7]).toBe(1);
    expect(loaded.bpm).toBe(95);
    expect(loaded.scaleRoot).toBe('F');
  });

  it('loads v1 cookie via migration', () => {
    const storage = createMemoryStorage();
    setToneGridStorageAdapter(storage);
    const matrix = Array(16)
      .fill(null)
      .map(() => Array(16).fill(0));
    matrix[2][2] = 1;
    storage.set(
      'tonegrid_pattern',
      JSON.stringify({ version: 1, matrix, bpm: 110 }),
    );
    const loaded = loadToneGridPattern();
    expect(loaded?.sections.verse.matrix[2][2]).toBe(1);
    expect(loaded?.bpm).toBe(110);
  });

  it('returns null when nothing saved', () => {
    expect(loadToneGridPattern()).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    const storage = createMemoryStorage();
    setToneGridStorageAdapter(storage);
    storage.set('tonegrid_pattern', '{not json');
    expect(loadToneGridPattern()).toBeNull();
  });

  it('returns null for invalid v2 sections', () => {
    const storage = createMemoryStorage();
    setToneGridStorageAdapter(storage);
    storage.set(
      'tonegrid_pattern',
      JSON.stringify({ version: 2, bpm: 120, sections: {} }),
    );
    expect(loadToneGridPattern()).not.toBeNull();
  });

  it('clears stored pattern', () => {
    saveToneGridPattern(new ToneGridSongState());
    clearToneGridPattern();
    expect(loadToneGridPattern()).toBeNull();
  });
});
