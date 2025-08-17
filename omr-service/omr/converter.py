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
            
            # Build ClairKeys animation data structure
            animation_data = {
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
        """Extract notes from MusicXML and convert to ClairKeys format"""
        notes = []
        current_time = 0.0
        
        # Find all parts (typically separate hands/voices)
        parts = root.findall('.//part')
        
        for part_idx, part in enumerate(parts):
            part_time = 0.0
            
            # Determine hand assignment (simple heuristic)
            hand = "R" if part_idx == 0 else "L"  # First part = right hand, second = left hand
            
            # Find all measures in this part
            measures = part.findall('measure')
            
            for measure in measures:
                measure_time = part_time
                
                # Find all notes in this measure
                note_elements = measure.findall('note')
                
                for note_elem in note_elements:
                    note_data = self._parse_note_element(note_elem, measure_time, hand)
                    if note_data:
                        notes.append(note_data)
                        measure_time = note_data['start'] + note_data['duration']
                
                part_time = measure_time
        
        # Sort notes by start time
        notes.sort(key=lambda n: n['start'])
        
        return notes
    
    def _parse_note_element(self, note_elem: ET.Element, current_time: float, hand: str) -> Optional[Dict[str, Any]]:
        """Parse individual note element"""
        try:
            # Skip rests
            if note_elem.find('rest') is not None:
                # Still need to advance time for rests
                duration_elem = note_elem.find('duration')
                if duration_elem is not None:
                    duration = float(duration_elem.text) / 4.0  # Convert to seconds (assuming quarter note = 1 second)
                return None
            
            # Get pitch information
            pitch_elem = note_elem.find('pitch')
            if pitch_elem is None:
                return None
            
            step = pitch_elem.find('step').text
            octave = int(pitch_elem.find('octave').text)
            alter = pitch_elem.find('alter')
            alter_value = int(alter.text) if alter is not None else 0
            
            # Convert to MIDI note number
            midi_num = self._note_to_midi(step, octave, alter_value)
            if midi_num is None:
                return None
            
            # Get duration
            duration_elem = note_elem.find('duration')
            duration = float(duration_elem.text) / 4.0 if duration_elem is not None else 0.5  # Default to quarter note
            
            # Get fingering if available
            fingering_elem = note_elem.find('.//fingering')
            finger = int(fingering_elem.text) if fingering_elem is not None and fingering_elem.text.isdigit() else None
            
            # Ensure finger is within valid range (1-5)
            if finger is not None and (finger < 1 or finger > 5):
                finger = None
            
            return {
                "midi": midi_num,
                "start": current_time,
                "duration": duration,
                "hand": hand,
                "finger": finger
            }
            
        except Exception as e:
            logger.warning(f"Error parsing note element: {str(e)}")
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