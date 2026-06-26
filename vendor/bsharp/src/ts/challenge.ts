/**
 * Timed challenge mode: points, replay limits, countdown, level progression.
 * Pure logic — no DOM; covered by unit tests in the parent repo.
 */
import { CHORD_DEFINITIONS } from './data';

/** Round lifecycle within one question. */
export type ChallengePhase = 'playing' | 'answered' | 'timeout' | 'level_up_pause';

/** Per-tier difficulty knobs for challenge mode. */
export interface ChallengeLevelConfig {
    /** Highest chord index included in the color pool (0 = red only). */
    maxChordIndex: number;
    /** Seconds allowed to answer after the round starts. */
    answerSeconds: number;
    /** Maximum chord replays per question (including auto-play on next). */
    maxReplays: number;
    /** Total points required before advancing to the next tier. */
    pointsToAdvance: number;
    /** Points awarded for a correct answer. */
    pointsPerCorrect: number;
    /** Correct identifications of the tier focus chord required to advance. */
    focusChordRequired: number;
}

/** Mutable challenge session tracked on the player profile. */
export interface ChallengeSessionState {
    levelIndex: number;
    points: number;
    /** Correct answers for the current tier's newest (focus) chord. */
    focusChordCorrect: number;
    replaysUsed: number;
    phase: ChallengePhase;
    /** Wall-clock ms when the current answer window ends; null when idle. */
    deadlineMs: number | null;
}

export const TIMEOUT_PENALTY_RATIO = 0.25;

/** Default point value for a correct answer when level config omits it. */
export const DEFAULT_POINTS_PER_CORRECT = 10;

/**
 * Challenge tiers: more chords, less time, fewer replays as level rises.
 * Chord pool grows via maxChordIndex (maps to CHORD_DEFINITIONS order).
 */
export const CHALLENGE_LEVELS: ChallengeLevelConfig[] = [
    { maxChordIndex: 1, answerSeconds: 10, maxReplays: 3, pointsToAdvance: 120, pointsPerCorrect: 10, focusChordRequired: 6 },
    { maxChordIndex: 2, answerSeconds: 9, maxReplays: 3, pointsToAdvance: 150, pointsPerCorrect: 10, focusChordRequired: 8 },
    { maxChordIndex: 3, answerSeconds: 8, maxReplays: 3, pointsToAdvance: 180, pointsPerCorrect: 12, focusChordRequired: 8 },
    { maxChordIndex: 4, answerSeconds: 8, maxReplays: 2, pointsToAdvance: 200, pointsPerCorrect: 12, focusChordRequired: 10 },
    { maxChordIndex: 5, answerSeconds: 7, maxReplays: 2, pointsToAdvance: 230, pointsPerCorrect: 12, focusChordRequired: 10 },
    { maxChordIndex: 6, answerSeconds: 7, maxReplays: 2, pointsToAdvance: 260, pointsPerCorrect: 15, focusChordRequired: 12 },
    { maxChordIndex: 7, answerSeconds: 6, maxReplays: 2, pointsToAdvance: 290, pointsPerCorrect: 15, focusChordRequired: 12 },
    { maxChordIndex: 8, answerSeconds: 6, maxReplays: 1, pointsToAdvance: 320, pointsPerCorrect: 15, focusChordRequired: 14 },
    { maxChordIndex: 9, answerSeconds: 5, maxReplays: 1, pointsToAdvance: 350, pointsPerCorrect: 20, focusChordRequired: 14 },
    { maxChordIndex: 10, answerSeconds: 5, maxReplays: 1, pointsToAdvance: 400, pointsPerCorrect: 20, focusChordRequired: 16 },
    { maxChordIndex: 11, answerSeconds: 4, maxReplays: 1, pointsToAdvance: 450, pointsPerCorrect: 20, focusChordRequired: 16 },
    { maxChordIndex: 12, answerSeconds: 4, maxReplays: 1, pointsToAdvance: 500, pointsPerCorrect: 25, focusChordRequired: 18 },
    { maxChordIndex: 13, answerSeconds: 4, maxReplays: 1, pointsToAdvance: 600, pointsPerCorrect: 25, focusChordRequired: 20 },
];

export const INSTRUMENTS = ['piano_1', 'guitar', 'ukulele', 'hammond', 'random'] as const;
export type ChallengeInstrument = (typeof INSTRUMENTS)[number];

/**
 * Creates a fresh challenge session at tier 0.
 * @returns Initial session state
 */
export function createChallengeSession(): ChallengeSessionState {
    return {
        levelIndex: 0,
        points: 0,
        focusChordCorrect: 0,
        replaysUsed: 0,
        phase: 'playing',
        deadlineMs: null,
    };
}

/**
 * Returns level config for a tier, clamped to the last defined tier.
 * @param levelIndex - Zero-based challenge tier
 */
export function getLevelConfig(levelIndex: number): ChallengeLevelConfig {
    const idx = Math.max(0, Math.min(levelIndex, CHALLENGE_LEVELS.length - 1));
    return CHALLENGE_LEVELS[idx];
}

/**
 * Chord color name for the current tier's maximum chord in the pool.
 * @param levelIndex - Challenge tier
 */
export function getChordNameForLevel(levelIndex: number): string {
    const config = getLevelConfig(levelIndex);
    const clamped = Math.min(config.maxChordIndex, CHORD_DEFINITIONS.length - 1);
    return CHORD_DEFINITIONS[clamped].name;
}

/**
 * The newest chord at a tier — must be identified correctly to advance.
 * @param levelIndex - Challenge tier
 */
export function getFocusChordForLevel(levelIndex: number): string {
    return getChordNameForLevel(levelIndex);
}

