/**
 * Main menu: pick 2048 or 2248 mode. Buttons scale with viewport.
 */
import Phaser from 'phaser';

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

    this.makeButton(width / 2, height * 0.45, btnW, btnH, fontSize, 'Play 2048', () => {
      this.scene.start('Game2048');
    });
    this.makeButton(width / 2, height * 0.58, btnW, btnH, fontSize, 'Play 2248', () => {
      this.scene.start('Game2248');
    });

    this.add
      .text(width / 2, height * 0.88, 'Swipe (2048) · Drag path (2248)', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(12, width * 0.035)}px`,
        color: '#a8a8c0',
      })
      .setOrigin(0.5);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} fontSize
   * @param {string} label
   * @param {() => void} onClick
   */
  makeButton(x, y, w, h, fontSize, label, onClick) {
    const bg = this.add
      .rectangle(x, y, w, h, 0x8f7a66, 12)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#f9f6f2',
      })
      .setOrigin(0.5);
    bg.on('pointerup', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0x9f8b77));
    bg.on('pointerout', () => bg.setFillStyle(0x8f7a66));
    return { bg, text };
  }

  shutdown() {
    this.scale.off('resize', this.buildUi, this);
  }
}
