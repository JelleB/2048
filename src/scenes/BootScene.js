/**
 * Boot scene: resume an unfinished saved game or open the menu.
 */
import Phaser from 'phaser';
import { getResumeTarget } from '../persistence/gameStorage.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    const resume = getResumeTarget();
    if (resume) {
      this.scene.start(resume.sceneKey, resume.state);
      return;
    }
    this.scene.start('Menu');
  }
}
