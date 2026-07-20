/**
 * Dutch crossword types for Level 1.
 * Puzzles are generated per session seed via crosswordLayout.js.
 */

/** @typedef {'across'|'down'} CrosswordDirection */

/**
 * @typedef {object} DutchCrosswordWord
 * @property {string} id
 * @property {number} number
 * @property {CrosswordDirection} direction
 * @property {number} row
 * @property {number} col
 * @property {string} answer - Uppercase Dutch answer (no spaces).
 * @property {string} clue - Dutch clue text (Player 2 / Meike via location lookup).
 * @property {string} location - IKEA magazijnlocatie (e.g. 14-A-042).
 */

/**
 * @typedef {object} DutchCrosswordPuzzle
 * @property {string} id
 * @property {string} title
 * @property {number} rows
 * @property {number} cols
 * @property {DutchCrosswordWord[]} words
 */

/**
 * @typedef {object} WarehouseClueEntry
 * @property {string} location
 * @property {string} clue
 * @property {number} length
 * @property {string} directionLabel
 * @property {number} number
 */

export { DUTCH_WORD_CATALOG } from './dutchWordCatalog.js';
