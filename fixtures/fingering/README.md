# Fingering regression corpus

Real canonical animation documents, kept so that fingering inference is measured against
music rather than against hand-built scales.

## Why these are in the repository

D-040 records the retention policy: **the original PDF is the only forbidden artefact**, because
it is what carries the direct copyright exposure. Everything from the MusicXML onward is allowed
where a need is shown. The need here is concrete — before this corpus existed, every finding
about the inferrer had to be re-derived by hand from a remote URL each session, and none of it
was pinned by anything the CI could run.

No PDF is stored, and none is needed: fingering is computed at playback time from the canonical
document, so these files exercise the whole path that ships.

## Files

| File | Notes | Key | Metre | Source `finger` | Provenance |
|---|---|---|---|---|---|
| `love-affair-411.json` | 411 | E | 4/4, ♩=60 | none | Production Supabase object `804629/omr_14d84a04-312b-40fc-bdc2-8145d1f0bbb6.json`, stored byte-for-byte |

`love-affair-411.json` is the score issue [#120](https://github.com/landfill/ClairKeys/issues/120)
measured and issue [#130](https://github.com/landfill/ClairKeys/issues/130) diagnoses. It is
useful precisely because it is ordinary: a two-hand piano texture with a wide left-hand arpeggio
that crosses above the right hand's lowest note, chords in both hands, and not one source
fingering — which is the product's normal input, not an edge case.

sha256 `97ff181dda5ee4835afb030e7bcaac0fc81f8b2068725d8d6e4ca5e2f5bcb8b7`

## Adding a score

Store the canonical JSON verbatim — do not reformat it, so the file keeps its provenance as the
exact bytes the service produced. Record its hash and what makes it worth keeping. A score that
duplicates an existing one's texture buys nothing; a score that exercises a shape none of the
others do is what this directory is for.
