/**
 * Type definitions for Falling Notes (MVP-style) piano visualization
 */

/**
 * Hand color constants for visual distinction
 */
export const HAND_COLORS = {
  L: '#3b82f6', // Blue for left hand
  R: '#ef4444', // Red for right hand
  DEFAULT: '#6b7280' // Gray for unassigned notes
} as const;

/**
 * Hand type definition
 */
export type Hand = "L" | "R";

/**
 * Finger number type definition
 */
export type Finger = 1 | 2 | 3 | 4 | 5;

/** Whether a player-bound finger came from the score or ClairKeys inference. */
export type FingerSource = "source" | "inferred";

/**
 * Represents a musical note for falling notes visualization
 */
export type FallingNote = {
  /** MIDI note number (21-108, representing A0-C8) */
  midi: number;
  /** Start time in seconds */
  start: number;
  /** Duration in seconds */
  duration: number;
  /** Hand assignment for piano playing */
  hand?: Hand;
  /** Finger number (1-5: thumb to pinky) */
  finger?: Finger;
  /** Provenance exists only at the player boundary; canonical score data stays untouched. */
  fingerSource?: FingerSource;
  /** Version of the deterministic inference, present only when fingerSource is inferred. */
  fingeringAlgorithm?: string;
  /** Note velocity (0-1) */
  velocity?: number;
};

/**
 * Amplitude envelope for one synthesised note, in seconds relative to its start.
 * Produced by `envelopeBreakpoints` in `@/utils/pianoTimbre` and consumed by the
 * playback hook when scheduling gain events.
 */
export interface NoteEnvelope {
  /** Peak amplitude reached at the end of the attack. */
  peak: number;
  /** Amplitude the note has fallen to by the end of the decay. */
  sustain: number;
  attackSec: number;
  decaySec: number;
  releaseSec: number;
}

/**
 * Measured level of one built piano sample, as linear amplitudes.
 *
 * The counterpart to `NoteEnvelope` on the recorded path: where a synthesised
 * note's level is computed, a sample's is whatever the recording happens to be,
 * so it has to be measured. Values live in `@/utils/pianoSampleLevels` and the
 * playback gain is derived from them.
 */
export interface SampleLevel {
  /** Largest absolute sample value in the file. */
  peak: number;
  /** RMS over the module's loudness window, taken from the file's start. */
  rms: number;
}

/**
 * Peak level a real mixdown reaches on one playback path, before the master gain.
 *
 * Measured rather than modelled. Summing voices arithmetically assumes each one
 * peaks at the same instant in matching phase, which different pitches struck by
 * different fingers do not do; values here come from rendering real audio.
 * Populated in `@/utils/pianoSampleLevels` for both the recorded and the
 * synthesised path.
 */
export interface MixdownPeaks {
  /** One note alone. */
  single: number;
  /** Eight voices struck together — a dense fortissimo chord. */
  denseChord: number;
  /** Twelve voices accumulating under the pedal, onsets staggered. */
  pedalled: number;
  /** Twelve struck at the same instant. Beyond ten fingers; a bound, not a texture. */
  twelveSimultaneous: number;
  /** Sixteen at the same instant. Unreachable in performance; the outer bound. */
  sixteenSimultaneous: number;
}

/**
 * Piano key layout information for 88-key keyboard
 */
export type KeyLayout = {
  /** Map of MIDI numbers to their visual positions */
  byMidi: Map<number, KeyPosition>;
  /** Total width of the keyboard */
  totalWidth: number;
  /** White-key width the layout settled on; the keyboard's proportions follow it */
  keyWidth: number;
};

/**
 * Position and appearance information for a piano key
 */
export type KeyPosition = {
  /** X position in pixels */
  x: number;
  /** Width in pixels */
  w: number;
  /** Whether this is a black key */
  black: boolean;
};

/**
 * Visual representation of a falling note
 */
export type VisualNote = {
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Height in pixels */
  h: number;
  /** Width in pixels */
  w: number;
  /** Color for rendering */
  color: string;
  /** Z-index for layering */
  z: number;
  /** Finger number for educational display */
  finger?: Finger;
  /** Hand assignment for color coding */
  hand?: Hand;
};

/**
 * Props for FallingNotesPlayer component
 */
export interface FallingNotesPlayerProps {
  /** Array of notes to display and play */
  notes: FallingNote[];
  /** Current playback time in seconds */
  currentTime: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Playback speed multiplier */
  tempoScale: number;
  /** Mute audio output */
  mute: boolean;
  /** Look ahead time in seconds */
  lookAheadSec: number;
  /** Event handlers */
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
  onTempoChange?: (tempo: number) => void;
  onMuteChange?: (mute: boolean) => void;
  onLookAheadChange?: (seconds: number) => void;
  className?: string;
}

/**
 * Props for FallingNotes component
 */
export interface FallingNotesProps {
  /** Array of musical notes to display */
  notes: FallingNote[];
  /** Current playback time in seconds */
  nowSec: number;
  /** Pixels per second for time-to-space conversion */
  pxPerSec: number;
  /** Height of the falling notes area */
  height: number;
  /** Piano keyboard layout for positioning */
  layout: KeyLayout;
}

/**
 * Props for SimplePianoKeyboard component
 */
export interface SimplePianoKeyboardProps {
  /** Piano keyboard layout */
  layout: KeyLayout;
  /** Currently pressed/highlighted keys */
  activeKeys?: Set<number>;
  /** Additional CSS classes */
  className?: string;
}
