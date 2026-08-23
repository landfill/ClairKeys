/**
 * Canonical Animation Contract (P0-A)
 *
 * One versioned shape shared from the OMR converter output through storage to
 * the player. This replaces the four divergent shapes documented in
 * `docs/recovery/validation/2026-07-21-p0a-animation-shape-audit.md`:
 * - Shape A `PianoNote` (`note:"C4"`, `startTime`, `hand:"left"|"right"`)
 * - Shape B `FallingNote` (`midi`, `start`, `hand:"L"|"R"`)
 * - Shape C `converter.py` output (`midi`, `start`, `hand:"R"|"L"`)
 * - Shape D `MusicData` (`midi`, `start`, `hand:"L"|"R"`)
 *
 * The canonical shape is the MIDI family (per D-009): pitch is a MIDI number,
 * onset is `start` (seconds), hand is `"L"|"R"`. `voice` and `staff` are new
 * fields — absent from every current shape — added so P0-B can populate them and
 * hand assignment stops relying on the `part_idx == 0 ? R : L` heuristic.
 *
 * Legacy Shape A JSON already exists in storage; it is not part of this type but
 * is accepted and normalized to it by `normalizeAnimationData`
 * (`src/utils/animationContract.ts`), so existing sheets keep rendering.
 */

/** Current canonical contract version. Bump on any breaking field change. */
export const ANIMATION_CONTRACT_VERSION = '1.1'

/** Readable versions. Stored 1.0 documents remain supported by the compatibility reader. */
export const SUPPORTED_ANIMATION_CONTRACT_VERSIONS = ['1.0', '1.1'] as const

/** Where a known tempo came from; `unknown` also labels legacy values with lost provenance. */
export type TempoSource = 'score' | 'user' | 'unknown'

/** Explicit timing basis used only when a score has no known tempo. */
export const DEFAULT_TIMING_REFERENCE_BPM = 60

/**
 * The four facts a screen needs to say where a tempo came from.
 *
 * Kept as a type rather than passing `CanonicalAnimationData` around because the
 * presentation rule depends on exactly these fields, and a caller holding a
 * legacy document can supply them without first inventing the rest.
 */
export interface TempoDisplayInput {
  tempo: number | null
  tempoSource: TempoSource
  timingReferenceBpm: number
  scoreTempo?: number | null
}

/**
 * What to print. `secondary` is deliberately a separate string: the timing
 * reference and the score's own mark are context for the primary claim, and
 * setting them in the same line and weight is the defect D-013 removes.
 */
export interface TempoDisplay {
  primary: string
  secondary?: string
}

/** Lowest and highest MIDI numbers on an 88-key piano (A0–C8). */
export const MIDI_MIN = 21
export const MIDI_MAX = 108

/** Hand assignment in canonical notation. */
export type CanonicalHand = 'L' | 'R'

/** Finger number, thumb (1) to pinky (5). */
export type CanonicalFinger = 1 | 2 | 3 | 4 | 5

/**
 * A single note in the canonical contract.
 *
 * `midi`, `start`, and `duration` are required — they are the minimum a note
 * needs to be scheduled and drawn (and the only fields the audio scheduler reads,
 * per D-007). Everything else is optional so partial OMR output still validates.
 */
export interface CanonicalNote {
  /** MIDI note number, 21–108. */
  midi: number
  /** Onset in seconds from the start of the piece. */
  start: number
  /** Duration in seconds. */
  duration: number
  /** Hand assignment, if known. */
  hand?: CanonicalHand
  /** Note velocity, 0–1. */
  velocity?: number
  /** Finger number, 1–5. */
  finger?: CanonicalFinger
  /** 1-based voice within the staff (new in v1; absent in legacy shapes). */
  voice?: number
  /** 1-based staff index — typically 1 = treble/RH, 2 = bass/LH (new in v1). */
  staff?: number
}

/** Optional descriptive metadata; never required to render. */
export interface CanonicalAnimationMetadata {
  originalFileName?: string
  fileSize?: number
  processedAt?: string
  keySignature?: string
  pagesProcessed?: number
  notesDetected?: number
  [key: string]: unknown
}

/**
 * The full canonical animation document: a versioned envelope around the note
 * list plus the timing context needed to play it.
 */
export interface CanonicalAnimationData {
  /** Contract version, e.g. "1.1"; normalized stored documents may remain "1.0". */
  version: string
  title: string
  composer: string
  /** Total duration in seconds. */
  duration: number
  /** Known quarter-note BPM, or `null` rather than a fabricated playback value. */
  tempo: number | null
  /** Provenance that lets the UI distinguish score readings, user input, and unknown values. */
  tempoSource: TempoSource
  /** BPM actually used to bake note seconds, kept separate from claims about the score. */
  timingReferenceBpm: number
  /** Score-derived BPM retained when a user override wins, so the UI can show both values. */
  scoreTempo?: number | null
  /** Time signature, e.g. "4/4". */
  timeSignature: string
  /** Key signature, e.g. "C" or "G". */
  keySignature?: string
  notes: CanonicalNote[]
  metadata?: CanonicalAnimationMetadata
}
