/**
 * Unit tests for BSharp daily play limits (session length, breaks, daily cap).
 */
import { describe, it, expect } from 'vitest';
import {
  PLAY_SESSION_MS,
  PLAY_BREAK_MS,
  PLAY_MAX_SESSIONS_PER_DAY,
  createPlayLimitState,
  dayKeyFromMs,
  resolvePlayLimit,
  getPlayLimitPhase,
  startSession,
  endSession,
  sessionRemainingMs,
  breakRemainingMs,
  formatCountdown,
  canPlay,
} from '../vendor/bsharp/src/ts/playLimit.ts';

const DAY_A = Date.UTC(2026, 6, 20, 12, 0, 0); // 2026-07-20 noon UTC
const DAY_B = Date.UTC(2026, 6, 21, 12, 0, 0); // next calendar day UTC

describe('constants', () => {
  it('uses 10-minute sessions, 10-minute breaks, and 3 sessions per day', () => {
    expect(PLAY_SESSION_MS).toBe(10 * 60 * 1000);
    expect(PLAY_BREAK_MS).toBe(10 * 60 * 1000);
    expect(PLAY_MAX_SESSIONS_PER_DAY).toBe(3);
  });
});

describe('createPlayLimitState', () => {
  it('starts available with zero sessions for the current day', () => {
    const state = createPlayLimitState(DAY_A);
    expect(state.dayKey).toBe(dayKeyFromMs(DAY_A));
    expect(state.sessionsCompleted).toBe(0);
    expect(state.sessionStartedAtMs).toBeNull();
    expect(state.breakUntilMs).toBeNull();
    expect(getPlayLimitPhase(state, DAY_A)).toBe('available');
    expect(canPlay(state, DAY_A)).toBe(false);
  });
});

describe('startSession / endSession', () => {
  it('starts a timed session and tracks remaining time', () => {
    let state = createPlayLimitState(DAY_A);
    state = startSession(state, DAY_A);
    expect(getPlayLimitPhase(state, DAY_A)).toBe('in_session');
    expect(canPlay(state, DAY_A)).toBe(true);
    expect(sessionRemainingMs(state, DAY_A)).toBe(PLAY_SESSION_MS);
    expect(sessionRemainingMs(state, DAY_A + 90_000)).toBe(PLAY_SESSION_MS - 90_000);
  });

  it('ends a session into a break and counts it toward the daily cap', () => {
    let state = startSession(createPlayLimitState(DAY_A), DAY_A);
    const endedAt = DAY_A + 60_000;
    state = endSession(state, endedAt);
    expect(state.sessionsCompleted).toBe(1);
    expect(state.sessionStartedAtMs).toBeNull();
    expect(state.breakUntilMs).toBe(endedAt + PLAY_BREAK_MS);
    expect(getPlayLimitPhase(state, endedAt)).toBe('on_break');
    expect(canPlay(state, endedAt)).toBe(false);
    expect(breakRemainingMs(state, endedAt)).toBe(PLAY_BREAK_MS);
  });

  it('becomes available again after the break ends', () => {
    let state = endSession(startSession(createPlayLimitState(DAY_A), DAY_A), DAY_A);
    const afterBreak = DAY_A + PLAY_BREAK_MS;
    const resolved = resolvePlayLimit(state, afterBreak);
    expect(resolved.phase).toBe('available');
    expect(resolved.state.breakUntilMs).toBeNull();
    expect(resolved.state.sessionsCompleted).toBe(1);
  });
});

describe('session expiry', () => {
  it('auto-ends an expired session into a break via resolvePlayLimit', () => {
    let state = startSession(createPlayLimitState(DAY_A), DAY_A);
    const afterSession = DAY_A + PLAY_SESSION_MS;
    const resolved = resolvePlayLimit(state, afterSession);
    expect(resolved.phase).toBe('on_break');
    expect(resolved.state.sessionsCompleted).toBe(1);
    expect(resolved.state.breakUntilMs).toBe(afterSession + PLAY_BREAK_MS);
  });
});

describe('daily cap', () => {
  it('blocks play after three completed sessions', () => {
    let state = createPlayLimitState(DAY_A);
    for (let i = 0; i < 3; i += 1) {
      state = startSession(state, DAY_A + i * 1000);
      state = endSession(state, DAY_A + i * 1000 + 1000);
      // skip break for test by clearing after each except to accumulate
      state = { ...state, breakUntilMs: null };
    }
    expect(state.sessionsCompleted).toBe(3);
    expect(getPlayLimitPhase(state, DAY_A + 10_000)).toBe('daily_done');
    expect(canPlay(state, DAY_A + 10_000)).toBe(false);
  });

  it('resets session count on a new calendar day', () => {
    let state = createPlayLimitState(DAY_A);
    state = { ...state, sessionsCompleted: 3 };
    const resolved = resolvePlayLimit(state, DAY_B);
    expect(resolved.state.dayKey).toBe(dayKeyFromMs(DAY_B));
    expect(resolved.state.sessionsCompleted).toBe(0);
    expect(resolved.phase).toBe('available');
  });
});

describe('formatCountdown', () => {
  it('formats mm:ss for session display', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(1000)).toBe('0:01');
    expect(formatCountdown(9 * 60_000 + 5_000)).toBe('9:05');
    expect(formatCountdown(PLAY_SESSION_MS)).toBe('10:00');
  });
});
