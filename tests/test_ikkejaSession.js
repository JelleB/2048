/**
 * Unit tests for IKKE-JA session join and persistence.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  clearPendingP1Session,
  computeSessionCodeCrc,
  generateSessionCode,
  loadPendingP1Session,
  loadSession,
  normalizeSessionCode,
  savePendingP1Session,
  saveSession,
  SESSION_CODE_LENGTH,
  validateSessionJoin,
} from '../src/ikkeja/logic/session.js';

/**
 * Builds a valid session code from a payload for deterministic tests.
 * @param {string} payload
 * @returns {string}
 */
function sessionCodeWithPayload(payload) {
  return `${payload}${computeSessionCodeCrc(payload)}`;
}

describe('computeSessionCodeCrc', () => {
  it('returns two characters from the session alphabet', () => {
    const crc = computeSessionCodeCrc('ABCD');
    expect(crc).toMatch(/^[A-Z2-9]{2}$/);
    expect(crc).not.toMatch(/[01IO]/);
  });

  it('is deterministic for the same payload', () => {
    expect(computeSessionCodeCrc('GAME')).toBe(computeSessionCodeCrc('GAME'));
  });
});

describe('generateSessionCode', () => {
  it(`returns ${SESSION_CODE_LENGTH} chars with a valid CRC suffix`, () => {
    const code = generateSessionCode();
    expect(code).toHaveLength(SESSION_CODE_LENGTH);
    expect(validateSessionJoin(code)).toBe(true);
  });
});

describe('validateSessionJoin', () => {
  it('accepts codes whose last two characters match the payload CRC', () => {
    const code = sessionCodeWithPayload('ABCD');
    expect(code).toHaveLength(SESSION_CODE_LENGTH);
    expect(validateSessionJoin(code)).toBe(true);
  });

  it('rejects codes with a wrong CRC suffix', () => {
    const code = sessionCodeWithPayload('ABCD');
    const tampered = `${code.slice(0, -2)}ZZ`;
    expect(validateSessionJoin(tampered)).toBe(false);
  });

  it('rejects too short, too long, or invalid characters', () => {
    expect(validateSessionJoin('AB12')).toBe(false);
    expect(validateSessionJoin('ABCD123')).toBe(false);
    expect(validateSessionJoin('abc-12')).toBe(false);
    expect(validateSessionJoin('ABCD1O')).toBe(false);
  });
});

describe('normalizeSessionCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeSessionCode('  abcd12  ')).toBe('ABCD12');
  });
});

describe('session storage', () => {
  /** @type {Storage} */
  let store;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
      removeItem: (k) => {
        delete store[k];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips session via save and load', () => {
    const seed = sessionCodeWithPayload('GAME');
    const session = {
      seed,
      role: 'p2',
      level: 2,
      nameP2: 'Tape',
    };
    saveSession(session);
    expect(loadSession()).toEqual(session);
  });

  it('clearSession removes data', () => {
    saveSession({ seed: sessionCodeWithPayload('TEST'), role: 'p1', level: 1 });
    clearSession();
    expect(loadSession()).toBeNull();
  });
});

describe('pending P1 session', () => {
  /** @type {Record<string, string>} */
  let store;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
      removeItem: (k) => {
        delete store[k];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips pending session code', () => {
    const seed = sessionCodeWithPayload('ABCD');
    savePendingP1Session(seed);
    expect(loadPendingP1Session()).toEqual({ seed });
  });

  it('rejects pending codes with invalid CRC', () => {
    savePendingP1Session('ABCDZZ');
    expect(loadPendingP1Session()).toBeNull();
  });

  it('clearPendingP1Session removes pending only', () => {
    const seed = sessionCodeWithPayload('ABCD');
    savePendingP1Session(seed);
    saveSession({ seed, role: 'p1', level: 1 });
    clearPendingP1Session();
    expect(loadPendingP1Session()).toBeNull();
    expect(loadSession()?.seed).toBe(seed);
  });

  it('clearSession removes pending and active session', () => {
    const seed = sessionCodeWithPayload('ABCD');
    savePendingP1Session(seed);
    saveSession({ seed, role: 'p1', level: 1 });
    clearSession();
    expect(loadPendingP1Session()).toBeNull();
    expect(loadSession()).toBeNull();
  });
});
