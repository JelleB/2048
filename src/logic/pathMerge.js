/**
 * Path-merge rules for 2248.
 *
 * Connection rules (path order):
 * - Values never decrease (no connecting down).
 * - When value rises, next cell must be exactly double the previous cell (no skipped rung).
 * - First step up from the starting value requires at least two of that value in the path.
 *
 * Merge result: sum of path values, rounded up to the next power of two.
 * Score per merge: rounded + rounded - sum (rounding bonus counts twice).
 */
import { roundUpToPowerOfTwo } from './startTiles.js';

/**
 * @param {number[]} values Tile values in path order.
 * @returns {boolean}
 */
export function isValidPartialMergePath(values) {
  if (values.length === 0) return false;
  if (values.some((v) => v <= 0)) return false;
  if (values.length === 1) return true;

  const startVal = values[0];

  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1];
    const curr = values[i];
    if (curr < prev) return false;
    if (curr > prev && curr !== prev * 2) return false;

    if (curr > prev && prev === startVal) {
      const countStart = values.slice(0, i).filter((v) => v === startVal).length;
      if (countStart < 2) return false;
    }
  }

  return true;
}

/**
 * @param {number[]} values
 * @returns {boolean}
 */
export function isValidMergePath(values) {
  return values.length >= 2 && isValidPartialMergePath(values);
}

/**
 * @param {number[]} values
 * @returns {number | null}
 */
export function computePathMergeResult(values) {
  const scored = computePathMergeScore(values);
  return scored?.tileValue ?? null;
}

/**
 * @param {number[]} values
 * @returns {{ tileValue: number, scoreDelta: number } | null}
 */
export function computePathMergeScore(values) {
  if (!isValidMergePath(values)) return null;
  const sum = values.reduce((total, v) => total + v, 0);
  const rounded = roundUpToPowerOfTwo(sum);
  return {
    tileValue: rounded,
    scoreDelta: rounded + rounded - sum,
  };
}
