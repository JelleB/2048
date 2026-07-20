/**
 * Web Audio synthesizer for IKEA escape room — no external audio files.
 */

/** @type {AudioContext|null} */
let ctx = null;

/**
 * Lazily creates AudioContext after a user gesture.
 * @returns {AudioContext}
 */
function getContext() {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

/**
 * Plays a short sine tone.
 * @param {number} freq - Hz.
 * @param {number} duration - Seconds.
 * @param {number} [volume=0.15]
 * @param {number} [delay=0]
 */
function playTone(freq, duration, volume = 0.15, delay = 0) {
  const audio = getContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t = audio.currentTime + delay;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Short high-pitched button tap. */
export function playClick() {
  playTone(880, 0.04, 0.12);
}

/** Major triad arpeggio C5–E5–G5 on success. */
export function playSuccess() {
  playTone(523.25, 0.18, 0.14, 0);
  playTone(659.25, 0.18, 0.14, 0.12);
  playTone(783.99, 0.22, 0.14, 0.24);
}

/** Gentle double low thud on error. */
export function playError() {
  playTone(120, 0.12, 0.2, 0);
  playTone(100, 0.14, 0.18, 0.16);
}

/** Note frequencies for Happy Birthday (C major, simplified). */
const BIRTHDAY_MELODY = [
  { f: 261.63, d: 0.25 },
  { f: 261.63, d: 0.12 },
  { f: 293.66, d: 0.35 },
  { f: 261.63, d: 0.35 },
  { f: 349.23, d: 0.35 },
  { f: 329.63, d: 0.55 },
  { f: 261.63, d: 0.25 },
  { f: 261.63, d: 0.12 },
  { f: 293.66, d: 0.35 },
  { f: 261.63, d: 0.35 },
  { f: 392.0, d: 0.35 },
  { f: 349.23, d: 0.55 },
];

/**
 * Plays synthesized Happy Birthday tune once.
 */
export function playHappyBirthday() {
  let offset = 0;
  for (const note of BIRTHDAY_MELODY) {
    playTone(note.f, note.d, 0.12, offset);
    offset += note.d + 0.05;
  }
}

/** Ensures audio context is ready (call on first user interaction). */
export function initAudio() {
  getContext();
}
