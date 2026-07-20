/**
 * Session join codes and client-side progress persistence (sessionStorage).
 */
import { normalizeSession } from './levelProgression.js';

const STORAGE_KEY = 'ikea:session';
const PENDING_P1_KEY = 'ikea:p1Pending';

/** Unambiguous uppercase alphanumeric set for session codes. */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Creates a random session code for Player 1 to share.
 * @param {number} [length=8]
 * @returns {string}
 */
export function generateSessionCode(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

/**
 * Checks whether a join code has valid shape.
 * @param {string} code
 * @returns {boolean}
 */
export function validateSessionJoin(code) {
  const normalized = (code || '').trim().toUpperCase();
  return normalized.length >= 6 && normalized.length <= 8 && /^[A-Z0-9]+$/.test(normalized);
}

/**
 * @typedef {object} IkeaSession
 * @property {string} seed
 * @property {'p1'|'p2'|'daughter'} role
 * @property {number} level - Internal id: 1, 2, 4 (allen key), 5 victory; 3 is skipped.
 * @property {string} [nameP1]
 * @property {string} [nameP2]
 * @property {string} [nameDaughter]
 * @property {boolean} [levelComplete] - Puzzle solved; waiting for sync to advance.
 * @property {boolean} [crosswordGridSolved] - Level 1: Player 1 filled the grid correctly.
 */

/**
 * Loads persisted session from sessionStorage.
 * @returns {IkeaSession|null}
 */
export function loadSession() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw);
    return session ? normalizeSession(session) : null;
  } catch {
    return null;
  }
}

/**
 * Persists session to sessionStorage.
 * @param {IkeaSession} session
 */
export function saveSession(session) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/** Clears stored session. */
export function clearSession() {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(PENDING_P1_KEY);
}

/**
 * Saves Player 1's generated session code before entering the game.
 * @param {string} seed
 */
export function savePendingP1Session(seed) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(PENDING_P1_KEY, JSON.stringify({ seed }));
}

/**
 * Returns a Player 1 session code generated but not yet entered into the game.
 * @returns {{ seed: string }|null}
 */
export function loadPendingP1Session() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(PENDING_P1_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.seed === 'string' && validateSessionJoin(parsed.seed)) {
      return { seed: parsed.seed };
    }
    return null;
  } catch {
    return null;
  }
}

/** Removes a pending Player 1 start (after entering the game or abandoning). */
export function clearPendingP1Session() {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(PENDING_P1_KEY);
}

/**
 * Normalizes a join code for storage as seed.
 * @param {string} code
 * @returns {string}
 */
export function normalizeSessionCode(code) {
  return (code || '').trim().toUpperCase();
}
