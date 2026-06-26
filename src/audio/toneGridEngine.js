/**
 * Tone.js audio engine for ToneGrid: scheduled steps, synth chain, section chaining.
 */
import * as Tone from 'tone';
import { SEQUENCER_CONFIG } from '../logic/toneGrid.js';

/** Window event fired on each sequencer step for Phaser sync. */
export const SEQUENCER_STEP_EVENT = 'sequencer-step';

/** Window event fired when playback advances to the next section. */
export const SECTION_CHANGE_EVENT = 'tonegrid-section-change';

const STEP_INDICES = Array.from({ length: SEQUENCER_CONFIG.cols }, (_, i) => i);

/**
 * @typedef {import('../logic/toneGrid.js').ToneGridSongState} ToneGridSongState
 */

/**
 * Creates a Tone.js-backed sequencer bound to shared song state.
 * @param {ToneGridSongState} state
 * @returns {ToneGridEngine}
 */
export function createToneGridEngine(state) {
  return new ToneGridEngine(state);
}

/**
 * Polyphonic step sequencer with transport lifecycle, sections, and cleanup.
 */
export class ToneGridEngine {
  /**
   * @param {ToneGridSongState} state Shared song state (read each step).
   */
  constructor(state) {
    this.state = state;
    this.disposed = false;
    /** @type {(() => void) | null} */
    this.onStopAtEnd = null;

    this.limiter = new Tone.Limiter(-1).toDestination();
    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n.',
      feedback: 0.25,
      wet: 0.2,
    }).connect(this.limiter);

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.0,
        release: 0.2,
      },
    }).connect(this.delay);

    this.sequence = new Tone.Sequence(
      (time, step) => this.handleStep(time, step),
      STEP_INDICES,
      '16n',
    );
  }

  /**
   * @param {number} time
   * @param {number} step
   */
  handleStep(time, step) {
    this.state.currentStep = step;
    const section = this.state.getPlaySection();
    const pitchMap = this.state.getPlayPitchMap();
    const stepSec = Tone.Time('16n').toSeconds();

    for (let r = 0; r < SEQUENCER_CONFIG.rows; r += 1) {
      if (section.matrix[r][step] === 1) {
        const offsetSec = section.offsets[r][step] * stepSec;
        this.synth.triggerAttackRelease(pitchMap[r], '16n', time + offsetSec);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SEQUENCER_STEP_EVENT, {
          detail: {
            step,
            sectionId: this.state.playSectionId,
            time,
          },
        }),
      );
    }

    if (step === SEQUENCER_CONFIG.cols - 1) {
      const next = this.state.advancePlaySection();
      if (next) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(SECTION_CHANGE_EVENT, {
              detail: { sectionId: next, step: 0 },
            }),
          );
        }
      } else if (this.onStopAtEnd) {
        this.onStopAtEnd();
      }
    }
  }

  /**
   * Registers callback when song ends with loopSong disabled.
   * @param {() => void} fn
   */
  setStopAtEndHandler(fn) {
    this.onStopAtEnd = fn;
  }

  /**
   * Unlocks audio context and starts transport playback.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.disposed) return;
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    Tone.getTransport().bpm.value = this.state.bpm;
    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }
    this.sequence.start(0);
    this.state.isPlaying = true;
  }

  /** Pauses transport while keeping the current step position. */
  pause() {
    if (this.disposed) return;
    Tone.getTransport().pause();
    this.state.isPlaying = false;
  }

  /** Stops transport and sequence; resets playhead to step 0 on play section. */
  stop() {
    if (this.disposed) return;
    Tone.getTransport().stop();
    this.sequence.stop();
    this.state.isPlaying = false;
    this.state.resetPlaybackPosition();
  }

  /**
   * Updates transport BPM from shared state.
   * @param {number} bpm
   */
  setBpm(bpm) {
    if (this.disposed) return;
    Tone.getTransport().bpm.value = bpm;
  }

  /** Releases synth nodes and cancels scheduled events. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.sequence.stop();
    this.sequence.dispose();
    this.synth.dispose();
    this.delay.dispose();
    this.limiter.dispose();
    Tone.getTransport().stop();
    this.state.isPlaying = false;
    this.onStopAtEnd = null;
  }
}
