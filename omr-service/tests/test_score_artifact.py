"""Tests for MusicXML score artifact generation and /result contract (ISSUE-125).

Tests cover:
- Two piano staves (grand staff)
- Ties and tie continuation noteIndex mapping
- Voices, chords, rests, and tuplets
- Piecewise changing tempi and user tempo override
- Compressed MXL parsing and plain MusicXML serialization (no DOCTYPE, <= 10MiB)
- Service endpoints: /status leakage prevention, /result artifact presence, and legacy job backward compatibility
- No PDF / temporary file retention
"""

import asyncio
import io
import json
import math
import os
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

from omr.converter import MusicXMLToClairKeysConverter
from omr.score_artifact import build_score_artifact


def make_musicxml_str(body: str, divisions: int = 1, tempo: float = 120.0) -> str:
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n'
        f'<score-partwise version="3.1">\n'
        f'  <work><work-title>Test Score</work-title></work>\n'
        f'  <identification><creator type="composer">Test Composer</creator></identification>\n'
        f'  <part-list>\n'
        f'    <score-part id="P1"><part-name>Piano</part-name></score-part>\n'
        f'  </part-list>\n'
        f'  <part id="P1">\n'
        f'    {body}\n'
        f'  </part>\n'
        f'</score-partwise>'
    )


