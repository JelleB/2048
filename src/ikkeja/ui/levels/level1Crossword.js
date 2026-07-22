/**

 * Level 1: Dutch crossword — P1 reads locations; P2/P3 search the magazijn with decoys.

 */

import {

  filterWarehouseLocations,

  resolveWarehouseFlashEntry,

  selectCrosswordBySeed,

  warehouseLookupSize,

} from '../../logic/levels/crossword.js';

import {

  crosswordGridProgress,

  isCrosswordGridComplete,

} from '../../logic/crosswordLayout.js';

import { formatPlayerName, getPlayerByRole } from '../../logic/puzzleData.js';

import { playClick, playError, playSuccess } from '../../audio/ikkejaSynth.js';

import { mountCrosswordBoard, renderCrosswordBoardHtml } from '../crosswordGrid.js';

import { burstConfetti, showToast, wobbleElement } from '../feedback.js';



/** Meike's answer flash duration in milliseconds. */

export const MEIKE_ANSWER_FLASH_MS = 500;



/**

 * @param {HTMLElement} container

 * @param {import('../../logic/session.js').IkkeJaSession} session

 * @param {(gridSolved: boolean) => void} onGridSolved

 */

export function renderLevel1(container, session, onGridSolved) {

  const puzzle = selectCrosswordBySeed(session.seed);

  container.innerHTML = '';

  const panel = document.createElement('section');

  panel.className = 'ikkeja-level ikkeja-level--1';



  if (session.role === 'p1') {

    panel.innerHTML = `

      <h2 class="ikkeja-level-title">Level 1: Lager-Korsord</h2>

      <p class="ikkeja-puzzle-title">${puzzle.title}</p>

      <p>Vul het kruiswoord in. Roep een <strong>magazijnlocatie</strong> — ${formatPlayerName(getPlayerByRole('p2'))} &amp; ${formatPlayerName(getPlayerByRole('daughter'))} zoeken de omschrijving op en lezen die voor.</p>

      <p class="ikkeja-grid-progress">Ingevuld: <span class="ikkeja-grid-progress-val">0</span> / <span class="ikkeja-grid-progress-total">0</span></p>

      ${renderCrosswordBoardHtml(puzzle)}

    `;

    wireP1(panel, puzzle, session, onGridSolved);

  } else if (session.role === 'p2') {

    panel.innerHTML = buildWarehouseView(formatPlayerName(getPlayerByRole('p2')), session, puzzle, false);

    wireWarehouse(panel, session, puzzle, false);

  } else {

    panel.innerHTML = buildWarehouseView(formatPlayerName(getPlayerByRole('daughter')), session, puzzle, true);

    wireWarehouse(panel, session, puzzle, true);

  }



  container.appendChild(panel);

}



/**

 * @param {string} roleLabel

 * @param {import('../../logic/session.js').IkkeJaSession} session

 * @param {import('../../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle

 * @param {boolean} daughterFlash

 */

function buildWarehouseView(roleLabel, session, puzzle, daughterFlash) {

  const totalLocations = warehouseLookupSize(session.seed, puzzle);

  const flashBlock = daughterFlash

    ? `

      <p class="ikkeja-hint ikkeja-daughter-flash-hint">Småland-special: flits het antwoord kort als je de locatie hebt gevonden.</p>

      <button type="button" class="ikkeja-btn ikkeja-btn--blue ikkeja-warehouse-flash" disabled>

        Småland-flits (0,5 s)

      </button>

      <p class="ikkeja-warehouse-flash-display" hidden aria-live="polite"></p>

    `

    : '';



  return `

    <h2 class="ikkeja-level-title">Level 1: Magazijn-locator</h2>

    <p>${roleLabel}: ${formatPlayerName(getPlayerByRole('p1'))} roept een <strong>magazijnlocatie</strong>. Zoek die code in het magazijn (${totalLocations} locaties — <strong>niet</strong> alles hoort bij jullie kruiswoord!) en lees de omschrijving hardop voor.</p>

    <input type="search" class="ikkeja-input ikkeja-warehouse-search" placeholder="Zoek op locatie, bv. 14-A-042…" autocapitalize="characters" />

    <p class="ikkeja-hint ikkeja-warehouse-search-hint">Typ een locatie om te zoeken. Het magazijn zit vol decoy-locaties.</p>

    ${flashBlock}

    <div class="ikkeja-warehouse-list"></div>

  `;

}



/**

 * @param {HTMLElement} panel

 * @param {import('../../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle

 * @param {import('../../logic/session.js').IkkeJaSession} session

 * @param {(gridSolved: boolean) => void} onGridSolved

 */

