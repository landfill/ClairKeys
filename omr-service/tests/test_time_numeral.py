"""Image math tests; actual font/corpus validation is an isolated VM probe."""
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

from omr.time_numeral import _bitmask, _glyph_image, _pixels, classify_time_numeral


class TimeNumeralTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture = Path(__file__).resolve().parents[2] / 'fixtures/recognition/clair-de-lune-time-numerals.json'
        cls.tables = [ET.fromstring(g['runTableXml']) for g in json.loads(fixture.read_text())['glyphs']]

    def test_translated_bit_masks_equal_set_translation_without_wrap(self):
        for table in self.tables:
            pixels = _pixels(_glyph_image(table))
            mask = _bitmask(pixels)
            for dx in range(-3, 4):
                for dy in range(-3, 4):
                    shift = dy * 84 + dx
                    shifted = mask << shift if shift >= 0 else mask >> -shift
                    self.assertEqual(shifted, _bitmask({(x + dx, y + dy) for x, y in pixels}))

    def test_orientation_evidence_does_not_treat_rotated_six_as_nine(self):
        # Exact/rotated masks test classifier mechanics, not general music fonts.
        from PIL import Image
        for table in self.tables:
            image = _glyph_image(table)
            nine = _pixels(image)
            six = _pixels(image.transpose(Image.Transpose.ROTATE_180))
            with patch('omr.time_numeral._templates', return_value=[
                    (6, _bitmask(six), len(six)), (9, _bitmask(nine), len(nine))]):
                self.assertEqual(classify_time_numeral(table, Path('unused'))['nine'], 1)
                with patch('omr.time_numeral._glyph_image', return_value=image.transpose(Image.Transpose.ROTATE_180)):
                    self.assertLess(classify_time_numeral(table, Path('unused'))['margin'], 0)

    def test_invalid_dimensions_and_runs_fail_closed(self):
        for xml in ('<run-table width="999999" height="4"/>',
                    '<run-table width="4" height="4" orientation="VERTICAL"/>',
                    '<run-table width="4" height="4" orientation="VERTICAL"><runs>5</runs><runs/><runs/><runs/></run-table>'):
            with self.subTest(xml=xml), self.assertRaises(ValueError):
                _glyph_image(ET.fromstring(xml))

    def test_blank_glyph_never_requests_fonts_or_proposes_a_digit(self):
        table = ET.fromstring('<run-table width="4" height="4" orientation="VERTICAL"><runs/><runs/><runs/><runs/></run-table>')
        with patch('omr.time_numeral._templates', side_effect=AssertionError('must not read fonts')):
            self.assertEqual(classify_time_numeral(table, Path('missing')), dict(six=0, nine=0, margin=0))


if __name__ == '__main__':
    unittest.main()
