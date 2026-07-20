import { CHORDS_TONE, FIRST_BLACK_INDEX } from './data';
import { randomElem } from './utils';
import {
    STATE, getCurrentProfile, getCurrentTargetNumber,
    saveState, saveSessionHistory,
    newStats, isRecent,
    DEFAULT_CHALLENGE_LEVEL_INDEX, DEFAULT_CHALLENGE_POINTS, DEFAULT_CHALLENGE_FOCUS_CORRECT,
} from './state';
import { updateStartTimeIfNeeded, updateStats } from './stats';
import {
    playChordFiles, preloadAudio,
    playChallengeChord, stopCurrentAudio,
} from './audio';
import {
    populateFlags, updateStatsDisplay, resetCatEmoji, setCatEmoji,
} from './ui';
import {
    dismissOnboardingStep, showOnboardingGuessPrompt, showOnboardingGoNextPrompt,
} from './onboarding';
import {
    ChallengeSessionState, ChallengeInstrument,
    createChallengeSession, getLevelConfig, getChordNameForLevel,
    canReplay, recordReplay, startRound, isTimedOut, remainingSeconds,
    applyTimeoutPenalty, applyCorrectAnswer, dismissLevelUp as clearLevelUpPause, resolveInstrument,
} from './challenge';
import {
    initGameHud, updateChallengeHud, updateChallengeTimerDisplay,
    showLevelUpOverlay, dismissLevelUpOverlay, showTimeoutPenaltyToast,
    showPointsEarnedToast, setPlayButtonReplayState,
    updateSessionLimitDisplay, showPlayLimitOverlay, hidePlayLimitOverlay,
} from './challengeUi';
import {
    createPlayLimitState,
    resolvePlayLimit,
    startSession,
    sessionRemainingMs,
    breakRemainingMs,
    canPlay,
    type PlayLimitState,
    type PlayLimitPhase,
} from './playLimit';

let _COLORS: string[] | null = null;
let _CHORDS_ON = false;
export let _CORRECT_COLOR: string | null = null;
let _SELECTED_ELEM: HTMLElement | null = null;
let _CORRECT_ELEM: HTMLElement | null = null;
let _CURRENT_AUDIO: [HTMLAudioElement, number] | null = null;
let _AUDIO_PLAYED = false;
let _EMOJI_LOCK = false;
let _TRAINER_PRELOADED = false;
let _PERSIST_REACTION_FACE_ENABLED = false;
let _CHALLENGE_SESSION: ChallengeSessionState = createChallengeSession();
let _CHALLENGE_TIMER_ID: ReturnType<typeof setInterval> | null = null;
let _PLAY_LIMIT: PlayLimitState = createPlayLimitState(Date.now());
let _PLAY_LIMIT_TIMER_ID: ReturnType<typeof setInterval> | null = null;
let _ROUND_INSTRUMENT: ChallengeInstrument = 'piano_1';
let _USES_CHALLENGE_SYNTH = false;
let _autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

/** Delay before the next chord auto-plays after an answer or timeout. */
const CHALLENGE_AUTO_ADVANCE_MS = 1400;

export function getTestDeterministicColor(): string | null {
    return (window as unknown as Record<string, unknown>).__bsharp_test_deterministic_color as string | null ?? null;
}

/**
 * BSharp always runs timed challenge mode (auto-progress, points, levels).
 */
export function isChallengeMode(): boolean {
    return true;
}

function loadChallengeSessionFromProfile(): void {
    const profile = getCurrentProfile();
    _CHALLENGE_SESSION = {
        levelIndex: profile.challenge_level_index ?? DEFAULT_CHALLENGE_LEVEL_INDEX,
        points: profile.challenge_points ?? DEFAULT_CHALLENGE_POINTS,
        focusChordCorrect: profile.challenge_focus_correct ?? DEFAULT_CHALLENGE_FOCUS_CORRECT,
        replaysUsed: 0,
        phase: 'playing',
        deadlineMs: null,
    };
}

function persistChallengeSession(): void {
    const profile = getCurrentProfile();
    profile.challenge_level_index = _CHALLENGE_SESSION.levelIndex;
    profile.challenge_points = _CHALLENGE_SESSION.points;
    profile.challenge_focus_correct = _CHALLENGE_SESSION.focusChordCorrect;
    saveState();
}

