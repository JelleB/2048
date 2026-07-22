/**
 * Level 3: 12-bar blues chord entry in C major (I, II, IV, V) — four chords per bar.
 */

/** Roman numerals used in the C-major blues puzzle. */
export const BLUES_CHORDS = ['I', 'II', 'IV', 'V'];

/** Chord slots entered per bar. */
export const CHORDS_PER_BAR = 4;

/** Wrong entries allowed before Meike must restart the progression. */
export const MAX_CHORD_MISTAKES = 3;

/**
 * Three bars × four chords = twelve entries (compressed 12-bar blues in C).
 * Bar 3 uses II on beat 1 as a ii–V–I–V turnaround (standard jazz-blues fudge).
 * @type {string[][]}
 */
export const BLUES_PROGRESSION = [
  ['I', 'I', 'I', 'I'],
  ['IV', 'IV', 'I', 'I'],
  ['II', 'V', 'I', 'V'],
];

/** Flat target sequence derived from {@link BLUES_PROGRESSION}. */
export const BLUES_SEQUENCE = BLUES_PROGRESSION.flat();

/**
 * @param {string[][]} [bars=BLUES_PROGRESSION]
 * @returns {string[]}
 */
export function flattenBluesProgression(bars = BLUES_PROGRESSION) {
  return bars.flat();
}

/**
 * @param {string[][]} bars
 * @returns {number}
 */
export function bluesChordCount(bars = BLUES_PROGRESSION) {
  return flattenBluesProgression(bars).length;
}

/**
 * @param {number} flatIndex - Zero-based index into the flat sequence.
 * @param {string[][]} [bars=BLUES_PROGRESSION]
 * @returns {{ bar: number, slot: number }}
 */
export function bluesPositionForIndex(flatIndex, bars = BLUES_PROGRESSION) {
  const bar = Math.floor(flatIndex / CHORDS_PER_BAR);
  const slot = flatIndex % CHORDS_PER_BAR;
  return { bar: bar + 1, slot: slot + 1 };
}

/**
 * @param {number} index
 * @param {string} chord
 * @param {string[][]} [bars=BLUES_PROGRESSION]
 * @returns {boolean}
 */
export function isExpectedChordAt(index, chord, bars = BLUES_PROGRESSION) {
  const sequence = flattenBluesProgression(bars);
  return sequence[index] === chord;
}

/**
 * @param {number} mistakeCount
 * @returns {boolean}
 */
export function shouldResetBluesAttempt(mistakeCount) {
  return mistakeCount >= MAX_CHORD_MISTAKES;
}

/**
 * @param {number} enteredCount
 * @param {string[][]} [bars=BLUES_PROGRESSION]
 * @returns {boolean}
 */
export function isBluesProgressionComplete(enteredCount, bars = BLUES_PROGRESSION) {
  return enteredCount >= bluesChordCount(bars);
}

/**
 * Human-readable chord names for coaches (Monique / Jelle).
 * @param {string} numeral
 * @returns {string}
 */
export function bluesChordLabel(numeral) {
  const labels = {
    I: 'I (C)',
    II: 'II (Dm)',
    IV: 'IV (F)',
    V: 'V (G)',
  };
  return labels[numeral] || numeral;
}
