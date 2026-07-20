/**
 * Level 3 UI: blues band — Meike (Hammond), Monique (flute), Jelle (bass).
 */
import {
  BLUES_CHORDS,
  BLUES_PROGRESSION,
  CHORDS_PER_BAR,
  MAX_CHORD_MISTAKES,
  bluesChordLabel,
  bluesPositionForIndex,
  isBluesProgressionComplete,
  isExpectedChordAt,
  shouldResetBluesAttempt,
} from '../../logic/levels/bluesChords.js';
import {
  peekNextBassBluesRole,
  peekNextFluteArpeggioDirection,
  playBassBluesChord,
  playBluesChord,
  playClick,
  playError,
  playFluteBluesChord,
  playSuccess,
  resetBassAlternation,
  resetFluteAlternation,
} from '../../audio/ikeaSynth.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {() => void} onComplete
 */
export function renderLevel4(container, session, onComplete) {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikea-level ikea-level--blues';

  if (session.role === 'daughter') {
    panel.innerHTML = buildMeikeView();
    wireMeikeKeypad(panel, onComplete);
  } else if (session.role === 'p1') {
    panel.innerHTML = buildCoachView(
      'Monique',
      'Lees het blues-schema voor Meike: 4 akkoorden per maat, tonica C majeur.',
      'Fluit — tik een akkoord: arpeggio wisselt laag→hoog en hoog→laag.',
      '<p class="ikea-bass-next">Volgende arpeggio: <strong class="ikea-flute-next-val">laag → hoog</strong></p>',
    );
    wireFluteKeypad(panel);
  } else {
    panel.innerHTML = buildCoachView(
      'Jelle',
      'Tel de maten mee en help Meike. Na 3 fout piept het — dan opnieuw vanaf maat 1.',
      'Bas — tik een akkoord: grondtoon en kwint wisselen om en om.',
      '<p class="ikea-bass-next">Volgende noot: <strong class="ikea-bass-next-val">grondtoon</strong></p>',
    );
    wireBassKeypad(panel);
  }

  container.appendChild(panel);
}

/**
 * @returns {string}
 */
function buildChordKeypadHtml() {
  const keys = BLUES_CHORDS.map(
    (chord) =>
      `<button type="button" class="ikea-btn ikea-chord-btn" data-chord="${chord}">${chord}</button>`,
  ).join('');
  return `<div class="ikea-chord-keypad">${keys}</div>`;
}

/**
 * @param {string} name
 * @param {string} intro
 * @param {string} instrumentLine
 * @param {string} nextHintHtml
 * @returns {string}
 */
function buildCoachView(name, intro, instrumentLine, nextHintHtml) {
  const bars = BLUES_PROGRESSION.map(
    (bar, index) =>
      `<div class="ikea-blues-bar">
        <span class="ikea-blues-bar-label">Maat ${index + 1}</span>
        <span class="ikea-blues-bar-chords">${bar.map((chord) => bluesChordLabel(chord)).join(' · ')}</span>
      </div>`,
  ).join('');

  return `
    <h2 class="ikea-level-title">Level 3: Blues-schema</h2>
    <p><strong>${name}:</strong> ${intro}</p>
    <div class="ikea-blues-chart" aria-label="12-bar blues schema">
      ${bars}
    </div>
    <p class="ikea-hint">Maat 3 begint met <strong>II (Dm)</strong> — ii in de ii–V–I–V turnaround.</p>
    <p class="ikea-instrument-label">${instrumentLine}</p>
    ${nextHintHtml}
    ${buildChordKeypadHtml()}
    <p class="ikea-hint">Alleen Meike's invoer telt voor het level; jullie spelen mee op jullie instrument.</p>
  `;
}

