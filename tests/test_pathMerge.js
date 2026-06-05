/**
 * Unit tests for 2248 path-merge connection and rounding rules.
 */
import { describe, it, expect } from 'vitest';
import {
  isValidMergePath,
  isValidPartialMergePath,
  computePathMergeResult,
  computePathMergeScore,
} from '../src/logic/pathMerge.js';

describe('path merge rules', () => {
  it('8 + 8 = 16', () => {
    expect(computePathMergeResult([8, 8])).toBe(16);
  });

  it('8 + 8 + 8 = 32 (24 rounded up)', () => {
    expect(computePathMergeResult([8, 8, 8])).toBe(32);
  });

  it('4 + 4 + 16 is invalid (skips 8)', () => {
    expect(isValidMergePath([4, 4, 16])).toBe(false);
    expect(computePathMergeResult([4, 4, 16])).toBeNull();
  });

  it('4 + 8 is invalid (only one 4 before stepping up)', () => {
    expect(isValidMergePath([4, 8])).toBe(false);
  });

  it('4 + 4 + 8 + 16 = 32', () => {
    expect(computePathMergeResult([4, 4, 8, 16])).toBe(32);
  });

  it('4 + 4 + 4 + 8 + 16 = 64 (36 rounded up)', () => {
    expect(computePathMergeResult([4, 4, 4, 8, 16])).toBe(64);
  });

  it('4 + 4 + 2 is invalid (connects down)', () => {
    expect(isValidMergePath([4, 4, 2])).toBe(false);
  });

  it('allows partial path while dragging 4,4,8', () => {
    expect(isValidPartialMergePath([4, 4, 8])).toBe(true);
    expect(isValidMergePath([4, 4, 8])).toBe(true);
  });

  it('rejects partial path 4,8 while dragging', () => {
    expect(isValidPartialMergePath([4, 8])).toBe(false);
  });

  it('scores exact merges as rounded value', () => {
    expect(computePathMergeScore([8, 8])).toEqual({ tileValue: 16, scoreDelta: 16 });
  });

  it('doubles rounding bonus in score', () => {
    expect(computePathMergeScore([8, 8, 8])).toEqual({ tileValue: 32, scoreDelta: 40 });
    expect(computePathMergeScore([4, 4, 4, 8, 16])).toEqual({
      tileValue: 64,
      scoreDelta: 92,
    });
  });
});
