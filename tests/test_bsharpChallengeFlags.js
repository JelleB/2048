/**
 * @vitest-environment happy-dom
 *
 * Regression: challenge boot skips changeSelector, so populateFlags must still run
 * when current_chord already matches the tier.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CHORDS_TONE } from '../vendor/bsharp/src/ts/data.ts';
import { getChallengeFlagColors } from '../vendor/bsharp/src/ts/challenge.ts';
import { populateFlags } from '../vendor/bsharp/src/ts/ui.ts';
import { loadState, getCurrentProfile, STATE } from '../vendor/bsharp/src/ts/state.ts';

const ALL_COLORS = Object.keys(CHORDS_TONE);

/** Minimal DOM shell matching BSharp flag markup. */
function setupFlagDom() {
  document.body.innerHTML = `
    <select id="chord-selector"></select>
    <div id="flag-holder"></div>
  `;
  const holder = document.getElementById('flag-holder');
  for (const color of ALL_COLORS) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flag-wrapper';
    wrapper.id = `${color}-flag`;
    wrapper.dataset.color = color;
    holder.appendChild(wrapper);
  }
}

function flagIsVisible(color) {
  return document.getElementById(`${color}-flag`).classList.contains('visible');
}

/** Mirrors applyChallengeChordPool flag sync (without audio/timer side effects). */
function syncChallengeFlags(levelIndex) {
  const colors = getChallengeFlagColors(levelIndex);
  const chordName = colors[colors.length - 1];
  STATE.current_chord = chordName;
  getCurrentProfile().current_chord = chordName;
  populateFlags(() => colors, () => false);
}

describe('getChallengeFlagColors', () => {
  it('level 0 exposes red and yellow only', () => {
    expect(getChallengeFlagColors(0)).toEqual(['red', 'yellow']);
  });
});

describe('challenge mode flag visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    setupFlagDom();
    loadState();
  });

  it('flags stay hidden until populateFlags runs', () => {
    expect(flagIsVisible('red')).toBe(false);
    expect(flagIsVisible('yellow')).toBe(false);
  });

  it('syncChallengeFlags shows tier flags even when current_chord already matches', () => {
    const profile = getCurrentProfile();
    profile.challenge_mode = true;
    profile.challenge_level_index = 0;
    profile.current_chord = 'yellow';
    STATE.current_chord = 'yellow';

    expect(flagIsVisible('red')).toBe(false);

    syncChallengeFlags(0);

    expect(flagIsVisible('red')).toBe(true);
    expect(flagIsVisible('yellow')).toBe(true);
    expect(flagIsVisible('blue')).toBe(false);
  });
});