function buildMeikeView() {
  return `
    <h2 class="ikea-level-title">Level 3: Blues-schema</h2>
    <p>Speel het 12-bar blues-schema in C: <strong>4 akkoorden per maat</strong>. Monique (fluit) en Jelle (bas) begeleiden je.</p>
    <p class="ikea-instrument-label">Hammond — volledig akkoord per toets.</p>
    <p class="ikea-blues-progress">Maat <span class="ikea-blues-bar-val">1</span> · akkoord <span class="ikea-blues-slot-val">1</span> van ${CHORDS_PER_BAR}</p>
    <p class="ikea-blues-entered ikea-mono">—</p>
    ${buildChordKeypadHtml()}
    <p class="ikea-buzz-count">Fouten: <span class="ikea-buzz-val">0</span> / ${MAX_CHORD_MISTAKES}</p>
  `;
}

/**
 * @param {HTMLElement} panel
 */
function wireFluteKeypad(panel) {
  const nextEl = panel.querySelector('.ikea-flute-next-val');

  const updateNextLabel = () => {
    if (!nextEl) return;
    nextEl.textContent =
      peekNextFluteArpeggioDirection() === 'descending' ? 'hoog → laag' : 'laag → hoog';
  };

  resetFluteAlternation();
  updateNextLabel();

  panel.querySelectorAll('.ikea-chord-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chord = btn.getAttribute('data-chord');
      if (!chord) return;
      playFluteBluesChord(chord);
      updateNextLabel();
    });
  });
}

/**
 * @param {HTMLElement} panel
 */
function wireBassKeypad(panel) {
  const nextEl = panel.querySelector('.ikea-bass-next-val');

  const updateNextLabel = () => {
    if (!nextEl) return;
    nextEl.textContent = peekNextBassBluesRole() === 'fifth' ? 'kwint (5e)' : 'grondtoon';
  };

  resetBassAlternation();
  updateNextLabel();

  panel.querySelectorAll('.ikea-chord-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chord = btn.getAttribute('data-chord');
      if (!chord) return;
      playBassBluesChord(chord);
      updateNextLabel();
    });
  });
}

/**
 * @param {HTMLElement} panel
 * @param {() => void} onComplete
 */
function wireMeikeKeypad(panel, onComplete) {
  /** @type {string[]} */
  let entered = [];
  let mistakes = 0;

  const barEl = panel.querySelector('.ikea-blues-bar-val');
  const slotEl = panel.querySelector('.ikea-blues-slot-val');
  const enteredEl = panel.querySelector('.ikea-blues-entered');
  const buzzEl = panel.querySelector('.ikea-buzz-val');

  const updateProgressUi = () => {
    const pos = bluesPositionForIndex(entered.length);
    if (barEl) barEl.textContent = String(pos.bar);
    if (slotEl) slotEl.textContent = String(pos.slot);
    if (enteredEl) {
      enteredEl.textContent = entered.length > 0 ? entered.join(' · ') : '—';
    }
    if (buzzEl) buzzEl.textContent = String(mistakes);
  };

  const resetAttempt = () => {
    entered = [];
    mistakes = 0;
    resetBassAlternation();
    updateProgressUi();
    showToast('3× fout — opnieuw vanaf maat 1!');
    wobbleElement(panel);
  };

  panel.querySelectorAll('.ikea-chord-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chord = btn.getAttribute('data-chord');
      if (!chord) return;

      playClick();
      playBluesChord(chord);

      if (!isExpectedChordAt(entered.length, chord)) {
        mistakes += 1;
        playError();
        wobbleElement(btn);
        updateProgressUi();
        if (shouldResetBluesAttempt(mistakes)) {
          resetAttempt();
        } else {
          showToast(`Fout akkoord! Nog ${MAX_CHORD_MISTAKES - mistakes} pogingen.`);
        }
        return;
      }

      entered.push(chord);
      updateProgressUi();

      if (isBluesProgressionComplete(entered.length)) {
        playSuccess();
        burstConfetti();
        showToast('FANTASTISKT! Lees je 4CODE voor Monique en Jelle.');
        onComplete();
      }
    });
  });

  updateProgressUi();
}
