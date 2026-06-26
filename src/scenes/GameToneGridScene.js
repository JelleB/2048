/**
 * Phaser scene for ToneGrid v2: sections, scales, micro-timing, song chain.
 */
import Phaser from 'phaser';
import {
  ToneGridSongState,
  getTonicRows,
  SECTION_LABELS,
} from '../logic/toneGrid.js';
import {
  createToneGridEngine,
  SEQUENCER_STEP_EVENT,
  SECTION_CHANGE_EVENT,
} from '../audio/toneGridEngine.js';
import {
  loadToneGridPattern,
  saveToneGridPattern,
} from '../persistence/toneGridStorage.js';
import {
  TONEGRID_COLS,
  TONEGRID_ROWS,
  TONEGRID_TIMING_OFFSET_MAX,
  TONEGRID_SECTION_IDS,
  TONEGRID_SCALE_ROOTS,
} from '../constants.js';
import { computeBoardLayout, pointerToCell, cellCenter } from '../ui/layout.js';
import { makeButton } from '../ui/buttons.js';

const CELL_INACTIVE = 0x2e2e3f;
const CELL_TONIC_BG = 0x3a3a28;
const CELL_ACTIVE = 0x00ffcc;
const CELL_STROKE = 0x3e3e56;
const TONIC_STROKE = 0xffcc66;
const PLAYHEAD_COLOR = 0x00ffcc;
const TAB_ACTIVE = 0x6a5a4a;
const TAB_PLAYING = 0x4a8a7a;

/** @typedef {import('../logic/toneGrid.js').SectionId} SectionId */

