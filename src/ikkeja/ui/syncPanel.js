/**
 * Sync code panel: Level 1 crossword completion code; levels 2–4 time-based 4CODE.
 */
import { selectCrosswordBySeed, validateCrosswordCompletionCode } from '../logic/levels/crossword.js';
import { crosswordCompletionCode } from '../logic/crosswordLayout.js';
import { getSlotProgress, getTimeSlot, syncCodeForSeed, validateSyncCode } from '../logic/syncEngine.js';
import {
  ALLEN_KEY_LEVEL,
  CROSSWORD_LEVEL,
  displayLevelNumber,
  MAZE_LEVEL,
  nextPlayableLevel,
  normalizeSessionLevel,
  VICTORY_LEVEL,
} from '../logic/levelProgression.js';
import { formatPlayerName, getPlayerByRole } from '../logic/puzzleData.js';
import { playClick, playError, playSuccess } from '../audio/ikkejaSynth.js';
import { glowSuccess, wobbleElement } from './feedback.js';

/** @type {number|null} */
let rafId = null;

/** @param {'p1'|'p2'|'daughter'} role */
function playerLabel(role) {
  return formatPlayerName(getPlayerByRole(role));
}

const COPY = {
  crosswordP1FillFirst:
    'Vul eerst het kruiswoord in. Als alles klopt, verschijnt hier een nieuwe 4CODE voor je team.',
  crosswordP1Complete: (nextDisplay) =>
    `Kruiswoord klaar! Lees deze 4CODE hardop voor ${playerLabel('p2')} & ${playerLabel('daughter')}, of ga zelf door naar Level ${nextDisplay}.`,
  crosswordEnterCompletion: (nextDisplay) =>
    `${playerLabel('p1')} heeft het kruiswoord ingevuld? Voer de 4CODE in die zij voorleest.`,
  p1Active:
    'Team sync · 4CODE: na elk level lees je elke 5 seconden een code vooruit (timerbalk).',
  p2Waiting:
    '4CODE na elk level: wacht tot de puzzel opgelost is, dan leest Player 1 de code voor.',
  p3Waiting:
    '4CODE na elk level: help het team de code invoeren zodra de puzzel klaar is.',
  mazeP1Guide:
    'Geef Player 2 route-aanwijzingen via de kaart. Vraag wat hij ziet om zijn positie te vinden.',
  mazeP2Play:
    'Volg Player 1\'s aanwijzingen. Bij de exit krijg jij de 4CODE voor het team.',
  mazeP3Play:
    'Volg Player 2\'s stappen op je pad en roep waarschuwingen als er vallen in de buurt zijn.',
  mazeP2Complete:
    'Level klaar! Lees je 4CODE hardop — Player 1 en Player 3 kunnen ook doorgaan als jij klaar bent.',
  bluesP1Coach:
    'Lees het schema voor Player 3 en speel mee op fluit (arpeggio laag↔hoog per akkoord).',
  bluesP2Coach:
    'Tel de maten en speel bas: grondtoon ↔ kwint per akkoordtoets.',
  bluesP3Play:
    'Speel het schema in — na afloop lees jij de 4CODE voor het team.',
  bluesP3Complete:
    'Level klaar! Lees je 4CODE hardop — Player 1 en Player 2 kunnen ook doorgaan als jij klaar bent.',
  advanceFromP1: (nextLevel) =>
    `Level klaar! ${playerLabel('p1')}: lees je huidige 4CODE voor. Iedereen: voer hem in voor Level ${nextLevel}.`,
  advanceFromP2: (nextLevel) =>
    `Level klaar! ${playerLabel('p2')}: lees je 4CODE voor. ${playerLabel('p1')} & ${playerLabel('daughter')}: voer hem in voor Level ${nextLevel}.`,
  advanceFromP3: () =>
    `Level klaar! ${playerLabel('daughter')}: lees je 4CODE voor. Voer hem in voor het certificaat.`,
};

/**
 * @typedef {'level1-complete'|'advance'} SyncAdvanceKind
 */

/**
 * @typedef {object} AdvanceGateOptions
 * @property {string} codeSourceLabel
 * @property {string} helpText
 */

