/**
 * Level 3 UI: receipt (P1), rune menu (P2), kids meal card (Daughter).
 */
import { CAFETERIA_MENU, CAFETERIA_RECEIPT } from '../../logic/puzzleData.js';
import { validateDoorCode } from '../../logic/levels/cafeteria.js';
import { playClick, playSuccess, playError } from '../../audio/ikkejaSynth.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkkeJaSession} session
 * @param {() => void} onComplete
 */
export function renderLevel3(container, session, onComplete) {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikkeja-level ikkeja-level--3';

  if (session.role === 'p1') {
    panel.innerHTML = buildP1View();
  } else if (session.role === 'p2') {
    panel.innerHTML = buildP2View();
    wireP2(panel, onComplete);
  } else {
    panel.innerHTML = buildDaughterView();
  }

  container.appendChild(panel);
}

function buildP1View() {
  const lines = CAFETERIA_RECEIPT.items
    .map((i) => `<li>${i.qty}× ${i.name}</li>`)
    .join('');
  return `
    <h2 class="ikkeja-level-title">Level 3: Restaurang-Kalkyl</h2>
    <div class="ikkeja-receipt">
      <p class="ikkeja-receipt-header">RECEIPT</p>
      <ul>${lines}</ul>
      <p class="ikkeja-receipt-total">Total Spent: $${CAFETERIA_RECEIPT.total}</p>
    </div>
  `;
}

function buildP2View() {
  const rows = CAFETERIA_MENU.map(
    (m) =>
      `<tr><td>${m.name}</td><td class="ikkeja-rune">${m.rune}</td><td class="ikkeja-price-hidden">???</td></tr>`,
  ).join('');
  return `
    <h2 class="ikkeja-level-title">Level 3: Menu Board</h2>
    <p>Prices hidden behind Swedish runes. Deduce the 4-digit door code!</p>
    <table class="ikkeja-menu-table">
      <thead><tr><th>Item</th><th>Rune</th><th>Price</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <form class="ikkeja-door-form">
      <label>Door code (4 digits):</label>
      <input type="text" class="ikkeja-input ikkeja-door-input" maxlength="4" pattern="[0-9]*" inputmode="numeric" placeholder="????" />
      <button type="submit" class="ikkeja-btn ikkeja-btn--yellow">UNLOCK</button>
    </form>
  `;
}

function buildDaughterView() {
  return `
    <h2 class="ikkeja-level-title">Level 3: Kids Meal Menu Card</h2>
    <div class="ikkeja-daughter-card">
      <div class="ikkeja-sprite ikkeja-sprite--kids-meal" aria-hidden="true"></div>
      <p><strong>Kids Meal = $3</strong></p>
      <p class="ikkeja-hint">Shout this price to your team!</p>
    </div>
  `;
}

/**
 * @param {HTMLElement} panel
 * @param {() => void} onComplete
 */
function wireP2(panel, onComplete) {
  const form = panel.querySelector('.ikkeja-door-form');
  const input = panel.querySelector('.ikkeja-door-input');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    playClick();
    if (validateDoorCode(input?.value || '')) {
      playSuccess();
      burstConfetti();
      showToast('MEATBALL POWER!');
      onComplete();
    } else {
      playError();
      if (input instanceof HTMLElement) wobbleElement(input);
    }
  });
}
