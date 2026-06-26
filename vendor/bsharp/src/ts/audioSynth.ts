/**
 * Runtime chord synthesis for challenge mode instruments (Tone.js).
 * Piano continues to use pre-generated MP3s; guitar, ukulele, and Hammond are synthesized.
 */
import * as Tone from 'tone';
import { CHORDS_TONE } from './data';
import type { ChallengeInstrument } from './challenge';

const CHORD_DURATION_SEC = 1.75;

let audioStarted = false;
let currentSynth: Tone.PolySynth | Tone.PluckSynth | null = null;
let currentTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Ensures the Web Audio context is running (requires user gesture).
 */
async function ensureAudioStarted(): Promise<void> {
    if (!audioStarted) {
        await Tone.start();
        audioStarted = true;
    }
}

function stopCurrentSynth(): void {
    if (currentTimeout !== null) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
    }
    if (currentSynth !== null) {
        currentSynth.dispose();
        currentSynth = null;
    }
}

/**
 * Builds a wonky Hammond-style chain: drawbar-ish poly synth + chorus + vibrato.
 */
function createHammondSynth(): Tone.PolySynth {
    const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.85, release: 1.2 },
    });
    const chorus = new Tone.Chorus({
        frequency: 0.8,
        delayTime: 3.5,
        depth: 0.7,
        spread: 120,
    }).start();
    const vibrato = new Tone.Vibrato({ frequency: 5, depth: 0.08 });
    const filter = new Tone.Filter({ frequency: 2200, type: 'lowpass' });
    synth.chain(filter, vibrato, chorus, Tone.Destination);
    synth.volume.value = -6;
    return synth;
}

function createGuitarSynth(): Tone.PluckSynth {
    const synth = new Tone.PluckSynth({
        attackNoise: 1.2,
        dampening: 2800,
        resonance: 0.92,
    });
    synth.volume.value = -4;
    synth.toDestination();
    return synth;
}

function createUkuleleSynth(): Tone.PluckSynth {
    const synth = new Tone.PluckSynth({
        attackNoise: 1.5,
        dampening: 4200,
        resonance: 0.88,
    });
    synth.volume.value = -2;
    synth.toDestination();
    return synth;
}

/**
 * Plays a chord color with the given synthesized instrument.
 * @param color - Chord color key (e.g. "red")
 * @param instrument - guitar, ukulele, or hammond
 * @param onEnded - Called when playback finishes
 */
export async function playChordSynth(
    color: string,
    instrument: Exclude<ChallengeInstrument, 'piano_1' | 'random'>,
    onEnded: () => void,
): Promise<void> {
    const notes = CHORDS_TONE[color];
    if (!notes) {
        onEnded();
        return;
    }

    await ensureAudioStarted();
    stopCurrentSynth();

    if (instrument === 'hammond') {
        const synth = createHammondSynth();
        currentSynth = synth;
        synth.triggerAttackRelease(notes, CHORD_DURATION_SEC);
    } else {
        const synth = instrument === 'ukulele' ? createUkuleleSynth() : createGuitarSynth();
        currentSynth = synth;
        const pitchNotes = instrument === 'ukulele'
            ? notes.map((n) => Tone.Frequency(n).transpose(12).toNote())
            : notes;
        for (const note of pitchNotes) {
            synth.triggerAttack(note, Tone.now(), CHORD_DURATION_SEC);
        }
    }

    currentTimeout = setTimeout(() => {
        stopCurrentSynth();
        onEnded();
    }, CHORD_DURATION_SEC * 1000 + 100);
}

/**
 * Stops any in-progress synthesized chord.
 */
export function stopSynthAudio(): void {
    stopCurrentSynth();
}

/**
 * Whether this instrument uses MP3 files instead of synthesis.
 * @param instrument - Resolved instrument id
 */
export function usesMp3Playback(instrument: ChallengeInstrument): boolean {
    return instrument === 'piano_1';
}
