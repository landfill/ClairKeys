"""Score artifact builder for ClairKeys OMR (ISSUE-125).

Builds a score artifact containing:
- version: 1
- musicxml: Plain MusicXML string (score-partwise, no DOCTYPE, max 10MiB)
- measures: [{partIndex, measureIndex, start, end, startQuarter, endQuarter}]
- notes: [{xmlId, noteIndex}]
- timingReferenceBpm: float
- tempoSource: str ("score" | "user" | "unknown")
"""

from fractions import Fraction
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

from omr.musicxml_timing import QuarterClock, ScoreTimeline

logger = logging.getLogger(__name__)

MAX_ARTIFACT_XML_BYTES = 10 * 1024 * 1024  # 10 MiB


def build_score_artifact(
    root: ET.Element,
    timeline: ScoreTimeline,
    clock: QuarterClock,
    notes: List[Dict[str, Any]],
    note_mappings: List[Tuple[str, Dict[str, Any]]],
    timing_reference_bpm: float,
    tempo_source: str,
) -> Dict[str, Any]:
    """Build the authenticated score_artifact for /result."""
    if root.tag != "score-partwise":
        raise ValueError(f"Expected root tag score-partwise, got {root.tag}")

    # 1. Map each unique XML note id to the final sorted canonical note index
    note_to_index = {id(n): idx for idx, n in enumerate(notes)}
    artifact_notes: List[Dict[str, Any]] = []
    for xml_id, canonical_note in note_mappings:
        note_idx = note_to_index.get(id(canonical_note))
        if note_idx is not None:
            artifact_notes.append({
                "xmlId": xml_id,
                "noteIndex": note_idx,
            })

    # 2. Build measures list
    artifact_measures: List[Dict[str, Any]] = []
    independent = [any(m.non_controlling for m in part) for part in timeline.parts]

    for part_idx, part in enumerate(timeline.parts):
        measure_count = len(part)
        for measure_idx, measure in enumerate(part):
            start_q = timeline.starts[part_idx][measure_idx]
            if measure_idx + 1 < measure_count:
                end_q = timeline.starts[part_idx][measure_idx + 1]
            else:
                if independent[part_idx]:
                    end_q = start_q + measure.length
                else:
                    bar_len = max(
                        (
                            p[measure_idx].length
                            for p_idx, p in enumerate(timeline.parts)
                            if not independent[p_idx] and measure_idx < len(p)
                        ),
                        default=measure.length,
                    )
                    end_q = start_q + bar_len

            if measure.length > (end_q - start_q):
                end_q = start_q + measure.length

            start_sec = round(clock.at(start_q), 6)
            end_sec = round(clock.at(end_q), 6)

            artifact_measures.append({
                "partIndex": part_idx,
                "measureIndex": measure_idx,
                "start": start_sec,
                "end": end_sec,
                "startQuarter": float(start_q),
                "endQuarter": float(end_q),
            })

    # 3. Serialize MusicXML string (ensure no DOCTYPE and <= 10MiB)
    musicxml_str = ET.tostring(root, encoding="utf-8").decode("utf-8")
    if "<!DOCTYPE" in musicxml_str:
        musicxml_str = re.sub(r"<!DOCTYPE[^>]*>\s*", "", musicxml_str)

    xml_bytes = musicxml_str.encode("utf-8")
    if len(xml_bytes) > MAX_ARTIFACT_XML_BYTES:
        raise ValueError(
            f"Serialized MusicXML exceeds {MAX_ARTIFACT_XML_BYTES} bytes ({len(xml_bytes)} bytes)"
        )

    return {
        "version": 1,
        "musicxml": musicxml_str,
        "measures": artifact_measures,
        "notes": artifact_notes,
        "timingReferenceBpm": timing_reference_bpm,
        "tempoSource": tempo_source,
    }
