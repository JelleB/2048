/**
 * Unit tests for Level 2 showroom maze.
 */
import { describe, expect, it } from 'vitest';
import {
  MAZE_START,
  getLandmarkForRoom,
  isAtExit,
  tryMove,
} from '../src/ikea/logic/levels/maze.js';

describe('tryMove', () => {
  it('moves along safe path from entrance to exit', () => {
    let room = MAZE_START;
    const path = ['east', 'east', 'south', 'east', 'south', 'east'];
    for (const dir of path) {
      const result = tryMove(room, dir);
      expect(result.trapped).toBe(false);
      expect(result.moved).toBe(true);
      room = result.roomId;
    }
    expect(isAtExit(room)).toBe(true);
  });

  it('blocks trap doors', () => {
    const trap = tryMove('livingRoom', 'north');
    expect(trap.trapped).toBe(true);
    expect(trap.moved).toBe(false);
    expect(trap.roomId).toBe('livingRoom');
  });

  it('rejects invalid direction', () => {
    const result = tryMove('entrance', 'west');
    expect(result.moved).toBe(false);
  });
});

describe('getLandmarkForRoom', () => {
  it('returns POÄNG hint in living room', () => {
    const lm = getLandmarkForRoom('livingRoom');
    expect(lm?.landmark).toContain('POÄNG');
  });
});

describe('isAtExit', () => {
  it('is true only at exit room', () => {
    expect(isAtExit('exit')).toBe(true);
    expect(isAtExit('cafeteria')).toBe(false);
  });
});
