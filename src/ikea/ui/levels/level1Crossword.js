/**
 * Level 1: Dutch crossword — P1 reads locations; P2/P3 search the magazijn with decoys.
 */
import {
  filterWarehouseLocations,
  selectCrosswordBySeed,
  warehouseLookupSize,
} from '../../logic/levels/crossword.js';
import {
  crosswordGridProgress,
  isCrosswordGridComplete,
} from '../../logic/crosswordLayout.js';
import { formatPlayerName, getPlayerByRole } from '../../logic/puzzleData.js';
import { playClick, playError, playSuccess } from '../../audio/ikeaSynth.js';
import { mountCrosswordBoard, renderCrosswordBoardHtml } from '../crosswordGrid.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {(gridSolved: boolean) => void} onGridSolved
 */
export function renderLevel1(container, session, onGridSolved) {
  const puzzle = selectCrosswordBySeed(session.seed);
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikea-level ikea-level--1';

  if (session.role === 'p1') {
    panel.innerHTML = `
      <h2 class="ikea-level-title">Level 1: Lager-Korsord</h2>
      <p class="ikea-puzzle-title">${puzzle.title}</p>
      <p>Vul het kruiswoord in. Roep een <strong>magazijnlocatie</strong> — ${formatPlayerName(getPlayerByRole('p2'))} &amp; ${formatPlayerName(getPlayerByRole('daughter'))} zoeken de omschrijving op en lezen die voor.</p>
      <p class="ikea-grid-progress">Ingevuld: <span class="ikea-grid-progress-val">0</span> / <span class="ikea-grid-progress-total">0</span></p>
      ${renderCrosswordBoardHtml(puzzle)}
    `;
    wireP1(panel, puzzle, session, onGridSolved);
  } else if (session.role === 'p2') {
    panel.innerHTML = buildWarehouseView(formatPlayerName(getPlayerByRole('p2')), session, puzzle);
    wireWarehouse(panel, session, puzzle);
  } else {
    panel.innerHTML = buildWarehouseView(formatPlayerName(getPlayerByRole('daughter')), session, puzzle);
    wireWarehouse(panel, session, puzzle);
  }

  container.appendChild(panel);
}

/**
 * @param {string} roleLabel
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {import('../../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 */
function buildWarehouseView(roleLabel, session, puzzle) {
  const totalLocations = warehouseLookupSize(session.seed, puzzle);
  return `
    <h2 class="ikea-level-title">Level 1: Magazijn-locator</h2>
    <p>${roleLabel}: Monique roept een <strong>magazijnlocatie</strong>. Zoek die code in het magazijn (${totalLocations} locaties — <strong>niet</strong> alles hoort bij jullie kruiswoord!) en lees de omschrijving hardop voor.</p>
    <input type="search" class="ikea-input ikea-warehouse-search" placeholder="Zoek op locatie, bv. 14-A-042…" autocapitalize="characters" />
    <p class="ikea-hint ikea-warehouse-search-hint">Typ een locatie om te zoeken. Het magazijn zit vol decoy-locaties.</p>
    <div class="ikea-warehouse-list"></div>
  `;
}

/**
 * @param {HTMLElement} panel
 * @param {import('../../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {(gridSolved: boolean) => void} onGridSolved
 */
function wireP1(panel, puzzle, session, onGridSolved) {
  const progressVal = panel.querySelector('.ikea-grid-progress-val');
  const progressTotal = panel.querySelector('.ikea-grid-progress-total');
  const board = panel.querySelector('.ikea-crossword-board');
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
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {import('../../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 */
function wireWarehouse(panel, session, puzzle) {
  const search = panel.querySelector('.ikea-warehouse-search');
  const list = panel.querySelector('.ikea-warehouse-list');
  const hint = panel.querySelector('.ikea-warehouse-search-hint');

  const renderList = (query = '') => {
    if (!list) return;
    const items = filterWarehouseLocations(session.seed, puzzle, query);

    if (!query.trim()) {
      list.innerHTML = '';
      if (hint instanceof HTMLElement) {
        hint.hidden = false;
      }
      return;
    }

    if (hint instanceof HTMLElement) {
      hint.hidden = items.length > 0;
    }

    list.innerHTML = items
      .map(
        (entry) =>
          `<article class="ikea-warehouse-row">
            <p class="ikea-warehouse-code">${entry.location}</p>
            <p class="ikea-warehouse-meta">${formatWarehouseMeta(entry)}</p>
            <p class="ikea-warehouse-clue">${entry.clue}</p>
          </article>`,
      )
      .join('');

    if (items.length === 0) {
      list.innerHTML = '<p class="ikea-hint">Geen locatie gevonden — probeer gang, rek of vak.</p>';
    }
  };

  search?.addEventListener('input', () => {
    playClick();
    renderList(search instanceof HTMLInputElement ? search.value : '');
  });

  renderList();
}
