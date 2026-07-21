# P0-A Audit — Current animation data shapes across layers

Date: 2026-07-21 KST
Phase: P0-A (Animation Contract and Golden Fixtures)
Purpose: Confirm D-002 ("필드명과 손 표기가 달라 런타임 cast로 오류가 숨겨진다") concretely, as the evidence base for the canonical schema.

## Method

Read every layer that produces or consumes animation JSON:
- `omr-service/omr/converter.py` (`convert` / `_extract_notes` / `_parse_note_element`) — real OMR output
- `src/services/pdfParser.ts` (`PianoAnimationData` / `PianoNote`) — demo path output + type source
- `src/types/animation.ts` (`PianoAnimationData` / `PianoNote`) — duplicate TS type
- `src/types/fallingNotes.ts` (`FallingNote`) — player runtime input
- `src/services/musicDataConverter.ts` (`MusicData`) — "sample-data" import format
- `src/utils/dataConverter.ts` (`convertToFallingNotes`) — glue
- `src/app/sheet/[id]/page.tsx` + `src/components/animation/FallingNotesPlayer.tsx` — the player boundary

## Finding: four divergent note shapes

| Field | Shape A: `PianoNote` (`types/animation.ts`, `pdfParser.ts`) | Shape B: `FallingNote` (`types/fallingNotes.ts`) | Shape C: `converter.py` output (real OMR) | Shape D: `MusicData` (`musicDataConverter.ts`, sample-data) |
|---|---|---|---|---|
| pitch | `note: "C4"` (string) | `midi: 60` (number) | `midi: 60` | `midi: 60` |
| onset | `startTime` | `start` | `start` | `start` |
| duration | `duration` | `duration` | `duration` | `duration` |
| hand | `hand?: "left" \| "right"` | `hand?: "L" \| "R"` | `hand: "R" \| "L"` | `hand: "L" \| "R"` |
| velocity | `velocity` (required) | `velocity?` (optional) | *(absent)* | `velocity?` |
| finger | `finger?: number` (any) | `finger?: 1..5` | `finger: int \| null` (1..5) | *(absent)* |
| voice | *(absent)* | *(absent)* | *(absent)* | *(absent)* |
| staff | *(absent)* | *(absent)* | *(absent)* | *(absent)* |

Top-level also disagrees: Shape A/D wrap `{ version, title, composer, duration, tempo, timeSignature, notes, metadata }`; Shape C emits `{ metadata:{title,composer}, notes, duration, tempo, keySignature, timeSignature, generated_at }` (no `version`, adds `generated_at`/`keySignature`).

## Finding: the player boundary casts without validating, and only understands Shape A

- `src/app/sheet/[id]/page.tsx:100` — `JSON.parse(responseText) as PianoAnimationData`. A raw cast, no runtime validation. This is exactly the D-002 hazard.
- `FallingNotesPlayer` (`animationData: PianoAnimationData`) calls `convertToFallingNotes(animationData)` (`src/utils/dataConverter.ts`), which reads `note.note` (string), `note.startTime`, and `note.hand === "left"/"right"` to build Shape B.

Consequence: the rendering pipeline assumes **Shape A**. But the real OMR path (`/api/omr/upload` → `converter.py`) stores **Shape C** (`midi`/`start`/`R`/`L`, no `note`/`startTime`). Feeding Shape C to `convertToFallingNotes`:
- `note.note` is `undefined` → `noteToMidi(undefined)` warns and returns the default `60` → **every note becomes middle C**.
- `note.startTime` is `undefined` → `start: undefined` → broken timing.

So a sheet whose stored JSON came from real OMR would not render correctly through the current player. The two upload paths (`/api/upload` demo → Shape A; `/api/omr/upload` real → Shape C) produce structurally incompatible stored JSON, and only one is understood downstream. This is the concrete failure D-002 predicted.

## Implication for the canonical contract (P0-A)

The MIDI-based family (Shapes B/C/D: `midi`, `start`, `hand: "L"|"R"`) is the natural canonical target — three of four layers, including the real OMR converter and the player's own runtime type, already use it. Shape A (`note:"C4"`, `startTime`, `hand:"left"|"right"`) is the outlier, kept alive only by the demo `pdfParser.ts` and the lossy `convertToFallingNotes` string round-trip.

Design directions this audit supports (to be specified in the phase doc / schema task, not decided here):
1. Canonical note = `{ midi, start, duration, hand: "L"|"R", velocity?, finger?: 1..5, voice?, staff? }` with a top-level `version`.
2. `voice` and `staff` are currently absent everywhere — they must be **added** (P0-A in-scope) so P0-B can populate them and hand assignment stops depending on the `part_idx==0 ? R : L` heuristic in `converter.py`.
3. A runtime validator replaces the `as PianoAnimationData` cast at `sheet/[id]/page.tsx`.
4. A compatibility policy is needed for already-stored Shape A JSON (string pitch / `startTime` / `left|right`) so existing sheets keep rendering.

## Related

- D-002 (single versioned contract), D-001 (demo vs real), D-007 (scheduler reads only `start`/`duration`/`midi`/`velocity`, so it survives this unification)
- Issue #20 (`pdfParser.ts` demo stub — its Shape A duplication is part of the cleanup), Issue #22 (server container)
- Phase: `docs/recovery/phases/P0-A-animation-contract.md`
