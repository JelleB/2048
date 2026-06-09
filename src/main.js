/**
 * Entry: Phaser 3 game with responsive FIT scaling for mobile and desktop.
 */
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { Game2048Scene } from './scenes/Game2048Scene.js';
import { Game2248Scene } from './scenes/Game2248Scene.js';
import { GameKnoppenspelScene } from './scenes/GameKnoppenspelScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 800,
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 1200,
      height: 1600,
    },
  },
  scene: [BootScene, MenuScene, Game2048Scene, Game2248Scene, GameKnoppenspelScene],
  input: {
    activePointers: 2,
  },
};

// eslint-disable-next-line no-new
new Phaser.Game(config);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    window.dispatchEvent(new Event('resize'));
  });
}
