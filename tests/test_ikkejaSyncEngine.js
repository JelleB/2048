/**
 * Unit tests for IKKE-JA time-sync engine.
 */
import { describe, expect, it } from 'vitest';
import {
  TIME_SLOT_MS,
  getSlotProgress,
  getTimeSlot,
  syncCodeForSeed,
  validateSyncCode,
} from '../src/ikkeja/logic/syncEngine.js';

describe('getTimeSlot', () => {
  it('floors epoch ms into 5-second windows', () => {
    expect(getTimeSlot(0)).toBe(0);
    expect(getTimeSlot(TIME_SLOT_MS - 1)).toBe(0);
    expect(getTimeSlot(TIME_SLOT_MS)).toBe(1);
  });
});

describe('getSlotProgress', () => {
  it('returns 1 at slot start and approaches 0 at slot end', () => {
    expect(getSlotProgress(0)).toBe(1);
    expect(getSlotProgress(TIME_SLOT_MS / 2)).toBeCloseTo(0.5);
    expect(getSlotProgress(TIME_SLOT_MS - 1)).toBeCloseTo(1 / TIME_SLOT_MS);
  });
});

describe('syncCodeForSeed', () => {
  it('is deterministic for fixed seed and slot', async () => {
    const a = await syncCodeForSeed('TESTSEED', 42);
    const b = await syncCodeForSeed('TESTSEED', 42);
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-Z0-9]{4}$/);
  });

  it('differs when slot changes', async () => {
    const a = await syncCodeForSeed('TESTSEED', 1);
    const b = await syncCodeForSeed('TESTSEED', 2);
    expect(a).not.toBe(b);
  });
});

describe('validateSyncCode', () => {
  it('accepts code for current slot', async () => {
    const now = 100_000;
    const slot = getTimeSlot(now);
    const code = await syncCodeForSeed('ABCD1234', slot);
    expect(await validateSyncCode('ABCD1234', code, now)).toBe(true);
  });

  it('accepts adjacent slot within skew tolerance', async () => {
    const now = TIME_SLOT_MS * 5 + 100;
    const slot = getTimeSlot(now);
    const prevCode = await syncCodeForSeed('SKEWTEST', slot - 1);
    expect(await validateSyncCode('SKEWTEST', prevCode, now)).toBe(true);
  });

  it('rejects wrong code', async () => {
    expect(await validateSyncCode('SEED', 'ZZZZ', 0)).toBe(false);
  });

  it('rejects non-4-char input', async () => {
    expect(await validateSyncCode('SEED', 'ABC', 0)).toBe(false);
  });
});
