/**
 * Level 2: showroom maze navigation and trap detection.
 */
import { MAZE_LANDMARKS, MAZE_ROOMS } from '../puzzleData.js';

export const MAZE_START = 'entrance';
export const MAZE_EXIT = 'exit';

/** Minimum safe moves from entrance to exit (excluding entrance). */
export const MAZE_SAFE_MOVE_COUNT = 5;

/**
 * @typedef {object} MazeMoveResult
 * @property {boolean} moved
 * @property {string} roomId
 * @property {boolean} trapped
 * @property {boolean} won
 * @property {string} [message]
 */

/**
 * Attempts a directional move from the current room.
 * @param {string} roomId
 * @param {'north'|'south'|'east'|'west'} direction
 * @returns {MazeMoveResult}
 */
export function tryMove(roomId, direction) {
  const room = MAZE_ROOMS[roomId];
  if (!room) {
    return { moved: false, roomId, trapped: false, won: false, message: 'Unknown room.' };
  }

  if (room.traps[direction]) {
    return {
      moved: false,
      roomId,
      trapped: true,
      won: false,
      message: room.traps[direction],
    };
  }

  const nextId = room.safeExits[direction];
  if (!nextId) {
    return {
      moved: false,
      roomId,
      trapped: false,
      won: false,
      message: 'No door that way.',
    };
  }

  const nextRoom = MAZE_ROOMS[nextId];
  return {
    moved: true,
    roomId: nextId,
    trapped: false,
    won: Boolean(nextRoom?.isExit),
    message: nextRoom?.isExit ? 'You found the exit!' : `Entered ${nextRoom.label}.`,
  };
}

/**
 * Returns landmark hint for the daughter role at a room.
 * @param {string} roomId
 * @returns {{ landmark: string, hint: string }|null}
 */
export function getLandmarkForRoom(roomId) {
  return MAZE_LANDMARKS[roomId] || null;
}

/**
 * Lists blueprint nodes for Player 1 map rendering.
 * @returns {Array<{ id: string, label: string, x: number, y: number, lockedDoors: string[], isExit: boolean }>}
 */
export function getBlueprintNodes() {
  return Object.entries(MAZE_ROOMS).map(([id, room]) => ({
    id,
    label: room.label,
    x: room.blueprint.x,
    y: room.blueprint.y,
    lockedDoors: room.lockedDoors || [],
    isExit: Boolean(room.isExit),
  }));
}

/**
 * Validates win state.
 * @param {string} roomId
 * @returns {boolean}
 */
export function isAtExit(roomId) {
  return roomId === MAZE_EXIT;
}
