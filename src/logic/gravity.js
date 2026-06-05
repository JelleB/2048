/**
 * Column gravity: tiles fall down until each column has no gaps.
 */

/**
 * Moves all non-zero tiles down within each column (row 0 = top).
 * Mutates the grid in place; one pass is sufficient per column.
 * @param {number[][]} grid Square NxN grid.
 * @returns {number[][]} The same grid reference.
 */
export function applyGravity(grid) {
  const size = grid.length;
  for (let col = 0; col < size; col += 1) {
    /** @type {number[]} */
    const columnTiles = [];
    for (let row = 0; row < size; row += 1) {
      const value = grid[row][col];
      if (value !== 0) columnTiles.push(value);
    }
    for (let row = 0; row < size; row += 1) {
      grid[row][col] = 0;
    }
    const startRow = size - columnTiles.length;
    for (let i = 0; i < columnTiles.length; i += 1) {
      grid[startRow + i][col] = columnTiles[i];
    }
  }
  return grid;
}

/**
 * @param {number[][]} grid
 * @returns {boolean} True when no tile can fall further.
 */
export function isGravitySettled(grid) {
  const size = grid.length;
  for (let col = 0; col < size; col += 1) {
    for (let row = size - 2; row >= 0; row -= 1) {
      if (grid[row][col] !== 0 && grid[row + 1][col] === 0) return false;
    }
  }
  return true;
}

/**
 * Moves every tile that can fall one row down (animated step).
 * @param {number[][]} grid
 * @returns {boolean} Whether any tile moved.
 */
export function applyGravityOneStep(grid) {
  const size = grid.length;
  let moved = false;
  for (let row = size - 2; row >= 0; row -= 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row][col] !== 0 && grid[row + 1][col] === 0) {
        grid[row + 1][col] = grid[row][col];
        grid[row][col] = 0;
        moved = true;
      }
    }
  }
  return moved;
}

/**
 * @typedef {{ fromRow: number, fromCol: number, toRow: number, toCol: number, value: number }} GravityMove
 */

/**
 * Lists one-row drops that {@link applyGravityOneStep} would perform (does not mutate).
 * @param {number[][]} grid
 * @returns {GravityMove[]}
 */
export function previewGravityOneStepMoves(grid) {
  const clone = grid.map((row) => [...row]);
  /** @type {GravityMove[]} */
  const moves = [];
  const size = clone.length;
  for (let row = size - 2; row >= 0; row -= 1) {
    for (let col = 0; col < size; col += 1) {
      if (clone[row][col] !== 0 && clone[row + 1][col] === 0) {
        moves.push({
          fromRow: row,
          fromCol: col,
          toRow: row + 1,
          toCol: col,
          value: clone[row][col],
        });
        clone[row + 1][col] = clone[row][col];
        clone[row][col] = 0;
      }
    }
  }
  return moves;
}
