/**
 * Unit tests for BSharp challenge mode (pure logic in vendor/bsharp).
 */
import { describe, it, expect } from 'vitest';
import {
  createChallengeSession,
  getLevelConfig,
  canReplay,
  replaysRemaining,
  recordReplay,
  startRound,
  remainingSeconds,
  isTimedOut,
  applyTimeoutPenalty,
  applyCorrectAnswer,
  dismissLevelUp,
  getChordNameForLevel,
  getFocusChordForLevel,
  isReadyToLevelUp,
  resolveInstrument,
  getChallengeFlagColors,
  CHALLENGE_LEVELS,
} from '../vendor/bsharp/src/ts/challenge.ts';

describe('createChallengeSession', () => {
  it('starts at level 0 with zero points and focus progress', () => {
    const s = createChallengeSession();
    expect(s.levelIndex).toBe(0);
    expect(s.points).toBe(0);
    expect(s.focusChordCorrect).toBe(0);
    expect(s.replaysUsed).toBe(0);
    expect(s.phase).toBe('playing');
    expect(s.deadlineMs).toBeNull();
  });
});

describe('getLevelConfig', () => {
  it('returns first tier for index 0', () => {
    expect(getLevelConfig(0)).toEqual(CHALLENGE_LEVELS[0]);
  });

  it('clamps above max tier', () => {
    expect(getLevelConfig(999).maxChordIndex).toBe(CHALLENGE_LEVELS.at(-1).maxChordIndex);
  });
});

describe('replays', () => {
  it('allows replays until max is reached', () => {
    const session = createChallengeSession();
    const config = getLevelConfig(0);
    expect(canReplay(session, config)).toBe(true);
    recordReplay(session);
    recordReplay(session);
    recordReplay(session);
    expect(canReplay(session, config)).toBe(false);
    expect(replaysRemaining(session, config)).toBe(0);
  });
});

describe('timer', () => {
  it('sets deadline from answerSeconds', () => {
    const session = createChallengeSession();
    const config = getLevelConfig(0);
    startRound(session, 1000, config);
    expect(session.deadlineMs).toBe(1000 + config.answerSeconds * 1000);
    expect(remainingSeconds(session.deadlineMs, 2000)).toBe(config.answerSeconds - 1);
  });

  it('detects timeout', () => {
    const session = createChallengeSession();
    startRound(session, 0, getLevelConfig(0));
    const deadline = session.deadlineMs;
    expect(isTimedOut(deadline, deadline - 1)).toBe(false);
    expect(isTimedOut(deadline, deadline)).toBe(true);
  });
});

describe('applyTimeoutPenalty', () => {
  it('removes 25% of points', () => {
    const session = createChallengeSession();
    session.points = 100;
    const lost = applyTimeoutPenalty(session);
    expect(lost).toBe(25);
    expect(session.points).toBe(75);
    expect(session.phase).toBe('timeout');
  });

  it('floors penalty on small totals', () => {
    const session = createChallengeSession();
    session.points = 3;
    applyTimeoutPenalty(session);
    expect(session.points).toBe(2);
  });
});

describe('applyCorrectAnswer', () => {
  it('adds points per correct without leveling when below threshold', () => {
    const session = createChallengeSession();
    const config = getLevelConfig(0);
    const result = applyCorrectAnswer(session, config, 'red');
    expect(result.pointsEarned).toBe(config.pointsPerCorrect);
    expect(result.leveledUp).toBe(false);
    expect(session.points).toBe(config.pointsPerCorrect);
    expect(session.focusChordCorrect).toBe(0);
    expect(session.phase).toBe('answered');
  });

  it('counts focus chord when answering the tier newest color', () => {
    const session = createChallengeSession();
    const config = getLevelConfig(0);
    const focus = getFocusChordForLevel(0);
    applyCorrectAnswer(session, config, focus);
    expect(session.focusChordCorrect).toBe(1);
  });

  it('does not level up with enough points but not enough focus chord ids', () => {
    const session = createChallengeSession();
    const config = getLevelConfig(0);
    session.points = config.pointsToAdvance - config.pointsPerCorrect;
    session.focusChordCorrect = 0;
    const result = applyCorrectAnswer(session, config, 'red');
    expect(result.leveledUp).toBe(false);
    expect(isReadyToLevelUp(session, config)).toBe(false);
  });

  it('levels up when points and focus chord requirements are met', () => {
    const session = createChallengeSession();
    const config = getLevelConfig(0);
    const focus = getFocusChordForLevel(0);
    session.points = config.pointsToAdvance - config.pointsPerCorrect;
    session.focusChordCorrect = config.focusChordRequired - 1;
    const result = applyCorrectAnswer(session, config, focus);
    expect(result.leveledUp).toBe(true);
    expect(session.levelIndex).toBe(1);
    expect(session.points).toBe(0);
    expect(session.focusChordCorrect).toBe(0);
    expect(session.phase).toBe('level_up_pause');
  });
});

describe('dismissLevelUp', () => {
  it('returns to playing from level_up_pause', () => {
    const session = createChallengeSession();
    session.phase = 'level_up_pause';
    dismissLevelUp(session);
    expect(session.phase).toBe('playing');
  });
});

describe('getChordNameForLevel', () => {
  it('maps tier to chord definition name', () => {
    expect(getChordNameForLevel(0)).toBe('yellow');
    expect(getChordNameForLevel(2)).toBe('black');
  });
});

describe('getChallengeFlagColors', () => {
  it('matches colors implied by tier chord index', () => {
    expect(getChallengeFlagColors(0)).toEqual(['red', 'yellow']);
  });
});

import { isChallengeMode } from '../vendor/bsharp/src/ts/game.ts';

describe('isChallengeMode', () => {
  it('is always enabled (challenge-only app)', () => {
    expect(isChallengeMode()).toBe(true);
  });
});

describe('resolveInstrument', () => {
  it('returns fixed instrument when not random', () => {
    expect(resolveInstrument('guitar')).toBe('guitar');
  });

  it('picks from pool when random', () => {
    expect(resolveInstrument('random', () => 0)).toBe('piano_1');
    expect(resolveInstrument('random', () => 0.99)).toBe('hammond');
  });
});
