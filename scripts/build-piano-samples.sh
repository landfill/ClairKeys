#!/usr/bin/env bash
#
# Rebuild public/samples/piano from the upstream Salamander Grand Piano set.
#
# The committed samples are derived, not original: this script records exactly
# how, so the set can be regenerated with different trade-offs (stereo instead of
# mono, longer tails, a different bitrate) without guessing what was done.
#
# Source: Salamander Grand Piano V3 by Alexander Holm, CC-BY 3.0, as converted to
# mp3 and hosted by the Tone.js project. See public/samples/piano/LICENSE.txt.
#
# Why the source cannot be used as-is: the upstream files are stereo and run up
# to 25 seconds each (422 seconds across the set). Decoded to float32 by
# `decodeAudioData` that is ~142 MB of browser memory, which is not acceptable on
# a phone. Trimming per register and folding to mono brings it to ~20 MB.
#
# Requires: curl, ffmpeg.

set -euo pipefail

BASE_URL="https://tonejs.github.io/audio/salamander"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/public/samples/piano"
MANIFEST_FILE="$ROOT_DIR/src/utils/pianoSampleManifest.json"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# Every deployed set is immutable for one year and cache-first in the service
# worker. Advance the query-string version only after all samples build, so a
# failed rebuild cannot point the app at an incomplete new set. SAMPLE_VERSION
# may be supplied for a deliberate jump; otherwise the numeric vN increments.
CURRENT_VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\(v[0-9][0-9]*\)".*/\1/p' "$MANIFEST_FILE")"
if [[ ! "$CURRENT_VERSION" =~ ^v[0-9]+$ ]]; then
  echo "Cannot read numeric sample version from $MANIFEST_FILE" >&2
  exit 1
fi
CURRENT_VERSION_NUMBER="${CURRENT_VERSION#v}"
SAMPLE_VERSION="${SAMPLE_VERSION:-v$((CURRENT_VERSION_NUMBER + 1))}"
if [[ ! "$SAMPLE_VERSION" =~ ^v[0-9]+$ ]] || (( ${SAMPLE_VERSION#v} <= CURRENT_VERSION_NUMBER )); then
  echo "SAMPLE_VERSION must be newer than $CURRENT_VERSION (got $SAMPLE_VERSION)" >&2
  exit 1
fi

# Channel layout. Mono halves decoded memory at the cost of the recording's
# stereo width; set to 2 to keep it.
CHANNELS="${CHANNELS:-1}"
BITRATE="${BITRATE:-80k}"

# Length of the fade applied at the trim point. Without it, cutting mid-decay
# leaves a step discontinuity that is audible as a click.
FADE_SEC=0.5

# Upstream note name, MIDI number, and seconds to keep.
#
# The kept length is per register because piano decay is: a bass string rings for
# many seconds, the top octave is gone in under two. A uniform trim would either
# truncate the bass audibly or waste memory on treble silence.
#
# 6.0s in the bass covers a whole note at quarter=40 with margin. Playback rate
# shifting shortens a sample by at most 5.7% (one semitone up, the widest shift
# possible at minor-third spacing), so 6.0s never plays back shorter than 5.67s.
SAMPLES="
A0 21 6.0
C1 24 6.0
Ds1 27 6.0
Fs1 30 6.0
A1 33 6.0
C2 36 6.0
Ds2 39 6.0
Fs2 42 6.0
A2 45 6.0
C3 48 4.0
Ds3 51 4.0
Fs3 54 4.0
A3 57 4.0
C4 60 4.0
Ds4 63 4.0
Fs4 66 4.0
A4 69 4.0
C5 72 4.0
Ds5 75 4.0
Fs5 78 4.0
A5 81 4.0
C6 84 2.0
Ds6 87 2.0
Fs6 90 2.0
A6 93 2.0
C7 96 2.0
Ds7 99 2.0
Fs7 102 2.0
A7 105 2.0
C8 108 2.0
"

mkdir -p "$OUT_DIR"

echo "$SAMPLES" | while read -r name midi keep; do
  [ -z "$name" ] && continue

  echo "  $name -> $midi.mp3 (${keep}s, ${CHANNELS}ch)"
  curl -sfL "$BASE_URL/$name.mp3" -o "$WORK_DIR/$name.mp3"

  # Files are named by MIDI number, not by note name: the playback code selects a
  # sample by MIDI distance, so a numeric name needs no note-spelling table and
  # cannot disagree with one.
  fade_start=$(awk "BEGIN { printf \"%.3f\", $keep - $FADE_SEC }")
  ffmpeg -nostdin -v error -y -i "$WORK_DIR/$name.mp3" \
    -t "$keep" \
    -af "afade=t=out:st=$fade_start:d=$FADE_SEC" \
    -ac "$CHANNELS" -b:a "$BITRATE" \
    "$OUT_DIR/$midi.mp3"
done

printf '{\n  "version": "%s"\n}\n' "$SAMPLE_VERSION" > "$WORK_DIR/pianoSampleManifest.json"
mv "$WORK_DIR/pianoSampleManifest.json" "$MANIFEST_FILE"

echo
echo "Wrote $(ls -1 "$OUT_DIR"/*.mp3 | wc -l) samples, $(du -sh "$OUT_DIR" | cut -f1) total."
echo "Sample URL version advanced from $CURRENT_VERSION to $SAMPLE_VERSION."
