/**
 * Level 2 UI: blueprint map (P1), navigation (P2), landmarks (Daughter).
 */
import { MAZE_ROOMS } from '../../logic/puzzleData.js';
import {
  MAZE_START,
  getBlueprintNodes,
  getLandmarkForRoom,
  tryMove,
} from '../../logic/levels/maze.js';
import { playClick, playSuccess, playError } from '../../audio/ikeaSynth.js';
import { burstConfetti, showToast, wobbleElement } from '../feedback.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../logic/session.js').IkeaSession} session
 * @param {() => void} onComplete
 */
export function renderLevel2(container, session, onComplete) {
  container.innerHTML = '';
  const panel = document.createElement('section');
  panel.className = 'ikea-level ikea-level--2';

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
  const nodes = getBlueprintNodes();
  const cells = nodes
    .map((n) => {
      const locked = n.lockedDoors.length
        ? `<span class="ikea-locked">🔒 ${n.lockedDoors.join(', ')}</span>`
        : '';
      const exit = n.isExit ? ' ikea-room--exit' : '';
      return `<div class="ikea-room${exit}" style="grid-column:${n.x + 1};grid-row:${n.y + 1}">
        <strong>${n.label}</strong>${locked}
      </div>`;
    })
    .join('');
  return `
    <h2 class="ikea-level-title">Level 2: Rum-Labyrint</h2>
    <p>Showroom blueprint — call out safe doors vs locked traps!</p>
    <div class="ikea-blueprint">${cells}</div>
    <p class="ikea-legend"><span class="ikea-locked">🔒</span> = locked trap door</p>
  `;
}

function buildP2View() {
  return `
    <h2 class="ikea-level-title">Level 2: Rum-Labyrint</h2>
    <p class="ikea-room-status">Location: <strong class="ikea-current-room">Entrance</strong></p>
    <div class="ikea-nav-pad">
      <button type="button" class="ikea-btn ikea-nav" data-dir="north">North</button>
      <div class="ikea-nav-row">
        <button type="button" class="ikea-btn ikea-nav" data-dir="west">West</button>
        <button type="button" class="ikea-btn ikea-nav" data-dir="east">East</button>
      </div>
      <button type="button" class="ikea-btn ikea-nav" data-dir="south">South</button>
    </div>
    <p class="ikea-nav-message"></p>
  `;
}

function buildDaughterView() {
  const items = Object.entries(MAZE_ROOMS)
    .filter(([id]) => id !== 'exit')
    .map(([id]) => {
      const lm = getLandmarkForRoom(id);
      return `<li><strong>${lm?.landmark || id}</strong> — ${lm?.hint || ''}</li>`;
    })
    .join('');
  return `
    <h2 class="ikea-level-title">Level 2: Landmark Guide</h2>
    <p>Read these aloud as Player 2 navigates!</p>
    <ul class="ikea-landmark-list">${items}</ul>
  `;
}

/**
 * @param {HTMLElement} panel
 * @param {() => void} onComplete
 */
function wireP2(panel, onComplete) {
  let roomId = MAZE_START;
  const roomEl = panel.querySelector('.ikea-current-room');
  const msgEl = panel.querySelector('.ikea-nav-message');

  panel.querySelectorAll('.ikea-nav').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClick();
      const dir = btn.getAttribute('data-dir');
      if (!dir) return;
      const result = tryMove(roomId, /** @type {'north'|'south'|'east'|'west'} */ (dir));
      if (msgEl) msgEl.textContent = result.message || '';
      if (result.trapped) {
        playError();
        wobbleElement(panel);
        showToast('Oj! Wrong way — try again!');
        return;
      }
      if (!result.moved) {
        playError();
        wobbleElement(btn);
        return;
      }
      roomId = result.roomId;
      const room = MAZE_ROOMS[roomId];
      if (roomEl) roomEl.textContent = room?.label || roomId;
      if (result.won) {
        playSuccess();
        burstConfetti();
        showToast('FANTASTISKT!');
        onComplete();
      }
    });
  });
}
