# Golden fixtures — canonical animation contract (P0-A)

Each subdirectory is one golden fixture: an input `input.musicxml` and the
hand-authored `expected.json` (canonical animation contract,
`src/types/animationContract.ts`).

`expected.json` encodes the **musically correct** interpretation, not what the
current `omr-service/omr/converter.py` produces — that converter's timing
(`duration / 4.0`, no `divisions` handling) and hand/voice/staff extraction are
exactly what P0-B must fix and will be measured against this corpus with
`src/utils/animationCompare.ts`.

## Timing convention

To keep expected onsets/durations exact, fixtures use **tempo = 60 BPM** with a
**quarter-note beat**, so one quarter note = **1.0 second**. Seconds are derived
as:

```
seconds = (duration_in_divisions / divisions) * (60 / tempo_bpm)
        = (duration_in_divisions / divisions)          // at 60 BPM
```

`divisions` is stated per fixture in its MusicXML `<attributes>`. A dotted
quarter = 1.5s, an eighth = 0.5s, a triplet eighth (three in one beat) = 1/3s.

## Hand / staff / voice convention

- `staff` 1 = treble (right hand), `staff` 2 = bass (left hand).
- `hand` is derived from staff for grand-staff fixtures: staff 1 → `R`, staff 2 → `L`.
- `voice` is the MusicXML `<voice>` number, 1-based, used for multi-voice-per-staff.

## Fixtures

| Dir | Case | Exercises |
|---|---|---|
| `01-monophonic` | 단선율 | single melodic line, quarter notes |
| `02-chord` | 동시 코드 | simultaneous notes via `<chord>` (same onset) |
| `03-rests-ties` | 쉼표와 붙임줄 | `<rest>` advances time; `<tie>` merges durations |
| `04-grand-staff` | 양손 grand staff | two staves → hand L/R |
| `05-multivoice` | 한 staff 내 다성부 | `<backup>` + `<voice>` overlapping in one staff |
| `06-triplet-dotted` | 셋잇단음표·점음표 | `<time-modification>` triplet, dotted duration |
| `07-tempo-change` | 템포/박자표 변경 | mid-piece tempo change re-scales seconds |

## Comparison

```ts
import { compareAnimationData } from '@/utils/animationCompare'
// compareAnimationData(actualFromConverter, expectedJson, { onsetSec, durationSec })
```

Default tolerance is 10 ms on onset and duration (`DEFAULT_TOLERANCE`). Pitch,
hand, voice, and staff are matched exactly.
