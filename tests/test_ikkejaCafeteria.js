/**
 * Unit tests for Level 3 cafeteria math puzzle.
 */
import { describe, expect, it } from 'vitest';
import {
  EXPECTED_DOOR_CODE,
  computeReceiptTotal,
  deriveDoorCode,
  getMenuPrice,
  validateDoorCode,
} from '../src/ikkeja/logic/levels/cafeteria.js';

describe('getMenuPrice', () => {
  it('returns prices by id', () => {
    expect(getMenuPrice('kottbullar')).toBe(7);
    expect(getMenuPrice('kids')).toBe(3);
  });
});

describe('computeReceiptTotal', () => {
  it('sums receipt to $23', () => {
    expect(computeReceiptTotal()).toBe(23);
  });
});

describe('deriveDoorCode', () => {
  it('combines prices as 3677', () => {
    expect(deriveDoorCode()).toBe('3677');
    expect(EXPECTED_DOOR_CODE).toBe('3677');
  });
});

describe('validateDoorCode', () => {
  it('accepts correct code only', () => {
    expect(validateDoorCode('3677')).toBe(true);
    expect(validateDoorCode('1234')).toBe(false);
  });
});
