export interface ChordDefinition {
    name: string;
    display: string;
    chord: string;
    notes: string[];
}

export interface AudioFileInfo {
    filename: string;
    color: string;
    chord: string;
    ext: string;
    elem: HTMLAudioElement | null;
}

export interface NoteAudioFileInfo {
    filename: string;
    notePrefix: string;
    ext: string;
    elem: HTMLAudioElement | null;
}

export interface Tally {
    correct: number;
    identifications: number;
    confusion_matrix: Record<string, Record<string, number>>;
}

export interface SessionStats {
    current_chord: string;
    start_time: number;
    updated_time: number;
    correct: number;
    identifications: number;
    confusion_matrix: Record<string, Record<string, number>>;
    notes: Tally;
    done: boolean;
}

export interface Profile {
    id: number;
    name: string;
    icon: string;
    target_number: number;
    show_chord_mode: string;
    reveal_chord_mode: string;
    chord_display_mode: string;
    single_note_mode: string;
    single_note_correctness_mode: string;
    persist_reaction_face: boolean;
    enable_onboarding_hints: boolean;
    color_scheme: string;
    chord_selection_mode: string;
    stats: SessionStats;
    current_chord: string;
    current_instrument: string;
    /** When true, timed challenge mode (points, timer, auto level-up) is active. */
    challenge_mode?: boolean;
    /** Zero-based challenge tier index. */
    challenge_level_index?: number;
    /** Points toward the current tier's advancement threshold. */
    challenge_points?: number;
    /** Correct identifications of the current tier focus chord. */
    challenge_focus_correct?: number;
    /** Local calendar day (`YYYY-MM-DD`) for play-limit counters. */
    play_limit_day?: string;
    /** Finished play sessions on `play_limit_day`. */
    play_limit_sessions_completed?: number;
    /** Wall-clock ms when the active play session started, if any. */
    play_limit_session_started_at?: number | null;
    /** Wall-clock ms when the mandatory break ends, if any. */
    play_limit_break_until?: number | null;
}

export interface AppState {
    profiles: Record<number, Profile>;
    current_chord: string;
    current_profile: number;
}

export interface NoteInfo {
    display: string;
    noteClass: string;
    absoluteClass: string;
    noteBase: string;
}
