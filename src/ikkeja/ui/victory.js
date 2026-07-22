/**
 * Victory certificate screen after escaping the IKKE-JA labyrinth.
 */
import { DEFAULT_ROLE_NAMES, getPlayerByRole } from '../logic/puzzleData.js';
import { clearSession } from '../logic/session.js';
import { playClick, playSuccess } from '../audio/ikkejaSynth.js';
import { victoryConfetti, showToast } from './feedback.js';
import { gamesMenuUrl } from '../../navigation.js';

/** @type {boolean} */
let celebrationPlayed = false;

/**
 * Renders victory certificate.
 * @param {HTMLElement} main
 * @param {import('../logic/session.js').IkkeJaSession} session
 */
export function renderVictory(main, session) {
  const footer = document.getElementById('ikkeja-footer');
  if (footer) footer.hidden = true;

  const p1 = session.nameP1 || DEFAULT_ROLE_NAMES.p1;
  const p2 = session.nameP2 || DEFAULT_ROLE_NAMES.p2;
  const daughter = session.nameDaughter || DEFAULT_ROLE_NAMES.daughter;

  main.innerHTML = `
    <section class="ikkeja-victory">
      <div class="ikkeja-certificate">
        <h2>Certificate of Flat-Pack Mastery</h2>
        <p class="ikkeja-cert-body">This certifies that</p>
        <ul class="ikkeja-cert-names">
          <li>${certPlayerLine('p1', p1)}</li>
          <li>${certPlayerLine('p2', p2)}</li>
          <li>${certPlayerLine('daughter', daughter)}</li>
        </ul>
        <p class="ikkeja-cert-body">escaped the IKKE-JA labyrinth together!</p>
        <div class="ikkeja-cert-ribbon">FANTASTISKT!</div>
      </div>
      <button type="button" class="ikkeja-btn ikkeja-btn--blue ikkeja-back-menu">Back to Games Menu</button>
      <button type="button" class="ikkeja-btn ikkeja-btn--yellow ikkeja-play-again">Play Again</button>
    </section>
  `;

  if (!celebrationPlayed) {
    celebrationPlayed = true;
    victoryConfetti();
    playSuccess();
    showToast('FANTASTISKT!');
  }

  main.querySelector('.ikkeja-back-menu')?.addEventListener('click', () => {
    playClick();
    clearSession();
    window.location.assign(gamesMenuUrl());
  });

  main.querySelector('.ikkeja-play-again')?.addEventListener('click', () => {
    playClick();
    clearSession();
    celebrationPlayed = false;
    window.location.reload();
  });
}

/**
 * @param {'p1'|'p2'|'daughter'} role
 * @param {string} name
 * @returns {string}
 */
function certPlayerLine(role, name) {
  const player = getPlayerByRole(role);
  return `${escapeHtml(name)} <em>(${player.title})</em>`;
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** Resets celebration flag (for tests). */
export function resetVictoryState() {
  celebrationPlayed = false;
}
