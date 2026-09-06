import asyncio
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from omr.converter import MusicXMLToClairKeysConverter


MAJOR_KEYS = [
    "Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C",
    "G", "D", "A", "E", "B", "F#", "C#",
]
MINOR_KEYS = [
    "Abm", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm", "Am",
    "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m",
]


def key_root(fifths=None, mode=None, include_key=True):
    key = ""
    if include_key:
        fifths_xml = "" if fifths is None else f"<fifths>{fifths}</fifths>"
        mode_xml = "" if mode is None else f"<mode>{mode}</mode>"
        key = f"<key>{fifths_xml}{mode_xml}</key>"
    return ET.fromstring(
        f"<score-partwise><part><measure><attributes>{key}</attributes>"
        "</measure></part></score-partwise>"
    )


class KeySignatureExtractionTest(unittest.TestCase):
    def setUp(self):
        self.converter = MusicXMLToClairKeysConverter()

    def test_maps_all_traditional_major_and_minor_fifths(self):
        for fifths, expected in zip(range(-7, 8), MAJOR_KEYS):
            with self.subTest(fifths=fifths, mode="major"):
                self.assertEqual(
                    self.converter._extract_key_signature(key_root(fifths, "  MaJoR ")),
                    expected,
                )
        for fifths, expected in zip(range(-7, 8), MINOR_KEYS):
            with self.subTest(fifths=fifths, mode="minor"):
                self.assertEqual(
                    self.converter._extract_key_signature(key_root(fifths, "  MiNoR ")),
                    expected,
                )

    def test_absent_mode_uses_major_name_but_explicit_unsupported_mode_is_omitted(self):
        self.assertEqual(self.converter._extract_key_signature(key_root(-1)), "F")
        for mode in ("", "none", "dorian"):
            with self.subTest(mode=mode):
                self.assertIsNone(
                    self.converter._extract_key_signature(key_root(-1, mode))
                )

    def test_missing_invalid_and_out_of_range_fifths_are_omitted(self):
        cases = (
            key_root(include_key=False),
            key_root(),
            key_root(""),
            key_root("not-an-integer"),
            key_root("1.0"),
            key_root("1_0"),
            key_root(-8),
            key_root(8),
        )
        for root in cases:
            with self.subTest(xml=ET.tostring(root, encoding="unicode")):
                self.assertIsNone(self.converter._extract_key_signature(root))

    def test_first_key_declaration_remains_the_bounded_source(self):
        root = ET.fromstring(
            "<score-partwise><part><measure><attributes>"
            "<key><fifths>-1</fifths></key>"
            "<key><fifths>2</fifths></key>"
            "</attributes></measure></part></score-partwise>"
        )
        self.assertEqual(self.converter._extract_key_signature(root), "F")

    def test_numeric_lexemes_are_ascii_and_bounded_before_integer_conversion(self):
        for name, text, expected in (
            ("huge-out-of-range", "9" * 5000, None),
            ("huge-leading-zero", "0" * 5000 + "7", "C#"),
            ("huge-negative-leading-zero", "-" + "0" * 5000 + "7", "Cb"),
            ("explicit-plus", "+0002", "D"),
            ("negative-zero", "-000", "C"),
            ("unicode-digit", "\u0661", None),
        ):
            with self.subTest(case=name):
                self.assertEqual(self.converter._extract_key_signature(key_root(text)), expected)

    def test_invalid_key_does_not_abort_conversion_or_emit_null(self):
        xml = """<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1"><attributes>
    <divisions>1</divisions><key><fifths>invalid</fifths></key>
    <time><beats>1</beats><beat-type>4</beat-type></time>
  </attributes><direction><sound tempo="72"/></direction>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration>
    <voice>1</voice><staff>1</staff></note></measure></part>
</score-partwise>"""
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "invalid.musicxml"
            for value in ("invalid", "9" * 5000):
                path.write_text(xml.replace("<fifths>invalid</fifths>", f"<fifths>{value}</fifths>"), encoding="utf-8")
                result = asyncio.run(self.converter.convert(path))
                self.assertNotIn("keySignature", result)
                self.assertEqual(result["tempo"], 72)

        self.assertNotIn("keySignature", result)
        self.assertEqual(result["tempo"], 72)
        self.assertEqual(
            result["notes"],
            [{
                "midi": 60,
                "start": 0.0,
                "duration": 0.833333,
                "hand": "R",
                "finger": None,
                "voice": 1,
                "staff": 1,
            }],
        )


if __name__ == "__main__":
    unittest.main()