/**
 * Renders sync UI into footer based on role and game state.
 * @param {HTMLElement} footer
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
export function renderSyncPanel(footer, session, onAdvance) {
  stopSyncAnimation();
  footer.hidden = false;
  footer.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'ikkeja-sync-panel';

  const level = normalizeSessionLevel(session.level);

  if (level === CROSSWORD_LEVEL) {
    renderCrosswordSync(wrap, session, onAdvance);
    footer.appendChild(wrap);
    return;
  }

  if (level === MAZE_LEVEL) {
    renderMazeSync(wrap, session, onAdvance);
    footer.appendChild(wrap);
    return;
  }

  if (level === ALLEN_KEY_LEVEL) {
    renderBluesSync(wrap, session, onAdvance);
    footer.appendChild(wrap);
    return;
  }

  if (session.levelComplete) {
    wrap.appendChild(
      buildAdvanceGate(session, onAdvance, {
        codeSourceLabel: playerLabel('p1'),
        helpText: COPY.advanceFromP1(displayLevelNumber(nextPlayableLevel(session.level))),
      }),
    );
  } else if (session.role === 'p1') {
    wrap.appendChild(buildCodeReaderPanel(COPY.p1Active, { seed: session.seed }));
  } else {
    wrap.appendChild(buildWaitingPanel(session.role));
  }

  footer.appendChild(wrap);
}

/**
 * @param {HTMLElement} wrap
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function renderCrosswordSync(wrap, session, onAdvance) {
  const puzzle = selectCrosswordBySeed(session.seed);
  const nextDisplay = displayLevelNumber(nextPlayableLevel(session.level));

  if (session.role === 'p1') {
    if (session.crosswordGridSolved) {
      wrap.appendChild(buildCrosswordCompletionDisplay(session, puzzle, nextDisplay, onAdvance));
    } else {
      wrap.appendChild(buildCrosswordFillFirstPanel());
    }
    return;
  }

  wrap.appendChild(buildCrosswordCompletionEntry(session, puzzle, nextDisplay, onAdvance));
}

/**
 * @param {HTMLElement} wrap
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function renderMazeSync(wrap, session, onAdvance) {
  const displayLevel = displayLevelNumber(session.level);
  const nextDisplay = displayLevelNumber(nextPlayableLevel(session.level));

  if (session.levelComplete) {
    if (session.role === 'p2') {
      wrap.appendChild(
        buildCodeReaderPanel(COPY.mazeP2Complete, {
          seed: session.seed,
          continueLabel: `Ga door naar Level ${nextDisplay}`,
          onContinue: () => onAdvance(true, 'advance'),
        }),
      );
      return;
    }

    wrap.appendChild(
      buildAdvanceGate(session, onAdvance, {
        codeSourceLabel: playerLabel('p2'),
        helpText: COPY.advanceFromP2(nextDisplay),
      }),
    );
    return;
  }

  if (session.role === 'p1') {
    wrap.appendChild(
      buildStaticHelpPanel(`Level ${displayLevel} · Kaartlezer`, COPY.mazeP1Guide),
    );
    return;
  }

  if (session.role === 'p2') {
    wrap.appendChild(
      buildStaticHelpPanel(`Level ${displayLevel} · Navigator`, COPY.mazeP2Play),
    );
    return;
  }

  wrap.appendChild(
    buildStaticHelpPanel(`Level ${displayLevel} · Hints`, COPY.mazeP3Play),
  );
}

/**
 * @param {HTMLElement} wrap
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function renderBluesSync(wrap, session, onAdvance) {
  const displayLevel = displayLevelNumber(session.level);

  if (session.levelComplete) {
    if (session.role === 'daughter') {
      wrap.appendChild(
        buildCodeReaderPanel(COPY.bluesP3Complete, {
          seed: session.seed,
          continueLabel: 'Bekijk certificaat',
          onContinue: () => onAdvance(true, 'advance'),
        }),
      );
      return;
    }

    wrap.appendChild(
      buildAdvanceGate(session, onAdvance, {
        codeSourceLabel: playerLabel('daughter'),
        helpText: COPY.advanceFromP3(),
      }),
    );
    return;
  }

  if (session.role === 'p1') {
    wrap.appendChild(
      buildStaticHelpPanel(`Level ${displayLevel} · Coach`, COPY.bluesP1Coach),
    );
    return;
  }

  if (session.role === 'p2') {
    wrap.appendChild(
      buildStaticHelpPanel(`Level ${displayLevel} · Metronoom`, COPY.bluesP2Coach),
    );
    return;
  }

  wrap.appendChild(
    buildStaticHelpPanel(`Level ${displayLevel} · Pianist`, COPY.bluesP3Play),
  );
}

function buildCrosswordFillFirstPanel() {
  const block = document.createElement('div');
  block.className = 'ikkeja-sync-waiting';
  block.innerHTML = `
    <p class="ikkeja-sync-heading">Level 1 · 4CODE</p>
    <p class="ikkeja-sync-help">${COPY.crosswordP1FillFirst}</p>
  `;
  return block;
}

/**
 * @param {string} heading
 * @param {string} help
 */
