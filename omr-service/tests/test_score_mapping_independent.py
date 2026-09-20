"""Independent audit test suite for ClairKeys OMR score mapping (Issue #125).

Rigorous verification covering:
- Exact index, pitch, onset, duration, voice, and staff mapping for chords, rests, and tuplets.
- Simultaneous same-pitch notes in different voices/staves (unison collision).
- Multi-measure, multi-voice tied continuations mapping to a single canonical note.
- Changing tempo across measures with cross-measure ties.
- Negative and boundary edge cases: all-rest measures, non-partwise roots, DOCTYPE stripping, 0-based sequential measureIndex guarantee.
"""

import asyncio
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

from omr.converter import MusicXMLToClairKeysConverter
from omr.score_artifact import build_score_artifact, MAX_ARTIFACT_XML_BYTES
from omr.musicxml_timing import QuarterClock, ScoreTimeline


def make_musicxml_str(body: str, divisions: int = 1, tempo: float = 120.0) -> str:
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n'
        f'<score-partwise version="3.1">\n'
        f'  <work><work-title>Independent Mapping Test</work-title></work>\n'
        f'  <part-list>\n'
        f'    <score-part id="P1"><part-name>Piano</part-name></score-part>\n'
        f'  </part-list>\n'
        f'  <part id="P1">\n'
        f'    {body}\n'
        f'  </part>\n'
        f'</score-partwise>'
    )


