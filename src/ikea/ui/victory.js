/**
 * Victory certificate screen with birthday celebration.
 */
import { DEFAULT_ROLE_NAMES, getPlayerByRole } from '../logic/puzzleData.js';
import { clearSession } from '../logic/session.js';
import { playHappyBirthday, playClick } from '../audio/ikeaSynth.js';
import { victoryConfetti, showToast } from './feedback.js';
import { gamesMenuUrl } from '../../navigation.js';

/** @type {boolean} */
let celebrationPlayed = false;

/**
 * Renders victory certificate.
 * @param {HTMLElement} main
 * @param {import('../logic/session.js').IkeaSession} session
 */
export function renderVictory(main, session) {
  const footer = document.getElementById('ikea-footer');
  if (footer) footer.hidden = true;

  const p1 = session.nameP1 || DEFAULT_ROLE_NAMES.p1;
  const p2 = session.nameP2 || DEFAULT_ROLE_NAMES.p2;
  const daughter = session.nameDaughter || DEFAULT_ROLE_NAMES.daughter;

  main.innerHTML = `
    <section class="ikea-victory">
      <div class="ikea-certificate">
        <h2>Certificate of Flat-Pack Mastery</h2>
        <p class="ikea-cert-body">This certifies that</p>
        <ul class="ikea-cert-names">
          <li>${certPlayerLine('p1', p1)}</li>
          <li>${certPlayerLine('p2', p2)}</li>
          <li>${certPlayerLine('daughter', daughter)}</li>
        </ul>
        <p class="ikea-cert-body">escaped the IKEA labyrinth together!</p>
        <div class="ikea-cert-ribbon">HAPPY BIRTHDAY!</div>
      </div>
      <button type="button" class="ikea-btn ikea-btn--blue ikea-back-menu">Back to Games Menu</button>
      <button type="button" class="ikea-btn ikea-btn--yellow ikea-play-again">Play Again</button>
    </section>
  `;

  if (!celebrationPlayed) {
    celebrationPlayed = true;
    victoryConfetti();
    playHappyBirthday();
    showToast('FANTASTISKT!');
  }

  main.querySelector('.ikea-back-menu')?.addEventListener('click', () => {
    playClick();
    clearSession();
    window.location.assign(gamesMenuUrl());
  });

  main.querySelector('.ikea-play-again')?.addEventListener('click', () => {
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
  const subtitle = player.alias ? `${player.alias} · ${player.title}` : player.title;
  return `${escapeHtml(name)} <em>(${subtitle})</em>`;
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