function loadPlayLimitFromProfile(): void {
    const profile = getCurrentProfile();
    const now = Date.now();
    _PLAY_LIMIT = {
        dayKey: profile.play_limit_day ?? createPlayLimitState(now).dayKey,
        sessionsCompleted: profile.play_limit_sessions_completed ?? 0,
        sessionStartedAtMs: profile.play_limit_session_started_at ?? null,
        breakUntilMs: profile.play_limit_break_until ?? null,
    };
}

function persistPlayLimit(): void {
    const profile = getCurrentProfile();
    profile.play_limit_day = _PLAY_LIMIT.dayKey;
    profile.play_limit_sessions_completed = _PLAY_LIMIT.sessionsCompleted;
    profile.play_limit_session_started_at = _PLAY_LIMIT.sessionStartedAtMs;
    profile.play_limit_break_until = _PLAY_LIMIT.breakUntilMs;
    saveState();
}

function refreshPlayLimitUi(phase: PlayLimitPhase, nowMs: number): void {
    updateSessionLimitDisplay(
        sessionRemainingMs(_PLAY_LIMIT, nowMs),
        _PLAY_LIMIT.sessionsCompleted,
        phase,
    );
    if (phase === 'on_break') {
        showPlayLimitOverlay(phase, breakRemainingMs(_PLAY_LIMIT, nowMs));
    } else if (phase === 'daily_done') {
        showPlayLimitOverlay(phase);
    } else {
        hidePlayLimitOverlay();
    }
}

function stopPlayLimitTimer(): void {
    if (_PLAY_LIMIT_TIMER_ID !== null) {
        clearInterval(_PLAY_LIMIT_TIMER_ID);
        _PLAY_LIMIT_TIMER_ID = null;
    }
}

function lockOutPlay(): void {
    stopChallengeTimer();
    cancelAutoAdvance();
    stopCurrentAudio();
    setPlayButtonReplayState(false);
}

/**
 * Resolves day rollover and session expiry, auto-starts when available, updates HUD/overlay.
 * @param options.resumePlay - When true and a new session just became available, auto-play a chord
 * @returns Whether the player may interact right now
 */
function syncPlayLimit(options: { resumePlay?: boolean } = {}): boolean {
    const nowMs = Date.now();
    const wasInSession = _PLAY_LIMIT.sessionStartedAtMs != null
        && sessionRemainingMs(_PLAY_LIMIT, nowMs) > 0;
    const wasAvailableOrBreak = !wasInSession;

    const before = { ..._PLAY_LIMIT };
    let resolved = resolvePlayLimit(_PLAY_LIMIT, nowMs);
    _PLAY_LIMIT = resolved.state;
    let phase = resolved.phase;

    if (phase === 'available') {
        _PLAY_LIMIT = startSession(_PLAY_LIMIT, nowMs);
        phase = 'in_session';
    }

    const changed = before.dayKey !== _PLAY_LIMIT.dayKey
        || before.sessionsCompleted !== _PLAY_LIMIT.sessionsCompleted
        || before.sessionStartedAtMs !== _PLAY_LIMIT.sessionStartedAtMs
        || before.breakUntilMs !== _PLAY_LIMIT.breakUntilMs;
    if (changed) persistPlayLimit();

    refreshPlayLimitUi(phase, nowMs);

    const allowed = canPlay(_PLAY_LIMIT, nowMs);
    if (!allowed) {
        lockOutPlay();
    } else if (
        options.resumePlay
        && wasAvailableOrBreak
        && phase === 'in_session'
        && before.sessionStartedAtMs !== _PLAY_LIMIT.sessionStartedAtMs
    ) {
        populateAudio();
        playAudio();
    }

    return allowed;
}

/** Starts the wall-clock ticker for session / break countdowns. */
function startPlayLimitTimer(): void {
    stopPlayLimitTimer();
    _PLAY_LIMIT_TIMER_ID = setInterval(() => {
        syncPlayLimit({ resumePlay: true });
    }, 250);
}

export function getSelectedColors(): string[] {
    const chordIdx = Object.keys(CHORDS_TONE).findIndex(x => x === STATE.current_chord);
    if (_COLORS === null) {
        _COLORS = Object.keys(CHORDS_TONE).slice(0, chordIdx + 1);
    }
    return _COLORS;
}

