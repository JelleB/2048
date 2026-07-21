/**
 * Sync code panel: Level 1 puzzle completion code; levels 2–4 time-based 4CODE.
 */
import { selectCrosswordBySeed, validateCrosswordCompletionCode } from '../logic/levels/crossword.js';
import {
  crosswordCompletionCode,
} from '../logic/crosswordLayout.js';
import { getSlotProgress, getTimeSlot, syncCodeForSeed, validateSyncCode } from '../logic/syncEngine.js';
import { displayLevelNumber, nextPlayableLevel, ALLEN_KEY_LEVEL, FIRST_PLAYABLE_LEVEL, normalizeSessionLevel } from '../logic/levelProgression.js';
import { playClick, playError, playSuccess } from '../audio/ikeaSynth.js';
import { glowSuccess, wobbleElement } from './feedback.js';

/** @type {number|null} */
let rafId = null;

const COPY = {
  p1FillFirst:
    'Vul eerst het kruiswoord in. Als alles klopt, verschijnt hier een nieuwe 4CODE voor je team.',
  p1CompletionCode:
    'Kruiswoord klaar! Lees deze 4CODE hardop voor Jelle & Meike, of ga zelf door naar Level 2.',
  p2EnterCompletion:
    'Monique heeft het kruiswoord ingevuld? Voer de 4CODE in die zij voorleest (verschijnt pas als het raster klopt).',
  p1Active:
    'Team sync · 4CODE: na elk level lees je elke 5 seconden een code vooruit (timerbalk).',
  p2Waiting:
    '4CODE na elk level: wacht tot de puzzel opgelost is, dan leest Monique de code voor.',
  daughterWaiting:
    '4CODE na elk level: help het team de code van Monique invoeren zodra de puzzel klaar is.',
  level2P1Guide:
    'Geef Jelle route-aanwijzingen via de kaart. Vraag wat hij ziet om zijn positie te vinden.',
  level2P2Play:
    'Volg Monique\'s aanwijzingen. Bij de exit krijg jij de 4CODE voor het team.',
  level2DaughterPlay:
    'Volg Jelle\'s stappen op je pad en roep waarschuwingen als er vallen in de buurt zijn.',
  level2P2CodeReader:
    'Level klaar! Lees je 4CODE hardop — Monique en Meike voeren hem in om door te gaan.',
  level3P1Coach:
    'Lees het schema voor Meike en speel mee op fluit (arpeggio laag↔hoog per akkoord).',
  level3P2Coach:
    'Tel de maten en speel bas: grondtoon ↔ kwint per akkoordtoets.',
  level3DaughterPlay:
    'Speel het schema in — na afloop lees jij de 4CODE voor Monique en Jelle.',
  level3DaughterCodeReader:
    'Level klaar! Lees je 4CODE hardop — Monique en Jelle voeren hem in voor het certificaat.',
  advanceFromDaughter: () =>
    'Level klaar! Meike leest haar 4CODE voor. Voer hem in voor het certificaat.',
  advanceFromP1: (nextLevel) =>
    `Level klaar! Monique: lees je huidige 4CODE voor. Iedereen: voer hem in voor Level ${nextLevel}.`,
  advanceFromP2: (nextLevel) =>
    `Level klaar! Jelle: lees je 4CODE voor. Monique & Meike: voer hem in voor Level ${nextLevel}.`,
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
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
export function renderSyncPanel(footer, session, onAdvance) {
  stopSyncAnimation();
  footer.hidden = false;
  footer.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'ikea-sync-panel';

  const level = normalizeSessionLevel(session.level);

  if (level === FIRST_PLAYABLE_LEVEL) {
    renderLevel2Sync(wrap, session, onAdvance);
    footer.appendChild(wrap);
    return;
  }

  if (level === ALLEN_KEY_LEVEL) {
    renderLevel3BluesSync(wrap, session, onAdvance);
    footer.appendChild(wrap);
    return;
  }

  if (session.levelComplete) {
    wrap.appendChild(
      buildAdvanceGate(session, onAdvance, {
        codeSourceLabel: 'Monique',
        helpText: COPY.advanceFromP1(displayLevelNumber(nextPlayableLevel(session.level))),
      }),
    );
  } else if (session.role === 'p1') {
    wrap.appendChild(buildCodeReaderPanel(COPY.p1Active));
    startCodeAnimation(session.seed, wrap);
  } else {
    wrap.appendChild(buildWaitingPanel(session.role));
  }

  footer.appendChild(wrap);
}

/**
 * @param {HTMLElement} wrap
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function renderLevel2Sync(wrap, session, onAdvance) {
  const nextLevel = displayLevelNumber(nextPlayableLevel(session.level));

  if (session.levelComplete) {
    if (session.role === 'p2') {
      wrap.appendChild(buildCodeReaderPanel(COPY.level2P2CodeReader));
      startCodeAnimation(session.seed, wrap);
      return;
    }

    wrap.appendChild(
      buildAdvanceGate(session, onAdvance, {
        codeSourceLabel: 'Jelle',
        helpText: COPY.advanceFromP2(nextLevel),
      }),
    );
    return;
  }

  if (session.role === 'p1') {
    wrap.appendChild(buildStaticHelpPanel('Level 2 · Kaartlezer', COPY.level2P1Guide));
    return;
  }

  if (session.role === 'p2') {
    wrap.appendChild(buildStaticHelpPanel('Level 2 · Navigator', COPY.level2P2Play));
    return;
  }

  wrap.appendChild(buildStaticHelpPanel('Level 2 · Beschermer', COPY.level2DaughterPlay));
}

/**
 * Level 3 blues: Meike enters chords; on win she reads the 4CODE.
 * @param {HTMLElement} wrap
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function renderLevel3BluesSync(wrap, session, onAdvance) {
  if (session.levelComplete) {
    if (session.role === 'daughter') {
      wrap.appendChild(buildCodeReaderPanel(COPY.level3DaughterCodeReader));
      startCodeAnimation(session.seed, wrap);
      return;
    }

    wrap.appendChild(
      buildAdvanceGate(session, onAdvance, {
        codeSourceLabel: 'Meike',
        helpText: COPY.advanceFromDaughter(),
      }),
    );
    return;
  }

  if (session.role === 'p1') {
    wrap.appendChild(buildStaticHelpPanel('Level 3 · Coach', COPY.level3P1Coach));
    return;
  }

  if (session.role === 'p2') {
    wrap.appendChild(buildStaticHelpPanel('Level 3 · Metronoom', COPY.level3P2Coach));
    return;
  }

  wrap.appendChild(buildStaticHelpPanel('Level 3 · Pianist', COPY.level3DaughterPlay));
}

/**
 * @param {HTMLElement} wrap
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function renderLevel1Sync(wrap, session, onAdvance) {
  const puzzle = selectCrosswordBySeed(session.seed);

  if (session.role === 'p1') {
    if (session.crosswordGridSolved) {
      wrap.appendChild(buildLevel1CompletionDisplay(session, puzzle, onAdvance));
    } else {
      wrap.appendChild(buildLevel1FillFirstPanel());
    }
    return;
  }

  wrap.appendChild(buildLevel1CompletionEntry(session, puzzle, onAdvance));
}

function buildLevel1FillFirstPanel() {
  const block = document.createElement('div');
  block.className = 'ikea-sync-waiting';
  block.innerHTML = `
    <p class="ikea-sync-heading">Level 1 · 4CODE</p>
    <p class="ikea-sync-help">${COPY.p1FillFirst}</p>
  `;
  return block;
}

/**
 * @param {string} heading
 * @param {string} help
 */
function buildStaticHelpPanel(heading, help) {
  const block = document.createElement('div');
  block.className = 'ikea-sync-waiting';
  block.innerHTML = `
    <p class="ikea-sync-heading">${heading}</p>
    <p class="ikea-sync-help">${help}</p>
  `;
  return block;
}

/**
 * @param {string} help
 */
function buildCodeReaderPanel(help) {
  const block = document.createElement('div');
  block.className = 'ikea-sync-p1';
  block.innerHTML = `
    <p class="ikea-sync-heading">Team sync · 4CODE</p>
    <p class="ikea-sync-help">${help}</p>
    <p class="ikea-sync-code-value ikea-sync-code-display" aria-live="polite">----</p>
    <div class="ikea-sync-bar" role="progressbar" aria-label="Time until code refreshes">
      <div class="ikea-sync-bar__fill"></div>
    </div>
  `;
  return block;
}

/**
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {import('../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function buildLevel1CompletionDisplay(session, puzzle, onAdvance) {
  const block = document.createElement('div');
  block.className = 'ikea-sync-p1 ikea-sync-p1--completion';
  block.innerHTML = `
    <p class="ikea-sync-heading">Level 1 · Nieuwe 4CODE</p>
    <p class="ikea-sync-help">${COPY.p1CompletionCode}</p>
    <p class="ikea-sync-code-value ikea-sync-code-display ikea-sync-code-display--static" aria-live="polite">----</p>
    <button type="button" class="ikea-btn ikea-btn--green ikea-l1-continue">Ga door naar Level 2</button>
  `;
  const codeEl = block.querySelector('.ikea-sync-code-display');
  crosswordCompletionCode(session.seed, puzzle.id).then((code) => {
    if (codeEl) codeEl.textContent = code;
  });
  block.querySelector('.ikea-l1-continue')?.addEventListener('click', () => {
    playClick();
    onAdvance(true, 'level1-complete');
  });
  return block;
}

/**
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {import('../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 */
function buildLevel1CompletionEntry(session, puzzle, onAdvance) {
  const block = document.createElement('div');
  block.className = 'ikea-advance-gate';
  block.innerHTML = `
    <p class="ikea-sync-heading">Level 1 · 4CODE invoeren</p>
    <p class="ikea-sync-help">${COPY.p2EnterCompletion}</p>
    <form class="ikea-sync-form">
      <label class="ikea-sync-form-label" for="ikea-l1-code">4CODE van Monique</label>
      <input id="ikea-l1-code" type="text" maxlength="4" class="ikea-input ikea-sync-input" autocomplete="off" autocapitalize="characters" placeholder="4CODE" />
      <button type="submit" class="ikea-btn ikea-btn--green">Bevestig kruiswoord</button>
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
  const bar = wrap.querySelector('.ikea-sync-bar__fill');
  const codeEl = wrap.querySelector('.ikea-sync-code-value');
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
  block.className = 'ikea-sync-waiting';
  const help = role === 'p2' ? COPY.p2Waiting : COPY.daughterWaiting;
  block.innerHTML = `
    <p class="ikea-sync-heading">Team sync · 4CODE</p>
    <p class="ikea-sync-help">${help}</p>
    <p class="ikea-sync-status">Los eerst het level op — daarna verschijnt de code-invoer.</p>
  `;
  return block;
}

/**
 * @param {import('../logic/session.js').IkeaSession} session
 * @param {(syncOk: boolean, kind?: SyncAdvanceKind) => void} onAdvance
 * @param {AdvanceGateOptions} options
 */
function buildAdvanceGate(session, onAdvance, options) {
  const nextLevel = displayLevelNumber(nextPlayableLevel(session.level));
  const block = document.createElement('div');
  block.className = 'ikea-advance-gate';
  block.innerHTML = `
    <p class="ikea-sync-heading">Unlock next level · 4CODE</p>
    <p class="ikea-sync-help ikea-advance-msg">${options.helpText}</p>
    <form class="ikea-sync-form">
      <label class="ikea-sync-form-label" for="ikea-sync-advance-input">4CODE van ${options.codeSourceLabel}</label>
      <input id="ikea-sync-advance-input" type="text" maxlength="4" class="ikea-input ikea-sync-input" autocomplete="off" autocapitalize="characters" placeholder="4CODE" />
      <button type="submit" class="ikea-btn ikea-btn--green">Unlock Level ${nextLevel}</button>
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
