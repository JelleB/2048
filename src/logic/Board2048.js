/**
 * Pure 2048 board logic (no Phaser).
 * Handles sliding, merging, spawning, and game-over detection.
 */
import { GRID_2048 } from '../constants.js';
import { fillGridWithStartValues, randomSpawnTileValue, roundUpToPowerOfTwo, purgeUnspawnableTiles } from './startTiles.js';

/**
 * @typedef {'up' | 'down' | 'left' | 'right'} Direction
 */

/**
 * Classic 2048 game state.
 */
export class Board2048 {
  /**
   * @param {{ rng?: () => number }} [options]
   */
  constructor(options = {}) {
    /** @type {() => number} */
    this.rng = options.rng ?? Math.random;
    this.size = GRID_2048;
    /** @type {number[][]} */
    this.grid = this.createEmptyGrid();
    this.score = 0;
  }

  /**
   * @returns {number[][]}
   */
  createEmptyGrid() {
    return Array.from({ length: this.size }, () =>
      Array(this.size).fill(0),
    );
  }

  /**
   * @returns {number[][]}
   */
  getGrid() {
    return this.grid.map((row) => [...row]);
  }

  /**
   * @param {number[][]} grid
   */
  setGrid(grid) {
    this.grid = grid.map((row) => [...row]);
  }

  /**
   * @param {number} row
   * @param {number} col
   * @returns {number}
   */
  cell(row, col) {
    return this.grid[row][col];
  }

  /**
   * Fills the board with random tiles (2, 4, 8, or 16).
   */
  start() {
    this.grid = this.createEmptyGrid();
    this.score = 0;
    fillGridWithStartValues(this.grid, this.rng);
  }

  /**
   * @returns {number}
   */
  countTiles() {
    return this.grid.flat().filter((v) => v > 0).length;
  }

  /**
   * @returns {{ row: number, col: number }[]}
   */
  emptyCells() {
    /** @type {{ row: number, col: number }[]} */
    const cells = [];
    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        if (this.grid[r][c] === 0) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  /**
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  spawnAt(row, col) {
    if (this.grid[row][col] !== 0) return false;
    this.grid[row][col] = randomSpawnTileValue(this.grid, this.rng);
    return true;
  }

  /**
   * @returns {boolean}
   */
  spawnAtRandom() {
    const empty = this.emptyCells();
    if (empty.length === 0) return false;
    const idx = Math.floor(this.rng() * empty.length);
    const { row, col } = empty[idx];
    return this.spawnAt(row, col);
  }

  /**
   * @param {Direction} direction
   * @returns {boolean} Whether the grid changed.
   */
  move(direction) {
    const before = JSON.stringify(this.grid);
    const vectors = {
      left: { dr: 0, dc: -1, traverse: 'row', reverse: false },
      right: { dr: 0, dc: 1, traverse: 'row', reverse: true },
      up: { dr: -1, dc: 0, traverse: 'col', reverse: false },
      down: { dr: 1, dc: 0, traverse: 'col', reverse: true },
    };
    const v = vectors[direction];
    if (v.traverse === 'row') {
      for (let r = 0; r < this.size; r += 1) {
        const line = this.getLine('row', r);
        const merged = this.compressLine(line, v.reverse);
        this.setLine('row', r, merged);
      }
    } else {
      for (let c = 0; c < this.size; c += 1) {
        const line = this.getLine('col', c);
        const merged = this.compressLine(line, v.reverse);
        this.setLine('col', c, merged);
      }
    }
    const changed = JSON.stringify(this.grid) !== before;
    if (changed) {
      this.spawnAtRandom();
      this.applySpawnPoolPurge();
    }
    return changed;
  }

  /** Removes tiles that no longer spawn at the current board tier. */
  applySpawnPoolPurge() {
    this.score += purgeUnspawnableTiles(this.grid);
  }

  /** @deprecated Use {@link applySpawnPoolPurge}. */
  applyTierNineTwosPurge() {
    this.applySpawnPoolPurge();
  }

  /**
   * @param {'row' | 'col'} axis
   * @param {number} index
   * @returns {number[]}
   */
  getLine(axis, index) {
    if (axis === 'row') return [...this.grid[index]];
    return this.grid.map((row) => row[index]);
  }

  /**
   * @param {'row' | 'col'} axis
   * @param {number} index
   * @param {number[]} line
   */
  setLine(axis, index, line) {
    if (axis === 'row') {
      this.grid[index] = line;
      return;
    }
    for (let r = 0; r < this.size; r += 1) {
      this.grid[r][index] = line[r];
    }
  }

  /**
   * Slide and merge one line (toward index 0, or reversed toward end).
   * @param {number[]} line
   * @param {boolean} reverse
   * @returns {number[]}
   */
  compressLine(line, reverse) {
    let arr = line.filter((n) => n !== 0);
    if (reverse) arr = arr.reverse();

    /** @type {number[]} */
    const out = [];
    let i = 0;
    while (i < arr.length) {
      if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
        const merged = roundUpToPowerOfTwo(arr[i] * 2);
        out.push(merged);
        this.score += merged;
        i += 2;
      } else {
        out.push(arr[i]);
        i += 1;
      }
    }
    while (out.length < this.size) out.push(0);
    if (reverse) {
      out.reverse();
      while (out.length < this.size) out.unshift(0);
      return out.slice(0, this.size);
    }
    return out;
  }

  /**
   * @returns {boolean}
   */
  canMove() {
    if (this.emptyCells().length > 0) return true;
    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        const v = this.grid[r][c];
        if (c + 1 < this.size && this.grid[r][c + 1] === v) return true;
        if (r + 1 < this.size && this.grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  /**
   * @returns {boolean}
   */
  isGameOver() {
    return !this.canMove();
  }
}