export function isBlackLevel(level?: number): boolean {
    if (level === undefined) {
        level = getSelectedColors().length;
    }
    return level > FIRST_BLACK_INDEX;
}

export function chordsOn(): boolean {
    return _CHORDS_ON;
}

function setPlayedAfter(delay: number): void {
    setTimeout(() => { showOnboardingGuessPrompt(); }, delay);
}

function onAudioEnded(): void {
    showOnboardingGuessPrompt();
}

function stopChallengeTimer(): void {
    if (_CHALLENGE_TIMER_ID !== null) {
        clearInterval(_CHALLENGE_TIMER_ID);
        _CHALLENGE_TIMER_ID = null;
    }
}

function tickChallengeTimer(): void {
    if (_CHALLENGE_SESSION.phase !== 'playing') return;
    const now = Date.now();
    const secs = remainingSeconds(_CHALLENGE_SESSION.deadlineMs, now);
    updateChallengeTimerDisplay(secs);
    if (isTimedOut(_CHALLENGE_SESSION.deadlineMs, now)) {
        handleChallengeTimeout();
    }
}

function startChallengeTimer(): void {
    stopChallengeTimer();
    tickChallengeTimer();
    _CHALLENGE_TIMER_ID = setInterval(tickChallengeTimer, 200);
}

function revealCorrectFlag(): void {
    const flagHolder = document.getElementById('flag-holder')!;
    _CORRECT_ELEM = flagHolder.querySelector(`div[data-color="${_CORRECT_COLOR}"]>div.flag`)!;
    if (_CORRECT_ELEM) _CORRECT_ELEM.classList.add('flag-correct');
    setCatEmoji(5);
}

function cancelAutoAdvance(): void {
    if (_autoAdvanceTimer !== null) {
        clearTimeout(_autoAdvanceTimer);
        _autoAdvanceTimer = null;
    }
}

/** Loads the next question and auto-plays the chord (challenge flow). */
function advanceToNextRound(): void {
    if (_CHALLENGE_SESSION.phase === 'level_up_pause') return;
    if (!syncPlayLimit()) return;

    cancelAutoAdvance();
    dismissOnboardingStep('goNext');

    if (_CHORDS_ON && getCurrentProfile().reveal_chord_mode === 'after_guess') {
        document.getElementById('flag-holder')!.classList.remove('chord-notes');
    }

    populateAudio();
    playAudio();
}

/** Schedules automatic advance to the next chord after an answer or timeout. */
function scheduleAutoAdvance(): void {
    if (_CHALLENGE_SESSION.phase === 'level_up_pause') return;
    cancelAutoAdvance();
    _autoAdvanceTimer = setTimeout(() => {
        _autoAdvanceTimer = null;
        advanceToNextRound();
    }, CHALLENGE_AUTO_ADVANCE_MS);
}

function handleChallengeTimeout(): void {
    if (_SELECTED_ELEM !== null || _CHALLENGE_SESSION.phase !== 'playing') return;
    stopChallengeTimer();
    const penalty = applyTimeoutPenalty(_CHALLENGE_SESSION);
    persistChallengeSession();
    updateChallengeHud(_CHALLENGE_SESSION);
    showTimeoutPenaltyToast(penalty);
    _AUDIO_PLAYED = true;
    revealCorrectFlag();
    updateChallengeTimerDisplay(0);
    setPlayButtonReplayState(false);
    scheduleAutoAdvance();
}

function applyChallengeChordPool(): void {
    const chordName = getChordNameForLevel(_CHALLENGE_SESSION.levelIndex);

    STATE.current_chord = chordName;
    getCurrentProfile().current_chord = chordName;
    getCurrentProfile().stats.current_chord = chordName;
    const chordSelector = document.getElementById('chord-selector') as HTMLSelectElement | null;
    if (chordSelector) chordSelector.value = chordName;

    _COLORS = null;
    const currentProfile = getCurrentProfile();
    _CHORDS_ON = (currentProfile.show_chord_mode === 'always'
        || (isBlackLevel() && currentProfile.show_chord_mode === 'black_only'));
    populateFlags(getSelectedColors, chordsOn);
}

