/**
 * Cookie-backed persistence for ToneGrid patterns (matrix + BPM).
 * Separate from puzzle save slots; no auto-resume on boot.
 */
import { getCookie, setCookie, deleteCookie } from './cookies.js';
import { ToneGridSongState } from '../logic/toneGrid.js';

export const TONEGRID_PATTERN_KEY = 'tonegrid_pattern';

/**
 * @typedef {{ get: (key: string) => string | null, set: (key: string, value: string) => void, remove: (key: string) => void }} StorageAdapter
 */

/** @type {StorageAdapter} */
let storageAdapter = {
  get: getCookie,
  set: setCookie,
  remove: deleteCookie,
};

/**
 * Swaps persistence backend (used by tests).
 * @param {StorageAdapter} adapter
 */
export function setToneGridStorageAdapter(adapter) {
  storageAdapter = adapter;
}

/** Restores the default cookie adapter after tests. */
export function resetToneGridStorageAdapter() {
  storageAdapter = {
    get: getCookie,
    set: setCookie,
    remove: deleteCookie,
  };
}

/**
 * Persists the current ToneGrid pattern and tempo.
 * @param {ToneGridSongState} state
 */
export function saveToneGridPattern(state) {
  storageAdapter.set(TONEGRID_PATTERN_KEY, JSON.stringify(state.toJSON()));
}

/**
 * Loads a saved ToneGrid pattern or returns null when missing/invalid.
 * @returns {ToneGridSongState | null}
 */
export function loadToneGridPattern() {
  const raw = storageAdapter.get(TONEGRID_PATTERN_KEY);
  if (!raw) return null;
  try {
    return ToneGridSongState.fromJSON(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Removes the stored ToneGrid pattern cookie. */
export function clearToneGridPattern() {
  storageAdapter.remove(TONEGRID_PATTERN_KEY);
}
