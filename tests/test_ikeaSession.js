/**
 * Unit tests for IKEA session join and persistence.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  clearPendingP1Session,
  generateSessionCode,
  loadPendingP1Session,
  loadSession,
  normalizeSessionCode,
  savePendingP1Session,
  saveSession,
  validateSessionJoin,
} from '../src/ikea/logic/session.js';

describe('generateSessionCode', () => {
  it('returns 8 uppercase alphanumeric characters', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });
});

describe('validateSessionJoin', () => {
  it('accepts 6–8 char codes', () => {
    expect(validateSessionJoin('ABC123')).toBe(true);
    expect(validateSessionJoin('ABCD1234')).toBe(true);
  });

  it('rejects too short or invalid chars', () => {
    expect(validateSessionJoin('AB12')).toBe(false);
    expect(validateSessionJoin('abc-123')).toBe(false);
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
    const session = {
      seed: 'GAME1234',
      role: 'p2',
      level: 2,
      nameP2: 'Tape',
    };
    saveSession(session);
    expect(loadSession()).toEqual(session);
  });

  it('clearSession removes data', () => {
    saveSession({ seed: 'X', role: 'p1', level: 1 });
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
    savePendingP1Session('ABCD1234');
    expect(loadPendingP1Session()).toEqual({ seed: 'ABCD1234' });
  });

  it('clearPendingP1Session removes pending only', () => {
    savePendingP1Session('ABCD1234');
    saveSession({ seed: 'ABCD1234', role: 'p1', level: 1 });
    clearPendingP1Session();
    expect(loadPendingP1Session()).toBeNull();
    expect(loadSession()?.seed).toBe('ABCD1234');
  });

  it('clearSession removes pending and active session', () => {
    savePendingP1Session('ABCD1234');
    saveSession({ seed: 'ABCD1234', role: 'p1', level: 1 });
    clearSession();
    expect(loadPendingP1Session()).toBeNull();
    expect(loadSession()).toBeNull();
  });
});
