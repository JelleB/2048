/**
 * Helpers for 8-bit binary LED rows and reveal labels.
 */
import { KNOPPEN_BIT_COUNT } from '../constants.js';

/**
 * Converts a byte to MSB-left bit flags for LED rendering.
 * @param {number} byte Value 0–255.
 * @returns {boolean[]}
 */
export function byteToBits(byte) {
  const value = Math.floor(byte) & 0xff;
  /** @type {boolean[]} */
  const bits = [];
  for (let i = KNOPPEN_BIT_COUNT - 1; i >= 0; i -= 1) {
    bits.push(((value >> i) & 1) === 1);
  }
  return bits;
}

/**
 * Formats a byte as binary string plus decimal for the learning reveal.
 * @param {number} byte
 * @returns {string}
 */
export function formatByte(byte) {
  const value = Math.floor(byte) & 0xff;
  const binary = byteToBits(value).map((on) => (on ? '1' : '0')).join('');
  return `${binary} (${value})`;
}
