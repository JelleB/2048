/**
 * Static puzzle content for all four IKEA escape room levels.
 */

/** Showroom maze room graph — IKEA afdelingen with optional korte routes. */
export const MAZE_ROOMS = {
  entrance: {
    label: 'Ingang',
    safeExits: { east: 'huiskamers' },
    traps: {
      north: 'Personeelsingang — geen toegang.',
      south: 'Roltrap naar het restaurant — doodlopend.',
      west: 'Parkeergarage — te koud om terug.',
    },
    blueprint: { x: 0, y: 0 },
  },
  huiskamers: {
    label: 'Huiskamers',
    safeExits: { west: 'entrance', east: 'slaapkamers' },
    traps: {
      north: 'Woonkamer-display achter glas — afgesloten.',
      south: 'Eetkamer-pop-up — alleen voor personeel.',
    },
    lockedDoors: ['north'],
    blueprint: { x: 1, y: 0 },
  },
  slaapkamers: {
    label: 'Slaapkamers',
    safeExits: { west: 'huiskamers', east: 'kinderkamers', south: 'keukens' },
    traps: { north: 'Matrasafdeling — te zacht, je blijft hangen.' },
    shortcuts: ['south'],
    blueprint: { x: 2, y: 0 },
  },
  kinderkamers: {
    label: 'Kinderkamers',
    safeExits: { west: 'slaapkamers', east: 'kantoor' },
    traps: {
      north: 'Småland ouders — geen doorgang.',
      south: 'Ballenbak — val in!',
    },
    blueprint: { x: 3, y: 0 },
  },
  kantoor: {
    label: 'Kantoor',
    safeExits: { west: 'kinderkamers', south: 'badkamers' },
    traps: {
      north: 'Printerruimte — papierstoring.',
      east: 'IKEA Family balie — wachtrij val.',
    },
    blueprint: { x: 4, y: 0 },
  },
  badkamers: {
    label: 'Badkamers',
    safeExits: { north: 'kantoor', west: 'keukens' },
    traps: {
      south: 'Demo-douche — alles nat.',
      east: 'Showroom-toilet — bezet.',
    },
    blueprint: { x: 4, y: 1 },
  },
  keukens: {
    label: 'Keukens',
    safeExits: { east: 'badkamers', west: 'pannen', north: 'slaapkamers' },
    traps: { south: 'Keuken-eiland montage — schroeven overal.' },
    shortcuts: ['north'],
    blueprint: { x: 3, y: 1 },
  },
  pannen: {
    label: 'Pannen',
    safeExits: { east: 'keukens', west: 'servies' },
    traps: {
      north: 'Messenset display — scherp!',
      south: 'Grillhoek — te heet.',
    },
    blueprint: { x: 2, y: 1 },
  },
  servies: {
    label: 'Servies',
    safeExits: { east: 'pannen', west: 'martelwerktuigen', south: 'magazijn2' },
    traps: { north: 'Glazen rek — alles kapot.' },
    shortcuts: ['south'],
    blueprint: { x: 1, y: 1 },
  },
  martelwerktuigen: {
    label: 'Martelwerktuigen',
    safeExits: { east: 'servies', south: 'planten' },
    traps: {
      north: 'ALLEMÄHNER rek — instabiel.',
      west: 'Retourhoek — je raakt kwijt.',
    },
    blueprint: { x: 0, y: 1 },
  },
  planten: {
    label: 'Planten',
    safeExits: { north: 'martelwerktuigen', east: 'magazijn1' },
    traps: {
      south: 'Kweekkas — te vochtig.',
      west: 'Tuinmeubelen buiten — deur dicht.',
    },
    blueprint: { x: 0, y: 2 },
  },
  magazijn1: {
    label: 'Magazijn (1)',
    safeExits: { west: 'planten', east: 'magazijn2' },
    traps: {
      north: 'Heftruck route — gevaarlijk.',
      south: 'Palletstapel — omgevallen.',
    },
    blueprint: { x: 1, y: 2 },
  },
  magazijn2: {
    label: 'Magazijn (2)',
    safeExits: { west: 'magazijn1', east: 'magazijn3', north: 'servies', south: 'kassa' },
    traps: { west: 'Vorkheftruck laadperron — geblokkeerd.' },
    shortcuts: ['north', 'south'],
    blueprint: { x: 2, y: 2 },
  },
  magazijn3: {
    label: 'Magazijn (3)',
    safeExits: { west: 'magazijn2', east: 'bijnaKlaar' },
    traps: {
      north: 'Inkomende vracht — afgesloten.',
      south: 'Containerterrein — geen uitgang.',
    },
    blueprint: { x: 3, y: 2 },
  },
  bijnaKlaar: {
    label: 'Bijna-klaar-sale',
    safeExits: { west: 'magazijn3', south: 'koopjeshoek' },
    traps: {
      north: 'Defecte banken — niet betreden.',
      east: 'Aanbieding-rollator — valgevaar.',
    },
    blueprint: { x: 4, y: 2 },
  },
  koopjeshoek: {
    label: 'Koopjeshoek',
    safeExits: { north: 'bijnaKlaar', west: 'kassa' },
    traps: {
      south: 'Restpartij tapijten — stapel instort.',
      east: 'Impulsaankopen — geen uitgang.',
    },
    blueprint: { x: 4, y: 3 },
  },
  kassa: {
    label: 'Kassa',
    safeExits: { east: 'koopjeshoek', west: 'hotdogstand', north: 'magazijn2' },
    traps: { south: 'Self-checkout — scanfout, blijf hangen.' },
    shortcuts: ['north'],
    blueprint: { x: 3, y: 3 },
  },
  hotdogstand: {
    label: 'Hotdogstand',
    safeExits: { east: 'kassa' },
    traps: {
      north: 'Koffiecorner — wachtrij.',
      south: 'Softijs machine — plakkerig.',
      west: 'Uitgang naar parkeerplaats — nog niet!',
    },
    blueprint: { x: 2, y: 3 },
    isExit: true,
  },
};

