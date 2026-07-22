"""
MusicXML to ClairKeys Converter
Converts MusicXML files to ClairKeys animation data format
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
import xml.etree.ElementTree as ET
from datetime import datetime

logger = logging.getLogger(__name__)

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
    
    async def convert(self, musicxml_path: Path, title: Optional[str] = None, composer: Optional[str] = None) -> Dict[str, Any]:
        """
        Convert MusicXML file to ClairKeys animation data format
        
        Args:
            musicxml_path: Path to MusicXML file
            title: Optional title for the piece
            composer: Optional composer name
            
        Returns:
            ClairKeys animation data as dictionary
        """
        try:
            logger.info(f"Converting MusicXML to ClairKeys format: {musicxml_path}")
            
            # Parse MusicXML file
            tree = ET.parse(musicxml_path)
            root = tree.getroot()
            
            # Extract basic metadata
            metadata = self._extract_metadata(root, title, composer)
            logger.info(f"Extracted metadata: {metadata}")
            
            # Extract notes and timing information
            notes = self._extract_notes(root)
            logger.info(f"Extracted {len(notes)} notes")
            
            # Build ClairKeys animation data structure.
            # Emit the canonical contract shape explicitly (version + top-level
            # title/composer) rather than relying on the TS validator's tolerance
            # for the old metadata-nested layout. See P0-A / D-009.
            animation_data = {
                "version": "1.0",
                "title": metadata.get("title", "Untitled"),
                "composer": metadata.get("composer", "Unknown"),
                "metadata": metadata,
                "notes": notes,
                "duration": self._calculate_duration(notes),
                "tempo": self._extract_tempo(root),
                "keySignature": self._extract_key_signature(root),
                "timeSignature": self._extract_time_signature(root),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Successfully converted to ClairKeys format")
            return animation_data
            
        except Exception as e:
            logger.error(f"Error converting MusicXML: {str(e)}")
            raise
    
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
    
    def _extract_notes(self, root: ET.Element) -> List[Dict[str, Any]]:
        """Extract notes from MusicXML into canonical timed notes.

        Timing is accumulated in *seconds*, not divisions, because tempo can
        change between measures and each change re-scales tick->second. Within a
        measure a cursor tracks the seconds offset so `<backup>`/`<forward>` and
        `<chord>` place notes at the right onset; `<tie>` merges durations instead
        of emitting a second note. Hand comes from `<staff>` (1->R, 2->L), falling
        back to the part index only when no staff is given.
        """
        notes: List[Dict[str, Any]] = []
        parts = root.findall('.//part')
        # Tempo is a score-wide property in MusicXML: a <sound tempo> / <per-minute>
        # in one part (conventionally the first) governs playback for every part at
        # that measure position. Build one measure-indexed timeline from all parts so
        # a tempo change declared in one part re-scales the others' timing too.
        tempo_timeline = self._build_tempo_timeline(parts, self._extract_tempo(root))

        for part_idx, part in enumerate(parts):
            divisions = 1
            measure_start_sec = 0.0
            # Tie state must persist across measure boundaries — a note tied into the
            # next measure has to merge with the note that opened the tie — so
            # open_ties lives at part scope, not per measure.
            open_ties: Dict[Any, Dict[str, Any]] = {}  # (midi, voice) -> tie-open note

            for measure_idx, measure in enumerate(part.findall('measure')):
                attributes = measure.find('attributes')
                if attributes is not None:
                    div_elem = attributes.find('divisions')
                    if div_elem is not None and div_elem.text:
                        try:
                            divisions = int(div_elem.text)
                        except ValueError:
                            pass
                if divisions <= 0:
                    divisions = 1

                tempo = tempo_timeline[measure_idx] if measure_idx < len(tempo_timeline) else self._extract_tempo(root)
                sec_per_tick = (60.0 / tempo) / divisions if tempo > 0 else 0.0

                cursor_sec = 0.0        # seconds offset from measure_start_sec
                measure_max_sec = 0.0   # furthest point reached (measure length)
                last_onset_sec = 0.0    # onset of the last non-chord note (chords share it)

                for elem in list(measure):
                    tag = elem.tag
                    if tag == 'backup':
                        cursor_sec = max(0.0, cursor_sec - self._duration_ticks(elem) * sec_per_tick)
                        continue
                    if tag == 'forward':
                        cursor_sec += self._duration_ticks(elem) * sec_per_tick
                        measure_max_sec = max(measure_max_sec, cursor_sec)
                        continue
                    if tag != 'note':
                        continue

                    dur_sec = self._duration_ticks(elem) * sec_per_tick
                    is_chord = elem.find('chord') is not None
                    onset_sec = last_onset_sec if is_chord else cursor_sec
                    end_sec = onset_sec + dur_sec

                    # Rests and unpitched/unparseable notes advance time but emit nothing.
                    parsed = None if elem.find('rest') is not None else self._parse_pitch(elem)
                    if parsed is not None:
                        midi_num, voice, staff = parsed
                        tie_start, tie_stop = self._tie_flags(elem)
                        key = (midi_num, voice)
                        if tie_stop and key in open_ties:
                            started = open_ties[key]
                            started['duration'] = round(started['duration'] + dur_sec, 6)
                            if not tie_start:
                                del open_ties[key]
                        else:
                            note: Dict[str, Any] = {
                                "midi": midi_num,
                                "start": round(measure_start_sec + onset_sec, 6),
                                "duration": round(dur_sec, 6),
                                "hand": self._hand_for(staff, part_idx),
                                "finger": self._fingering(elem),
                            }
                            if voice is not None:
                                note["voice"] = voice
                            if staff is not None:
                                note["staff"] = staff
                            notes.append(note)
                            if tie_start:
                                open_ties[key] = note

                    if not is_chord:
                        cursor_sec = end_sec
                        last_onset_sec = onset_sec
                    measure_max_sec = max(measure_max_sec, end_sec)

                measure_start_sec += measure_max_sec

        notes.sort(key=lambda n: (n['start'], n['midi']))
        return notes

    def _duration_ticks(self, elem: ET.Element) -> int:
        """Read a `<duration>` child as an integer tick count (0 if absent)."""
        dur_elem = elem.find('duration')
        if dur_elem is not None and dur_elem.text:
            try:
                return int(dur_elem.text)
            except ValueError:
                try:
                    return int(float(dur_elem.text))
                except ValueError:
                    return 0
        return 0

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
        """Find a tempo (BPM) declared in this measure, or None."""
        sound = measure.find('.//sound[@tempo]')
        if sound is not None:
            try:
                return float(sound.get('tempo'))
            except (TypeError, ValueError):
                pass
        per_minute = measure.find('.//per-minute')
        if per_minute is not None and per_minute.text:
            try:
                return float(per_minute.text)
            except ValueError:
                pass
        return None

    def _build_tempo_timeline(self, parts: List[ET.Element], initial_tempo: float) -> List[float]:
        """Build a measure-indexed tempo (BPM) timeline shared across all parts.

        For each measure position, the first tempo declared by any part (scanning
        parts in document order) wins and carries forward until the next change.
        This mirrors MusicXML's convention that a tempo direction in one part is a
        global playback change, so parts that carry no tempo of their own still get
        re-scaled at a measure where another part changed tempo.
        """
        max_measures = max((len(part.findall('measure')) for part in parts), default=0)
        timeline: List[float] = []
        current = initial_tempo
        for i in range(max_measures):
            for part in parts:
                measures = part.findall('measure')
                if i < len(measures):
                    measure_tempo = self._find_tempo(measures[i])
                    if measure_tempo is not None and measure_tempo > 0:
                        current = measure_tempo
                        break
            timeline.append(current)
        return timeline

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
    
    def _extract_tempo(self, root: ET.Element) -> int:
        """Extract tempo from MusicXML (BPM)"""
        # Look for tempo marking
        tempo_elem = root.find('.//per-minute')
        if tempo_elem is not None and tempo_elem.text:
            try:
                return int(float(tempo_elem.text))
            except ValueError:
                pass
        
        # Default tempo
        return 120
    
    def _extract_key_signature(self, root: ET.Element) -> str:
        """Extract key signature from MusicXML"""
        key_elem = root.find('.//key')
        if key_elem is not None:
            fifths_elem = key_elem.find('fifths')
            if fifths_elem is not None:
                fifths = int(fifths_elem.text)
                # Convert circle of fifths to key name (simplified)
                keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
                if 0 <= fifths < len(keys):
                    return keys[fifths]
        
        return "C"  # Default to C major
    
    def _extract_time_signature(self, root: ET.Element) -> str:
        """Extract time signature from MusicXML"""
        time_elem = root.find('.//time')
        if time_elem is not None:
            beats = time_elem.find('beats')
            beat_type = time_elem.find('beat-type')
            if beats is not None and beat_type is not None:
                return f"{beats.text}/{beat_type.text}"
        
        return "4/4"  # Default time signature