/**
 * Level 2: showroom maze navigation and trap detection.
 */
import { MAZE_LANDMARKS, MAZE_ROOMS } from '../puzzleData.js';

export const MAZE_START = 'entrance';
export const MAZE_EXIT = 'hotdogstand';

/** Main-route directions from entrance to hotdogstand (17 steps). */
export const MAZE_MAIN_PATH = [
  'east',
  'east',
  'east',
  'east',
  'south',
  'west',
  'west',
  'west',
  'west',
  'south',
  'east',
  'east',
  'east',
  'east',
  'south',
  'west',
  'west',
];

/** Minimum safe moves on the main route (excluding entrance). */
export const MAZE_SAFE_MOVE_COUNT = MAZE_MAIN_PATH.length;

/** @type {Record<'north'|'south'|'east'|'west', string>} */
export const MAZE_DIRECTION_LABELS = {
  north: 'Noord',
  south: 'Zuid',
  east: 'Oost',
  west: 'West',
};

/** @typedef {'north'|'south'|'east'|'west'} MazeDirection */

/**
 * @typedef {object} MazeTrapWarning
 * @property {MazeDirection} direction
 * @property {string} directionLabel
 * @property {string} warning
 */

/**
 * @typedef {object} MazeMoveResult
 * @property {boolean} moved
 * @property {string} roomId
 * @property {boolean} trapped
 * @property {boolean} won
 * @property {string} [message]
 */

/**
 * Sensory hint for Player 2 — no room name.
 * @param {string} roomId
 * @returns {string}
 */
export function getSceneHint(roomId) {
  if (roomId === MAZE_EXIT) {
    return 'Een groene nooddeur met een exit-bord. Je ruikt vrijheid!';
  }
  const landmark = MAZE_LANDMARKS[roomId];
  if (!landmark) {
    return 'Gele pijlen op de grond en IKKE-JA-meubels overal om je heen.';
  }
  return `Je ziet: ${landmark.landmark}.`;
}

/**
 * Trap warnings for Meike at the current mirrored location.
 * @param {string} roomId
 * @returns {MazeTrapWarning[]}
 */
export function getTrapWarnings(roomId) {
  const room = MAZE_ROOMS[roomId];
  if (!room) {
    return [];
  }

  /** @type {MazeTrapWarning[]} */
  const warnings = [];
  for (const [direction, trapMessage] of Object.entries(room.traps || {})) {
    const dir = /** @type {MazeDirection} */ (direction);
    warnings.push({
      direction: dir,
      directionLabel: MAZE_DIRECTION_LABELS[dir],
      warning: `Niet naar ${MAZE_DIRECTION_LABELS[dir]}! ${trapMessage}`,
    });
  }
  return warnings;
}

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
    shortcuts: room.shortcuts || [],
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