/** Sensory landmarks per room (Player 2 scene hints). */
export const MAZE_LANDMARKS = {
  entrance: { landmark: 'Welkomst-pijlen en gele tasrekken', hint: 'Start richting huiskamers.' },
  huiskamers: { landmark: 'POÄNG fauteuils en KALLAX wanden', hint: 'Door naar slaapkamers.' },
  slaapkamers: { landmark: 'MALM bedden en HEMNES kasten', hint: 'Langs kinderkamers of korte route zuid.' },
  kinderkamers: { landmark: 'STUVA speelhoek en FLISAT tafel', hint: 'Richting kantoor.' },
  kantoor: { landmark: 'MICKE bureaus en MARKERAD lamp', hint: 'Naar badkamers beneden.' },
  badkamers: { landmark: 'GODMORGON wastafels en spiegels', hint: 'Door naar keukens.' },
  keukens: { landmark: 'METOD keukenblokken en voorbeeld-eiland', hint: 'Naar pannen of korte route terug.' },
  pannen: { landmark: 'SKÅNKA pannenset en kookgerei', hint: 'Servies is westwaarts.' },
  servies: { landmark: 'FÄRGRIK borden en glazen rek', hint: 'Martelwerktuigen west, magazijn shortcut zuid.' },
  martelwerktuigen: { landmark: 'BILLY met extra schroefsets', hint: 'Naar planten beneden.' },
  planten: { landmark: 'FEJKA kunstplanten en grote cactussen', hint: 'Magazijn (1) is oostwaarts.' },
  magazijn1: { landmark: 'Palletrek rij A met flatpacks', hint: 'Door naar magazijn (2).' },
  magazijn2: { landmark: 'Heftruck parkeerplek en rek 42', hint: 'Korte routes naar servies of kassa.' },
  magazijn3: { landmark: 'Scan-station en rollencontainer', hint: 'Bijna-klaar-sale is oost.' },
  bijnaKlaar: { landmark: 'Oranje stickers en deuken in karton', hint: 'Koopjeshoek beneden.' },
  koopjeshoek: { landmark: 'As-is rekken met rode prijskaartjes', hint: 'Kassa is west.' },
  kassa: { landmark: 'Kassaband nummer 12 piept', hint: 'Hotdogstand west, magazijn shortcut noord.' },
  hotdogstand: { landmark: 'Geur van KÖTTBULLAR en mosterd', hint: 'Je bent er bijna — uitgang!' },
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