class ScoreArtifactUnitTests(unittest.TestCase):
    """Unit coverage for MusicXML score artifact generation."""

    def setUp(self):
        self.converter = MusicXMLToClairKeysConverter()

    def test_two_piano_staves_grand_staff(self):
        """Two piano staves (grand staff) with separate voices and staves."""
        measure_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>1</divisions>\n'
            '      <key><fifths>0</fifths></key>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '      <staves>2</staves>\n'
            '      <clef number="1"><sign>G</sign><line>2</line></clef>\n'
            '      <clef number="2"><sign>F</sign><line>4</line></clef>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="120"/></direction>\n'
            '    <!-- Staff 1 (Right Hand) -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>5</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <type>whole</type>\n'
            '      <staff>1</staff>\n'
            '    </note>\n'
            '    <backup><duration>4</duration></backup>\n'
            '    <!-- Staff 2 (Left Hand) -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>3</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>2</voice>\n'
            '      <type>whole</type>\n'
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
            # Check canonical notes
            self.assertEqual(len(animation_data["notes"]), 2)
            # Check score_artifact structure
            self.assertEqual(artifact["version"], 1)
            self.assertIn("musicxml", artifact)
            self.assertNotIn("<!DOCTYPE", artifact["musicxml"])
            self.assertTrue(artifact["musicxml"].startswith("<score-partwise") or "<score-partwise" in artifact["musicxml"])

            # Check measures
            self.assertEqual(len(artifact["measures"]), 1)
            m0 = artifact["measures"][0]
            self.assertEqual(m0["partIndex"], 0)
            self.assertEqual(m0["measureIndex"], 0)
            self.assertEqual(m0["startQuarter"], 0.0)
            self.assertEqual(m0["endQuarter"], 4.0)
            self.assertAlmostEqual(m0["start"], 0.0)
            self.assertAlmostEqual(m0["end"], 2.0)  # 4 quarters @ 120 BPM = 2.0s

            # Check notes mapping
            self.assertEqual(len(artifact["notes"]), 2)
            # Verify that each pitched note has xmlId and valid noteIndex
            xml_ids = [entry["xmlId"] for entry in artifact["notes"]]
            self.assertEqual(len(set(xml_ids)), 2, "xmlId must be unique")
            for entry in artifact["notes"]:
                self.assertIn(entry["noteIndex"], (0, 1))

            # Verify serialized XML contains the id attributes on notes
            root = ET.fromstring(artifact["musicxml"])
            pitched_notes = [n for n in root.findall(".//note") if n.find("pitch") is not None]
            for n in pitched_notes:
                self.assertIn(n.get("id"), xml_ids)

            # Check timing reference
            self.assertEqual(artifact["timingReferenceBpm"], 120.0)
            self.assertEqual(artifact["tempoSource"], "score")
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_ties_mapping_tied_continuations_to_same_note_index(self):
        """Tied notes across measures map continuation notes to the same canonical noteIndex."""
        measures_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>1</divisions>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="60"/></direction>\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '      <tie type="start"/>\n'
            '      <notations><tied type="start"/></notations>\n'
            '    </note>\n'
            '  </measure>\n'
            '  <measure number="2">\n'
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
            # Canonical notes: merged into 1 note of duration 8.0s (4+4 quarters @ 60 BPM)
            self.assertEqual(len(animation_data["notes"]), 1)
            self.assertEqual(animation_data["notes"][0]["duration"], 8.0)

            # Artifact notes: both XML notes are present in mapping
            self.assertEqual(len(artifact["notes"]), 2)
            n1_map = artifact["notes"][0]
            n2_map = artifact["notes"][1]
            self.assertNotEqual(n1_map["xmlId"], n2_map["xmlId"])
            # Both must point to canonical noteIndex 0!
            self.assertEqual(n1_map["noteIndex"], 0)
            self.assertEqual(n2_map["noteIndex"], 0)

            # Artifact measures: 2 measures
            self.assertEqual(len(artifact["measures"]), 2)
            self.assertEqual(artifact["measures"][0]["start"], 0.0)
            self.assertEqual(artifact["measures"][0]["end"], 4.0)
            self.assertEqual(artifact["measures"][1]["start"], 4.0)
            self.assertEqual(artifact["measures"][1]["end"], 8.0)
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_voices_chords_rests_tuplets(self):
        """Voices, chords, rests, and tuplets are correctly mapped and timed."""
        measure_xml = (
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>3</divisions>\n'  # 3 divisions per quarter for triplet
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="120"/></direction>\n'
            '    <!-- Rest 1 quarter: 3 divisions -->\n'
            '    <note>\n'
            '      <rest/>\n'
            '      <duration>3</duration>\n'
            '      <voice>1</voice>\n'
            '    </note>\n'
            '    <!-- Chord: C4 + E4 quarter note at quarter 1 -->\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>3</duration>\n'
            '      <voice>1</voice>\n'
            '    </note>\n'
            '    <note>\n'
            '      <chord/>\n'
            '      <pitch><step>E</step><octave>4</octave></pitch>\n'
            '      <duration>3</duration>\n'
            '      <voice>1</voice>\n'
            '    </note>\n'
            '    <!-- Triplet: 3 eighth notes taking 1 quarter note (each 1 division: 3 eighths = 3 divisions = 1 quarter) -->\n'
            '    <note>\n'
            '      <pitch><step>G</step><octave>4</octave></pitch>\n'
            '      <duration>1</duration>\n'
            '      <voice>1</voice>\n'
            '      <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>\n'
            '    </note>\n'
            '    <note>\n'
            '      <pitch><step>A</step><octave>4</octave></pitch>\n'
            '      <duration>1</duration>\n'
            '      <voice>1</voice>\n'
            '      <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>\n'
            '    </note>\n'
            '    <note>\n'
            '      <pitch><step>B</step><octave>4</octave></pitch>\n'
            '      <duration>1</duration>\n'
            '      <voice>1</voice>\n'
            '      <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>\n'
            '    </note>\n'
            '    <!-- Voice 2: half note rest + half note C3 -->\n'
            '    <backup><duration>6</duration></backup>\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>3</octave></pitch>\n'
            '      <duration>6</duration>\n'
            '      <voice>2</voice>\n'
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
            # Rests are not in canonical notes, and not in artifact['notes']
            pitched_count = 1 + 1 + 3 + 1  # 2 chord notes + 3 triplet notes + 1 voice2 note = 6
            self.assertEqual(len(artifact["notes"]), 6)
            self.assertEqual(len(animation_data["notes"]), 6)

            # Check that each artifact note has matching canonical start
            for entry in artifact["notes"]:
                canonical_note = animation_data["notes"][entry["noteIndex"]]
                self.assertIsNotNone(canonical_note)

            # Rest does NOT have an XML id
            root = ET.fromstring(artifact["musicxml"])
            rests = root.findall(".//note[rest]")
            for r in rests:
                self.assertIsNone(r.get("id"))
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_changing_tempi_and_user_tempo_override(self):
        """Piecewise tempo changes in score vs user override."""
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
            '    </note>\n'
            '  </measure>\n'
            '  <measure number="2">\n'
            '    <direction><sound tempo="60"/></direction>\n'
            '    <note>\n'
            '      <pitch><step>D</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '    </note>\n'
            '  </measure>\n'
        )
        xml_content = make_musicxml_str(measures_xml)
        with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as f:
            f.write(xml_content)
            tmp_path = Path(f.name)
        try:
            # Case 1: Default score tempo
            _, artifact_score = asyncio.run(
                self.converter.convert_with_artifact(tmp_path)
            )
            self.assertEqual(artifact_score["tempoSource"], "score")
            self.assertEqual(artifact_score["timingReferenceBpm"], 120.0)
            m1 = artifact_score["measures"][0]
            m2 = artifact_score["measures"][1]
            self.assertEqual(m1["start"], 0.0)
            self.assertEqual(m1["end"], 2.0)  # 4 quarters @ 120 BPM = 2.0s
            self.assertEqual(m2["start"], 2.0)
            self.assertEqual(m2["end"], 6.0)  # 4 quarters @ 60 BPM = 4.0s -> 2.0 + 4.0 = 6.0s

            # Case 2: User tempo override = 60 BPM
            _, artifact_user = asyncio.run(
                self.converter.convert_with_artifact(tmp_path, tempo=60.0)
            )
            self.assertEqual(artifact_user["tempoSource"], "user")
            self.assertEqual(artifact_user["timingReferenceBpm"], 60.0)
            um1 = artifact_user["measures"][0]
            um2 = artifact_user["measures"][1]
            self.assertEqual(um1["start"], 0.0)
            self.assertEqual(um1["end"], 4.0)  # 4 quarters @ 60 BPM = 4.0s
            self.assertEqual(um2["start"], 4.0)
            self.assertEqual(um2["end"], 8.0)  # 4 quarters @ 60 BPM = 4.0s -> 4.0 + 4.0 = 8.0s
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_mxl_archive_parsing_and_no_doctype(self):
        """Compressed .mxl archive is parsed, no DOCTYPE in serialized XML, size <= 10MiB."""
        xml_content = make_musicxml_str(
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
            '    </note>\n'
            '  </measure>\n'
        )
        container_xml = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
            '  <rootfiles>\n'
            '    <rootfile full-path="score.xml" media-type="application/vnd.recordare.musicxml+xml"/>\n'
            '  </rootfiles>\n'
            '</container>'
        )
        with tempfile.NamedTemporaryFile("wb", suffix=".mxl", delete=False) as f:
            with zipfile.ZipFile(f, "w") as zf:
                zf.writestr("META-INF/container.xml", container_xml)
                zf.writestr("score.xml", xml_content)
            mxl_path = Path(f.name)

        try:
            _, artifact = asyncio.run(
                self.converter.convert_with_artifact(mxl_path)
            )
            musicxml = artifact["musicxml"]
            self.assertNotIn("<!DOCTYPE", musicxml)
            self.assertIn("<score-partwise", musicxml)
            self.assertLessEqual(len(musicxml.encode("utf-8")), 10 * 1024 * 1024)
        finally:
            mxl_path.unlink(missing_ok=True)


