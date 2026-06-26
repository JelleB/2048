import { AudioFileInfo, NoteAudioFileInfo } from './types';
import { AUDIO_FILE_LIST, NOTE_AUDIO_FILE_LIST, getNoteFilePrefix } from './data';
import { randomElem } from './utils';
import { resolveInstrument, type ChallengeInstrument } from './challenge';
import { playChordSynth, stopSynthAudio, usesMp3Playback } from './audioSynth';

let AUDIO_FILES: Map<string, AudioFileInfo[]> | null = null;

export function getAudioFiles(): Map<string, AudioFileInfo[]> {
    if (AUDIO_FILES === null) {
        AUDIO_FILES = new Map();

        for (const file of AUDIO_FILE_LIST) {
            const [base] = file.split('.');
            const parts = base.split('_');
            const chord = parts[0];
            const color = parts[1];
            const ext = file.split('.').pop()!;

            const audioFile: AudioFileInfo = {
                filename: file,
                color,
                chord,
                ext,
                elem: null,
            };

            if (!AUDIO_FILES.has(color)) {
                AUDIO_FILES.set(color, []);
            }
            AUDIO_FILES.get(color)!.push(audioFile);
        }
    }
    return AUDIO_FILES;
}

export function audioFileElem(audioFile: AudioFileInfo, onEnded: () => void): HTMLAudioElement {
    if (audioFile.elem === null) {
        audioFile.elem = document.createElement('audio');
        audioFile.elem.classList.add('chord');
        audioFile.elem.controls = true;
        audioFile.elem.preload = 'auto';
        audioFile.elem.src = 'static/chords/' + audioFile.filename;
        audioFile.elem.onended = onEnded;
        audioFile.elem.load();
    }
    return audioFile.elem;
}

let _currentTrainerAudio: HTMLAudioElement | null = null;

export function playChordFiles(color: string, onEnded: () => void): void {
    const audioFiles = getAudioFiles();
    const files = audioFiles.get(color);
    if (files) {
        if (_currentTrainerAudio) {
            _currentTrainerAudio.pause();
            _currentTrainerAudio.currentTime = 0;
        }
        const audioFile = randomElem(files);
        const elem = audioFileElem(audioFile, onEnded);
        _currentTrainerAudio = elem;
        elem.play();
    }
}

export function preloadAudio(color: string, onEnded: () => void): void {
    const audioFiles = getAudioFiles().get(color);
    if (audioFiles) {
        for (const audioFile of audioFiles) {
            audioFileElem(audioFile, onEnded);
        }
    }
}

// --- Single note audio ---

let NOTE_AUDIO_FILES: Map<string, NoteAudioFileInfo[]> | null = null;

export function getNoteAudioFiles(): Map<string, NoteAudioFileInfo[]> {
    if (NOTE_AUDIO_FILES === null) {
        NOTE_AUDIO_FILES = new Map();

        for (const file of NOTE_AUDIO_FILE_LIST) {
            const [base] = file.split('.');
            const parts = base.split('_');
            const notePrefix = parts[0];
            const ext = file.split('.').pop()!;

            const noteFile: NoteAudioFileInfo = {
                filename: file,
                notePrefix,
                ext,
                elem: null,
            };

            if (!NOTE_AUDIO_FILES.has(notePrefix)) {
                NOTE_AUDIO_FILES.set(notePrefix, []);
            }
            NOTE_AUDIO_FILES.get(notePrefix)!.push(noteFile);
        }
    }
    return NOTE_AUDIO_FILES;
}

export function noteAudioFileElem(noteFile: NoteAudioFileInfo, onEnded: () => void): HTMLAudioElement {
    if (noteFile.elem === null) {
        noteFile.elem = document.createElement('audio');
        noteFile.elem.classList.add('note');
        noteFile.elem.controls = true;
        noteFile.elem.src = 'static/notes/' + noteFile.filename;
        noteFile.elem.onended = onEnded;
    }
    return noteFile.elem;
}

export function playNoteFile(note: string, onEnded: () => void): void {
    const prefix = getNoteFilePrefix(note);
    const noteFiles = getNoteAudioFiles().get(prefix);
    if (noteFiles) {
        const noteFile = randomElem(noteFiles);
        noteAudioFileElem(noteFile, onEnded).play();
    }
}

let _currentChallengeAudio: HTMLAudioElement | null = null;

/**
 * Stops MP3 and synthesized challenge/trainer playback.
 */
export function stopCurrentAudio(): void {
    stopSynthAudio();
    if (_currentChallengeAudio) {
        _currentChallengeAudio.pause();
        _currentChallengeAudio.currentTime = 0;
        _currentChallengeAudio = null;
    }
    if (_currentTrainerAudio) {
        _currentTrainerAudio.pause();
        _currentTrainerAudio.currentTime = 0;
    }
}

/**
 * Plays a chord for challenge mode using MP3 or Tone.js synthesis.
 * @param color - Chord color key
 * @param instrument - Instrument id (may be "random")
 * @param onEnded - Called when playback ends
 */
export async function playChallengeChord(
    color: string,
    instrument: ChallengeInstrument,
    onEnded: () => void,
): Promise<void> {
    stopCurrentAudio();
    const resolved = resolveInstrument(instrument);
    if (usesMp3Playback(resolved)) {
        const audioFiles = getAudioFiles();
        const files = audioFiles.get(color);
        if (files) {
            const audioFile = randomElem(files);
            const elem = audioFileElem(audioFile, onEnded);
            _currentChallengeAudio = elem;
            elem.play();
        } else {
            onEnded();
        }
        return;
    }
    await playChordSynth(color, resolved, onEnded);
}
