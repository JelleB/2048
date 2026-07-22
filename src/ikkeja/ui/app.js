/**
 * IKKE-JA escape room app router and global state.
 */
import { formatPlayerName, getPlayerByRole } from '../logic/puzzleData.js';
import { clearSession, loadSession, saveSession } from '../logic/session.js';
import { gamesMenuUrl } from '../../navigation.js';
import { renderRoleSelect } from './roleSelect.js';
import { renderSyncPanel, stopSyncAnimation } from './syncPanel.js';
import { renderLevel1 } from './levels/level1Crossword.js';
import { renderLevel2 } from './levels/level2Maze.js';
import { renderLevel4 } from './levels/level4AllenKey.js';
import {
  ALLEN_KEY_LEVEL,
  CROSSWORD_LEVEL,
  displayLevelNumber,
  displayLevelTitle,
  MAZE_LEVEL,
  nextPlayableLevel,
  normalizeSession,
  normalizeSessionLevel,
  VICTORY_LEVEL,
} from '../logic/levelProgression.js';
import { renderVictory } from './victory.js';
import { applyDebugJumpToLevel, applyDebugSkipLevel } from '../logic/debugCheats.js';
import { renderDebugCheats } from './debugCheats.js';
import { burstConfetti, showToast } from './feedback.js';
import { playClick, playSuccess } from '../audio/ikkejaSynth.js';

/** @type {import('../logic/session.js').IkkeJaSession|null} */
let session = null;

/** @type {boolean} */
let headerNavWired = false;

/**
 * Wires header navigation (choose role + all games). Safe to call once at boot.
 */
export function setupHeaderNavigation() {
  if (headerNavWired) return;
  headerNavWired = true;

  const homeLink = document.getElementById('ikkeja-home-link');
  const leaveBtn = document.getElementById('ikkeja-leave-role-btn');

  if (homeLink instanceof HTMLAnchorElement) {
    homeLink.href = gamesMenuUrl();
    homeLink.addEventListener('click', (e) => {
      if (!session || session.level < 1 || session.level > 4) return;
      const ok = window.confirm(
        'Leave this escape room session and return to the games menu? You can rejoin with the same session code.',
      );
      if (!ok) {
        e.preventDefault();
      }
    });
  }

  leaveBtn?.addEventListener('click', () => {
    playClick();
    leaveToRoleSelect();
  });
}

/**
 * Updates header button visibility for current screen.
 * @param {'role-select'|'in-game'|'victory'} mode
 */
function updateHeaderNav(mode) {
  const leaveBtn = document.getElementById('ikkeja-leave-role-btn');
  if (!(leaveBtn instanceof HTMLButtonElement)) return;
  leaveBtn.hidden = mode === 'role-select';
}

/**
 * Clears session and returns to role selection (same page).
 */
export function leaveToRoleSelect() {
  const inProgress = session && session.level >= 1 && session.level <= 4 && !session.levelComplete;
  if (inProgress) {
    const ok = window.confirm(
      'Return to role selection? Your current progress on this device will be cleared (others can keep playing).',
    );
    if (!ok) return;
  }

  stopSyncAnimation();
  clearSession();
  session = null;

  const footer = document.getElementById('ikkeja-footer');
  if (footer) footer.hidden = true;

  const main = document.getElementById('ikkeja-main');
  if (main) {
    updateHeaderNav('role-select');
    renderRoleSelect(main, startSession);
  }
}

/**
 * Boots the IKKE-JA escape room application.
 */
export function initIkkeJaApp() {
  const main = document.getElementById('ikkeja-main');
  if (!main) return;

  session = loadSession();
  if (session) {
    session = normalizeSession(session);
    saveSession(session);
  }
  const playableLevel = session ? normalizeSessionLevel(session.level) : 0;
  if (session && playableLevel >= CROSSWORD_LEVEL && playableLevel <= ALLEN_KEY_LEVEL) {
    updateHeaderNav('in-game');
    renderGame(main);
  } else if (session && session.level >= VICTORY_LEVEL) {
    updateHeaderNav('victory');
    renderVictory(main, session);
  } else {
    updateHeaderNav('role-select');
    renderRoleSelect(main, startSession);
  }
}

/**
 * @param {import('../logic/session.js').IkkeJaSession} newSession
 */
