/**
 * Phaser scene for Knoppenspel: match the top target LED row to one of eight answer rows.
 * Logic lives in src/logic/knoppenspel.js; portrait layout only.
 */
import Phaser from 'phaser';
import { Knoppenspel } from '../logic/knoppenspel.js';
import { byteToBits } from '../logic/binaryDisplay.js';
import {
  KNOPPEN_BIT_COUNT,
  KNOPPEN_ROW_COUNT,
  KNOPPEN_REVEAL_PAUSE_MS,
} from '../constants.js';
import { getHighScore, updateHighScore } from '../persistence/gameStorage.js';
import { makeButton } from '../ui/buttons.js';

const LED_ON = 0xe74c3c;
const LED_OFF = 0x3d3d5c;
const BAR_BG = 0x2d2d44;

/**
 * LED radius that fits a row inside a max width and height budget.
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @returns {number}
 */
function ledRadiusForBudget(maxWidth, maxHeight) {
  const byWidth = maxWidth / (KNOPPEN_BIT_COUNT * 2.2);
  const byHeight = maxHeight / 2.2;
  const radius = Math.min(byWidth, byHeight);
  return Math.max(5, Math.min(radius, 22));
}

/**
 * Portrait layout: one target bar + eight answer bars with shared column alignment.
 * @param {number} width
 * @param {number} height
 * @returns {object}
 */
export function computeKnoppensLayout(width, height) {
  const marginX = width * 0.04;
  const contentTop = height * 0.17;
  const contentBottom = height * 0.82;
  const contentH = contentBottom - contentTop;
  const totalBars = KNOPPEN_ROW_COUNT + 1;
  const rowStep = contentH / (totalBars + 0.35);
  const barH = rowStep * 0.78;

  const pickBtnW = Math.min(46, width * 0.11);
  const pickBtnH = Math.max(28, barH * 0.88);
  const labelColW = pickBtnW;
  const labelX = marginX + labelColW / 2;
  const pickBtnX = width - marginX - pickBtnW / 2;
  const decimalColW = Math.max(44, width * 0.12);
  const decimalX = pickBtnX - pickBtnW / 2 - decimalColW / 2 - 8;
  const ledAreaRight = decimalX - decimalColW / 2 - 10;
  const ledAreaLeft = marginX + labelColW + 10;
  const ledCenterX = (ledAreaLeft + ledAreaRight) / 2;
  const ledMaxW = ledAreaRight - ledAreaLeft;

  const ledRadius = ledRadiusForBudget(ledMaxW, barH);
  const ledGap = ledRadius * 2.15;
  const decimalFont = Math.max(13, Math.floor(ledRadius * 2));
  const labelFont = Math.max(11, Math.floor(decimalFont * 0.85));
  const pickBtnFont = Math.max(13, Math.floor(pickBtnH * 0.4));

  const targetY = contentTop + rowStep * 0.55;
  const rowStartY = contentTop + rowStep * 1.45;
  const dividerY = contentTop + rowStep * 1.05;

  const startBtnW = Math.min(200, width * 0.55);
  const startBtnH = Math.max(44, height * 0.06);
  const startBtnY = height * 0.9;

  return {
    contentTop,
    contentBottom,
    dividerY,
    targetY,
    rowStartY,
    rowStep,
    barH,
    barW: width - marginX * 2,
    barX: width / 2,
    labelX,
    ledCenterX,
    decimalX,
    pickBtnX,
    pickBtnW,
    pickBtnH,
    pickBtnFont,
    ledRadius,
    ledGap,
    decimalFont,
    labelFont,
    startBtnW,
    startBtnH,
    startBtnY,
    startBtnFont: Math.max(16, Math.floor(startBtnH * 0.38)),
  };
}

