/**
 * Main menu: pick 2048 or 2248 mode. Buttons scale with viewport.
 */
import Phaser from 'phaser';
import { makeButton } from '../ui/buttons.js';
import { getHighScore, loadSavedGame } from '../persistence/gameStorage.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create() {
    this.buildUi();
    this.scale.on('resize', this.buildUi, this);
  }

  buildUi() {
    const { width, height } = this.scale;
    this.children.removeAll();

    const titleSize = Math.max(28, Math.floor(width * 0.08));
    this.add
      .text(width / 2, height * 0.22, '2048 & 2248', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleSize}px`,
        color: '#f9f6f2',
      })
      .setOrigin(0.5);

    const btnW = Math.min(280, width * 0.7);
    const btnH = Math.max(48, height * 0.08);
    const fontSize = Math.max(18, Math.floor(btnH * 0.38));

    makeButton(this, width / 2, height * 0.45, btnW, btnH, fontSize, 'Play 2048', () => {
      const saved = loadSavedGame('2048');
      this.scene.start('Game2048', saved && !saved.gameOver ? saved : undefined);
    });
    makeButton(this, width / 2, height * 0.58, btnW, btnH, fontSize, 'Play 2248', () => {
      const saved = loadSavedGame('2248');
      this.scene.start('Game2248', saved && !saved.gameOver ? saved : undefined);
    });

    const hintSize = Math.max(12, width * 0.03);
    this.add
      .text(
        width / 2,
        height * 0.72,
        `Best 2048: ${getHighScore('2048')} · Best 2248: ${getHighScore('2248')}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${hintSize}px`,
          color: '#a8a8c0',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.88, 'Swipe (2048) · Drag path (2248)', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(12, width * 0.035)}px`,
        color: '#a8a8c0',
      })
      .setOrigin(0.5);
  }

  shutdown() {
    this.scale.off('resize', this.buildUi, this);
  }
}
