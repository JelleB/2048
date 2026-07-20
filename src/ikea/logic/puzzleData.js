/**
 * Static puzzle content for all four IKEA escape room levels.
 */

/** Showroom maze room graph. */
export const MAZE_ROOMS = {
  entrance: {
    label: 'Entrance',
    safeExits: { east: 'livingRoom' },
    traps: {},
    blueprint: { x: 0, y: 1 },
  },
  livingRoom: {
    label: 'Living Room',
    safeExits: { east: 'kitchen' },
    traps: { north: 'Locked showroom trap!' },
    blueprint: { x: 1, y: 1 },
    lockedDoors: ['north'],
  },
  kitchen: {
    label: 'Kitchen',
    safeExits: { south: 'bedroom' },
    traps: { west: 'Warehouse dead-end!' },
    blueprint: { x: 2, y: 1 },
    lockedDoors: ['west'],
  },
  bedroom: {
    label: 'Bedroom',
    safeExits: { east: 'lighting' },
    traps: {},
    blueprint: { x: 2, y: 2 },
  },
  lighting: {
    label: 'Lighting',
    safeExits: { south: 'cafeteria' },
    traps: {},
    blueprint: { x: 3, y: 2 },
  },
  cafeteria: {
    label: 'Cafeteria',
    safeExits: { east: 'exit' },
    traps: {},
    blueprint: { x: 3, y: 3 },
  },
  exit: {
    label: 'Exit Door',
    safeExits: {},
    traps: {},
    blueprint: { x: 4, y: 3 },
    isExit: true,
  },
};

/** Daughter landmark hints per room (when standing in that room). */
export const MAZE_LANDMARKS = {
  entrance: { landmark: 'Welcome arrows', hint: 'Head East into the showroom maze.' },
  livingRoom: { landmark: 'POÄNG chair', hint: 'POÄNG chair points East — follow it!' },
  kitchen: { landmark: 'BLÅHAJ shark', hint: 'BLÅHAJ says avoid North — it is a trap!' },
  bedroom: { landmark: 'KÖTTBULLAR sign', hint: 'The path continues East toward Lighting!' },
  lighting: { landmark: 'BILLY boxes', hint: 'Stack of BILLY boxes — head South toward food!' },
  cafeteria: { landmark: 'Lingonberry display', hint: 'You smell freedom — go East to the Exit!' },
};

/** Cafeteria menu items with rune labels (prices hidden from P2 until decoded). */
export const CAFETERIA_MENU = [
  { id: 'kottbullar', name: 'KÖTTBULLAR', rune: 'ᚠ', price: 7 },
  { id: 'princess', name: 'Princess Cake', rune: 'ᚢ', price: 6 },
  { id: 'kids', name: 'Kids Meal', rune: 'ᚦ', price: 3 },
  { id: 'coffee', name: 'Coffee', rune: 'ᚨ', price: 2 },
];

/** P1 receipt line items. */
export const CAFETERIA_RECEIPT = {
  total: 23,
  items: [
    { name: 'KÖTTBULLAR', qty: 2 },
    { name: 'Princess Cake', qty: 1 },
    { name: 'Kids Meal', qty: 1 },
  ],
};

/** Daughter-only kids meal card. */
export const DAUGHTER_KIDS_MEAL_PRICE = 3;

/** Allen key colors for level 4 rhythm puzzle. */
export const ALLEN_KEY_COLORS = ['red', 'blue', 'yellow', 'green'];

/** Role display defaults for certificate and session. */
export const DEFAULT_ROLE_NAMES = {
  p1: 'Monique',
  p2: 'Jelle',
  daughter: 'Meike',
};

/**
 * Fixed player roster for this escape room.
 * @typedef {object} PlayerProfile
 * @property {'p1'|'p2'|'daughter'} role
 * @property {string} name
 * @property {string} [alias]
 * @property {string} title
 * @property {string} description
 */

/** @type {PlayerProfile[]} */
export const PLAYER_ROSTER = [
  {
    role: 'p1',
    name: 'Monique',
    alias: 'Mo',
    title: 'Blue Pencil',
    description: 'Navigator & Information Reader',
  },
  {
    role: 'p2',
    name: 'Jelle',
    title: 'Yellow Tape Measure',
    description: 'Action & Code Entry',
  },
  {
    role: 'daughter',
    name: 'Meike',
    title: 'Småland Specialist',
    description: "Visual Guide & Map Holder",
  },
];

/**
 * @param {'p1'|'p2'|'daughter'} role
 * @returns {PlayerProfile}
 */
export function getPlayerByRole(role) {
  const player = PLAYER_ROSTER.find((entry) => entry.role === role);
  if (!player) {
    throw new Error(`Unknown role: ${role}`);
  }
  return player;
}

/**
 * @param {PlayerProfile} player
 * @returns {string}
 */
export function formatPlayerName(player) {
  return player.alias ? `${player.name} (${player.alias})` : player.name;
}

/**
 * Dropdown label for a player profile.
 * @param {PlayerProfile} player
 * @returns {string}
 */
export function playerSelectLabel(player) {
  return `${formatPlayerName(player)} — ${player.title}`;
}

/**
 * Default names for all three players (certificate + session).
 * @returns {{ nameP1: string, nameP2: string, nameDaughter: string }}
 */
export function defaultSessionNames() {
  return {
    nameP1: DEFAULT_ROLE_NAMES.p1,
    nameP2: DEFAULT_ROLE_NAMES.p2,
    nameDaughter: DEFAULT_ROLE_NAMES.daughter,
  };
}
