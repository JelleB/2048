/**
 * Shared Phaser UI button helper for menu and game scenes.
 */

/**
 * Creates a rounded rectangle button with label and hover feedback.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} fontSize
 * @param {string} label
 * @param {() => void} onClick
 * @returns {{ bg: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text }}
 */
export function makeButton(scene, x, y, w, h, fontSize, label, onClick) {
  const bg = scene.add
    .rectangle(x, y, w, h, 0x8f7a66, 12)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
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
