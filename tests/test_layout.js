/**
 * Unit tests for responsive board layout helpers.
 */
import { describe, it, expect } from 'vitest';
import {
  computeBoardLayout,
  pointerToCell,
  cellCenter,
  tileColor,
  tileTextColor,
} from '../src/ui/layout.js';

describe('computeBoardLayout', () => {
  it('returns positive cell size and centered offsets', () => {
    const layout = computeBoardLayout(480, 800, 4);
    expect(layout.cellSize).toBeGreaterThan(0);
    expect(layout.boardSize).toBeGreaterThan(0);
    expect(layout.offsetX).toBeGreaterThanOrEqual(0);
    expect(layout.offsetY).toBeGreaterThan(0);
    expect(layout.gap).toBeGreaterThanOrEqual(4);
  });

  it('uses smaller cells when more HUD padding is reserved', () => {
    const tight = computeBoardLayout(480, 800, 5, 0.22);
    const loose = computeBoardLayout(480, 800, 5, 0.35);
    expect(loose.cellSize).toBeLessThanOrEqual(tight.cellSize);
  });
});

describe('pointerToCell', () => {
  const layout = computeBoardLayout(480, 800, 5);

  it('maps pointer inside a cell to row and col', () => {
    const center = cellCenter(layout, 2, 3);
    expect(pointerToCell(center.x, center.y, layout, 5)).toEqual({
      row: 2,
      col: 3,
    });
  });

  it('returns null outside the board', () => {
    expect(pointerToCell(0, 0, layout, 5)).toBeNull();
    expect(pointerToCell(9999, 9999, layout, 5)).toBeNull();
  });

  it('returns null in gap between cells', () => {
    const { offsetX, offsetY, gap, cellSize } = layout;
    const step = cellSize + gap;
    const betweenCols = offsetX + gap + cellSize + gap * 0.5;
    const inRow = offsetY + gap + cellSize * 0.5;
    expect(pointerToCell(betweenCols, inRow, layout, 5)).toBeNull();
    expect(pointerToCell(offsetX + gap * 0.5, offsetY + gap * 0.5, layout, 5)).toBeNull();
  });
});

describe('cellCenter', () => {
  it('returns pixel center for a grid cell', () => {
    const layout = computeBoardLayout(400, 600, 4);
    const { x, y } = cellCenter(layout, 0, 0);
    expect(x).toBeGreaterThan(layout.offsetX);
    expect(y).toBeGreaterThan(layout.offsetY);
  });
});

describe('tile styling', () => {
  it('returns palette colors for known tile values', () => {
    expect(tileColor(2)).toBe(0xeee4da);
    expect(tileColor(2048)).toBe(0xedc22e);
  });

  it('returns fallback color for unknown values', () => {
    expect(tileColor(9999)).toBe(0x3c3a32);
    expect(tileColor(0)).toBe(0x3d3d5c);
  });

  it('chooses dark or light text by tile value', () => {
    expect(tileTextColor(2)).toBe('#1a1a2e');
    expect(tileTextColor(8)).toBe('#f9f6f2');
  });
});
