/**
 * Renders and wires Player 1 Dutch crossword grids.
 */
import {
  buildCrosswordGrid,
  normalizeCrosswordLetter,
} from '../logic/crosswordLayout.js';

/**
 * Static crossword board HTML with inputs (Player 1).
 * @param {import('../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 * @returns {string}
 */
export function renderCrosswordBoardHtml(puzzle) {
  const grid = buildCrosswordGrid(puzzle);
  const { rows, cols } = puzzle;

  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = grid[row][col];
      if (!cell) {
        cells.push('<div class="ikea-crossword-cell ikea-crossword-cell--block" aria-hidden="true"></div>');
        continue;
      }
      const number = cell.number
        ? `<span class="ikea-crossword-cell__num">${cell.number}</span>`
        : '';
      cells.push(
        `<div class="ikea-crossword-cell ikea-crossword-cell--input" data-row="${row}" data-col="${col}">` +
          `${number}<input type="text" maxlength="1" class="ikea-crossword-input" ` +
          `data-row="${row}" data-col="${col}" aria-label="Rij ${row + 1} kolom ${col + 1}" autocomplete="off" autocapitalize="characters" /></div>`,
      );
    }
  }

  const across = puzzle.words
    .filter((word) => word.direction === 'across')
    .sort((a, b) => a.number - b.number)
    .map(
      (word) =>
        `<li><span class="ikea-crossword-location">${word.location}</span> ` +
        `<span class="ikea-crossword-clue-meta">${word.number}. · ${word.answer.length} letters</span></li>`,
    )
    .join('');

  const down = puzzle.words
    .filter((word) => word.direction === 'down')
    .sort((a, b) => a.number - b.number)
    .map(
      (word) =>
        `<li><span class="ikea-crossword-location">${word.location}</span> ` +
        `<span class="ikea-crossword-clue-meta">${word.number}. · ${word.answer.length} letters</span></li>`,
    )
    .join('');

  return `
    <div class="ikea-crossword-wrap">
      <div
        class="ikea-crossword-board"
        style="grid-template-columns: repeat(${cols}, minmax(28px, 36px));"
        role="grid"
        aria-label="Nederlands kruiswoordpuzzel"
      >
        ${cells.join('')}
      </div>
      <aside class="ikea-crossword-clues">
        <p class="ikea-hint">Roep een magazijnlocatie — Jelle &amp; Meike zoeken de omschrijving op.</p>
        <div class="ikea-crossword-clues-group">
          <h3>Horizontaal</h3>
          <ul>${across}</ul>
        </div>
        <div class="ikea-crossword-clues-group">
          <h3>Verticaal</h3>
          <ul>${down}</ul>
        </div>
      </aside>
    </div>
  `;
}

/**
 * @typedef {object} CrosswordBoardHandlers
 * @property {(fills: Record<string, string>) => void} onChange
 * @property {(fills: Record<string, string>) => void} onComplete - Called when all cells filled.
 */

/**
 * Wires Player 1 fillable grid inputs.
 * @param {HTMLElement} boardRoot
 * @param {import('../data/dutchCrosswords.js').DutchCrosswordPuzzle} puzzle
 * @param {CrosswordBoardHandlers} handlers
 */
export function mountCrosswordBoard(boardRoot, puzzle, handlers) {
  /** @type {Record<string, string>} */
  const fills = {};
  const grid = buildCrosswordGrid(puzzle);
  let letterCells = 0;
  for (let r = 0; r < puzzle.rows; r += 1) {
    for (let c = 0; c < puzzle.cols; c += 1) {
      if (grid[r][c]) letterCells += 1;
    }
  }

  boardRoot.querySelectorAll('.ikea-crossword-input').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;

    input.addEventListener('input', () => {
      input.value = normalizeCrosswordLetter(input.value).slice(-1);
      const row = input.dataset.row;
      const col = input.dataset.col;
      if (row === undefined || col === undefined) return;
      fills[`${row},${col}`] = input.value;
      handlers.onChange(fills);

      const filledCount = Object.values(fills).filter((v) => v.length === 1).length;
      if (filledCount >= letterCells) {
        handlers.onComplete(fills);
      }
    });
  });
}
