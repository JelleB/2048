/**
 * Phaser scene for classic 2048: keyboard + swipe input, responsive grid.
 */
import Phaser from 'phaser';
import { Board2048 } from '../logic/Board2048.js';
import { SWIPE_THRESHOLD_PX } from '../constants.js';
import {
  computeBoardLayout,
  tileColor,
  tileTextColor,
} from '../ui/layout.js';

export class Game2048Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game2048' });
  }

  create() {
    /** @type {Board2048} */
    this.board = new Board2048();
    this.board.start();
    this.gameOver = false;
    /** @type {Phaser.GameObjects.Rectangle[][]} */
    this.tileRects = [];
    /** @type {Phaser.GameObjects.Text[][]} */
    this.tileTexts = [];

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.pointerDown = null;
    this.input.on('pointerdown', (p) => {
      this.pointerDown = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p) => this.handleSwipe(p.x, p.y));

    this.buildUi();
    this.scale.on('resize', () => this.buildUi());
  }

  buildUi() {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.tileRects = [];
    this.tileTexts = [];

    const titleSize = Math.max(20, width * 0.05);
    this.add
      .text(width / 2, height * 0.06, '2048', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleSize}px`,
        color: '#f9f6f2',
      })
      .setOrigin(0.5);

    this.scoreText = this.add.text(width / 2, height * 0.12, 'Score: 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(16, width * 0.04)}px`,
      color: '#edc22e',
    }).setOrigin(0.5);

    const backSize = Math.max(14, width * 0.035);
    const back = this.add
      .text(width * 0.08, height * 0.06, '← Menu', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${backSize}px`,
        color: '#a8a8c0',
      })
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Menu'));

    this.layout = computeBoardLayout(width, height, this.board.size);
    const { offsetX, offsetY, cellSize, gap, boardSize } = this.layout;
    this.add.rectangle(
      offsetX + boardSize / 2,
      offsetY + boardSize / 2,
      boardSize,
      boardSize,
      0x2d2d44,
    );

    for (let r = 0; r < this.board.size; r += 1) {
      this.tileRects[r] = [];
      this.tileTexts[r] = [];
      for (let c = 0; c < this.board.size; c += 1) {
        const step = cellSize + gap;
        const x = offsetX + gap + c * step + cellSize / 2;
        const y = offsetY + gap + r * step + cellSize / 2;
        const rect = this.add.rectangle(x, y, cellSize, cellSize, tileColor(0));
        const label = this.add
          .text(x, y, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.max(14, cellSize * 0.38)}px`,
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
        this.tileRects[r][c].setFillStyle(tileColor(v));
        this.tileTexts[r][c].setText(v > 0 ? String(v) : '');
        this.tileTexts[r][c].setColor(tileTextColor(v));
      }
    }
    this.scoreText.setText(`Score: ${this.board.score}`);
  }

  /**
   * @param {number} endX
   * @param {number} endY
   */
  handleSwipe(endX, endY) {
    if (!this.pointerDown || this.gameOver) return;
    const dx = endX - this.pointerDown.x;
    const dy = endY - this.pointerDown.y;
    this.pointerDown = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) {
      return;
    }
    let dir;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }
    this.tryMove(dir);
  }

  /**
   * @param {'up' | 'down' | 'left' | 'right'} direction
   */
  tryMove(direction) {
    if (this.gameOver) return;
    const moved = this.board.move(direction);
    if (moved) {
      this.syncTiles();
      if (this.board.isGameOver()) {
        this.gameOver = true;
        this.showGameOver();
      }
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

  update() {
    if (this.gameOver) return;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.left)) {
      this.tryMove('left');
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.right)) {
      this.tryMove('right');
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up)) {
      this.tryMove('up');
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.down)) {
      this.tryMove('down');
    }
  }
}
