/**
 * Level 4 UI: flashing Allen keys (P1), rhythm readout (Daughter), keypad (P2).
 */
import { ALLEN_KEY_COLORS } from '../../logic/puzzleData.js';
import {
  RHYTHM_WINDOW_MS,
  generateSequence,
  isPartialMatch,
  isRhythmExpired,
  sequencesMatch,
} from '../../logic/levels/allenKey.js';
import { playClick, playSuccess, playError } from '../../audio/ikeaSynth.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

const FLASH_ON_MS = 700;
const FLASH_OFF_MS = 300;

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {() => void} onComplete
 */
export function renderLevel4(container, session, onComplete) {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikea-level ikea-level--4';
  const sequence = generateSequence(session.seed);

  if (session.role === 'p1') {
    panel.innerHTML = buildP1View();
    wireP1Flash(panel, sequence);
  } else if (session.role === 'p2') {
    panel.innerHTML = buildP2View();
    wireP2Keypad(panel, sequence, onComplete);
  } else {
    panel.innerHTML = buildDaughterView();
    wireDaughterReadout(panel, sequence);
  }

  container.appendChild(panel);
}

function buildP1View() {
  const keys = ALLEN_KEY_COLORS.map(
    (c) => `<div class="ikea-allen-key ikea-allen-key--${c}" data-color="${c}"></div>`,
  ).join('');
  return `
    <h2 class="ikea-level-title">Level 3: Unbrakonyckel</h2>
    <p>Watch the Allen key rhythm — call nothing out, let the Specialist read!</p>
    <div class="ikea-allen-display">${keys}</div>
  `;
}

function buildP2View() {
  const keys = ALLEN_KEY_COLORS.map(
    (c) =>
      `<button type="button" class="ikea-btn ikea-keypad-btn ikea-allen-key--${c}" data-color="${c}">${c}</button>`,
  ).join('');
  return `
    <h2 class="ikea-level-title">Level 3: Unbrakonyckel</h2>
    <p>Repeat the color sequence within 5 seconds!</p>
    <p class="ikea-rhythm-timer">Time: <span class="ikea-timer-val">5.0</span>s</p>
    <div class="ikea-keypad">${keys}</div>
    <p class="ikea-keypad-progress"></p>
  `;
}

function buildDaughterView() {
  return `
    <h2 class="ikea-level-title">Level 3: Rhythm Guide</h2>
    <p>Read the colors aloud as they light up!</p>
    <p class="ikea-daughter-rhythm ikea-mono">—</p>
  `;
}

/**
 * @param {HTMLElement} panel
 * @param {string[]} sequence
 */
function wireP1Flash(panel, sequence) {
  const keys = panel.querySelectorAll('.ikea-allen-key');
  let idx = 0;

  const flashOne = () => {
    keys.forEach((k) => k.classList.remove('ikea-allen-key--lit'));
    const color = sequence[idx % sequence.length];
    const el = panel.querySelector(`.ikea-allen-key[data-color="${color}"]`);
    el?.classList.add('ikea-allen-key--lit');
    window.setTimeout(() => {
      el?.classList.remove('ikea-allen-key--lit');
      idx += 1;
      window.setTimeout(flashOne, FLASH_OFF_MS);
    }, FLASH_ON_MS);
  };
  flashOne();
}

/**
 * @param {HTMLElement} panel
 * @param {string[]} sequence
 */
function wireDaughterReadout(panel, sequence) {
  const out = panel.querySelector('.ikea-daughter-rhythm');
  let idx = 0;
  const tick = () => {
    const color = sequence[idx % sequence.length];
    if (out) out.textContent = color.toUpperCase();
    idx += 1;
    window.setTimeout(tick, FLASH_ON_MS + FLASH_OFF_MS);
  };
  tick();
}

/**
 * @param {HTMLElement} panel
 * @param {string[]} sequence
 * @param {() => void} onComplete
 */
function wireP2Keypad(panel, sequence, onComplete) {
  /** @type {string[]} */
  let input = [];
  let roundStart = Date.now();
  const progressEl = panel.querySelector('.ikea-keypad-progress');
  const timerEl = panel.querySelector('.ikea-timer-val');

  const resetRound = () => {
    input = [];
    roundStart = Date.now();
    if (progressEl) progressEl.textContent = 'Sequence reset — listen again!';
    showToast('New sequence — go!');
  };

  const timerId = window.setInterval(() => {
    const left = Math.max(0, RHYTHM_WINDOW_MS - (Date.now() - roundStart));
    if (timerEl) timerEl.textContent = (left / 1000).toFixed(1);
    if (isRhythmExpired(roundStart) && input.length > 0 && input.length < sequence.length) {
      playError();
      wobbleElement(panel);
      resetRound();
    }
  }, 100);

  panel.querySelectorAll('.ikea-keypad-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClick();
      if (isRhythmExpired(roundStart)) {
        resetRound();
        return;
      }
      const color = btn.getAttribute('data-color');
      if (!color) return;
      input.push(color);
      if (progressEl) progressEl.textContent = `Entered: ${input.join(' → ')}`;

      if (!isPartialMatch(sequence, input)) {
        playError();
        wobbleElement(panel);
        resetRound();
        return;
      }

      if (sequencesMatch(sequence, input)) {
        window.clearInterval(timerId);
        playSuccess();
        burstConfetti();
        showToast('FANTASTISKT!');
        onComplete();
      }
    });
  });

  resetRound();
}