export class GameToneGridScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameToneGrid' });
  }

  create() {
    this.state = loadToneGridPattern() ?? new ToneGridSongState();
    /** @type {import('../audio/toneGridEngine.js').ToneGridEngine | null} */
    this.audioEngine = null;
    /** @type {Phaser.GameObjects.Rectangle[][]} */
    this.cellVisuals = [];
    /** @type {Phaser.GameObjects.Rectangle | null} */
    this.playheadBar = null;
    /** @type {Phaser.GameObjects.Text | null} */
    this.bpmText = null;
    /** @type {Phaser.GameObjects.Text | null} */
    this.playBtnText = null;
    /** @type {{ row: number, col: number } | null} */
    this.dragLastCell = null;
    /** @type {{ row: number, col: number, startX: number, startOffset: number } | null} */
    this.nudgeDrag = null;
    /** @type {boolean} */
    this.paintMode = false;
    /** @type {Phaser.GameObjects.Container | null} */
    this.blockTypePicker = null;

    this.onSequencerStep = (event) => {
      const step = event.detail?.step;
      if (typeof step === 'number') {
        this.time.delayedCall(0, () => this.updateVisualPlayhead(step));
      }
    };
    this.onSectionChange = () => {
      this.time.delayedCall(0, () => {
        if (this.state.isPlaying) {
          this.buildUi();
        }
        this.syncCellColors();
        this.updateVisualPlayhead(this.state.currentStep);
      });
    };

    window.addEventListener(SEQUENCER_STEP_EVENT, this.onSequencerStep);
    window.addEventListener(SECTION_CHANGE_EVENT, this.onSectionChange);

    this.ensureParticleTexture();
    this.buildUi();
    this.setupPointerHandlers();
    this.scale.on('resize', this.rebuildUiPreserveState, this);
  }

  ensureParticleTexture() {
    if (this.textures.exists('tonegrid-particle')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('tonegrid-particle', 8, 8);
    g.destroy();
  }

  rebuildUiPreserveState() {
    const step = this.state.currentStep;
    const playing = this.state.isPlaying;
    this.buildUi();
    if (playing) {
      this.updateVisualPlayhead(step);
    }
  }

  buildUi() {
    const { width, height } = this.scale;
    this.children.removeAll();
    this.cellVisuals = [];
    this.playheadBar = null;
    this.bpmText = null;
    this.playBtnText = null;
    this.blockTypePicker = null;

    const titleSize = Math.max(16, width * 0.045);
    this.add
      .text(width / 2, height * 0.03, 'ToneGrid', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleSize}px`,
        color: '#f9f6f2',
      })
      .setOrigin(0.5);

    const backSize = Math.max(12, width * 0.028);
    const back = this.add
      .text(width * 0.06, height * 0.03, '← Menu', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${backSize}px`,
        color: '#a8a8c0',
      })
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.goToMenu());

    this.createSectionTabs(width, height);
    this.createSongBlocksStrip(width, height);
    this.createScalePicker(width, height);

    this.layout = computeBoardLayout(width, height, TONEGRID_COLS, 0.38);
    this.createGrid();
    this.createPlayhead();
    this.createHud(width, height);
    this.syncCellColors();
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  createSectionTabs(width, height) {
    const y = height * 0.075;
    const tabW = Math.min(58, width * 0.14);
    const tabH = Math.max(22, height * 0.028);
    const fontSize = Math.max(9, Math.floor(tabH * 0.42));
    const totalW = TONEGRID_SECTION_IDS.length * (tabW + 4);
    let x = width / 2 - totalW / 2 + tabW / 2;

    for (const id of TONEGRID_SECTION_IDS) {
      const isEdit = this.state.editSectionId === id;
      const isPlay = this.state.isPlaying && this.state.playSectionId === id;
      const fill = isPlay ? TAB_PLAYING : isEdit ? TAB_ACTIVE : 0x3d3d52;
      const tab = this.add
        .rectangle(x, y, tabW, tabH, fill, 1)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(isEdit ? 2 : 1, isEdit ? 0x00ffcc : 0x555570);
      this.add
        .text(x, y, SECTION_LABELS[id], {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#f9f6f2',
        })
        .setOrigin(0.5);
      tab.on('pointerup', () => {
        this.state.setEditSection(id);
        this.syncCellColors();
        this.buildUi();
        saveToneGridPattern(this.state);
      });
      x += tabW + 4;
    }
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  createSongBlocksStrip(width, height) {
    const y = height * 0.115;
    const chipH = Math.max(20, height * 0.025);
    const fontSize = Math.max(9, Math.floor(chipH * 0.45));
    const chipPad = 6;
    let x = width * 0.04;

    this.state.songBlocks.forEach((block, index) => {
      const label = SECTION_LABELS[block.sectionId];
      const repeatLabel = `×${block.repeats}`;
      const tonic = this.state.getSectionTonic(block.sectionId);
      const chipW = Math.max(72, (label.length + repeatLabel.length + 2) * fontSize * 0.55 + chipPad * 2 + 24);

      const isPlayingBlock =
        this.state.isPlaying
        && this.state.playBlockIndex === index
        && this.state.playSectionId === block.sectionId;
      const chip = this.add
        .rectangle(x + chipW / 2, y, chipW, chipH, isPlayingBlock ? 0x4a8a7a : 0x454560)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x666680);

      const typeText = this.add
        .text(x + chipPad + 4, y, `${label} ▾`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#f9f6f2',
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      const repeatText = this.add
        .text(x + chipW / 2, y, repeatLabel, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#aaccff',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const tonicText = this.add
        .text(x + chipW - chipPad - 4, y, `${tonic} ▾`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#ffcc88',
        })
        .setOrigin(1, 0.5)
        .setInteractive({ useHandCursor: true });

      const removeSize = Math.max(8, fontSize * 0.75);
      const removeBtn = this.add
        .text(x + chipW - 4, y - chipH * 0.35, '×', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${removeSize}px`,
          color: '#c08080',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      chip.on('pointerup', () => {
        this.state.setEditSection(block.sectionId);
        this.syncCellColors();
        this.buildUi();
        saveToneGridPattern(this.state);
      });

      typeText.on('pointerup', (pointer) => {
        pointer.event.stopPropagation();
        this.showBlockTypePicker(index, x + chipPad, y + chipH * 0.6, width);
      });

      repeatText.on('pointerup', (pointer) => {
        pointer.event.stopPropagation();
        const next = block.repeats >= 8 ? 1 : block.repeats + 1;
        this.state.setBlockRepeats(index, next);
        this.buildUi();
        saveToneGridPattern(this.state);
      });

      tonicText.on('pointerup', (pointer) => {
        pointer.event.stopPropagation();
        this.cycleBlockTonic(block.sectionId);
      });

      removeBtn.on('pointerup', (pointer) => {
        pointer.event.stopPropagation();
        if (this.state.removeBlock(index)) {
          this.buildUi();
          saveToneGridPattern(this.state);
        }
      });

      x += chipW + 4;
      if (index < this.state.songBlocks.length - 1) {
        this.add
          .text(x, y, '→', { fontSize: `${fontSize}px`, color: '#8888a0' })
          .setOrigin(0.5);
        x += 14;
      }
    });

    const addBtnW = Math.max(28, height * 0.032);
    makeButton(this, x + addBtnW / 2 + 4, y, addBtnW, chipH, fontSize, '+', () => {
      this.showBlockTypePicker(-1, x, y + chipH * 0.6, width);
    });

    const loopLabel = this.state.loopSong ? '↻ On' : '↻ Off';
    makeButton(this, width * 0.92, y, addBtnW + 16, chipH, fontSize, loopLabel, () => {
      this.state.loopSong = !this.state.loopSong;
      this.buildUi();
      saveToneGridPattern(this.state);
    });
  }

  /**
   * Shows a dropdown row to pick section type for a block or a new block.
   * @param {number} blockIndex -1 when adding a new block.
   * @param {number} anchorX
   * @param {number} anchorY
   * @param {number} width
   */
  showBlockTypePicker(blockIndex, anchorX, anchorY, width) {
    if (this.blockTypePicker) {
      this.blockTypePicker.destroy();
      this.blockTypePicker = null;
    }

    const chipH = Math.max(22, this.scale.height * 0.028);
    const fontSize = Math.max(9, Math.floor(chipH * 0.42));
    const itemW = Math.min(62, width * 0.14);
    const container = this.add.container(0, 0).setDepth(100);

    const bgW = Math.min(width * 0.92, TONEGRID_SECTION_IDS.length * (itemW + 4) + 8);
    const bg = this.add
      .rectangle(anchorX + bgW / 2 - itemW / 2, anchorY + chipH / 2, bgW, chipH + 8, 0x2a2a3a, 0.95)
      .setStrokeStyle(1, 0x00ffcc);
    container.add(bg);

    let x = anchorX;
    for (const id of TONEGRID_SECTION_IDS) {
      const item = this.add
        .rectangle(x + itemW / 2, anchorY + chipH / 2, itemW, chipH, 0x454560)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x666680);
      const text = this.add
        .text(x + itemW / 2, anchorY + chipH / 2, SECTION_LABELS[id], {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#f9f6f2',
        })
        .setOrigin(0.5);
      item.on('pointerup', () => {
        if (blockIndex >= 0) {
          this.state.setBlockType(blockIndex, id);
        } else {
          this.state.addBlock(id);
        }
        this.state.setEditSection(id);
        container.destroy();
        this.blockTypePicker = null;
        this.buildUi();
        saveToneGridPattern(this.state);
      });
      container.add([item, text]);
      x += itemW + 4;
    }

    this.blockTypePicker = container;
  }

  /**
   * Cycles the tonic for a section type (applies to every block of that type).
   * @param {import('../logic/toneGrid.js').SectionId} sectionId
   */
  cycleBlockTonic(sectionId) {
    const current = this.state.getSectionTonic(sectionId);
    const idx = TONEGRID_SCALE_ROOTS.indexOf(current);
    const next = TONEGRID_SCALE_ROOTS[(idx + 1) % TONEGRID_SCALE_ROOTS.length];
    this.state.setSectionTonic(sectionId, next);
    this.buildUi();
    saveToneGridPattern(this.state);
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  createScalePicker(width, height) {
    const y = height * 0.155;
    const btnW = Math.max(28, width * 0.075);
    const btnH = Math.max(24, height * 0.03);
    const fontSize = Math.max(12, Math.floor(btnH * 0.45));
    const totalW = TONEGRID_SCALE_ROOTS.length * (btnW + 4);
    let x = width / 2 - totalW / 2 + btnW / 2;

    for (const root of TONEGRID_SCALE_ROOTS) {
      const active = this.state.getSectionTonic(this.state.editSectionId) === root;
      const fill = active ? 0x00aa88 : 0x8f7a66;
      const bg = this.add
        .rectangle(x, y, btnW, btnH, fill, 12)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, root, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#f9f6f2',
        })
        .setOrigin(0.5);
      bg.on('pointerup', () => {
        this.state.setScaleRoot(root);
        this.buildUi();
        saveToneGridPattern(this.state);
      });
      bg.on('pointerover', () => bg.setFillStyle(active ? 0x00cc99 : 0x9f8b77));
      bg.on('pointerout', () => bg.setFillStyle(fill));
      x += btnW + 4;
    }
  }

  createGrid() {
    const { offsetX, offsetY, cellSize, gap } = this.layout;
    const step = cellSize + gap;
    const pitchMap = this.state.getPitchMap();
    const tonicRows = getTonicRows(pitchMap, this.state.getSectionTonic(this.state.editSectionId));

    for (let r = 0; r < TONEGRID_ROWS; r += 1) {
      this.cellVisuals[r] = [];
      const isTonic = tonicRows.includes(r);
      const baseColor = isTonic ? CELL_TONIC_BG : CELL_INACTIVE;
      for (let c = 0; c < TONEGRID_COLS; c += 1) {
        const x = offsetX + gap + c * step + cellSize / 2;
        const y = offsetY + gap + r * step + cellSize / 2;
        const cell = this.add
          .rectangle(x, y, cellSize, cellSize, baseColor)
          .setInteractive({ useHandCursor: true })
          .setData({ row: r, col: c, baseX: x, baseColor, isTonic });
        cell.setStrokeStyle(isTonic && c === 0 ? 2 : 1, isTonic ? TONIC_STROKE : CELL_STROKE);
        this.cellVisuals[r][c] = cell;
      }
    }
  }

  createPlayhead() {
    const { offsetX, offsetY, cellSize, gap } = this.layout;
    const step = cellSize + gap;
    const gridH = TONEGRID_ROWS * step - gap;
    const y = offsetY + gap + gridH / 2;
    this.playheadBar = this.add
      .rectangle(offsetX + gap, y, 2, gridH, PLAYHEAD_COLOR, 0.4)
      .setDepth(10)
      .setVisible(false);
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  createHud(width, height) {
    const btnW = Math.min(100, width * 0.22);
    const btnH = Math.max(36, height * 0.045);
    const fontSize = Math.max(14, Math.floor(btnH * 0.38));
    const y = height * 0.94;

    const playLabel = this.state.isPlaying ? 'Pause' : 'Play';
    const { text: playText } = makeButton(
      this,
      width * 0.22,
      y,
      btnW,
      btnH,
      fontSize,
      playLabel,
      () => {
        this.togglePlayback();
      },
    );
    this.playBtnText = playText;

    makeButton(this, width * 0.5, y, btnW, btnH, fontSize, 'Clear', () => {
      this.clearGrid();
    });

    const bpmFont = Math.max(16, width * 0.04);
    this.bpmText = this.add
      .text(width * 0.78, y - btnH * 0.55, `${this.state.bpm} BPM`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${bpmFont}px`,
        color: '#f9f6f2',
      })
      .setOrigin(0.5);

    const stepBtnW = Math.max(32, width * 0.08);
    const stepBtnH = btnH * 0.75;
    const stepFont = Math.max(18, Math.floor(stepBtnH * 0.5));
    makeButton(this, width * 0.68, y, stepBtnW, stepBtnH, stepFont, '−', () => {
      this.changeBpm(-5);
    });
    makeButton(this, width * 0.88, y, stepBtnW, stepBtnH, stepFont, '+', () => {
      this.changeBpm(5);
    });
  }

  setupPointerHandlers() {
    this.input.off('gameobjectdown');
    this.input.off('pointermove');
    this.input.off('pointerup');

    this.input.on('gameobjectdown', (pointer, gameObject) => {
      const r = gameObject.getData('row');
      const c = gameObject.getData('col');
      if (r === undefined || c === undefined) return;

      const section = this.state.getEditSection();
      if (section.matrix[r][c] === 1) {
        this.nudgeDrag = {
          row: r,
          col: c,
          startX: pointer.x,
          startOffset: section.offsets[r][c],
        };
        this.paintMode = false;
        this.dragLastCell = null;
        return;
      }

      this.paintMode = true;
      this.dragLastCell = { row: r, col: c };
      this.handleCellToggle(r, c, gameObject);
    });

    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;

      if (this.nudgeDrag) {
        const { row, col, startX, startOffset } = this.nudgeDrag;
        const { cellSize } = this.layout;
        const delta = ((pointer.x - startX) / cellSize) * TONEGRID_TIMING_OFFSET_MAX;
        const section = this.state.getEditSection();
        section.offsets[row][col] = Math.min(
          TONEGRID_TIMING_OFFSET_MAX,
          Math.max(-TONEGRID_TIMING_OFFSET_MAX, startOffset + delta),
        );
        this.applyCellVisual(row, col);
        return;
      }

      if (!this.paintMode) return;
      const hit = pointerToCell(pointer.x, pointer.y, this.layout, TONEGRID_COLS);
      if (!hit || hit.row >= TONEGRID_ROWS) return;
      const { row, col } = hit;
      if (this.state.getEditSection().matrix[row][col] !== 0) return;
      if (
        this.dragLastCell
        && this.dragLastCell.row === row
        && this.dragLastCell.col === col
      ) {
        return;
      }
      const cell = this.cellVisuals[row][col];
      if (cell) {
        this.dragLastCell = { row, col };
        this.handleCellToggle(row, col, cell);
      }
    });

    this.input.on('pointerup', () => {
      if (this.nudgeDrag) {
        saveToneGridPattern(this.state);
      }
      this.nudgeDrag = null;
      this.dragLastCell = null;
      this.paintMode = false;
    });
  }

  /**
   * @param {number} row
   * @param {number} col
   * @param {Phaser.GameObjects.Rectangle} cellObj
   */
  handleCellToggle(row, col, cellObj) {
    const newState = this.state.toggleCell(row, col);
    if (newState === 1) {
      this.tweens.add({
        targets: cellObj,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 50,
        yoyo: true,
      });
    } else {
      cellObj.setScale(1);
    }
    this.applyCellVisual(row, col);
    saveToneGridPattern(this.state);
  }

  /**
   * @param {number} row
   * @param {number} col
   */
  applyCellVisual(row, col) {
    const cell = this.cellVisuals[row]?.[col];
    if (!cell || !this.layout) return;
    const section = this.state.getEditSection();
    const active = section.matrix[row][col] === 1;
    const baseX = cell.getData('baseX');
    const baseColor = cell.getData('baseColor');
    const { cellSize } = this.layout;

    cell.setFillStyle(active ? CELL_ACTIVE : baseColor);
    cell.x = baseX + (active ? section.offsets[row][col] * cellSize : 0);
    cell.setScale(1);
    cell.setAlpha(1);
  }

  syncCellColors() {
    for (let r = 0; r < TONEGRID_ROWS; r += 1) {
      for (let c = 0; c < TONEGRID_COLS; c += 1) {
        this.applyCellVisual(r, c);
      }
    }
  }

  async togglePlayback() {
    if (!this.audioEngine) {
      this.audioEngine = createToneGridEngine(this.state);
      this.audioEngine.setStopAtEndHandler(() => {
        this.audioEngine?.pause();
        if (this.playBtnText) this.playBtnText.setText('Play');
      });
    }
    if (this.state.isPlaying) {
      this.audioEngine.pause();
      this.playheadBar?.setVisible(true);
    } else {
      this.state.resetPlaybackPosition();
      await this.audioEngine.start();
      this.playheadBar?.setVisible(true);
      this.syncCellColors();
    }
    if (this.playBtnText) {
      this.playBtnText.setText(this.state.isPlaying ? 'Pause' : 'Play');
    }
  }

  clearGrid() {
    this.state.clearEditSection();
    this.syncCellColors();
    saveToneGridPattern(this.state);
  }

  /**
   * @param {number} delta
   */
  changeBpm(delta) {
    this.state.setBpm(this.state.bpm + delta);
    if (this.audioEngine) {
      this.audioEngine.setBpm(this.state.bpm);
    }
    if (this.bpmText) {
      this.bpmText.setText(`${this.state.bpm} BPM`);
    }
    saveToneGridPattern(this.state);
  }

  /**
   * @param {number} step
   */
  updateVisualPlayhead(step) {
    if (!this.state.isPlaying && !this.playheadBar?.visible) return;
    if (!this.playheadBar || !this.layout) return;

    this.playheadBar.setVisible(true);
    const { cellSize, gap } = this.layout;
    const stride = cellSize + gap;
    const targetX = this.layout.offsetX + gap + step * stride + cellSize / 2;
    this.playheadBar.x = targetX;

    const section = this.state.getPlaySection();
    for (let r = 0; r < TONEGRID_ROWS; r += 1) {
      if (section.matrix[r][step] !== 1) continue;
      const activeCell =
        this.state.editSectionId === this.state.playSectionId
          ? this.cellVisuals[r][step]
          : null;

      if (activeCell) {
        this.tweens.add({
          targets: activeCell,
          alpha: 0.6,
          duration: 60,
          yoyo: true,
          onStart: () => {
            activeCell.setFillStyle(0xffffff);
          },
          onComplete: () => {
            this.applyCellVisual(r, step);
          },
        });
      }

      const offset = section.offsets[r][step];
      const { x, y } = cellCenter(this.layout, r, step);
      this.burstParticles(x + offset * cellSize, y);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  burstParticles(x, y) {
    if (!this.textures.exists('tonegrid-particle')) return;
    const emitter = this.add.particles(x, y, 'tonegrid-particle', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.6, end: 0 },
      lifespan: 200,
      quantity: 6,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.setDepth(11);
    emitter.explode(6);
    this.time.delayedCall(300, () => emitter.destroy());
  }

  goToMenu() {
    if (this.audioEngine) {
      this.audioEngine.stop();
    }
    saveToneGridPattern(this.state);
    this.scene.start('Menu');
  }

  shutdown() {
    window.removeEventListener(SEQUENCER_STEP_EVENT, this.onSequencerStep);
    window.removeEventListener(SECTION_CHANGE_EVENT, this.onSectionChange);
    this.scale.off('resize', this.rebuildUiPreserveState, this);
    if (this.audioEngine) {
      this.audioEngine.dispose();
      this.audioEngine = null;
    }
    saveToneGridPattern(this.state);
  }
}