class IndependentScoreMappingTests(unittest.TestCase):
    """Independent verification of converter and score_artifact mapping correctness."""

    def setUp(self):
        self.converter = MusicXMLToClairKeysConverter()

    def test_exact_mapping_voices_chords_rests_tuplets(self):
        """Verify exact index, pitch, onset, duration, voice, and staff for chords, rests, and tuplets."""
        # 120 BPM -> 1 beat (quarter) = 0.5 sec
        # divisions = 3 -> 1 quarter = 3 divisions
        # Measure structure (4/4 time):
        # Voice 1:
        #   - 0.0s to 0.5s: Rest (1 quarter = 3 div) -> excluded from notes
        #   - 0.5s: Chord C4 (midi 60) + E4 (midi 64), 1 quarter -> duration = 0.5s
        #   - 1.0s: Triplet eighth notes G4 (midi 67), A4 (midi 69), B4 (midi 71), total 1 quarter
        #           each duration = 1/3 quarter = 1/6 s ≈ 0.166667s
        # Voice 2 (starts after backup 6 divisions = at quarter 2 = 1.0s):
        #   - 1.0s to 2.0s: Half note C3 (midi 48), 2 quarters = 6 div -> duration = 1.0s
        measure_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>3</divisions>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="120"/></direction>\n'
            '    <!-- 1. Rest 1 quarter: 3 divisions -->\n'
            '    <note>\n'
            '      <rest/>\n'
            '      <duration>3</duration>\n'
            '      <voice>1</voice>\n'
            '      <staff>1</staff>\n'
            '    </note>\n'
            '    <!-- 2. Chord: C4 (base note) at quarter 1 (0.5s) -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>3</duration>\n'
            '      <voice>1</voice>\n'
            '      <staff>1</staff>\n'
            '    </note>\n'
            '    <!-- 3. Chord note: E4 at quarter 1 (0.5s) -->\n'
            '    <note>\n'
            '      <chord/>\n'
            '      <pitch><step>E</step><octave>4</octave></pitch>\n'
            '      <duration>3</duration>\n'
            '      <voice>1</voice>\n'
            '      <staff>1</staff>\n'
            '    </note>\n'
            '    <!-- 4. Triplet 8th: G4 at quarter 2 (1.0s) -->\n'
            '    <note>\n'
            '      <pitch><step>G</step><octave>4</octave></pitch>\n'
            '      <duration>1</duration>\n'
            '      <voice>1</voice>\n'
            '      <staff>1</staff>\n'
            '      <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>\n'
            '    </note>\n'
            '    <!-- 5. Triplet 8th: A4 at quarter 2 + 1/3 (1.166667s) -->\n'
            '    <note>\n'
            '      <pitch><step>A</step><octave>4</octave></pitch>\n'
            '      <duration>1</duration>\n'
            '      <voice>1</voice>\n'
            '      <staff>1</staff>\n'
            '      <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>\n'
            '    </note>\n'
            '    <!-- 6. Triplet 8th: B4 at quarter 2 + 2/3 (1.333333s) -->\n'
            '    <note>\n'
            '      <pitch><step>B</step><octave>4</octave></pitch>\n'
            '      <duration>1</duration>\n'
            '      <voice>1</voice>\n'
            '      <staff>1</staff>\n'
            '      <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>\n'
            '    </note>\n'
            '    <!-- Voice 2: backup to quarter 2 (6 divisions total in measure so far = 3 rest + 3 chord; backup 3 = quarter 2) -->\n'
            '    <backup><duration>3</duration></backup>\n'
            '    <!-- 7. Voice 2 Half note: C3 at quarter 2 (1.0s), duration 6 div = 2 quarters = 1.0s -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>3</octave></pitch>\n'
            '      <duration>6</duration>\n'
            '      <voice>2</voice>\n'
            '      <staff>2</staff>\n'
            '    </note>\n'
            '  </measure>\n'
        )
        xml_content = make_musicxml_str(measure_xml, divisions=3)
        with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as f:
            f.write(xml_content)
            tmp_path = Path(f.name)

        try:
            animation_data, artifact = asyncio.run(
                self.converter.convert_with_artifact(tmp_path)
            )
            canonical_notes = animation_data["notes"]
            artifact_notes = artifact["notes"]

            # Exactly 6 pitched notes (rest excluded)
            self.assertEqual(len(canonical_notes), 6)
            self.assertEqual(len(artifact_notes), 6)

            # Check sort order of canonical notes: sorted by (start, midi)
            # 1) start=0.5s: C4 (midi 60)
            # 2) start=0.5s: E4 (midi 64)
            # 3) start=1.0s: C3 (midi 48) [from Voice 2, lowest midi at 1.0s]
            # 4) start=1.0s: G4 (midi 67) [from Voice 1 Triplet 1]
            # 5) start=1.166667s: A4 (midi 69) [from Voice 1 Triplet 2]
            # 6) start=1.333333s: B4 (midi 71) [from Voice 1 Triplet 3]

            self.assertEqual(canonical_notes[0]["midi"], 60)
            self.assertAlmostEqual(canonical_notes[0]["start"], 0.5, places=5)
            self.assertAlmostEqual(canonical_notes[0]["duration"], 0.5, places=5)
            self.assertEqual(canonical_notes[0]["voice"], 1)
            self.assertEqual(canonical_notes[0]["staff"], 1)
            self.assertEqual(canonical_notes[0]["hand"], "R")

            self.assertEqual(canonical_notes[1]["midi"], 64)
            self.assertAlmostEqual(canonical_notes[1]["start"], 0.5, places=5)
            self.assertAlmostEqual(canonical_notes[1]["duration"], 0.5, places=5)
            self.assertEqual(canonical_notes[1]["voice"], 1)
            self.assertEqual(canonical_notes[1]["staff"], 1)
            self.assertEqual(canonical_notes[1]["hand"], "R")

            self.assertEqual(canonical_notes[2]["midi"], 48)
            self.assertAlmostEqual(canonical_notes[2]["start"], 1.0, places=5)
            self.assertAlmostEqual(canonical_notes[2]["duration"], 1.0, places=5)
            self.assertEqual(canonical_notes[2]["voice"], 2)
            self.assertEqual(canonical_notes[2]["staff"], 2)
            self.assertEqual(canonical_notes[2]["hand"], "L")

            self.assertEqual(canonical_notes[3]["midi"], 67)
            self.assertAlmostEqual(canonical_notes[3]["start"], 1.0, places=5)
            self.assertAlmostEqual(canonical_notes[3]["duration"], 0.166667, places=5)
            self.assertEqual(canonical_notes[3]["voice"], 1)
            self.assertEqual(canonical_notes[3]["staff"], 1)
            self.assertEqual(canonical_notes[3]["hand"], "R")

            self.assertEqual(canonical_notes[4]["midi"], 69)
            self.assertAlmostEqual(canonical_notes[4]["start"], 1.166667, places=5)
            self.assertAlmostEqual(canonical_notes[4]["duration"], 0.166667, places=5)
            self.assertEqual(canonical_notes[4]["voice"], 1)
            self.assertEqual(canonical_notes[4]["staff"], 1)
            self.assertEqual(canonical_notes[4]["hand"], "R")

            self.assertEqual(canonical_notes[5]["midi"], 71)
            self.assertAlmostEqual(canonical_notes[5]["start"], 1.333333, places=5)
            self.assertAlmostEqual(canonical_notes[5]["duration"], 0.166667, places=5)
            self.assertEqual(canonical_notes[5]["voice"], 1)
            self.assertEqual(canonical_notes[5]["staff"], 1)
            self.assertEqual(canonical_notes[5]["hand"], "R")

            # Verify artifact_notes exact index references
            # Note that xml_id follows sequential numbering of pitched notes in measure:
            # n1 = C4, n2 = E4, n3 = G4, n4 = A4, n5 = B4, n6 = C3
            mapping_by_id = {item["xmlId"]: item["noteIndex"] for item in artifact_notes}

            self.assertEqual(mapping_by_id["p1-m1-n1"], 0)  # C4 -> canonical idx 0
            self.assertEqual(mapping_by_id["p1-m1-n2"], 1)  # E4 -> canonical idx 1
            self.assertEqual(mapping_by_id["p1-m1-n3"], 3)  # G4 -> canonical idx 3
            self.assertEqual(mapping_by_id["p1-m1-n4"], 4)  # A4 -> canonical idx 4
            self.assertEqual(mapping_by_id["p1-m1-n5"], 5)  # B4 -> canonical idx 5
            self.assertEqual(mapping_by_id["p1-m1-n6"], 2)  # C3 -> canonical idx 2

        finally:
            tmp_path.unlink(missing_ok=True)

    def test_simultaneous_same_pitch_different_voices_and_staves(self):
        """Simultaneous unison notes (same pitch, same onset) in Staff 1 and Staff 2 remain distinct in mapping."""
        # Staff 1 (Right Hand) plays C4 at 0.0s
        # Staff 2 (Left Hand) simultaneously plays C4 at 0.0s
        measure_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>1</divisions>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '      <staves>2</staves>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="60"/></direction>\n'
            '    <!-- Staff 1 Note: C4 -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <staff>1</staff>\n'
            '    </note>\n'
            '    <backup><duration>4</duration></backup>\n'
            '    <!-- Staff 2 Note: C4 simultaneously -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>2</voice>\n'
            '      <staff>2</staff>\n'
            '    </note>\n'
            '  </measure>\n'
        )
        xml_content = make_musicxml_str(measure_xml)
        with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as f:
            f.write(xml_content)
            tmp_path = Path(f.name)

        try:
            animation_data, artifact = asyncio.run(
                self.converter.convert_with_artifact(tmp_path)
            )
            canonical_notes = animation_data["notes"]
            artifact_notes = artifact["notes"]

            # Must preserve 2 separate canonical notes despite identical start & midi
            self.assertEqual(len(canonical_notes), 2)
            self.assertEqual(len(artifact_notes), 2)

            self.assertEqual(canonical_notes[0]["midi"], 60)
            self.assertEqual(canonical_notes[1]["midi"], 60)
            self.assertEqual(canonical_notes[0]["start"], 0.0)
            self.assertEqual(canonical_notes[1]["start"], 0.0)

            # One must be Right hand (Staff 1), one Left hand (Staff 2)
            hands = {canonical_notes[0]["hand"], canonical_notes[1]["hand"]}
            self.assertEqual(hands, {"R", "L"})

            # Artifact mappings must link to different canonical indices (0 and 1)
            mapped_indices = [item["noteIndex"] for item in artifact_notes]
            self.assertEqual(sorted(mapped_indices), [0, 1])

            # XML IDs must be distinct
            self.assertEqual(artifact_notes[0]["xmlId"], "p1-m1-n1")
            self.assertEqual(artifact_notes[1]["xmlId"], "p1-m1-n2")

            # Verify that the Staff 1 XML note links to the R note, and Staff 2 XML note links to the L note
            idx1 = artifact_notes[0]["noteIndex"]
            idx2 = artifact_notes[1]["noteIndex"]
            self.assertEqual(canonical_notes[idx1]["hand"], "R")
            self.assertEqual(canonical_notes[idx2]["hand"], "L")

        finally:
            tmp_path.unlink(missing_ok=True)

    def test_multi_measure_multi_voice_tied_continuations(self):
        """A tied note across 3 measures in Voice 1 maps all 3 XML notes to canonical noteIndex 0, while Voice 2 proceeds independently."""
        measures_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>1</divisions>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="60"/></direction>\n'
            '    <!-- Voice 1: C4 tie start (4 beats = 4.0s) -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <tie type="start"/>\n'
            '      <notations><tied type="start"/></notations>\n'
            '    </note>\n'
            '  </measure>\n'
            '  <measure number="2">\n'
            '    <!-- Voice 1: C4 tie continue (stop and start) -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <tie type="stop"/>\n'
            '      <tie type="start"/>\n'
            '      <notations><tied type="stop"/><tied type="start"/></notations>\n'
            '    </note>\n'
            '    <!-- Voice 2: independent E4 note (start = 4.0s, duration 4.0s) -->\n'
            '    <backup><duration>4</duration></backup>\n'
            '    <note>\n'
            '      <pitch><step>E</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>2</voice>\n'
            '    </note>\n'
            '  </measure>\n'
            '  <measure number="3">\n'
            '    <!-- Voice 1: C4 tie stop -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <tie type="stop"/>\n'
            '      <notations><tied type="stop"/></notations>\n'
            '    </note>\n'
            '  </measure>\n'
        )
        xml_content = make_musicxml_str(measures_xml)
        with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as f:
            f.write(xml_content)
            tmp_path = Path(f.name)

        try:
            animation_data, artifact = asyncio.run(
                self.converter.convert_with_artifact(tmp_path)
            )
            canonical_notes = animation_data["notes"]
            artifact_notes = artifact["notes"]

            # Only 2 canonical notes:
            # Note 0: C4 tied across 3 measures (duration = 4 + 4 + 4 = 12.0s)
            # Note 1: E4 in Voice 2 of measure 2 (start = 4.0s, duration = 4.0s)
            self.assertEqual(len(canonical_notes), 2)
            self.assertEqual(canonical_notes[0]["midi"], 60)
            self.assertAlmostEqual(canonical_notes[0]["start"], 0.0)
            self.assertAlmostEqual(canonical_notes[0]["duration"], 12.0)

            self.assertEqual(canonical_notes[1]["midi"], 64)
            self.assertAlmostEqual(canonical_notes[1]["start"], 4.0)
            self.assertAlmostEqual(canonical_notes[1]["duration"], 4.0)

            # Artifact notes: 4 XML note elements total
            # p1-m1-n1 (C4 start) -> noteIndex 0
            # p1-m2-n1 (C4 continue) -> noteIndex 0
            # p1-m2-n2 (E4 independent) -> noteIndex 1
            # p1-m3-n1 (C4 stop) -> noteIndex 0
            self.assertEqual(len(artifact_notes), 4)
            mapping_dict = {item["xmlId"]: item["noteIndex"] for item in artifact_notes}

            self.assertEqual(mapping_dict["p1-m1-n1"], 0)
            self.assertEqual(mapping_dict["p1-m2-n1"], 0)
            self.assertEqual(mapping_dict["p1-m2-n2"], 1)
            self.assertEqual(mapping_dict["p1-m3-n1"], 0)

        finally:
            tmp_path.unlink(missing_ok=True)

    def test_changing_tempo_across_measures_with_cross_measure_tie(self):
        """Tempo changes across measures (120 BPM in m1, 60 BPM in m2) accurately scale tied duration and measure bounds."""
        # Measure 1: 120 BPM (1 beat = 0.5s) -> 4 quarters = 2.0s
        #   Note C4 tie start (4 quarters)
        # Measure 2: 60 BPM (1 beat = 1.0s) -> 4 quarters = 4.0s
        #   Note C4 tie stop (4 quarters)
        # Total canonical duration of C4: 2.0s (from m1) + 4.0s (from m2) = 6.0s!
        measures_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>1</divisions>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="120"/></direction>\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <tie type="start"/>\n'
            '      <notations><tied type="start"/></notations>\n'
            '    </note>\n'
            '  </measure>\n'
            '  <measure number="2">\n'
            '    <direction><sound tempo="60"/></direction>\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <tie type="stop"/>\n'
            '      <notations><tied type="stop"/></notations>\n'
            '    </note>\n'
            '  </measure>\n'
        )
        xml_content = make_musicxml_str(measures_xml)
        with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as f:
            f.write(xml_content)
            tmp_path = Path(f.name)

        try:
            animation_data, artifact = asyncio.run(
                self.converter.convert_with_artifact(tmp_path)
            )

            # Single merged note with exact piecewise integrated duration: 2.0s + 4.0s = 6.0s
            self.assertEqual(len(animation_data["notes"]), 1)
            self.assertAlmostEqual(animation_data["notes"][0]["start"], 0.0)
            self.assertAlmostEqual(animation_data["notes"][0]["duration"], 6.0)

            # Both XML notes map to noteIndex 0
            self.assertEqual(len(artifact["notes"]), 2)
            self.assertEqual(artifact["notes"][0]["noteIndex"], 0)
            self.assertEqual(artifact["notes"][1]["noteIndex"], 0)

            # Measure timing bounds
            self.assertEqual(len(artifact["measures"]), 2)
            m1 = artifact["measures"][0]
            m2 = artifact["measures"][1]

            self.assertAlmostEqual(m1["start"], 0.0)
            self.assertAlmostEqual(m1["end"], 2.0)
            self.assertAlmostEqual(m2["start"], 2.0)
            self.assertAlmostEqual(m2["end"], 6.0)

            # Ensure 0-based sequential measureIndex
            self.assertEqual(m1["measureIndex"], 0)
            self.assertEqual(m2["measureIndex"], 1)

        finally:
            tmp_path.unlink(missing_ok=True)

    def test_edge_cases_and_negative_validation(self):
        """Negative cases and edge cases: all-rest score, non-partwise root, DOCTYPE stripping, and 0-based index guarantee."""
        # 1. Score with only rests
        all_rest_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>1</divisions>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="100"/></direction>\n'
            '    <note><rest/><duration>4</duration></note>\n'
            '  </measure>\n'
        )
        with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as f:
            f.write(make_musicxml_str(all_rest_xml))
            tmp_rest_path = Path(f.name)

        try:
            anim, art = asyncio.run(self.converter.convert_with_artifact(tmp_rest_path))
            self.assertEqual(len(anim["notes"]), 0)
            self.assertEqual(len(art["notes"]), 0)
            self.assertEqual(len(art["measures"]), 1)
            self.assertEqual(art["measures"][0]["measureIndex"], 0)
            self.assertAlmostEqual(art["measures"][0]["start"], 0.0)
            self.assertAlmostEqual(art["measures"][0]["end"], 2.4)  # 4 beats @ 100 BPM = 2.4s
        finally:
            tmp_rest_path.unlink(missing_ok=True)

        # 2. build_score_artifact rejects non-score-partwise root tag
        invalid_root = ET.Element("score-timewise")
        timeline = ScoreTimeline(parts=[], starts=[], tempos={}, warnings=[])
        clock = QuarterClock(120, {})
        with self.assertRaises(ValueError) as ctx:
            build_score_artifact(
                root=invalid_root,
                timeline=timeline,
                clock=clock,
                notes=[],
                note_mappings=[],
                timing_reference_bpm=120,
                tempo_source="score",
            )
        self.assertIn("score-partwise", str(ctx.exception))

        # 3. Serialized musicxml strips DOCTYPE declarations cleanly
        root_with_doctype = ET.Element("score-partwise")
        art_doctype = build_score_artifact(
            root=root_with_doctype,
            timeline=timeline,
            clock=clock,
            notes=[],
            note_mappings=[],
            timing_reference_bpm=120,
            tempo_source="score",
        )
        self.assertNotIn("<!DOCTYPE", art_doctype["musicxml"])

        # 4. Measure numbering in XML (<measure number="99">) does NOT leak into measureIndex;
        #    measureIndex MUST always be 0-based sequential index (0, 1, 2, ...)
        custom_number_xml = (
            '  <measure number="99">\n'
            '    <attributes><divisions>1</divisions></attributes>\n'
            '    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>\n'
            '  </measure>\n'
            '  <measure number="100">\n'
            '    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>\n'
            '  </measure>\n'
        )
        with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as f:
            f.write(make_musicxml_str(custom_number_xml))
            tmp_num_path = Path(f.name)

        try:
            _, art_num = asyncio.run(self.converter.convert_with_artifact(tmp_num_path))
            self.assertEqual(len(art_num["measures"]), 2)
            # Crucial assertion for frontend OSMD MeasureList mapping
            self.assertEqual(art_num["measures"][0]["measureIndex"], 0)
            self.assertEqual(art_num["measures"][1]["measureIndex"], 1)
        finally:
            tmp_num_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
