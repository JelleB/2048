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

/** Hammond drawbar-style harmonic weights (multiple of fundamental). */
const HAMMOND_HARMONICS = [
  { mult: 1, level: 1, wave: 'sine' },
  { mult: 2, level: 0.78, wave: 'sine' },
  { mult: 3, level: 0.52, wave: 'triangle' },
  { mult: 4, level: 0.3, wave: 'triangle' },
  { mult: 6, level: 0.16, wave: 'sine' },
];

/** Root-position triads in a warm organ register (C major blues). */
const BLUES_CHORD_HZ = {
  I: [130.81, 164.81, 196.0],
  II: [146.83, 174.61, 220.0],
  IV: [174.61, 220.0, 261.63],
  V: [196.0, 246.94, 293.66],
};

/** Block chord length in seconds. */
const HAMMOND_CHORD_DURATION = 0.78;

/** Dedicated bass register: root and fifth per blues chord (Hz, C3 range for audibility). */
const BLUES_BASS_ROOT_FIFTH = {
  I: { root: 130.81, fifth: 196.0 },
  II: { root: 146.83, fifth: 220.0 },
  IV: { root: 174.61, fifth: 261.63 },
  V: { root: 196.0, fifth: 293.66 },
};

/** Toggles each bass key press: false → root, true → fifth. */
let bassAlternateToggle = false;

/** false → ascending arpeggio, true → descending. */
let fluteArpeggioDescending = false;

/**
 * Returns the bass frequency for the current press and advances alternation.
 * Exported for unit tests.
 * @param {string} chord
 * @returns {number|null}
 */
export function nextBassBluesFrequency(chord) {
  const bass = BLUES_BASS_ROOT_FIFTH[chord];
  if (!bass) {
    return null;
  }
  const freq = bassAlternateToggle ? bass.fifth : bass.root;
  bassAlternateToggle = !bassAlternateToggle;
  return freq;
}

/**
 * @returns {'root'|'fifth'} What the next bass press will play.
 */
export function peekNextBassBluesRole() {
  return bassAlternateToggle ? 'fifth' : 'root';
}

/**
 * Returns arpeggio note order for the current press and toggles direction.
 * Exported for unit tests.
 * @param {number[]} freqs - Note frequencies in low→high order.
 * @returns {number[]}
 */
export function nextFluteArpeggioOrder(freqs) {
  const ordered = fluteArpeggioDescending ? [...freqs].reverse() : [...freqs];
  fluteArpeggioDescending = !fluteArpeggioDescending;
  return ordered;
}

/**
 * @returns {'ascending'|'descending'} Direction of the next flute arpeggio.
 */
export function peekNextFluteArpeggioDirection() {
  return fluteArpeggioDescending ? 'descending' : 'ascending';
}

/**
 * @param {string} chord
 * @returns {number[]|null}
 */
function bluesChordFreqs(chord) {
  return BLUES_CHORD_HZ[chord] || null;
}

/**
 * Soft flute-like tone with vibrato into a destination node.
 * @param {number} freq
 * @param {number} when
 * @param {number} duration
 * @param {AudioNode} destination
 * @param {number} peakGain
 */
function playFluteTone(freq, when, duration, destination, peakGain) {
  const audio = getContext();
  const envelope = audio.createGain();
  envelope.connect(destination);

  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.linearRampToValueAtTime(peakGain, when + 0.025);
  envelope.gain.exponentialRampToValueAtTime(peakGain * 0.65, when + 0.08);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  const osc = audio.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, when);

  const vibrato = audio.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.value = 5.2;
  const vibratoDepth = audio.createGain();
  vibratoDepth.gain.value = freq * 0.012;
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(osc.frequency);

  osc.connect(envelope);
  osc.start(when);
  osc.stop(when + duration + 0.05);
  vibrato.start(when);
  vibrato.stop(when + duration + 0.05);
}

/**
 * Plays a blues triad as a flute arpeggio (Monique).
 * @param {string} chord - I, II, IV, or V.
 */
export function playFluteBluesChord(chord) {
  const freqs = bluesChordFreqs(chord);
  if (!freqs) {
    playClick();
    return;
  }

  const audio = getContext();
  const when = audio.currentTime;
  const arpeggio = nextFluteArpeggioOrder(freqs.map((freq) => freq * 2));
  const step = 0.28;
  const noteDuration = 0.34;

  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 4200;
  filter.Q.value = 0.4;
  filter.connect(audio.destination);

  arpeggio.forEach((freq, index) => {
    const isLast = index === arpeggio.length - 1;
    const duration = isLast ? noteDuration * 2 : noteDuration;
    const peakGain = index === 0 ? 0.16 : 0.12;
    playFluteTone(freq, when + index * step, duration, filter, peakGain);
  });
}

/**
 * Plays root or fifth on alternating presses (Jelle's bass).
 * @param {string} chord - I, II, IV, or V.
 */
