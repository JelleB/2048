/**
 * Unit tests for 8-bit LED display helpers.
 */
import { describe, it, expect } from 'vitest';
import { byteToBits, formatByte } from '../src/logic/binaryDisplay.js';

describe('binaryDisplay', () => {
  it('byteToBits returns MSB-left for zero', () => {
    expect(byteToBits(0)).toEqual([false, false, false, false, false, false, false, false]);
  });

  it('byteToBits returns MSB-left for 255', () => {
    expect(byteToBits(255)).toEqual([true, true, true, true, true, true, true, true]);
  });

  it('byteToBits encodes 181 as 10110101', () => {
    expect(byteToBits(181)).toEqual([true, false, true, true, false, true, false, true]);
  });

  it('formatByte shows binary and decimal', () => {
    expect(formatByte(181)).toBe('10110101 (181)');
    expect(formatByte(0)).toBe('00000000 (0)');
    expect(formatByte(255)).toBe('11111111 (255)');
  });
});
