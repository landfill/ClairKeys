"""
MusicXML to ClairKeys Converter
Converts MusicXML files to ClairKeys animation data format
"""

from datetime import datetime, timezone
import json
import logging
import math
from pathlib import Path, PurePosixPath
import re
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET
import zipfile

from omr.musicxml_timing import QuarterClock, ScoreTimeline, scan_score
from omr.score_artifact import build_score_artifact

logger = logging.getLogger(__name__)

DEFAULT_TIMING_REFERENCE_BPM = 60.0

_QUARTER_NOTE_MULTIPLIERS = {
    "breve": 8.0,
    "long": 16.0,
    "whole": 4.0,
    "half": 2.0,
    "quarter": 1.0,
    "eighth": 0.5,
    "16th": 0.25,
    "32nd": 0.125,
    "64th": 0.0625,
    "128th": 0.03125,
}

_TRADITIONAL_KEY_NAMES = {
    "major": (
        "Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C",
        "G", "D", "A", "E", "B", "F#", "C#",
    ),
    "minor": (
        "Abm", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm", "Am",
        "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m",
    ),
}

class MusicXMLToClairKeysConverter:
    """Converts MusicXML to ClairKeys animation data format"""
    
    def __init__(self):
        # MIDI note number to note name mapping
        self.midi_to_note = {}
        self._build_midi_mapping()
        
    def _build_midi_mapping(self):
        """Build MIDI note number to note name mapping"""
        note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        for midi_num in range(21, 109):  # Piano range A0 (21) to C8 (108)
            octave = (midi_num - 12) // 12
            note_index = (midi_num - 12) % 12
            note_name = f"{note_names[note_index]}{octave}"
            self.midi_to_note[midi_num] = note_name
    
    async def convert_with_artifact(
        self,
        musicxml_path: Path,
        title: Optional[str] = None,
        composer: Optional[str] = None,
        tempo: Optional[float] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Convert MusicXML file to ClairKeys animation data format and score artifact.
        
        Args:
            musicxml_path: Path to MusicXML file
            title: Optional title for the piece
            composer: Optional composer name
            tempo: Optional user-supplied quarter-note BPM
            
        Returns:
            Tuple of (animation_data, score_artifact)
        """
        try:
            logger.info(f"Converting MusicXML to ClairKeys format and artifact: {musicxml_path}")
            
            # Audiveris exports compressed MusicXML (.mxl). Resolve its declared
            # root document without extracting the archive; plain MusicXML remains
            # supported for the existing converter corpus.
            tree = self._parse_musicxml(musicxml_path)
            root = tree.getroot()
            
            # Extract basic metadata
            metadata = self._extract_metadata(root, title, composer)
            logger.info(f"Extracted metadata: {metadata}")

            timeline = scan_score(root, self._find_tempo)
            if timeline.warnings:
                metadata['timingWarnings'] = timeline.warnings
            score_tempo = timeline.opening_tempo
            resolved_tempo = tempo if tempo is not None else score_tempo
            if tempo is not None:
                tempo_source = "user"
            elif score_tempo is not None:
                tempo_source = "score"
            else:
                tempo_source = "unknown"
            timing_reference_bpm = (
                resolved_tempo
                if resolved_tempo is not None
                else DEFAULT_TIMING_REFERENCE_BPM
            )

            if not math.isfinite(timing_reference_bpm) or timing_reference_bpm <= 0:
                raise ValueError("Tempo must be greater than zero")
            
            use_score_tempo_changes = tempo is None
            clock = QuarterClock(
                timing_reference_bpm,
                timeline.tempos if use_score_tempo_changes else {},
            )
            notes, note_mappings, clock = self._extract_notes_and_mappings(
                root,
                timing_reference_bpm,
                use_score_tempo_changes=use_score_tempo_changes,
                timeline=timeline,
                clock=clock,
            )
            logger.info(f"Extracted {len(notes)} notes")
            
            # Build ClairKeys animation data structure.
            animation_data = {
                "version": "1.1",
                "title": metadata.get("title", "Untitled"),
                "composer": metadata.get("composer", "Unknown"),
                "metadata": metadata,
                "notes": notes,
                "duration": self._calculate_duration(notes),
                "tempo": resolved_tempo,
                "tempoSource": tempo_source,
                "timingReferenceBpm": timing_reference_bpm,
                "scoreTempo": score_tempo,
                "timeSignature": self._extract_time_signature(root),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
            key_signature = self._extract_key_signature(root)
            if key_signature is not None:
                animation_data["keySignature"] = key_signature
            
            score_artifact = build_score_artifact(
                root=root,
                timeline=timeline,
                clock=clock,
                notes=notes,
                note_mappings=note_mappings,
                timing_reference_bpm=timing_reference_bpm,
                tempo_source=tempo_source,
            )

            logger.info("Successfully converted to ClairKeys format with artifact")
            return animation_data, score_artifact
            
        except Exception as e:
            logger.error(f"Error converting MusicXML: {str(e)}")
            raise

    async def convert(
        self,
        musicxml_path: Path,
        title: Optional[str] = None,
        composer: Optional[str] = None,
        tempo: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Convert MusicXML file to ClairKeys animation data format (legacy/standard)."""
        animation_data, _ = await self.convert_with_artifact(
            musicxml_path, title, composer, tempo
        )
        return animation_data

    def _parse_musicxml(self, musicxml_path: Path) -> ET.ElementTree:
        """Parse plain MusicXML or the root document declared by an MXL container."""
        if not zipfile.is_zipfile(musicxml_path):
            return ET.parse(musicxml_path)

        with zipfile.ZipFile(musicxml_path) as archive:
            try:
                container = ET.fromstring(archive.read("META-INF/container.xml"))
            except KeyError as exc:
                raise ValueError("MXL archive has no META-INF/container.xml") from exc

            rootfile = container.find(
                ".//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile"
            )
            if rootfile is None:
                rootfile = container.find(".//rootfile")

            root_path = rootfile.get("full-path") if rootfile is not None else None
            if not root_path:
                raise ValueError("MXL container does not declare a root MusicXML file")

            archive_path = PurePosixPath(root_path)
            if archive_path.is_absolute() or ".." in archive_path.parts:
                raise ValueError(f"Unsafe MXL root path: {root_path}")

            try:
                with archive.open(root_path) as musicxml:
                    return ET.parse(musicxml)
            except KeyError as exc:
                raise ValueError(
                    f"MXL root MusicXML file is missing: {root_path}"
                ) from exc
    
    def _extract_metadata(self, root: ET.Element, title: Optional[str], composer: Optional[str]) -> Dict[str, Any]:
        """Extract metadata from MusicXML"""
        metadata = {}
        
        # Try to get title from XML or use provided title
        work_title = root.find('.//work-title')
        if work_title is not None and work_title.text:
            metadata['title'] = work_title.text.strip()
        elif title:
            metadata['title'] = title
        else:
            metadata['title'] = "Untitled"
        
        # Try to get composer from XML or use provided composer
        creator = root.find('.//creator[@type="composer"]')
        if creator is not None and creator.text:
            metadata['composer'] = creator.text.strip()
        elif composer:
            metadata['composer'] = composer
        else:
            metadata['composer'] = "Unknown"
        
        return metadata
    
    def _extract_notes_and_mappings(
        self,
        root: ET.Element,
        initial_tempo: float,
        use_score_tempo_changes: bool = True,
        timeline: Optional[ScoreTimeline] = None,
        clock: Optional[QuarterClock] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Tuple[str, Dict[str, Any]]], QuarterClock]:
        """Interpret musical positions first, then integrate a shared tempo map."""
        timeline = timeline or scan_score(root, self._find_tempo)
        clock = clock or QuarterClock(initial_tempo, timeline.tempos if use_score_tempo_changes else {})
        notes: List[Dict[str, Any]] = []
        note_mappings: List[Tuple[str, Dict[str, Any]]] = []
        for part_idx, measures in enumerate(timeline.parts):
            open_ties: Dict[Any, Dict[str, Any]] = {}
            for measure_idx, measure in enumerate(measures):
                note_seq = 0
                for elem, onset, duration in measure.notes:
                    parsed = None if elem.find('rest') is not None else self._parse_pitch(elem)
                    if parsed is None:
                        continue
                    note_seq += 1
                    xml_id = f"p{part_idx + 1}-m{measure_idx + 1}-n{note_seq}"
                    elem.set("id", xml_id)

                    midi_num, voice, staff = parsed
                    start_quarter = timeline.starts[part_idx][measure_idx] + onset
                    dur_sec = clock.duration(start_quarter, start_quarter + duration)
                    tie_start, tie_stop = self._tie_flags(elem)
                    key = (midi_num, voice)
                    if tie_stop and key in open_ties:
                        started = open_ties[key]
                        started['duration'] = round(started['duration'] + dur_sec, 6)
                        note_mappings.append((xml_id, started))
                        if not tie_start:
                            del open_ties[key]
                    else:
                        note: Dict[str, Any] = {
                            "midi": midi_num,
                            "start": round(clock.at(start_quarter), 6),
                            "duration": round(dur_sec, 6),
                            "hand": self._hand_for(staff, part_idx),
                            "finger": self._fingering(elem),
                        }
                        if voice is not None:
                            note["voice"] = voice
                        if staff is not None:
                            note["staff"] = staff
                        notes.append(note)
                        note_mappings.append((xml_id, note))
                        if tie_start:
                            open_ties[key] = note
        notes.sort(key=lambda n: (n['start'], n['midi']))
        return notes, note_mappings, clock

    def _extract_notes(
        self,
        root: ET.Element,
        initial_tempo: float,
        use_score_tempo_changes: bool = True,
        timeline: Optional[ScoreTimeline] = None,
    ) -> List[Dict[str, Any]]:
        notes, _, _ = self._extract_notes_and_mappings(
            root, initial_tempo, use_score_tempo_changes, timeline
        )
        return notes

    def _parse_pitch(self, note_elem: ET.Element) -> Optional[tuple]:
        """Return (midi, voice, staff) for a pitched note, or None if unpitched."""
        pitch_elem = note_elem.find('pitch')
        if pitch_elem is None:
            return None
        step_elem = pitch_elem.find('step')
        octave_elem = pitch_elem.find('octave')
        if step_elem is None or not step_elem.text or octave_elem is None or not octave_elem.text:
            return None
        try:
            octave = int(octave_elem.text)
        except ValueError:
            return None
        alter_elem = pitch_elem.find('alter')
        alter_value = 0
        if alter_elem is not None and alter_elem.text:
            try:
                alter_value = int(alter_elem.text)
            except ValueError:
                alter_value = 0

        midi_num = self._note_to_midi(step_elem.text, octave, alter_value)
        if midi_num is None:
            return None

        voice = self._int_child(note_elem, 'voice')
        staff = self._int_child(note_elem, 'staff')
        return midi_num, voice, staff

    @staticmethod
    def _int_child(elem: ET.Element, tag: str) -> Optional[int]:
        child = elem.find(tag)
        if child is not None and child.text and child.text.strip().isdigit():
            return int(child.text.strip())
        return None

    def _hand_for(self, staff: Optional[int], part_idx: int) -> str:
        """Assign hand from staff (1->R, >=2->L); fall back to part index."""
        if staff == 1:
            return "R"
        if staff is not None and staff >= 2:
            return "L"
        return "R" if part_idx == 0 else "L"

    @staticmethod
    def _tie_flags(note_elem: ET.Element) -> tuple:
        """Return (tie_start, tie_stop) from the sounding `<tie>` elements."""
        tie_start = tie_stop = False
        for tie in note_elem.findall('tie'):
            tie_type = tie.get('type')
            if tie_type == 'start':
                tie_start = True
            elif tie_type == 'stop':
                tie_stop = True
        return tie_start, tie_stop

    @staticmethod
    def _fingering(note_elem: ET.Element) -> Optional[int]:
        """Read a fingering 1-5, or None."""
        fingering_elem = note_elem.find('.//fingering')
        if fingering_elem is not None and fingering_elem.text and fingering_elem.text.strip().isdigit():
            finger = int(fingering_elem.text.strip())
            if 1 <= finger <= 5:
                return finger
        return None

    def _find_tempo(self, measure: ET.Element) -> Optional[float]:
        """Find a quarter-note BPM declared in this measure, or None.

        MusicXML defines `<sound tempo>` directly in quarter notes per minute,
        while a printed `<metronome>` pairs its number with a beat unit that
        must first be converted. Keep `sound` first because it is the playback
        value and needs no beat-unit conversion.
        """
        sound = measure if measure.tag == 'sound' else measure.find('.//sound[@tempo]')
        if sound is not None:
            try:
                tempo = float(sound.get('tempo'))
                if math.isfinite(tempo) and tempo > 0:
                    return tempo
            except (TypeError, ValueError):
                pass

        for metronome in measure.findall('.//metronome'):
            tempo = self._metronome_quarter_bpm(metronome)
            if tempo is not None:
                return tempo
        return None

    def _note_to_midi(self, step: str, octave: int, alter: int = 0) -> Optional[int]:
        """Convert note name to MIDI number"""
        try:
            # Base MIDI numbers for each note in octave 4
            base_notes = {'C': 60, 'D': 62, 'E': 64, 'F': 65, 'G': 67, 'A': 69, 'B': 71}
            
            if step not in base_notes:
                return None
            
            # Calculate MIDI number
            midi_num = base_notes[step] + (octave - 4) * 12 + alter
            
            # Ensure within piano range
            if 21 <= midi_num <= 108:
                return midi_num
            
            return None
            
        except Exception:
            return None
    
    def _calculate_duration(self, notes: List[Dict[str, Any]]) -> float:
        """Calculate total duration of the piece"""
        if not notes:
            return 0.0
        
        # Find the latest note end time
        max_end_time = max(note['start'] + note['duration'] for note in notes)
        return max_end_time
    
    @staticmethod
    def _metronome_quarter_bpm(metronome: ET.Element) -> Optional[float]:
        """Convert a regular MusicXML metronome mark to quarter-note BPM."""
        beat_unit = metronome.find('beat-unit')
        per_minute = metronome.find('per-minute')
        if (
            beat_unit is None
            or not beat_unit.text
            or per_minute is None
            or not per_minute.text
        ):
            return None

        multiplier = _QUARTER_NOTE_MULTIPLIERS.get(beat_unit.text.strip())
        if multiplier is None:
            return None

        try:
            per_minute_value = float(per_minute.text)
        except ValueError:
            return None
        if per_minute_value <= 0:
            return None

        dot_count = len(metronome.findall('beat-unit-dot'))
        # MusicXML 4.0 calls each <beat-unit-dot/> an augmentation dot and
        # permits zero or more of them:
        # https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/beat-unit-dot/
        # Augmentation dots add successive halves of the previous addition, so
        # one dot is 1.5x and two are 1.75x (not 1.5x * 1.5x).
        dot_multiplier = 2.0 - (0.5 ** dot_count)
        return per_minute_value * multiplier * dot_multiplier

    def _extract_tempo(self, root: ET.Element) -> Optional[float]:
        """Only a tempo effective at quarter zero describes the opening."""
        return scan_score(root, self._find_tempo).opening_tempo

    def _extract_key_signature(self, root: ET.Element) -> Optional[str]:
        """Decode the first key declaration without guessing unreadable metadata."""
        key_elem = root.find('.//key')
        if key_elem is None:
            return None

        fifths_elem = key_elem.find('fifths')
        if fifths_elem is None or fifths_elem.text is None:
            return None
        fifths_text = fifths_elem.text.strip()
        if re.fullmatch(r"[+-]?[0-9]+", fifths_text) is None:
            return None
        digits = fifths_text[1:] if fifths_text[0] in "+-" else fifths_text
        digits = digits.lstrip("0") or "0"
        # Bound the textual magnitude before int(): huge invalid values must
        # not hit Python's digit limit or consume arbitrary bigint work.
        if len(digits) != 1 or digits > "7":
            return None
        fifths = int(digits) * (-1 if fifths_text.startswith("-") else 1)

        mode_elem = key_elem.find('mode')
        if mode_elem is None:
            mode = "major"
        elif mode_elem.text is None:
            return None
        else:
            mode = mode_elem.text.strip().lower()
            if mode not in _TRADITIONAL_KEY_NAMES:
                return None

        return _TRADITIONAL_KEY_NAMES[mode][fifths + 7]
    
    def _extract_time_signature(self, root: ET.Element) -> str:
        """Extract time signature from MusicXML"""
        time_elem = root.find('.//time')
        if time_elem is not None:
            beats = time_elem.find('beats')
            beat_type = time_elem.find('beat-type')
            if beats is not None and beat_type is not None:
                return f"{beats.text}/{beat_type.text}"
        
        return "4/4"  # Default time signature