function buildStaticHelpPanel(heading, help) {
  const block = document.createElement('div');
  block.className = 'ikkeja-sync-waiting';
  block.innerHTML = `
    <p class="ikkeja-sync-heading">${heading}</p>
    <p class="ikkeja-sync-help">${help}</p>
  `;
  return block;
}

/**
 * @typedef {object} CodeReaderOptions
 * @property {string} [seed]
 * @property {string} [continueLabel]
 * @property {() => void} [onContinue]
 */

/**
 * @param {string} help
 * @param {CodeReaderOptions} [options]
 */
function buildCodeReaderPanel(help, options = {}) {
  const block = document.createElement('div');
  block.className = 'ikkeja-sync-p1 ikkeja-sync-p1--completion';
  const continueBtn = options.continueLabel
    ? `<button type="button" class="ikkeja-btn ikkeja-btn--green ikkeja-level-continue">${options.continueLabel}</button>`
    : '';
  block.innerHTML = `
    <p class="ikkeja-sync-heading">Team sync · 4CODE</p>
    <p class="ikkeja-sync-help">${help}</p>
    <p class="ikkeja-sync-code-value ikkeja-sync-code-display" aria-live="polite">----</p>
    <div class="ikkeja-sync-bar" role="progressbar" aria-label="Time until code refreshes">
      <div class="ikkeja-sync-bar__fill"></div>
    </div>
    ${continueBtn}
  `;
  if (options.seed) {
    startCodeAnimation(options.seed, block);
  }
  block.querySelector('.ikkeja-level-continue')?.addEventListener('click', () => {
    playClick();
    options.onContinue?.();
  });
  return block;
}