export class GameKnoppenspelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameKnoppenspel' });
  }

  create() {
    /** @type {Knoppenspel} */
    this.game = new Knoppenspel();
    /** @type {Phaser.Time.TimerEvent | null} */
    this.timerEvent = null;
    /** @type {Phaser.Time.TimerEvent | null} */
    this.revealAutoEvent = null;
    /** @type {number} */
    this.timerRemainingMs = 0;
    /** @type {Phaser.GameObjects.Rectangle | null} */
    this.timerBarFill = null;

    this.buildUi();
    this.scale.on('resize', this.rebuildUiPreserveState, this);
  }

  /**
   * Rebuilds layout without resetting the active run (resize handler).
   */
  rebuildUiPreserveState() {
    this.stopTimer();
    this.cancelRevealAutoContinue();
    this.buildUi();
    if (this.game.phase === 'playing') {
      this.startTimer();
    } else if (this.game.phase === 'reveal') {
      this.scheduleRevealAutoContinue();
    }
  }

  buildUi() {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.timerBarFill = null;

    const titleSize = Math.max(18, width * 0.05);
    this.add
      .text(width / 2, height * 0.05, 'Knoppenspel', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleSize}px`,
        color: '#f9f6f2',
      })
      .setOrigin(0.5);

    const backSize = Math.max(13, width * 0.03);
    const back = this.add
      .text(width * 0.06, height * 0.05, '← Menu', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${backSize}px`,
        color: '#a8a8c0',
      })
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.goToMenu());

    const scoreSize = Math.max(14, width * 0.032);
    this.scoreText = this.add
      .text(width / 2, height * 0.105, this.formatScoreLine(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${scoreSize}px`,
        color: '#edc22e',
      })
      .setOrigin(0.5);

    if (this.game.phase !== 'idle') {
      this.drawTimerBar(width, height);
    }
    this.drawBars(width, height);
    this.drawStartButton(width, height);
    this.drawStatusMessage(width, height);

    if (this.game.phase === 'reveal') {
      this.scheduleRevealAutoContinue();
    }
  }

  /**
   * @returns {string}
   */
  formatScoreLine() {
    return `Score: ${this.game.score} · Best: ${getHighScore('knoppenspel')}`;
  }

  /**
   * @returns {boolean}
   */
  isRevealing() {
    return this.game.phase === 'reveal' || this.game.phase === 'gameOver';
  }

  /**
   * @returns {boolean}
   */
  showStartButton() {
    return this.game.phase === 'idle' || this.game.phase === 'gameOver';
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  drawTimerBar(width, height) {
    const barW = Math.min(width * 0.88, 420);
    const barH = Math.max(8, height * 0.014);
    const x = width / 2;
    const y = height * 0.145;
    const totalMs = this.game.timerMs;

    this.add.rectangle(x, y, barW, barH, BAR_BG);
    const fillW = totalMs > 0
      ? barW * Math.max(0, Math.min(1, this.timerRemainingMs / totalMs))
      : 0;
    this.timerBarFill = this.add.rectangle(
      x - barW / 2 + fillW / 2,
      y,
      fillW,
      barH,
      0xedc22e,
    );
  }

  /**
   * Draws the target bar and eight answer bars with identical alignment.
   * @param {number} width
   * @param {number} height
   */
  drawBars(width, height) {
    const round = this.game.currentRound;
    if (!round) return;

    const layout = computeKnoppensLayout(width, height);
    const revealing = this.isRevealing();

    this.add
      .text(layout.barX, layout.contentTop, 'Target', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${layout.labelFont}px`,
        color: '#a8a8c0',
      })
      .setOrigin(0.5, 0);

    this.drawBarRow(layout, layout.targetY, {
      label: 'T',
      byte: round.targetByte,
      decimalStyle: revealing ? 'target' : 'hidden',
      pickLabel: null,
      onPick: null,
    });

    this.add
      .line(0, 0, width * 0.04, layout.dividerY, width * 0.96, layout.dividerY, 0x3d3d5c)
      .setOrigin(0, 0);

    this.add
      .text(layout.barX, layout.dividerY + layout.rowStep * 0.08, 'Pick an answer', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${layout.labelFont}px`,
        color: '#a8a8c0',
      })
      .setOrigin(0.5, 0);

    for (let row = 0; row < KNOPPEN_ROW_COUNT; row += 1) {
      const y = layout.rowStartY + row * layout.rowStep;
      this.drawBarRow(layout, y, {
        label: String(row + 1),
        byte: round.rows[row],
        decimalStyle: this.decimalRevealStyle(row, revealing),
        pickLabel: String(row + 1),
        onPick: this.game.phase === 'playing' ? () => this.handleChoice(row) : null,
      });
    }
  }

  /**
   * One bar row: background strip, label, LEDs, decimal slot, optional pick button.
   * @param {object} layout
   * @param {number} y
   * @param {{ label: string, byte: number, decimalStyle: string, pickLabel: string | null, onPick: (() => void) | null }} row
   */
  drawBarRow(layout, y, row) {
    this.add.rectangle(layout.barX, y, layout.barW, layout.barH, BAR_BG, 0.55);

    this.add
      .text(layout.labelX, y, row.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${layout.labelFont}px`,
        color: '#a8a8c0',
      })
      .setOrigin(0.5);

    this.drawLedRow(layout.ledCenterX, y, layout.ledRadius, layout.ledGap, row.byte);
    this.drawDecimalSlot(
      layout.decimalX,
      y,
      layout.decimalFont,
      row.byte,
      row.decimalStyle,
    );

    if (row.onPick && row.pickLabel) {
      makeButton(
        this,
        layout.pickBtnX,
        y,
        layout.pickBtnW,
        layout.pickBtnH,
        layout.pickBtnFont,
        row.pickLabel,
        row.onPick,
      );
    }
  }

  /**
   * @param {number} rowIndex
   * @param {boolean} revealing
   * @returns {'hidden' | 'target' | 'correct' | 'wrong' | 'neutral'}
   */
  decimalRevealStyle(rowIndex, revealing) {
    if (!revealing) return 'hidden';
    const round = this.game.currentRound;
    if (!round) return 'hidden';
    if (rowIndex === round.correctRowIndex) return 'correct';
    if (this.game.lastChoice === rowIndex) return 'wrong';
    return 'neutral';
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} fontSize
   * @param {number} byte
   * @param {'hidden' | 'target' | 'correct' | 'wrong' | 'neutral'} style
   */
  drawDecimalSlot(x, y, fontSize, byte, style) {
    const value = Math.floor(byte) & 0xff;
    const colors = {
      hidden: '#3d3d5c',
      target: '#f9f6f2',
      correct: '#2ecc71',
      wrong: '#e74c3c',
      neutral: '#a8a8c0',
    };
    const label = style === 'hidden' ? '···' : String(value);
    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: colors[style],
      })
      .setOrigin(0.5);
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  drawStartButton(width, height) {
    if (!this.showStartButton()) return;

    const layout = computeKnoppensLayout(width, height);
    const label = this.game.phase === 'idle' ? 'Start' : 'Restart';
    makeButton(
      this,
      width / 2,
      layout.startBtnY,
      layout.startBtnW,
      layout.startBtnH,
      layout.startBtnFont,
      label,
      () => this.handleStart(),
    );
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  drawStatusMessage(width, height) {
    if (this.game.phase === 'idle') {
      this.add
        .text(width / 2, height * 0.965, 'Press Start to play', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${Math.max(12, width * 0.03)}px`,
          color: '#a8a8c0',
        })
        .setOrigin(0.5);
      return;
    }

    if (!this.isRevealing()) return;

    const y = height * 0.965;
    const fontSize = Math.max(12, width * 0.03);

    if (this.game.phase === 'reveal') {
      const seconds = Math.ceil(KNOPPEN_REVEAL_PAUSE_MS / 1000);
      this.add
        .text(width / 2, y, `Correct! Next round in ${seconds}s…`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#2ecc71',
        })
        .setOrigin(0.5);
      return;
    }

    this.add
      .text(width / 2, y, 'Game Over', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#e74c3c',
      })
      .setOrigin(0.5);
  }

  /**
   * @param {number} centerX
   * @param {number} centerY
   * @param {number} radius
   * @param {number} gap
   * @param {number} byte
   */
  drawLedRow(centerX, centerY, radius, gap, byte) {
    const bits = byteToBits(byte);
    const totalW = (KNOPPEN_BIT_COUNT - 1) * gap;
    const startX = centerX - totalW / 2;
    bits.forEach((on, index) => {
      this.add.circle(startX + index * gap, centerY, radius, on ? LED_ON : LED_OFF);
    });
  }

  handleStart() {
    if (!this.showStartButton()) return;
    this.cancelRevealAutoContinue();
    this.game.start();
    this.timerRemainingMs = this.game.timerMs;
    this.buildUi();
    this.startTimer();
  }

  /**
   * @param {number} rowIndex
   */
  handleChoice(rowIndex) {
    if (this.game.phase !== 'playing') return;

    const result = this.game.submitChoice(rowIndex);
    this.stopTimer();

    if (result === 'correct') {
      updateHighScore('knoppenspel', this.game.score);
    }

    if (result === 'correct' || result === 'wrong') {
      this.refreshAfterChoice();
    }
  }

  refreshAfterChoice() {
    this.cancelRevealAutoContinue();
    this.scoreText?.setText(this.formatScoreLine());
    this.buildUi();
  }

  scheduleRevealAutoContinue() {
    if (this.game.phase !== 'reveal') return;
    this.cancelRevealAutoContinue();
    this.revealAutoEvent = this.time.delayedCall(KNOPPEN_REVEAL_PAUSE_MS, () => {
      this.continueAfterCorrectReveal();
    });
  }

  cancelRevealAutoContinue() {
    if (this.revealAutoEvent) {
      this.revealAutoEvent.remove();
      this.revealAutoEvent = null;
    }
  }

  continueAfterCorrectReveal() {
    if (this.game.phase !== 'reveal') return;
    this.cancelRevealAutoContinue();
    this.game.continueAfterReveal();
    this.buildUi();
    this.startTimer();
  }

  startTimer() {
    if (this.game.phase !== 'playing') return;

    this.timerRemainingMs = this.game.timerMs;
    this.stopTimer();
    this.timerEvent = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this.tickTimer(50),
    });
  }

  /**
   * @param {number} deltaMs
   */
  tickTimer(deltaMs) {
    if (this.game.phase !== 'playing') {
      this.stopTimer();
      return;
    }

    this.timerRemainingMs = Math.max(0, this.timerRemainingMs - deltaMs);
    this.updateTimerBar();

    if (this.timerRemainingMs <= 0) {
      this.stopTimer();
      this.game.handleTimeout();
      this.refreshAfterChoice();
    }
  }

  updateTimerBar() {
    if (!this.timerBarFill) return;
    const { width } = this.scale;
    const barW = Math.min(width * 0.88, 420);
    const totalMs = this.game.timerMs;
    const fillW = totalMs > 0
      ? barW * Math.max(0, Math.min(1, this.timerRemainingMs / totalMs))
      : 0;
    const x = width / 2;
    const y = this.timerBarFill.y;
    this.timerBarFill.setSize(fillW, this.timerBarFill.height);
    this.timerBarFill.setPosition(x - barW / 2 + fillW / 2, y);
  }

  stopTimer() {
    if (this.timerEvent) {
      this.timerEvent.remove();
      this.timerEvent = null;
    }
  }

  goToMenu() {
    this.stopTimer();
    this.cancelRevealAutoContinue();
    this.scene.start('Menu');
  }

  shutdown() {
    this.stopTimer();
    this.cancelRevealAutoContinue();
    this.scale.off('resize', this.rebuildUiPreserveState, this);
  }
}
