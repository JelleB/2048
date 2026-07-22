/**
 * Unit tests for player roster helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROLE_NAMES,
  formatPlayerName,
  getPlayerByRole,
  playerSelectLabel,
} from '../src/ikkeja/logic/puzzleData.js';

describe('player roster', () => {
  it('uses generic player names', () => {
    expect(DEFAULT_ROLE_NAMES).toEqual({
      p1: 'Player 1',
      p2: 'Player 2',
      daughter: 'Player 3',
    });
  });

  it('formats Player 1 with Navigator title', () => {
    expect(formatPlayerName(getPlayerByRole('p1'))).toBe('Player 1');
    expect(playerSelectLabel(getPlayerByRole('p1'))).toBe('Player 1 — Navigator');
  });

  it('formats Player 2 and Player 3', () => {
    expect(formatPlayerName(getPlayerByRole('p2'))).toBe('Player 2');
    expect(formatPlayerName(getPlayerByRole('daughter'))).toBe('Player 3');
    expect(playerSelectLabel(getPlayerByRole('daughter'))).toBe('Player 3 — Hints');
  });
});