function beginChallengeRound(): void {
    const config = getLevelConfig(_CHALLENGE_SESSION.levelIndex);
    startRound(_CHALLENGE_SESSION, Date.now(), config);
    updateChallengeHud(_CHALLENGE_SESSION);
    setPlayButtonReplayState(canReplay(_CHALLENGE_SESSION, config));
    startChallengeTimer();
}

function _getWeights(): number[] | undefined {
    return undefined;
}

export function selectNewColor(): void {
    const weights = _getWeights();
    _CORRECT_COLOR = getTestDeterministicColor() ?? randomElem(getSelectedColors(), weights);
    if (_SELECTED_ELEM !== null) {
        _SELECTED_ELEM.classList.remove('flag-correct');
        _SELECTED_ELEM.classList.remove('flag-incorrect');
        _SELECTED_ELEM = null;
    }
    if (_CORRECT_ELEM !== null) {
        _CORRECT_ELEM.classList.remove('flag-correct');
        _CORRECT_ELEM.classList.remove('flag-incorrect');
        _CORRECT_ELEM = null;
    }
}

export function populateAudio(): void {
    cancelAutoAdvance();
    loadChallengeSessionFromProfile();
    applyChallengeChordPool();

    selectNewColor();
    stopCurrentAudio();
    stopChallengeTimer();

    const profileInstrument = (getCurrentProfile().current_instrument || 'piano_1') as ChallengeInstrument;
    _ROUND_INSTRUMENT = profileInstrument === 'random'
        ? 'random'
        : resolveInstrument(profileInstrument);
    _USES_CHALLENGE_SYNTH = _ROUND_INSTRUMENT !== 'piano_1';
    _CURRENT_AUDIO = null;
    beginChallengeRound();
    _AUDIO_PLAYED = false;
}

export function playAudio(): void {
    const playButton = document.getElementById('play-button');
    if (playButton && playButton.classList.contains('deactivated')) return;
    if (!canPlay(_PLAY_LIMIT, Date.now())) return;

    if (_CHALLENGE_SESSION.phase === 'level_up_pause') return;
    const config = getLevelConfig(_CHALLENGE_SESSION.levelIndex);
    if (!canReplay(_CHALLENGE_SESSION, config)) return;

    dismissOnboardingStep('play');
    recordReplay(_CHALLENGE_SESSION);
    updateChallengeHud(_CHALLENGE_SESSION);
    setPlayButtonReplayState(canReplay(_CHALLENGE_SESSION, config));

    // Allow flag taps as soon as the chord starts (not after full playback).
    _AUDIO_PLAYED = true;

    const onDone = onAudioEnded;
    if (_USES_CHALLENGE_SYNTH) {
        void playChallengeChord(_CORRECT_COLOR!, _ROUND_INSTRUMENT, onDone);
        setPlayedAfter(1500);
    } else {
        void playChallengeChord(_CORRECT_COLOR!, 'piano_1', onDone);
        setPlayedAfter(1400);
    }
}