function wireP1(panel, puzzle, session, onGridSolved) {

  const progressVal = panel.querySelector('.ikkeja-grid-progress-val');

  const progressTotal = panel.querySelector('.ikkeja-grid-progress-total');

  const board = panel.querySelector('.ikkeja-crossword-board');

  if (!(board instanceof HTMLElement)) return;



  const { total } = crosswordGridProgress(puzzle, {});

  if (progressTotal) progressTotal.textContent = String(total);



  if (session.crosswordGridSolved) {

    if (progressVal) progressVal.textContent = String(total);

    onGridSolved(true);

    return;

  }



  mountCrosswordBoard(board, puzzle, {

    onChange(fills) {

      const progress = crosswordGridProgress(puzzle, fills);

      if (progressVal) progressVal.textContent = String(progress.filled);

    },

    onComplete(fills) {

      if (!isCrosswordGridComplete(puzzle, fills)) {

        playError();

        wobbleElement(board);

        showToast('Nog niet helemaal goed — controleer de letters!');

        return;

      }

      playSuccess();

      showToast('FANTASTISKT! Lees de nieuwe 4CODE aan je team.');

      burstConfetti();

      onGridSolved(true);

    },

  });

}



/**

 * @param {import('../../data/dutchCrosswords.js').WarehouseClueEntry} entry

 * @returns {string}

 */

function formatWarehouseMeta(entry) {

  if (entry.number > 0) {

    return `${entry.number}. ${entry.directionLabel} · ${entry.length} letters`;

  }

  return `${entry.directionLabel} · ${entry.length} letters`;

}



/**

 * @param {HTMLElement} panel

 * @param {import('../../logic/session.js').IkkeJaSession} session

 * @param {import('../../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle

 * @param {boolean} daughterFlash

 */

function wireWarehouse(panel, session, puzzle, daughterFlash) {

  const search = panel.querySelector('.ikkeja-warehouse-search');

  const list = panel.querySelector('.ikkeja-warehouse-list');

  const hint = panel.querySelector('.ikkeja-warehouse-search-hint');

  const flashBtn = panel.querySelector('.ikkeja-warehouse-flash');

  const flashDisplay = panel.querySelector('.ikkeja-warehouse-flash-display');

  /** @type {number|null} */

  let flashTimer = null;



  const updateFlashButton = (query = '') => {

    if (!(flashBtn instanceof HTMLButtonElement)) {

      return;

    }

    const target = resolveWarehouseFlashEntry(session.seed, puzzle, query);

    flashBtn.disabled = !target;

  };



  const renderList = (query = '') => {

    if (!list) return;

    const items = filterWarehouseLocations(session.seed, puzzle, query);



    if (!query.trim()) {

      list.innerHTML = '';

      if (hint instanceof HTMLElement) {

        hint.hidden = false;

      }

      updateFlashButton(query);

      return;

    }



    if (hint instanceof HTMLElement) {

      hint.hidden = items.length > 0;

    }



    list.innerHTML = items

      .map(

        (entry) =>

          `<article class="ikkeja-warehouse-row">

            <p class="ikkeja-warehouse-code">${entry.location}</p>

            <p class="ikkeja-warehouse-meta">${formatWarehouseMeta(entry)}</p>

            <p class="ikkeja-warehouse-clue">${entry.clue}</p>

          </article>`,

      )

      .join('');



    if (items.length === 0) {

      list.innerHTML = '<p class="ikkeja-hint">Geen locatie gevonden — probeer gang, rek of vak.</p>';

    }



    updateFlashButton(query);

  };



  search?.addEventListener('input', () => {

    playClick();

    renderList(search instanceof HTMLInputElement ? search.value : '');

  });



  flashBtn?.addEventListener('click', () => {

    if (!(search instanceof HTMLInputElement) || !(flashDisplay instanceof HTMLElement)) {

      return;

    }



    const target = resolveWarehouseFlashEntry(session.seed, puzzle, search.value);

    if (!target) {

      playError();

      wobbleElement(flashBtn);

      showToast('Zoek eerst de exacte locatie (of tot er maar één treffer is).');

      return;

    }



    playClick();

    if (flashTimer !== null) {

      window.clearTimeout(flashTimer);

      flashTimer = null;

    }



    flashDisplay.textContent = target.answer;

    flashDisplay.hidden = false;

    flashDisplay.classList.add('ikkeja-warehouse-flash-display--visible');



    flashTimer = window.setTimeout(() => {

      flashDisplay.hidden = true;

      flashDisplay.textContent = '';

      flashDisplay.classList.remove('ikkeja-warehouse-flash-display--visible');

      flashTimer = null;

    }, MEIKE_ANSWER_FLASH_MS);

  });



  renderList();

}