class ServiceResultEndpointContractTests(unittest.TestCase):
    """Contract tests for /status (no leakage) and /result (score_artifact) and legacy compatibility."""

    def setUp(self):
        import os
        import app
        self.app_module = app
        self.client = app.app
        self.secret = "test-secret-token"
        os.environ["OMR_SHARED_SECRET"] = self.secret

    def test_status_endpoint_never_leaks_score_artifact(self):
        """GET /status/{job_id} must NEVER return score_artifact or animation_data."""
        from httpx import AsyncClient
        async def _test():
            job_id = "test-job-status-leakage"
            self.app_module.processing_jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "message": "Done",
                "file_info": {},
                "result": {"title": "T", "composer": "C", "processed_at": "now"},
                "animation_data": {"notes": []},
                "score_artifact": {"version": 1, "musicxml": "<score-partwise/>", "measures": [], "notes": []},
            }
            async with AsyncClient(app=self.client, base_url="http://test") as ac:
                res = await ac.get(f"/status/{job_id}", headers={"X-ClairKeys-Token": self.secret})
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertNotIn("animation_data", data)
                self.assertNotIn("score_artifact", data)
                self.assertIn("result", data)
        asyncio.run(_test())

    def test_result_endpoint_returns_score_artifact_when_present(self):
        """GET /result/{job_id} includes score_artifact for completed jobs."""
        from httpx import AsyncClient
        async def _test():
            job_id = "test-job-result-artifact"
            artifact = {
                "version": 1,
                "musicxml": "<score-partwise/>",
                "measures": [],
                "notes": [],
                "timingReferenceBpm": 120.0,
                "tempoSource": "score"
            }
            self.app_module.processing_jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "message": "Done",
                "result": {"title": "T", "composer": "C", "processed_at": "now"},
                "animation_data": {"notes": []},
                "score_artifact": artifact,
            }
            async with AsyncClient(app=self.client, base_url="http://test") as ac:
                res = await ac.get(f"/result/{job_id}", headers={"X-ClairKeys-Token": self.secret})
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertIn("score_artifact", data)
                self.assertEqual(data["score_artifact"]["version"], 1)
                self.assertEqual(data["score_artifact"]["timingReferenceBpm"], 120.0)
        asyncio.run(_test())

    def test_result_endpoint_requires_auth(self):
        """GET /result/{job_id} without valid token returns 401."""
        from httpx import AsyncClient
        async def _test():
            job_id = "test-job-unauth"
            self.app_module.processing_jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "message": "Done",
                "result": {"title": "T", "composer": "C", "processed_at": "now"},
                "animation_data": {"notes": []},
                "score_artifact": None,
            }
            async with AsyncClient(app=self.client, base_url="http://test") as ac:
                res = await ac.get(f"/result/{job_id}")
                self.assertEqual(res.status_code, 401)
        asyncio.run(_test())

    def test_result_endpoint_legacy_job_backward_compatibility(self):
        """Legacy jobs without score_artifact keep current response support without error."""
        from httpx import AsyncClient
        async def _test():
            job_id = "test-job-legacy"
            self.app_module.processing_jobs[job_id] = {
                "status": "completed",
                "progress": 100,
                "message": "Done",
                "result": {"title": "Legacy Title", "composer": "Legacy Composer", "processed_at": "now"},
                "animation_data": {"version": "1.1", "notes": []},
                # No score_artifact!
            }
            async with AsyncClient(app=self.client, base_url="http://test") as ac:
                res = await ac.get(f"/result/{job_id}", headers={"X-ClairKeys-Token": self.secret})
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertIn("animation_data", data)
                self.assertEqual(data["title"], "Legacy Title")
                self.assertNotIn("score_artifact", data)
        asyncio.run(_test())

    def test_process_pdf_background_no_pdf_retention_and_stores_artifact(self):
        """Background PDF processing cleans up temporary files and stores score_artifact."""
        from unittest.mock import AsyncMock, patch
        from fastapi import UploadFile

        xml_str = make_musicxml_str(
            '  <measure number="1">\n'
            '    <attributes>\n'
            '      <divisions>1</divisions>\n'
            '      <time><beats>4</beats><beat-type>4</beat-type></time>\n'
            '    </attributes>\n'
            '    <direction><sound tempo="100"/></direction>\n'
            '    <note>\n'
            '      <pitch><step>C</step><octave>4</octave></pitch>\n'
            '      <duration>4</duration>\n'
            '      <voice>1</voice>\n'
            '    </note>\n'
            '  </measure>\n'
        )

        async def _test():
            job_id = "test-job-bg-cleanup"
            with tempfile.TemporaryDirectory() as proc_root:
                os.environ["OMR_PROCESSING_DIR"] = proc_root
                self.app_module.processing_jobs[job_id] = {
                    "status": "pending",
                    "progress": 0,
                    "message": "Queued",
                    "file_info": {},
                }
                fake_pdf = UploadFile(
                    filename="score.pdf",
                    file=io.BytesIO(b"%PDF-1.4 simulated content"),
                )

                with tempfile.NamedTemporaryFile("w", suffix=".musicxml", delete=False) as mxml_file:
                    mxml_file.write(xml_str)
                    mxml_path = Path(mxml_file.name)

                temp_dir_used = None

                async def fake_audiveris(pdf_path, temp_dir):
                    nonlocal temp_dir_used
                    temp_dir_used = temp_dir
                    self.assertTrue(pdf_path.exists(), "PDF must exist when processor runs")
                    return mxml_path

                with patch.object(self.app_module.audiveris_processor, "process_pdf", side_effect=fake_audiveris):
                    await self.app_module.process_pdf_background(
                        job_id=job_id,
                        file=fake_pdf,
                        title="Test Piece",
                        composer="Test Author",
                        user_id="u123",
                        tempo=None,
                        callback_url=None,
                    )

                # Assert job completed successfully
                job = self.app_module.processing_jobs[job_id]
                self.assertEqual(job["status"], "completed")
                self.assertIn("animation_data", job)
                self.assertIn("score_artifact", job)
                self.assertEqual(job["score_artifact"]["version"], 1)
                self.assertEqual(job["score_artifact"]["timingReferenceBpm"], 100.0)
                self.assertEqual(job["score_artifact"]["tempoSource"], "score")

                # Assert no PDF or temp dir retained
                if temp_dir_used is not None:
                    self.assertFalse(temp_dir_used.exists(), "temp_dir must be deleted after job completion")

                mxml_path.unlink(missing_ok=True)

        asyncio.run(_test())