export function selectFlag(elem: HTMLElement): void {
    if (_SELECTED_ELEM !== null) return;
    if (!_AUDIO_PLAYED) return;
    if (!canPlay(_PLAY_LIMIT, Date.now())) return;
    if (_CHALLENGE_SESSION.phase === 'level_up_pause') return;
    if (_CHALLENGE_SESSION.phase !== 'playing') return;

    const chosenColor = elem.parentElement!.dataset.color!;
    const flagHolder = document.getElementById('flag-holder')!;

    _EMOJI_LOCK = true;
    updateStartTimeIfNeeded();
    updateStats(_CORRECT_COLOR!, chosenColor);
    updateStatsDisplay();

    const isCorrect = chosenColor === _CORRECT_COLOR;

    if (isCorrect) {
        const config = getLevelConfig(_CHALLENGE_SESSION.levelIndex);
        const result = applyCorrectAnswer(_CHALLENGE_SESSION, config, chosenColor);
        persistChallengeSession();
        updateChallengeHud(_CHALLENGE_SESSION);
        showPointsEarnedToast(result.pointsEarned);
        if (result.leveledUp) {
            applyChallengeChordPool();
            showLevelUpOverlay(result.newLevelIndex);
        }
    } else {
        _CHALLENGE_SESSION.phase = 'answered';
        _CHALLENGE_SESSION.deadlineMs = null;
    }
    stopChallengeTimer();
    updateChallengeTimerDisplay(0);
    setPlayButtonReplayState(false);

    if (isCorrect) {
        elem.classList.add('flag-correct');
        setCatEmoji(6);
    } else {
        elem.classList.add('flag-incorrect');
        _CORRECT_ELEM = flagHolder.querySelector(`div[data-color="${_CORRECT_COLOR}"]>div.flag`)!;
        if (_CORRECT_ELEM) _CORRECT_ELEM.classList.add('flag-correct');
        setCatEmoji(5);
    }
    _SELECTED_ELEM = elem;
    showOnboardingGoNextPrompt(isCorrect);

    if (getCurrentProfile().persist_reaction_face &&
        getCurrentProfile().stats.identifications < getCurrentTargetNumber()) {
        _PERSIST_REACTION_FACE_ENABLED = true;
    } else {
        setTimeout(() => {
            _EMOJI_LOCK = false;
            resetCatEmoji();
        }, 1500);
    }

    if (_CHORDS_ON && getCurrentProfile().reveal_chord_mode === 'after_guess') {
        document.getElementById('flag-holder')!.classList.add('chord-notes');
    }

    if (_CHALLENGE_SESSION.phase !== 'level_up_pause') {
        scheduleAutoAdvance();
    }
}

export function nextAudio(): void {
    const nextButton = document.getElementById('next-chord');
    if (!nextButton || nextButton.classList.contains('deactivated')) return;
    advanceToNextRound();
}

/**
 * Dismisses the level-up celebration and starts the next challenge round.
 */
export function dismissLevelUpCelebration(): void {
    dismissLevelUpOverlay();
    clearLevelUpPause(_CHALLENGE_SESSION);
    persistChallengeSession();
    applyChallengeChordPool();
    advanceToNextRound();
}

export function resetStats(done = true): void {
    cancelAutoAdvance();
    getCurrentProfile().stats.done = done;
    if (!done || getCurrentProfile().stats.identifications > 0) {
        saveSessionHistory();
    }
    if (_PERSIST_REACTION_FACE_ENABLED && done) {
        resetCatEmoji();
        _PERSIST_REACTION_FACE_ENABLED = false;
        _EMOJI_LOCK = false;
    }
    getCurrentProfile().stats = newStats();

    _CHALLENGE_SESSION = createChallengeSession();
    getCurrentProfile().challenge_level_index = 0;
    getCurrentProfile().challenge_points = 0;
    getCurrentProfile().challenge_focus_correct = 0;
    persistChallengeSession();
    applyChallengeChordPool();

    saveState();
    updateStatsDisplay();
    if (!syncPlayLimit()) return;
    populateAudio();
    playAudio();
}

export function changeSelector(to?: string): void {
    if (to === undefined) return;
    initChallengeMode();
}

export function onTrainerOpen(): void {
    if (!_TRAINER_PRELOADED) {
        for (const color of Object.keys(CHORDS_TONE)) {
            preloadAudio(color, onAudioEnded);
        }
        _TRAINER_PRELOADED = true;
    }
}

export function playChord(color: string): void {
    playChordFiles(color, onAudioEnded);
}

export function getEmojiLock(): boolean {
    return _EMOJI_LOCK;
}

/** Boots the challenge game: flags, HUD, first chord auto-plays when allowed. */
export function initChallengeMode(): void {
    loadChallengeSessionFromProfile();
    loadPlayLimitFromProfile();
    initGameHud();

    const currentProfile = getCurrentProfile();
    applyChallengeChordPool();
    _CHORDS_ON = (currentProfile.show_chord_mode === 'always'
        || (isBlackLevel() && currentProfile.show_chord_mode === 'black_only'));

    for (const color of getSelectedColors()) {
        preloadAudio(color, onAudioEnded);
    }

    updateChallengeHud(_CHALLENGE_SESSION);
    const allowed = syncPlayLimit();
    startPlayLimitTimer();
    if (!allowed) return;

    populateAudio();
    playAudio();
}

export { stopCurrentAudio };