/**
 * Display name for the focus chord at a tier.
 * @param levelIndex - Challenge tier
 */
export function getFocusChordDisplayForLevel(levelIndex: number): string {
    const config = getLevelConfig(levelIndex);
    const clamped = Math.min(config.maxChordIndex, CHORD_DEFINITIONS.length - 1);
    return CHORD_DEFINITIONS[clamped].display;
}

/**
 * Whether both point and focus-chord requirements are met for level-up.
 */
export function isReadyToLevelUp(
    session: ChallengeSessionState,
    config: ChallengeLevelConfig,
): boolean {
    return session.points >= config.pointsToAdvance
        && session.focusChordCorrect >= config.focusChordRequired;
}

/**
 * Whether the player may press play again this round.
 * @param session - Current challenge session
 * @param config - Active tier config
 */
export function canReplay(session: ChallengeSessionState, config: ChallengeLevelConfig): boolean {
    return session.phase === 'playing' && session.replaysUsed < config.maxReplays;
}

/**
 * Remaining replays for the current question (0 when exhausted).
 * @param session - Current challenge session
 * @param config - Active tier config
 */
export function replaysRemaining(session: ChallengeSessionState, config: ChallengeLevelConfig): number {
    return Math.max(0, config.maxReplays - session.replaysUsed);
}

/**
 * Records one chord playback toward the per-question replay cap.
 * @param session - Current session (mutated)
 */
export function recordReplay(session: ChallengeSessionState): void {
    session.replaysUsed += 1;
}

/**
 * Starts a new question: resets replays and sets the answer deadline.
 * @param session - Current session (mutated)
 * @param nowMs - Current timestamp (ms)
 * @param config - Active tier config
 */
export function startRound(session: ChallengeSessionState, nowMs: number, config: ChallengeLevelConfig): void {
    session.replaysUsed = 0;
    session.phase = 'playing';
    session.deadlineMs = nowMs + config.answerSeconds * 1000;
}

/**
 * Whole seconds left on the timer (ceil), or 0 when expired / no deadline.
 * @param deadlineMs - Answer deadline
 * @param nowMs - Current timestamp (ms)
 */
export function remainingSeconds(deadlineMs: number | null, nowMs: number): number {
    if (deadlineMs === null) return 0;
    const msLeft = deadlineMs - nowMs;
    if (msLeft <= 0) return 0;
    return Math.ceil(msLeft / 1000);
}

/**
 * @param deadlineMs - Answer deadline
 * @param nowMs - Current timestamp (ms)
 */
export function isTimedOut(deadlineMs: number | null, nowMs: number): boolean {
    if (deadlineMs === null) return false;
    return nowMs >= deadlineMs;
}

/**
 * Applies the timeout penalty and marks the round timed out.
 * @param session - Current session (mutated)
 * @param ratio - Fraction of points lost (default 25%)
 * @returns Points removed
 */
export function applyTimeoutPenalty(
    session: ChallengeSessionState,
    ratio: number = TIMEOUT_PENALTY_RATIO,
): number {
    const before = session.points;
    session.points = Math.floor(session.points * (1 - ratio));
    session.phase = 'timeout';
    session.deadlineMs = null;
    return before - session.points;
}

export interface CorrectAnswerResult {
    pointsEarned: number;
    leveledUp: boolean;
    newLevelIndex: number;
}

/**
 * Awards points for a correct answer; may trigger level-up when points and focus chord goals are met.
 * @param session - Current session (mutated)
 * @param config - Active tier config
 * @param answeredColor - Color the player chose (must match correct chord to call this)
 */
export function applyCorrectAnswer(
    session: ChallengeSessionState,
    config: ChallengeLevelConfig,
    answeredColor: string,
): CorrectAnswerResult {
    const focusChord = getFocusChordForLevel(session.levelIndex);
    const pointsEarned = config.pointsPerCorrect;
    session.points += pointsEarned;
    if (answeredColor === focusChord) {
        session.focusChordCorrect += 1;
    }
    session.phase = 'answered';
    session.deadlineMs = null;

    let leveledUp = false;
    let newLevelIndex = session.levelIndex;

    if (isReadyToLevelUp(session, config) && session.levelIndex < CHALLENGE_LEVELS.length - 1) {
        leveledUp = true;
        newLevelIndex = session.levelIndex + 1;
        session.levelIndex = newLevelIndex;
        session.points = 0;
        session.focusChordCorrect = 0;
        session.phase = 'level_up_pause';
    }

    return { pointsEarned, leveledUp, newLevelIndex };
}

/**
 * Clears level-up pause so the next round can begin.
 * @param session - Current session (mutated)
 */
export function dismissLevelUp(session: ChallengeSessionState): void {
    if (session.phase === 'level_up_pause') {
        session.phase = 'playing';
    }
}

/**
 * Color names (flags) available at a challenge tier.
 * @param levelIndex - Zero-based challenge tier
 */
export function getChallengeFlagColors(levelIndex: number): string[] {
    const config = getLevelConfig(levelIndex);
    const end = Math.min(config.maxChordIndex, CHORD_DEFINITIONS.length - 1);
    return CHORD_DEFINITIONS.slice(0, end + 1).map((c) => c.name);
}

/**
 * Picks a concrete instrument when profile is set to random.
 * @param rng - Returns value in [0, 1)
 */
export function resolveInstrument(
    instrument: ChallengeInstrument,
    rng: () => number = Math.random,
): Exclude<ChallengeInstrument, 'random'> {
    if (instrument !== 'random') {
        return instrument;
    }
    const pool: Exclude<ChallengeInstrument, 'random'>[] = ['piano_1', 'guitar', 'ukulele', 'hammond'];
    const idx = Math.floor(rng() * pool.length);
    return pool[idx];
}