export function playBassBluesChord(chord) {
  const freq = nextBassBluesFrequency(chord);
  if (freq === null) {
    return;
  }

  const audio = getContext();
  const when = audio.currentTime;
  const duration = 0.62;

  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(720, when);
  filter.frequency.exponentialRampToValueAtTime(420, when + duration);
  filter.Q.value = 0.9;

  const master = audio.createGain();
  master.gain.setValueAtTime(0.7, when);
  filter.connect(master);
  master.connect(audio.destination);

  const env = audio.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.linearRampToValueAtTime(0.38, when + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  env.connect(filter);

  // Main pitch (C3) + quiet upper harmonic for speakers + sub-octave for headphones.
  const fundamental = audio.createOscillator();
  fundamental.type = 'sine';
  fundamental.frequency.setValueAtTime(freq, when);

  const presence = audio.createOscillator();
  presence.type = 'sine';
  presence.frequency.setValueAtTime(freq * 2, when);

  const sub = audio.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq / 2, when);

  const fundGain = audio.createGain();
  fundGain.gain.value = 1;
  const presenceGain = audio.createGain();
  presenceGain.gain.value = 0.22;
  const subGain = audio.createGain();
  subGain.gain.value = 0.55;

  fundamental.connect(fundGain);
  presence.connect(presenceGain);
  sub.connect(subGain);
  fundGain.connect(env);
  presenceGain.connect(env);
  subGain.connect(env);

  fundamental.start(when);
  presence.start(when);
  sub.start(when);
  fundamental.stop(when + duration + 0.05);
  presence.stop(when + duration + 0.05);
  sub.stop(when + duration + 0.05);
}

/**
 * Resets bass root/fifth alternation (e.g. new level attempt).
 */
export function resetBassAlternation() {
  bassAlternateToggle = false;
}

/**
 * Resets flute arpeggio direction (e.g. new level attempt).
 */
export function resetFluteAlternation() {
  fluteArpeggioDescending = false;
}

/**
 * Builds a Hammond-style organ note (drawbars + soft envelope) into a bus node.
 * @param {number} freq - Fundamental Hz.
 * @param {number} when - AudioContext time.
 * @param {number} duration
 * @param {AudioNode} destination
 * @param {number} peakGain
 */
function playHammondNote(freq, when, duration, destination, peakGain) {
  const audio = getContext();
  const envelope = audio.createGain();
  envelope.connect(destination);

  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(peakGain, when + 0.012);
  envelope.gain.exponentialRampToValueAtTime(peakGain * 0.82, when + 0.1);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  const norm = HAMMOND_HARMONICS.reduce((sum, h) => sum + h.level, 0);

  for (const harmonic of HAMMOND_HARMONICS) {
    const osc = audio.createOscillator();
    osc.type = /** @type {OscillatorType} */ (harmonic.wave);
    osc.frequency.value = freq * harmonic.mult;

    const partial = audio.createGain();
    partial.gain.value = harmonic.level / norm;
    osc.connect(partial);
    partial.connect(envelope);
    osc.start(when);
    osc.stop(when + duration + 0.06);
  }

  // Short percussion bump on the 2nd harmonic (Hammond “attack”).
  const perc = audio.createOscillator();
  perc.type = 'sine';
  perc.frequency.value = freq * 2;
  const percGain = audio.createGain();
  percGain.gain.setValueAtTime(0.0001, when);
  percGain.gain.exponentialRampToValueAtTime(peakGain * 0.35, when + 0.004);
  percGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  perc.connect(percGain);
  percGain.connect(destination);
  perc.start(when);
  perc.stop(when + 0.08);
}

/**
 * Plays a blues chord as a Hammond-style block (Leslie tremolo + warm filter).
 * @param {string} chord - I, II, IV, or V.
 */
export function playBluesChord(chord) {
  const freqs = bluesChordFreqs(chord);
  if (!freqs) {
    playClick();
    return;
  }

  const audio = getContext();
  const when = audio.currentTime;
  const duration = HAMMOND_CHORD_DURATION;

  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, when);
  filter.frequency.exponentialRampToValueAtTime(2400, when + duration);
  filter.Q.value = 0.6;

  const master = audio.createGain();
  master.gain.setValueAtTime(0.62, when);
  filter.connect(master);
  master.connect(audio.destination);

  const leslie = audio.createOscillator();
  leslie.type = 'sine';
  leslie.frequency.value = 6.1;
  const leslieDepth = audio.createGain();
  leslieDepth.gain.value = 0.2;
  leslie.connect(leslieDepth);
  leslieDepth.connect(master.gain);
  leslie.start(when);
  leslie.stop(when + duration + 0.08);

  const noteGain = 0.11;
  for (const freq of freqs) {
    playHammondNote(freq, when, duration, filter, noteGain);
  }
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