/**
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {import('../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 * @param {number} nextDisplay
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function buildCrosswordCompletionDisplay(session, puzzle, nextDisplay, onAdvance) {
  const block = document.createElement('div');
  block.className = 'ikkeja-sync-p1 ikkeja-sync-p1--completion';
  block.innerHTML = `
    <p class="ikkeja-sync-heading">Level 1 · Nieuwe 4CODE</p>
    <p class="ikkeja-sync-help">${COPY.crosswordP1Complete(nextDisplay)}</p>
    <p class="ikkeja-sync-code-value ikkeja-sync-code-display ikkeja-sync-code-display--static" aria-live="polite">----</p>
    <button type="button" class="ikkeja-btn ikkeja-btn--green ikkeja-l1-continue">Ga door naar Level ${nextDisplay}</button>
  `;
  const codeEl = block.querySelector('.ikkeja-sync-code-display');
  crosswordCompletionCode(session.seed, puzzle.id).then((code) => {
    if (codeEl) codeEl.textContent = code;
  });
  block.querySelector('.ikkeja-l1-continue')?.addEventListener('click', () => {
    playClick();
    onAdvance(true, 'level1-complete');
  });
  return block;
}

/**
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {import('../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 * @param {number} nextDisplay
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function buildCrosswordCompletionEntry(session, puzzle, nextDisplay, onAdvance) {
  const block = document.createElement('div');
  block.className = 'ikkeja-advance-gate';
  block.innerHTML = `
    <p class="ikkeja-sync-heading">Level 1 · 4CODE invoeren</p>
    <p class="ikkeja-sync-help">${COPY.crosswordEnterCompletion(nextDisplay)}</p>
    <form class="ikkeja-sync-form">
      <label class="ikkeja-sync-form-label" for="ikkeja-l1-code">4CODE van ${playerLabel('p1')}</label>
      <input id="ikkeja-l1-code" type="text" maxlength="4" class="ikkeja-input ikkeja-sync-input" autocomplete="off" autocapitalize="characters" placeholder="4CODE" />
      <button type="submit" class="ikkeja-btn ikkeja-btn--green">Bevestig kruiswoord</button>
    </form>
  `;
  const form = block.querySelector('form');
  const input = block.querySelector('input');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    playClick();
    const ok = await validateCrosswordCompletionCode(
      session.seed,
      puzzle.id,
      input?.value || '',
    );
    if (ok) {
      playSuccess();
      if (input instanceof HTMLElement) glowSuccess(input);
      onAdvance(true, 'level1-complete');
    } else {
      playError();
      if (input instanceof HTMLElement) wobbleElement(input);
    }
  });
  return block;
}

/** @param {string} seed @param {HTMLElement} wrap */
function startCodeAnimation(seed, wrap) {
  const bar = wrap.querySelector('.ikkeja-sync-bar__fill');
  const codeEl = wrap.querySelector('.ikkeja-sync-code-value');
  if (!bar || !codeEl) return;

  const tick = async () => {
    const now = Date.now();
    bar.style.width = `${getSlotProgress(now) * 100}%`;
    const slot = getTimeSlot(now);
    codeEl.textContent = await syncCodeForSeed(seed, slot);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

export function stopSyncAnimation() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/**
 * @param {'p2'|'daughter'} role
 */
function buildWaitingPanel(role) {
  const block = document.createElement('div');
  block.className = 'ikkeja-sync-waiting';
  const help = role === 'p2' ? COPY.p2Waiting : COPY.p3Waiting;
  block.innerHTML = `
    <p class="ikkeja-sync-heading">Team sync · 4CODE</p>
    <p class="ikkeja-sync-help">${help}</p>
    <p class="ikkeja-sync-status">Los eerst het level op — daarna verschijnt de code-invoer.</p>
  `;
  return block;
}

/**
 * @param {import('../logic/session.js').IkkeJaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 * @param {AdvanceGateOptions} options
 */
function buildAdvanceGate(session, onAdvance, options) {
  const nextLevel = displayLevelNumber(nextPlayableLevel(session.level));
  const unlockLabel =
    nextPlayableLevel(session.level) >= VICTORY_LEVEL
      ? 'Bekijk certificaat'
      : `Unlock Level ${nextLevel}`;
  const block = document.createElement('div');
  block.className = 'ikkeja-advance-gate';
  block.innerHTML = `
    <p class="ikkeja-sync-heading">Unlock next level · 4CODE</p>
    <p class="ikkeja-sync-help ikkeja-advance-msg">${options.helpText}</p>
    <form class="ikkeja-sync-form">
      <label class="ikkeja-sync-form-label" for="ikkeja-sync-advance-input">4CODE van ${options.codeSourceLabel}</label>
      <input id="ikkeja-sync-advance-input" type="text" maxlength="4" class="ikkeja-input ikkeja-sync-input" autocomplete="off" autocapitalize="characters" placeholder="4CODE" />
      <button type="submit" class="ikkeja-btn ikkeja-btn--green">${unlockLabel}</button>
    </form>
  `;
  const form = block.querySelector('form');
  const input = block.querySelector('input');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    playClick();
    const ok = await validateSyncCode(session.seed, input?.value || '');
    if (ok) {
      playSuccess();
      if (input instanceof HTMLElement) glowSuccess(input);
      onAdvance(true, 'advance');
    } else {
      playError();
      if (input instanceof HTMLElement) wobbleElement(input);
    }
  });
  return block;
}
