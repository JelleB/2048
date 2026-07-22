/**
 * Level 3 UI: blues band — Player 3 (Hammond), Player 1 (flute), Player 2 (bass).
 */
import { formatPlayerName, getPlayerByRole } from '../logic/puzzleData.js';
import { ALLEN_KEY_LEVEL, displayLevelNumber, displayLevelTitle } from '../../logic/levelProgression.js';
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
} from '../../audio/ikkejaSynth.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkkeJaSession} session
 * @param {() => void} onComplete
 */
export function renderLevel4(container, session, onComplete) {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikkeja-level ikkeja-level--blues';

  if (session.role === 'daughter') {
    panel.innerHTML = buildPlayer3View();
    wirePlayer3Keypad(panel, onComplete);
  } else if (session.role === 'p1') {
    panel.innerHTML = buildCoachView(
      formatPlayerName(getPlayerByRole('p1')),
      `Lees het blues-schema voor ${formatPlayerName(getPlayerByRole('daughter'))}: 4 akkoorden per maat, tonica C majeur.`,
      'Fluit — tik een akkoord: arpeggio wisselt laag→hoog en hoog→laag.',
      '<p class="ikkeja-bass-next">Volgende arpeggio: <strong class="ikkeja-flute-next-val">laag → hoog</strong></p>',
    );
    wireFluteKeypad(panel);
  } else {
    panel.innerHTML = buildCoachView(
      formatPlayerName(getPlayerByRole('p2')),
      `Tel de maten mee en help ${formatPlayerName(getPlayerByRole('daughter'))}. Na 3 fout piept het — dan opnieuw vanaf maat 1.`,
      'Bas — tik een akkoord: grondtoon en kwint wisselen om en om.',
      '<p class="ikkeja-bass-next">Volgende noot: <strong class="ikkeja-bass-next-val">grondtoon</strong></p>',
    );
    wireBassKeypad(panel);
  }

  container.appendChild(panel);
}

function bluesLevelHeading() {
  return `Level ${displayLevelNumber(ALLEN_KEY_LEVEL)}: ${displayLevelTitle(ALLEN_KEY_LEVEL)}`;
}

/**
 * @returns {string}
 */
function buildChordKeypadHtml() {
  const keys = BLUES_CHORDS.map(
    (chord) =>
      `<button type="button" class="ikkeja-btn ikkeja-chord-btn" data-chord="${chord}">${chord}</button>`,
  ).join('');
  return `<div class="ikkeja-chord-keypad">${keys}</div>`;
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
      `<div class="ikkeja-blues-bar">
        <span class="ikkeja-blues-bar-label">Maat ${index + 1}</span>
        <span class="ikkeja-blues-bar-chords">${bar.map((chord) => bluesChordLabel(chord)).join(' · ')}</span>
      </div>`,
  ).join('');

  return `
    <h2 class="ikkeja-level-title">${bluesLevelHeading()}</h2>
    <p><strong>${name}:</strong> ${intro}</p>
    <div class="ikkeja-blues-chart" aria-label="12-bar blues schema">
      ${bars}
    </div>
    <p class="ikkeja-hint">Maat 3 begint met <strong>II (Dm)</strong> — ii in de ii–V–I–V turnaround.</p>
    <p class="ikkeja-instrument-label">${instrumentLine}</p>
    ${nextHintHtml}
    ${buildChordKeypadHtml()}
    <p class="ikkeja-hint">Alleen ${formatPlayerName(getPlayerByRole('daughter'))}'s invoer telt voor het level; jullie spelen mee op jullie instrument.</p>
  `;
}

function buildPlayer3View() {
  const p1 = formatPlayerName(getPlayerByRole('p1'));
  const p2 = formatPlayerName(getPlayerByRole('p2'));
  return `
    <h2 class="ikkeja-level-title">${bluesLevelHeading()}</h2>
    <p>Speel het 12-bar blues-schema in C: <strong>4 akkoorden per maat</strong>. ${p1} (fluit) en ${p2} (bas) begeleiden je.</p>
    <p class="ikkeja-instrument-label">Hammond — volledig akkoord per toets.</p>
    <p class="ikkeja-blues-progress">Maat <span class="ikkeja-blues-bar-val">1</span> · akkoord <span class="ikkeja-blues-slot-val">1</span> van ${CHORDS_PER_BAR}</p>
    <p class="ikkeja-blues-entered ikkeja-mono">—</p>
    ${buildChordKeypadHtml()}
    <p class="ikkeja-buzz-count">Fouten: <span class="ikkeja-buzz-val">0</span> / ${MAX_CHORD_MISTAKES}</p>
  `;
}

/**
 * @param {HTMLElement} panel
 */
function wireFluteKeypad(panel) {
  const nextEl = panel.querySelector('.ikkeja-flute-next-val');

  const updateNextLabel = () => {
    if (!nextEl) return;
    nextEl.textContent =
      peekNextFluteArpeggioDirection() === 'descending' ? 'hoog → laag' : 'laag → hoog';
  };

  resetFluteAlternation();
  updateNextLabel();

  panel.querySelectorAll('.ikkeja-chord-btn').forEach((btn) => {
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
  const nextEl = panel.querySelector('.ikkeja-bass-next-val');

  const updateNextLabel = () => {
    if (!nextEl) return;
    nextEl.textContent = peekNextBassBluesRole() === 'fifth' ? 'kwint (5e)' : 'grondtoon';
  };

  resetBassAlternation();
  updateNextLabel();

  panel.querySelectorAll('.ikkeja-chord-btn').forEach((btn) => {
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
function wirePlayer3Keypad(panel, onComplete) {
  /** @type {string[]} */
  let entered = [];
  let mistakes = 0;

  const barEl = panel.querySelector('.ikkeja-blues-bar-val');
  const slotEl = panel.querySelector('.ikkeja-blues-slot-val');
  const enteredEl = panel.querySelector('.ikkeja-blues-entered');
  const buzzEl = panel.querySelector('.ikkeja-buzz-val');

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

  panel.querySelectorAll('.ikkeja-chord-btn').forEach((btn) => {
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
        showToast(
          `FANTASTISKT! Lees je 4CODE voor ${formatPlayerName(getPlayerByRole('p1'))} en ${formatPlayerName(getPlayerByRole('p2'))}.`,
        );
        onComplete();
      }
    });
  });

  updateProgressUi();
}
