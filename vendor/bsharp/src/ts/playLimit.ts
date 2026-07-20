/**
 * Daily play limits for BSharp: timed sessions, mandatory breaks, and a daily cap.
 * Pure logic (injectable clock) so Vitest can cover rollover and expiry without DOM.
 */

/** Maximum active play time per session (10 minutes). */
export const PLAY_SESSION_MS = 10 * 60 * 1000;

/** Mandatory rest after each session ends (10 minutes). */
export const PLAY_BREAK_MS = 10 * 60 * 1000;

/** How many play sessions are allowed per calendar day. */
export const PLAY_MAX_SESSIONS_PER_DAY = 3;

/** Lifecycle phase for the daily play budget. */
export type PlayLimitPhase = 'available' | 'in_session' | 'on_break' | 'daily_done';

/**
 * Persisted / runtime play-limit counters for one profile.
 */
export interface PlayLimitState {
  /** Local calendar day `YYYY-MM-DD`. */
  dayKey: string;
  /** Finished sessions on `dayKey`. */
  sessionsCompleted: number;
  /** Wall-clock start of the active session. */
  sessionStartedAtMs: number | null;
  /** When the current break ends. */
  breakUntilMs: number | null;
}

/**
 * Local calendar day key for a timestamp.
 * @param {number} nowMs
 * @returns {string}
 */
export function dayKeyFromMs(nowMs) {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Fresh play-limit state for the given instant.
 * @param {number} nowMs
 * @returns {PlayLimitState}
 */
export function createPlayLimitState(nowMs) {
  return {
    dayKey: dayKeyFromMs(nowMs),
    sessionsCompleted: 0,
    sessionStartedAtMs: null,
    breakUntilMs: null,
  };
}

/**
 * Formats a non-negative duration as `m:ss` for the session / break countdown.
 * @param {number} ms
 * @returns {string}
 */
export function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Milliseconds left in the active session (0 when not in session).
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {number}
 */
export function sessionRemainingMs(state, nowMs) {
  if (state.sessionStartedAtMs == null) return 0;
  return Math.max(0, state.sessionStartedAtMs + PLAY_SESSION_MS - nowMs);
}

/**
 * Milliseconds left in the mandatory break (0 when not on break).
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {number}
 */
export function breakRemainingMs(state, nowMs) {
  if (state.breakUntilMs == null) return 0;
  return Math.max(0, state.breakUntilMs - nowMs);
}

/**
 * Resets counters when the calendar day rolls over.
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {PlayLimitState}
 */
function syncDay(state, nowMs) {
  const today = dayKeyFromMs(nowMs);
  if (state.dayKey === today) return state;
  return {
    dayKey: today,
    sessionsCompleted: 0,
    sessionStartedAtMs: state.sessionStartedAtMs,
    breakUntilMs: state.breakUntilMs,
  };
}

/**
 * Clears an expired break marker.
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {PlayLimitState}
 */
function clearExpiredBreak(state, nowMs) {
  if (state.breakUntilMs == null || nowMs < state.breakUntilMs) return state;
  return { ...state, breakUntilMs: null };
}

/**
 * Current phase from already-synced state (does not mutate).
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {PlayLimitPhase}
 */
export function getPlayLimitPhase(state, nowMs) {
  if (state.sessionStartedAtMs != null && sessionRemainingMs(state, nowMs) > 0) {
    return 'in_session';
  }
  if (state.breakUntilMs != null && nowMs < state.breakUntilMs) {
    return 'on_break';
  }
  if (state.sessionsCompleted >= PLAY_MAX_SESSIONS_PER_DAY) {
    return 'daily_done';
  }
  return 'available';
}

/**
 * Whether the player may hear chords / tap flags right now.
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {boolean}
 */
export function canPlay(state, nowMs) {
  return getPlayLimitPhase(state, nowMs) === 'in_session';
}

/**
 * Begins a play session when the player is available.
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {PlayLimitState}
 */
export function startSession(state, nowMs) {
  const synced = clearExpiredBreak(syncDay(state, nowMs), nowMs);
  if (getPlayLimitPhase(synced, nowMs) !== 'available') return synced;
  return {
    ...synced,
    sessionStartedAtMs: nowMs,
    breakUntilMs: null,
  };
}

/**
 * Ends the active session: count it and start the mandatory break.
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {PlayLimitState}
 */
export function endSession(state, nowMs) {
  const synced = syncDay(state, nowMs);
  return {
    ...synced,
    sessionsCompleted: Math.min(
      PLAY_MAX_SESSIONS_PER_DAY,
      synced.sessionsCompleted + 1,
    ),
    sessionStartedAtMs: null,
    breakUntilMs: nowMs + PLAY_BREAK_MS,
  };
}

/**
 * Applies day rollover, expires finished sessions into breaks, and clears ended breaks.
 * @param {PlayLimitState} state
 * @param {number} nowMs
 * @returns {{ state: PlayLimitState, phase: PlayLimitPhase }}
 */
export function resolvePlayLimit(state, nowMs) {
  let next = clearExpiredBreak(syncDay(state, nowMs), nowMs);

  if (
    next.sessionStartedAtMs != null
    && sessionRemainingMs(next, nowMs) <= 0
  ) {
    const endedAt = next.sessionStartedAtMs + PLAY_SESSION_MS;
    next = endSession(next, endedAt);
    next = clearExpiredBreak(next, nowMs);
  }

  return { state: next, phase: getPlayLimitPhase(next, nowMs) };
}
