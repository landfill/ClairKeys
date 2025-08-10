/**
 * Type definitions for Falling Notes (MVP-style) piano visualization
 */

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
  hand?: "L" | "R";
  /** Note velocity (0-1) */
  velocity?: number;
};

/**
 * Piano key layout information for 88-key keyboard
 */
export type KeyLayout = {
  /** Map of MIDI numbers to their visual positions */
  byMidi: Map<number, KeyPosition>;
  /** Total width of the keyboard */
  totalWidth: number;
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