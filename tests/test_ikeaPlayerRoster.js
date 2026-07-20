/**
 * Unit tests for player roster helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROLE_NAMES,
  formatPlayerName,
  getPlayerByRole,
  playerSelectLabel,
} from '../src/ikea/logic/puzzleData.js';

describe('player roster', () => {
  it('uses the intended player names', () => {
    expect(DEFAULT_ROLE_NAMES).toEqual({
      p1: 'Monique',
      p2: 'Jelle',
      daughter: 'Meike',
    });
  });

  it('formats Monique with alias Mo', () => {
    expect(formatPlayerName(getPlayerByRole('p1'))).toBe('Monique (Mo)');
    expect(playerSelectLabel(getPlayerByRole('p1'))).toBe('Monique (Mo) — Blue Pencil');
  });

  it('formats Jelle and Meike without alias', () => {
    expect(formatPlayerName(getPlayerByRole('p2'))).toBe('Jelle');
    expect(formatPlayerName(getPlayerByRole('daughter'))).toBe('Meike');
  });
});
