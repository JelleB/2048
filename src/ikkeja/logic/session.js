/**
 * Session join codes and client-side progress persistence (sessionStorage).
 */
import { normalizeSession } from './levelProgression.js';

const STORAGE_KEY = 'ikkeja:session';
const PENDING_P1_KEY = 'ikkeja:p1Pending';

/** Unambiguous uppercase alphanumeric set for session codes. */
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Total session code length: payload + CRC suffix. */
export const SESSION_CODE_LENGTH = 6;

/** CRC suffix length appended to every generated session code. */
export const SESSION_CODE_CRC_LENGTH = 2;

/** Random payload length before the CRC suffix. */
export const SESSION_CODE_PAYLOAD_LENGTH = SESSION_CODE_LENGTH - SESSION_CODE_CRC_LENGTH;

/** CRC-16/CCITT-FALSE polynomial for session code checksums. */
const CRC16_POLYNOMIAL = 0x1021;

/**
 * Computes the two-character CRC suffix for a session code payload.
 * @param {string} payload - Uppercase payload without CRC suffix.
 * @returns {string}
 */
export function computeSessionCodeCrc(payload) {
  const normalized = (payload || '').trim().toUpperCase();
  let crc = 0xffff;

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (!CODE_CHARS.includes(ch)) {
      throw new Error(`Invalid session code character: ${ch}`);
    }
    crc ^= ch.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ CRC16_POLYNOMIAL) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  const alphabetSize = CODE_CHARS.length;
  const value = crc % (alphabetSize * alphabetSize);
  return CODE_CHARS[Math.floor(value / alphabetSize)] + CODE_CHARS[value % alphabetSize];
}

/**
 * Creates a random session code with a CRC-protected suffix for P2/P3 validation.
 * @returns {string}
 */
export function generateSessionCode() {
  const bytes = new Uint8Array(SESSION_CODE_PAYLOAD_LENGTH);
  crypto.getRandomValues(bytes);
  let payload = '';
  for (let i = 0; i < SESSION_CODE_PAYLOAD_LENGTH; i += 1) {
    payload += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `${payload}${computeSessionCodeCrc(payload)}`;
}

/**
 * Checks whether a join code has valid shape and CRC suffix.
 * @param {string} code
 * @returns {boolean}
 */
export function validateSessionJoin(code) {
  const normalized = normalizeSessionCode(code);
  if (normalized.length !== SESSION_CODE_LENGTH) {
    return false;
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return false;
  }
  if ([...normalized].some((ch) => !CODE_CHARS.includes(ch))) {
    return false;
  }

  const payload = normalized.slice(0, SESSION_CODE_PAYLOAD_LENGTH);
  const suffix = normalized.slice(SESSION_CODE_PAYLOAD_LENGTH);
  return computeSessionCodeCrc(payload) === suffix;
}

/**
 * @typedef {object} IkkeJaSession
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
 * @returns {IkkeJaSession|null}
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
    const parsed = JSON.parse(raw);
    if (!parsed) {
      return null;
    }
    const normalized = normalizeSession(parsed);
    if (
      normalized.level !== parsed.level ||
      normalized.crosswordGridSolved !== parsed.crosswordGridSolved
    ) {
      saveSession(normalized);
    }
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Persists session to sessionStorage.
 * @param {IkkeJaSession} session
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
