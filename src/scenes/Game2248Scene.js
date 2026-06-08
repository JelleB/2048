/**
 * Phaser scene for 2248-style path linking: drag across matching tiles.
 */
import Phaser from 'phaser';
import { Board2248 } from '../logic/Board2248.js';
import { GRAVITY_STEP_MS, SPAWN_PAUSE_MS } from '../constants.js';
import {
  applyGravityOneStep,
  isGravitySettled,
  previewGravityOneStepMoves,
} from '../logic/gravity.js';
import {
  computeBoardLayout,
  pointerToCell,
  cellCenter,
  tileColor,
  tileTextColor,
} from '../ui/layout.js';
import {
  addGameControlButtons,
  formatScoreLine,
  initBoardFromStorage,
  persistGameState,
  startNewGame,
} from './gamePersistence.js';

export class Game2248Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game2248' });
  }

  /**
   * @param {import('../persistence/gameStorage.js').SavedGameState} [data]
   */
  create(data) {
    /** @type {Board2248} */
    this.board = new Board2248();
    this.gameOver = initBoardFromStorage('2248', this.board, data);
    this.animating = false;
    /** @type {{ row: number, col: number }[]} */
    this.path = [];
    this.dragging = false;
    /** @type {Phaser.GameObjects.Graphics | null} */
    this.pathGraphics = null;

    this.buildUi();
    this.input.on('pointerdown', (p) => this.onPointerDown(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    this.input.on('pointerup', () => this.onPointerUp());
    this.scale.on('resize', () => {
      if (!this.animating) this.buildUi();
    });
  }

  buildUi() {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.pathGraphics = this.add.graphics().setDepth(5);

    const titleSize = Math.max(20, width * 0.05);
    this.add
      .text(width / 2, height * 0.06, '2248', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleSize}px`,
        color: '#f9f6f2',
      })
      .setOrigin(0.5);

    this.scoreText = this.add.text(
      width / 2,
      height * 0.12,
      formatScoreLine('2248', this.board.score),
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(16, width * 0.04)}px`,
        color: '#edc22e',
      },
    ).setOrigin(0.5);

    addGameControlButtons(this, width, height, {
      disabled: this.animating,
      onNew: () => this.handleNewGame(),
      onSave: () => this.handleSaveGame(),
    });

    const back = this.add
      .text(width * 0.08, height * 0.06, '← Menu', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(14, width * 0.035)}px`,
        color: '#a8a8c0',
      })
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => {
      if (!this.animating) this.scene.start('Menu');
    });

    this.layout = computeBoardLayout(width, height, this.board.size, 0.28);
    const { offsetX, offsetY, cellSize, gap, boardSize } = this.layout;
    this.add.rectangle(
      offsetX + boardSize / 2,
      offsetY + boardSize / 2,
      boardSize,
      boardSize,
      0x2d2d44,
    );

    /** @type {Phaser.GameObjects.Rectangle[][]} */
    this.tileRects = [];
    /** @type {Phaser.GameObjects.Text[][]} */
    this.tileTexts = [];
    for (let r = 0; r < this.board.size; r += 1) {
      this.tileRects[r] = [];
      this.tileTexts[r] = [];
      for (let c = 0; c < this.board.size; c += 1) {
        const { x, y } = cellCenter(this.layout, r, c);
        const rect = this.add
          .rectangle(x, y, cellSize, cellSize, tileColor(0))
          .setInteractive();
        const label = this.add
          .text(x, y, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.max(12, cellSize * 0.32)}px`,
            color: tileTextColor(2),
          })
          .setOrigin(0.5);
        this.tileRects[r][c] = rect;
        this.tileTexts[r][c] = label;
      }
    }

    this.syncTiles();
    if (this.gameOver) this.showGameOver();
  }

  syncTiles() {
    const grid = this.board.getGrid();
    for (let r = 0; r < this.board.size; r += 1) {
      for (let c = 0; c < this.board.size; c += 1) {
        const v = grid[r][c];
        const { x, y } = cellCenter(this.layout, r, c);
        this.tileRects[r][c].setPosition(x, y);
        this.tileTexts[r][c].setPosition(x, y);
        this.tileRects[r][c].setFillStyle(tileColor(v));
        this.tileTexts[r][c].setText(v > 0 ? String(v) : '');
        this.tileTexts[r][c].setColor(tileTextColor(v));
      }
    }
    this.scoreText.setText(formatScoreLine('2248', this.board.score));
    this.drawPathHighlight();
  }

  handleNewGame() {
    if (this.gameOver || this.animating) return;
    this.gameOver = startNewGame('2248', this.board);
    this.buildUi();
  }

  handleSaveGame() {
    if (this.gameOver || this.animating) return;
    persistGameState('2248', this.board.getGrid(), this.board.score, false);
    this.scoreText.setText(formatScoreLine('2248', this.board.score));
  }

  /** Auto-saves after each merge and updates the high score cookie. */
  autoPersist() {
    persistGameState('2248', this.board.getGrid(), this.board.score, this.gameOver);
    this.scoreText.setText(formatScoreLine('2248', this.board.score));
  }

  /**
   * @param {Phaser.Input.Pointer} pointer
   */
  onPointerDown(pointer) {
    if (this.gameOver || this.animating) return;
    const cell = pointerToCell(pointer.x, pointer.y, this.layout, this.board.size);
    if (!cell || this.board.cell(cell.row, cell.col) === 0) return;
    this.dragging = true;
    this.path = [cell];
    this.drawPathHighlight();
  }

  /**
   * @param {Phaser.Input.Pointer} pointer
   */
  onPointerMove(pointer) {
    if (!this.dragging || this.gameOver || this.animating) return;
    const cell = pointerToCell(pointer.x, pointer.y, this.layout, this.board.size);
    if (!cell) return;
    const last = this.path[this.path.length - 1];
    if (last.row === cell.row && last.col === cell.col) return;
    if (this.board.cell(cell.row, cell.col) === 0) return;
    const rollback = this.board.tryRollbackPath(this.path, cell);
    if (rollback) {
      this.path = rollback;
      this.drawPathHighlight();
      return;
    }
    if (!this.board.areAdjacent(last, cell)) return;
    if (!this.board.canExtendPath(this.path, cell)) return;
    this.path.push(cell);
    this.drawPathHighlight();
  }

  onPointerUp() {
    if (!this.dragging || this.gameOver || this.animating) return;
    this.dragging = false;
    const path = [...this.path];
    this.path = [];
    this.drawPathHighlight();

    if (!this.board.applyPathMerge(path)) return;

    this.syncTiles();
    this.playPostMergeAnimation();
  }

  /**
   * Animates gravity settle, then spawns and falls one tile at a time until full.
   */
  async playPostMergeAnimation() {
    this.animating = true;
    try {
      await this.animateUntilSettled();
      await this.refillBoardAnimated();
      this.syncTiles();
      if (this.board.isGameOver()) {
        this.gameOver = true;
        this.showGameOver();
      }
      this.autoPersist();
    } finally {
      this.animating = false;
    }
  }

  /**
   * Steps gravity one row at a time with tweens until settled.
   */
  async animateUntilSettled() {
    while (!isGravitySettled(this.board.grid)) {
      const moves = previewGravityOneStepMoves(this.board.getGrid());
      if (moves.length === 0) break;
      applyGravityOneStep(this.board.grid);
      await Promise.all(moves.map((move) => this.tweenTileMove(move)));
      this.syncTiles();
    }
  }

  /**
   * @param {{ fromRow: number, fromCol: number, toRow: number, toCol: number }} move
   * @returns {Promise<void>}
   */
  tweenTileMove(move) {
    const rect = this.tileRects[move.fromRow][move.fromCol];
    const text = this.tileTexts[move.fromRow][move.fromCol];
    const dest = cellCenter(this.layout, move.toRow, move.toCol);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: [rect, text],
        x: dest.x,
        y: dest.y,
        duration: GRAVITY_STEP_MS,
        ease: 'Quad.easeIn',
        onComplete: resolve,
      });
    });
  }

  /**
   * Spawns and animates until the board has no empty cells.
   */
  async refillBoardAnimated() {
    while (this.board.emptyCells().length > 0) {
      await this.waitMs(SPAWN_PAUSE_MS);
      if (!this.board.spawnAtTopRandomColumn()) break;
      this.syncTiles();
      await this.animateUntilSettled();
    }
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  waitMs(ms) {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  drawPathHighlight() {
    if (!this.pathGraphics || !this.layout) return;
    this.pathGraphics.clear();
    for (const { row, col } of this.path) {
      this.tileRects[row][col].setStrokeStyle(3, 0xedc22e);
    }
    for (let r = 0; r < this.board.size; r += 1) {
      for (let c = 0; c < this.board.size; c += 1) {
        const inPath = this.path.some((p) => p.row === r && p.col === c);
        if (!inPath) this.tileRects[r][c].setStrokeStyle();
      }
    }
    if (this.path.length < 2) return;
    const { offsetX, offsetY, cellSize, gap } = this.layout;
    const step = cellSize + gap;
    this.pathGraphics.lineStyle(4, 0xedc22e, 0.9);
    for (let i = 0; i < this.path.length - 1; i += 1) {
      const a = this.path[i];
      const b = this.path[i + 1];
      const ax = offsetX + gap + a.col * step + cellSize / 2;
      const ay = offsetY + gap + a.row * step + cellSize / 2;
      const bx = offsetX + gap + b.col * step + cellSize / 2;
      const by = offsetY + gap + b.row * step + cellSize / 2;
      this.pathGraphics.strokeLineShape(
        new Phaser.Geom.Line(ax, ay, bx, by),
      );
    }
  }

  showGameOver() {
    const { width, height } = this.scale;
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setDepth(10);
    this.add
      .text(width / 2, height / 2, 'Game Over\nTap Menu to retry', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(22, width * 0.06)}px`,
        color: '#f9f6f2',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(11);
  }
}