function startSession(newSession) {
  session = normalizeSession({ ...newSession, levelComplete: false });
  saveSession(session);
  updateHeaderNav('in-game');
  const main = document.getElementById('ikkeja-main');
  if (main) renderGame(main);
}

function renderGame(main) {
  if (!session) return;

  session = normalizeSession(session);
  saveSession(session);

  updateHeaderNav('in-game');

  const level = normalizeSessionLevel(session.level);

  main.innerHTML = `
    <div class="ikkeja-game-header">
      <span class="ikkeja-role-badge">${roleLabel(session.role)}</span>
      <span class="ikkeja-level-badge">Level ${displayLevelNumber(session.level)}: ${displayLevelTitle(session.level)}</span>
      <span class="ikkeja-seed-badge">Session: ${session.seed}</span>
    </div>
    <div id="ikkeja-level-root" class="ikkeja-level-root"></div>
  `;

  renderDebugCheats(main, session, {
    onSkipLevel: () => applyDebugSessionUpdate(applyDebugSkipLevel),
    onJumpToLevel: (displayLevel) =>
      applyDebugSessionUpdate((current) => applyDebugJumpToLevel(current, displayLevel)),
  });

  const levelRoot = main.querySelector('#ikkeja-level-root');
  if (!(levelRoot instanceof HTMLElement)) return;

  const onLevelComplete = () => {
    if (!session) return;
    session.levelComplete = true;
    saveSession(session);
    showToast('Level complete! Enter 4CODE to unlock the next level.');
    refreshFooter();
  };

  switch (level) {
    case CROSSWORD_LEVEL:
      renderLevel1(levelRoot, session, (gridSolved) => {
        if (!session || !gridSolved) return;
        session.crosswordGridSolved = true;
        saveSession(session);
        refreshFooter();
      });
      break;
    case MAZE_LEVEL:
      renderLevel2(levelRoot, session, onLevelComplete);
      break;
    case ALLEN_KEY_LEVEL:
      renderLevel4(levelRoot, session, onLevelComplete);
      break;
    default:
      renderVictory(main, session);
      return;
  }

  refreshFooter();
}

/**
 * Applies a debug session transform and re-renders the current screen.
 * @param {(current: import('../logic/session.js').IkkeJaSession) => import('../logic/session.js').IkkeJaSession} transform
 */
function applyDebugSessionUpdate(transform) {
  if (!session) return;
  stopSyncAnimation();
  session = transform(session);
  saveSession(session);
  showToast(
    `Debug: now at ${session.level >= VICTORY_LEVEL ? 'Victory' : `Level ${displayLevelNumber(session.level)}`}`,
  );

  const main = document.getElementById('ikkeja-main');
  if (!main) return;

  if (session.level >= VICTORY_LEVEL) {
    updateHeaderNav('victory');
    const footer = document.getElementById('ikkeja-footer');
    if (footer) footer.hidden = true;
    renderVictory(main, session);
    return;
  }

  renderGame(main);
}

function refreshFooter() {
  const footer = document.getElementById('ikkeja-footer');
  if (!footer || !session) return;

  if (session.level >= VICTORY_LEVEL) {
    footer.hidden = true;
    stopSyncAnimation();
    return;
  }

  renderSyncPanel(footer, session, (syncOk, kind) => {
    if (!syncOk || !session) return;

    if (kind === 'level1-complete') {
      playSuccess();
      burstConfetti();
      session.level = MAZE_LEVEL;
      session.crosswordGridSolved = false;
      session.levelComplete = false;
      saveSession(session);
      const main = document.getElementById('ikkeja-main');
      if (main) renderGame(main);
      return;
    }

    if (session.levelComplete && kind === 'advance') {
      playSuccess();
      burstConfetti();
      session.level = nextPlayableLevel(session.level);
      session.levelComplete = false;
      saveSession(session);
      const main = document.getElementById('ikkeja-main');
      if (!main) return;
      if (session.level >= VICTORY_LEVEL) {
        stopSyncAnimation();
        updateHeaderNav('victory');
        renderVictory(main, session);
      } else {
        renderGame(main);
      }
    }
  });
}

/**
 * @param {'p1'|'p2'|'daughter'} role
 * @returns {string}
 */
function roleLabel(role) {
  return formatPlayerName(getPlayerByRole(role));
}
