/**
 * Pure 2248-style path-link board logic (no Phaser).
 * Player draws a non-decreasing path (double-only steps up); sum rounds up to a power of two.
 */
import { GRID_2248 } from '../constants.js';
import { fillGridWithStartValues, randomSpawnTileValue, purgeUnspawnableTiles } from './startTiles.js';
import {
  isValidPartialMergePath,
  isValidMergePath,
  computePathMergeScore,
} from './pathMerge.js';
import { applyGravity } from './gravity.js';

/**
 * @typedef {{ row: number, col: number }} Cell
 */

/**
 * 2248 path-merge game state.
 */
export class Board2248 {
  /**
   * @param {{ rng?: () => number }} [options]
   */
  constructor(options = {}) {
    /** @type {() => number} */
    this.rng = options.rng ?? Math.random;
    this.size = GRID_2248;
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
   * Whether two tile values can link in a path (same value).
   * @param {number} a
   * @param {number} b
   * @returns {boolean}
   */
  canLink(a, b) {
    return a === b && a > 0;
  }

  /**
   * @returns {Cell[]}
   */
  emptyCells() {
    /** @type {Cell[]} */
    const cells = [];
    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        if (this.grid[r][c] === 0) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  /**
   * Spawns one tile at the topmost empty cell in a random column (no gravity).
   * @returns {boolean}
   */
  spawnAtTopRandomColumn() {
    /** @type {number[]} */
    const columnsWithSpace = [];
    for (let col = 0; col < this.size; col += 1) {
      if (this.grid.some((row) => row[col] === 0)) {
        columnsWithSpace.push(col);
      }
    }
    if (columnsWithSpace.length === 0) return false;

    const col =
      columnsWithSpace[Math.floor(this.rng() * columnsWithSpace.length)];
    let spawnRow = 0;
    while (spawnRow < this.size && this.grid[spawnRow][col] !== 0) {
      spawnRow += 1;
    }
    if (spawnRow >= this.size) return false;

    this.grid[spawnRow][col] = randomSpawnTileValue(this.grid, this.rng);
    return true;
  }

  /**
   * Spawns one tile at the topmost empty cell in a random column, then applies gravity.
   * @returns {boolean}
   */
  spawnOneAndFall() {
    if (!this.spawnAtTopRandomColumn()) return false;
    applyGravity(this.grid);
    return true;
  }

  /**
   * Clears tiles that no longer spawn at the current board tier (raw score).
   * @returns {number} Points added.
   */
  applySpawnPoolPurge() {
    const points = purgeUnspawnableTiles(this.grid);
    this.score += points;
    return points;
  }

  /** @deprecated Use {@link applySpawnPoolPurge}. */
  applyTierNineTwosPurge() {
    return this.applySpawnPoolPurge();
  }

  /**
   * After merge and gravity, spawns tiles one at a time until the board is full.
   */
  refillUntilFull() {
    applyGravity(this.grid);
    while (this.emptyCells().length > 0) {
      if (!this.spawnOneAndFall()) break;
    }
  }

  /**
   * @returns {boolean}
   */
  spawnAtRandom() {
    const empty = this.emptyCells();
    if (empty.length === 0) return false;
    const idx = Math.floor(this.rng() * empty.length);
    const { row, col } = empty[idx];
    this.grid[row][col] = randomSpawnTileValue(this.grid, this.rng);
    return true;
  }

  /**
   * @param {Cell} a
   * @param {Cell} b
   * @returns {boolean}
   */
  areAdjacent(a, b) {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return dr <= 1 && dc <= 1 && (dr + dc > 0);
  }

  /**
   * @param {Cell[]} path
   * @returns {number[]}
   */
  pathValues(path) {
    return path.map(({ row, col }) => this.grid[row][col]);
  }

  /**
   * Removes the last path cell when the pointer returns to the penultimate cell.
   * @param {Cell[]} path
   * @param {Cell} cell
   * @returns {Cell[] | null} Shortened path, or null if not a one-step rollback.
   */
  tryRollbackPath(path, cell) {
    if (path.length < 2) return null;
    const butLast = path[path.length - 2];
    if (butLast.row !== cell.row || butLast.col !== cell.col) return null;
    const last = path[path.length - 1];
    if (!this.areAdjacent(last, cell)) return null;
    return path.slice(0, path.length - 1);
  }

  /**
   * Whether adding a cell keeps a valid partial chain (for drag).
   * @param {Cell[]} path
   * @param {Cell} next
   * @returns {boolean}
   */
  canExtendPath(path, next) {
    if (this.grid[next.row][next.col] === 0) return false;
    const values = [...this.pathValues(path), this.grid[next.row][next.col]];
    return isValidPartialMergePath(values);
  }

  /**
   * @param {Cell[]} path
   * @returns {boolean}
   */
  isValidPath(path) {
    if (path.length < 2) return false;

    for (let i = 0; i < path.length; i += 1) {
      const { row, col } = path[i];
      if (row < 0 || col < 0 || row >= this.size || col >= this.size) {
        return false;
      }
      if (this.grid[row][col] === 0) return false;
      if (i > 0 && !this.areAdjacent(path[i - 1], path[i])) return false;
    }

    return isValidMergePath(this.pathValues(path));
  }

  /**
   * Applies merge only (no gravity or refill). Used by the scene for animated settle.
   * @param {Cell[]} path
   * @returns {boolean}
   */
  applyPathMerge(path) {
    if (!this.isValidPath(path)) return false;

    const merge = computePathMergeScore(this.pathValues(path));
    if (merge === null) return false;

    const last = path[path.length - 1];
    for (const { row, col } of path) {
      this.grid[row][col] = 0;
    }
    this.grid[last.row][last.col] = merge.tileValue;
    this.score += merge.scoreDelta;
    this.applySpawnPoolPurge();
    return true;
  }

  /**
   * Applies path merge, gravity, then refills the board one falling spawn at a time.
   * @param {Cell[]} path
   * @returns {boolean}
   */
  applyPath(path) {
    if (!this.applyPathMerge(path)) return false;
    this.refillUntilFull();
    return true;
  }

  /**
   * Runs column gravity until tiles settle (single pass per call).
   */
  settleGravity() {
    applyGravity(this.grid);
  }

  /**
   * @returns {boolean}
   */
  hasValidMove() {
    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        const v = this.grid[r][c];
        if (v === 0) continue;
        const neighbors = [
          { row: r - 1, col: c },
          { row: r + 1, col: c },
          { row: r, col: c - 1 },
          { row: r, col: c + 1 },
          { row: r - 1, col: c - 1 },
          { row: r - 1, col: c + 1 },
          { row: r + 1, col: c - 1 },
          { row: r + 1, col: c + 1 },
        ];
        for (const n of neighbors) {
          if (n.row < 0 || n.col < 0 || n.row >= this.size || n.col >= this.size) {
            continue;
          }
          if (this.canLink(v, this.grid[n.row][n.col])) return true;
        }
      }
    }
    return false;
  }

  /**
   * @returns {boolean}
   */
  isGameOver() {
    return !this.hasValidMove();
  }
}
