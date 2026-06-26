/**
 * Responsive layout helpers for Phaser scenes (mobile-first sizing).
 */

/**
 * Computes square cell size and board offset for centering.
 * @param {number} gameWidth
 * @param {number} gameHeight
 * @param {number} gridSize NxN cells
 * @param {number} [paddingRatio] Fraction of min dimension reserved for HUD
 * @returns {{ cellSize: number, boardSize: number, offsetX: number, offsetY: number, gap: number }}
 */
export function computeBoardLayout(
  gameWidth,
  gameHeight,
  gridSize,
  paddingRatio = 0.22,
) {
  const gap = Math.max(4, Math.floor(Math.min(gameWidth, gameHeight) * 0.012));
  const usableW = gameWidth * (1 - paddingRatio * 0.5);
  const usableH = gameHeight * (1 - paddingRatio);
  const boardSize = Math.min(usableW, usableH) * 0.92;
  const cellSize = Math.floor((boardSize - gap * (gridSize + 1)) / gridSize);
  const actualBoard = cellSize * gridSize + gap * (gridSize + 1);
  const offsetX = (gameWidth - actualBoard) / 2;
  const offsetY = gameHeight * paddingRatio * 0.35 + (usableH - actualBoard) / 2;
  return { cellSize, boardSize: actualBoard, offsetX, offsetY, gap };
}

/**
 * Maps pointer position to grid cell.
 * @param {number} px
 * @param {number} py
 * @param {{ offsetX: number, offsetY: number, cellSize: number, gap: number }} layout
 * @param {number} gridSize
 * @returns {{ row: number, col: number } | null}
 */
export function pointerToCell(px, py, layout, gridSize) {
  const { offsetX, offsetY, cellSize, gap } = layout;
  const step = cellSize + gap;
  const col = Math.floor((px - offsetX - gap) / step);
  const row = Math.floor((py - offsetY - gap) / step);
  if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) return null;
  const cellLeft = offsetX + gap + col * step;
  const cellTop = offsetY + gap + row * step;
  if (px < cellLeft || px > cellLeft + cellSize) return null;
  if (py < cellTop || py > cellTop + cellSize) return null;
  return { row, col };
}

/**
 * Whether pointer movement should start a nudge-drag instead of a tap-toggle.
 * @param {number} startX
 * @param {number} startY
 * @param {number} x
 * @param {number} y
 * @param {number} thresholdPx
 * @returns {boolean}
 */
export function pointerMovedBeyondThreshold(startX, startY, x, y, thresholdPx) {
  return Math.abs(x - startX) > thresholdPx || Math.abs(y - startY) > thresholdPx;
}

/**
 * Pixel center of a grid cell for tweens.
 * @param {{ offsetX: number, offsetY: number, cellSize: number, gap: number }} layout
 * @param {number} row
 * @param {number} col
 * @returns {{ x: number, y: number }}
 */
export function cellCenter(layout, row, col) {
  const { offsetX, offsetY, cellSize, gap } = layout;
  const step = cellSize + gap;
  return {
    x: offsetX + gap + col * step + cellSize / 2,
    y: offsetY + gap + row * step + cellSize / 2,
  };
}

/**
 * @param {number} value
 * @returns {number} Background color for tile value.
 */
export function tileColor(value) {
  const palette = {
    0: 0x3d3d5c,
    2: 0xeee4da,
    4: 0xede0c8,
    8: 0xf2b179,
    16: 0xf59563,
    32: 0xf67c5f,
    64: 0xf65e3b,
    128: 0xedcf72,
    256: 0xedcc61,
    512: 0xedc850,
    1024: 0xedc53f,
    2048: 0xedc22e,
  };
  return palette[value] ?? 0x3c3a32;
}

/**
 * @param {number} value
 * @returns {string}
 */
export function tileTextColor(value) {
  return value <= 4 ? '#1a1a2e' : '#f9f6f2';
}
