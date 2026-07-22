/**
 * Unit tests for Level 2 showroom maze.
 */
import { describe, expect, it } from 'vitest';
import {
  MAZE_EXIT,
  MAZE_MAIN_PATH,
  MAZE_START,
  getBlueprintNodes,
  getLandmarkForRoom,
  getSceneHint,
  getTrapWarnings,
  isAtExit,
  tryMove,
} from '../src/ikkeja/logic/levels/maze.js';

describe('tryMove', () => {
  it('moves along the main route from entrance to hotdogstand', () => {
    let room = MAZE_START;
    for (const dir of MAZE_MAIN_PATH) {
      const result = tryMove(room, dir);
      expect(result.trapped).toBe(false);
      expect(result.moved).toBe(true);
      room = result.roomId;
    }
    expect(isAtExit(room)).toBe(true);
    expect(room).toBe(MAZE_EXIT);
  });

  it('supports the servies → magazijn2 shortcut', () => {
    let room = MAZE_START;
    const shortcutPath = [
      'east',
      'east',
      'east',
      'east',
      'south',
      'west',
      'west',
      'west',
      'south',
      'east',
      'east',
      'south',
      'west',
      'west',
    ];
    for (const dir of shortcutPath) {
      const result = tryMove(room, dir);
      expect(result.trapped).toBe(false);
      expect(result.moved).toBe(true);
      room = result.roomId;
    }
    expect(isAtExit(room)).toBe(true);
    expect(shortcutPath.length).toBeLessThan(MAZE_MAIN_PATH.length);
  });

  it('blocks trap doors', () => {
    const trap = tryMove('huiskamers', 'north');
    expect(trap.trapped).toBe(true);
    expect(trap.moved).toBe(false);
    expect(trap.roomId).toBe('huiskamers');
  });

  it('rejects invalid direction', () => {
    const result = tryMove('entrance', 'west');
    expect(result.moved).toBe(false);
  });
});

describe('getBlueprintNodes', () => {
  it('includes all departments on the map', () => {
    const labels = getBlueprintNodes().map((node) => node.label);
    expect(labels).toContain('Huiskamers');
    expect(labels).toContain('Hotdogstand');
    expect(labels).toContain('Martelwerktuigen');
    expect(labels).toContain('Magazijn (2)');
  });

  it('marks shortcut rooms on the blueprint', () => {
    const slaapkamers = getBlueprintNodes().find((node) => node.id === 'slaapkamers');
    expect(slaapkamers?.shortcuts).toContain('south');
  });
});

describe('getSceneHint', () => {
  it('describes the scene without a room name', () => {
    const hint = getSceneHint('huiskamers');
    expect(hint).toContain('POÄNG');
    expect(hint.toLowerCase()).not.toContain('huiskamer');
  });
});

describe('getTrapWarnings', () => {
  it('warns about the north trap in huiskamers', () => {
    const warnings = getTrapWarnings('huiskamers');
    expect(warnings.some((entry) => entry.direction === 'north')).toBe(true);
    expect(warnings[0]?.warning).toMatch(/Noord/i);
  });

  it('returns no warnings for unknown rooms', () => {
    expect(getTrapWarnings('unknown-room')).toEqual([]);
  });
});

describe('getLandmarkForRoom', () => {
  it('returns POÄNG hint in huiskamers', () => {
    const lm = getLandmarkForRoom('huiskamers');
    expect(lm?.landmark).toContain('POÄNG');
  });
});

describe('isAtExit', () => {
  it('is true only at hotdogstand', () => {
    expect(isAtExit('hotdogstand')).toBe(true);
    expect(isAtExit('kassa')).toBe(false);
  });
});
