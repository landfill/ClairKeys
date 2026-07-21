/**
 * Runtime validation and normalization for the canonical animation contract
 * (`src/types/animationContract.ts`, P0-A).
 *
 * This is the single entry point that replaces the unchecked
 * `JSON.parse(...) as PianoAnimationData` cast at the player boundary
 * (`sheet/[id]/page.tsx`). It accepts:
 * - canonical / MIDI-family JSON (`midi`, `start`, `hand:"L"|"R"`)
 * - legacy Shape A JSON (`note:"C4"`, `startTime`, `hand:"left"|"right"`)
 * - `converter.py`-style JSON (top-level fields partly under `metadata`)
 *
 * and returns a `CanonicalAnimationData`, or throws `AnimationContractError` with
 * a specific reason. Unlike the old `convertToFallingNotes`, an unparseable pitch
 * is a hard error — it never silently collapses to middle C.
 */

import {
  ANIMATION_CONTRACT_VERSION,
  MIDI_MIN,
  MIDI_MAX,
  type CanonicalAnimationData,
  type CanonicalNote,
  type CanonicalHand,
  type CanonicalFinger,
} from '@/types/animationContract'

/** Thrown when input cannot be normalized into the canonical contract. */
export class AnimationContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnimationContractError'
  }
}

const SEMITONE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/**
 * Strictly parse a scientific-pitch name (e.g. "C4", "F#5", "Bb3") to MIDI.
 * Returns `null` when the name is malformed — the caller decides whether that is
 * fatal. Deliberately not lenient: no default-to-60 fallback.
 */
export function parsePitchToMidi(name: string): number | null {
  const match = /^([A-G])(#|b)?(-?\d+)$/.exec(name.trim())
  if (!match) return null

  const [, letter, accidental, octaveStr] = match
  const base = SEMITONE[letter]
  if (base === undefined) return null

  const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  const octave = Number.parseInt(octaveStr, 10)
  // MIDI: C4 = 60, so (octave + 1) * 12 + semitone.
  const midi = (octave + 1) * 12 + base + alter

  return Number.isFinite(midi) ? midi : null
}

function normalizeHand(raw: unknown): CanonicalHand | undefined {
  if (raw === 'L' || raw === 'R') return raw
  if (raw === 'left') return 'L'
  if (raw === 'right') return 'R'
  return undefined
}

function normalizeFinger(raw: unknown): CanonicalFinger | undefined {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
  if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5) {
    return n as CanonicalFinger
  }
  return undefined
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function requireFiniteNumber(value: unknown, field: string, noteIndex: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AnimationContractError(
      `note[${noteIndex}].${field} must be a finite number, got ${JSON.stringify(value)}`
    )
  }
  return value
}

/**
 * Normalize a single raw note (any supported shape) to a `CanonicalNote`.
 * Throws on a missing/unparseable pitch, a MIDI number out of the 21–108 piano
 * range, or a non-finite start/duration.
 */
function normalizeNote(raw: unknown, index: number): CanonicalNote {
  if (!isObject(raw)) {
    throw new AnimationContractError(`note[${index}] must be an object, got ${JSON.stringify(raw)}`)
  }

  // Pitch: prefer canonical `midi`, else parse a legacy `note` string.
  let midi: number
  if (typeof raw.midi === 'number') {
    midi = raw.midi
  } else if (typeof raw.note === 'string') {
    const parsed = parsePitchToMidi(raw.note)
    if (parsed === null) {
      throw new AnimationContractError(`note[${index}].note is not a valid pitch: ${JSON.stringify(raw.note)}`)
    }
    midi = parsed
  } else {
    throw new AnimationContractError(`note[${index}] has no usable pitch (need \`midi\` number or \`note\` string)`)
  }

  if (!Number.isInteger(midi) || midi < MIDI_MIN || midi > MIDI_MAX) {
    throw new AnimationContractError(
      `note[${index}] MIDI ${midi} is outside the piano range ${MIDI_MIN}–${MIDI_MAX}`
    )
  }

  // Onset: prefer canonical `start`, else legacy `startTime`.
  const startRaw = raw.start ?? raw.startTime
  const start = requireFiniteNumber(startRaw, 'start', index)
  const duration = requireFiniteNumber(raw.duration, 'duration', index)
  if (start < 0) throw new AnimationContractError(`note[${index}].start must be >= 0, got ${start}`)
  if (duration < 0) throw new AnimationContractError(`note[${index}].duration must be >= 0, got ${duration}`)

  const note: CanonicalNote = { midi, start, duration }

  const hand = normalizeHand(raw.hand)
  if (hand) note.hand = hand
  if (typeof raw.velocity === 'number' && Number.isFinite(raw.velocity)) note.velocity = raw.velocity
  const finger = normalizeFinger(raw.finger)
  if (finger) note.finger = finger
  if (typeof raw.voice === 'number' && Number.isInteger(raw.voice)) note.voice = raw.voice
  if (typeof raw.staff === 'number' && Number.isInteger(raw.staff)) note.staff = raw.staff

  return note
}

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c
  }
  return undefined
}

/**
 * Validate and normalize arbitrary parsed JSON into `CanonicalAnimationData`.
 * Accepts canonical, legacy Shape A, and `converter.py`-style documents; throws
 * `AnimationContractError` with a specific reason when it cannot.
 */
export function normalizeAnimationData(raw: unknown): CanonicalAnimationData {
  if (!isObject(raw)) {
    throw new AnimationContractError(`animation data must be an object, got ${JSON.stringify(raw)}`)
  }

  if (!Array.isArray(raw.notes)) {
    throw new AnimationContractError('animation data is missing a `notes` array')
  }

  const notes = raw.notes.map((n, i) => normalizeNote(n, i))

  // Shape C keeps title/composer/keySignature under `metadata`; fall back to it.
  const meta = isObject(raw.metadata) ? raw.metadata : {}

  const title = pickString(raw.title, meta.title) ?? 'Untitled'
  const composer = pickString(raw.composer, meta.composer) ?? 'Unknown'
  const timeSignature = pickString(raw.timeSignature) ?? '4/4'
  const keySignature = pickString(raw.keySignature, meta.keySignature)

  const duration =
    typeof raw.duration === 'number' && Number.isFinite(raw.duration)
      ? raw.duration
      : notes.reduce((max, n) => Math.max(max, n.start + n.duration), 0)

  const tempo = typeof raw.tempo === 'number' && Number.isFinite(raw.tempo) ? raw.tempo : 120

  const result: CanonicalAnimationData = {
    version: pickString(raw.version) ?? ANIMATION_CONTRACT_VERSION,
    title,
    composer,
    duration,
    tempo,
    timeSignature,
    notes,
  }
  if (keySignature) result.keySignature = keySignature
  if (isObject(raw.metadata)) result.metadata = raw.metadata as CanonicalAnimationData['metadata']

  return result
}

/**
 * Type guard form: returns true when `raw` normalizes cleanly. Prefer
 * `normalizeAnimationData` directly when you want the normalized value or the
 * specific error message.
 */
export function isValidAnimationData(raw: unknown): boolean {
  try {
    normalizeAnimationData(raw)
    return true
  } catch {
    return false
  }
}
