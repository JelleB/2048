/**
 * Challenge mode UI: HUD, timer display, level-up celebration overlay.
 */
import {
    ChallengeSessionState,
    getLevelConfig,
    replaysRemaining,
    getFocusChordDisplayForLevel,
} from './challenge';
import { CHORD_DEFINITIONS } from './data';
import {
    PLAY_MAX_SESSIONS_PER_DAY,
    formatCountdown,
    type PlayLimitPhase,
} from './playLimit';

/**
 * Shows challenge HUD; hides manual level selector and next-arrow (auto-progress only).
 */
export function initGameHud(): void {
    const hud = document.getElementById('challenge-hud');
    const selectors = document.querySelector('.selectors');
    if (hud) {
        hud.classList.add('visible');
        hud.setAttribute('aria-hidden', 'false');
    }
    if (selectors) {
        selectors.classList.add('challenge-hidden');
    }
    const nextButton = document.getElementById('next-chord');
    if (nextButton) {
        nextButton.classList.add('challenge-hidden');
    }
}

/**
 * Refreshes points, level label, and replay counter in the HUD.
 * @param session - Current challenge session
 */
export function updateChallengeHud(session: ChallengeSessionState): void {
    const config = getLevelConfig(session.levelIndex);
    const pointsEl = document.getElementById('challenge-points');
    const levelEl = document.getElementById('challenge-level');
    const replaysEl = document.getElementById('challenge-replays');
    const goalEl = document.getElementById('challenge-goal');
    const focusCountEl = document.getElementById('challenge-focus-count');
    const focusGoalEl = document.getElementById('challenge-focus-goal');
    const focusNameEl = document.getElementById('challenge-focus-name');

    if (pointsEl) pointsEl.textContent = String(session.points);
    if (levelEl) levelEl.textContent = String(session.levelIndex + 1);
    if (replaysEl) {
        const left = replaysRemaining(session, config);
        replaysEl.textContent = left === 1 ? '1 listen left' : `${left} listens left`;
    }
    if (goalEl) goalEl.textContent = String(config.pointsToAdvance);
    if (focusCountEl) focusCountEl.textContent = String(session.focusChordCorrect);
    if (focusGoalEl) focusGoalEl.textContent = String(config.focusChordRequired);
    if (focusNameEl) focusNameEl.textContent = getFocusChordDisplayForLevel(session.levelIndex);
}

/**
 * Updates the per-question countdown timer display.
 * @param secondsLeft - Whole seconds remaining
 */
export function updateChallengeTimerDisplay(secondsLeft: number): void {
    const timerEl = document.getElementById('challenge-timer');
    if (!timerEl) return;
    timerEl.textContent = String(secondsLeft);
    timerEl.classList.toggle('urgent', secondsLeft > 0 && secondsLeft <= 3);
    timerEl.classList.toggle('expired', secondsLeft === 0);
}

/**
 * Updates the visible play-session countdown and sessions remaining today.
 * @param remainingMs - Milliseconds left in the current play session
 * @param sessionsCompleted - Finished sessions today
 * @param phase - Current play-limit phase
 */
export function updateSessionLimitDisplay(
    remainingMs: number,
    sessionsCompleted: number,
    phase: PlayLimitPhase,
): void {
    const timerEl = document.getElementById('session-timer');
    const leftEl = document.getElementById('session-left');
    const sessionsLeft = Math.max(0, PLAY_MAX_SESSIONS_PER_DAY - sessionsCompleted);
    if (timerEl) {
        timerEl.textContent = phase === 'in_session' ? formatCountdown(remainingMs) : '0:00';
        timerEl.classList.toggle('urgent', phase === 'in_session' && remainingMs <= 60_000);
    }
    if (leftEl) {
        leftEl.textContent = sessionsLeft === 1 ? '1 left today' : `${sessionsLeft} left today`;
    }
}

/**
 * Shows the lockout overlay for break or daily limit.
 * @param phase - `on_break` or `daily_done`
 * @param remainingMs - Break time remaining (ignored for daily_done)
 */
export function showPlayLimitOverlay(phase: PlayLimitPhase, remainingMs = 0): void {
    const overlay = document.getElementById('play-limit-overlay');
    const title = document.getElementById('play-limit-title');
    const detail = document.getElementById('play-limit-detail');
    const countdown = document.getElementById('play-limit-countdown');
    if (!overlay) return;

    if (phase === 'on_break') {
        if (title) title.textContent = 'Break time';
        if (detail) {
            detail.textContent = 'Take a 10-minute break before your next session.';
        }
        if (countdown) {
            countdown.textContent = formatCountdown(remainingMs);
            countdown.hidden = false;
        }
    } else if (phase === 'daily_done') {
        if (title) title.textContent = 'Done for today';
        if (detail) {
            detail.textContent = `You used all ${PLAY_MAX_SESSIONS_PER_DAY} sessions. Come back tomorrow.`;
        }
        if (countdown) {
            countdown.textContent = '';
            countdown.hidden = true;
        }
    } else {
        hidePlayLimitOverlay();
        return;
    }

    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
}

/**
 * Hides the play-limit lockout overlay.
 */
export function hidePlayLimitOverlay(): void {
    const overlay = document.getElementById('play-limit-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
}

/**
 * Shows the level-up celebration overlay and pauses interaction.
 * @param levelIndex - New zero-based tier
 */
export function showLevelUpOverlay(levelIndex: number): void {
    const overlay = document.getElementById('level-up-overlay');
    const title = document.getElementById('level-up-title');
    const detail = document.getElementById('level-up-detail');
    if (!overlay) return;

    const chordName = CHORD_DEFINITIONS[Math.min(
        getLevelConfig(levelIndex).maxChordIndex,
        CHORD_DEFINITIONS.length - 1,
    )].display;
    const config = getLevelConfig(levelIndex);

    if (title) title.textContent = `Level ${levelIndex + 1}!`;
    if (detail) {
        detail.textContent = `Learn ${chordName}: ${config.pointsToAdvance} pts and ${config.focusChordRequired} correct. ${config.answerSeconds}s, ${config.maxReplays} listens.`;
    }
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
}

/**
 * Hides the level-up overlay after the player continues.
 */
export function dismissLevelUpOverlay(): void {
    const overlay = document.getElementById('level-up-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
}

/**
 * Brief toast when time runs out.
 * @param penalty - Points lost to the timeout penalty
 */
export function showTimeoutPenaltyToast(penalty: number): void {
    const toast = document.getElementById('challenge-toast');
    if (!toast) return;
    toast.textContent = penalty > 0
        ? `Time's up! −${penalty} pts (25%)`
        : "Time's up!";
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2200);
}

/**
 * Brief toast when a correct answer earns points.
 * @param points - Points earned
 */
export function showPointsEarnedToast(points: number): void {
    const toast = document.getElementById('challenge-toast');
    if (!toast) return;
    toast.textContent = `+${points} pts`;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 1200);
}

/**
 * Updates play button state when replays are exhausted.
 * @param canReplayMore - Whether another replay is allowed
 */
export function setPlayButtonReplayState(canReplayMore: boolean): void {
    const playButton = document.getElementById('play-button');
    if (!playButton) return;
    if (canReplayMore) {
        playButton.classList.remove('deactivated');
    } else {
        playButton.classList.add('deactivated');
    }
}
