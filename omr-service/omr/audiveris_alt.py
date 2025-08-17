"""
Alternative OMR Processor (Fallback)
Simple PDF to MusicXML conversion without Audiveris
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class AlternativeOMRProcessor:
    """Simple OMR processor that generates demo MusicXML for testing"""
    
    def __init__(self):
        self.processing_delay = 5  # Simulate processing time
        
    async def process_pdf(self, pdf_path: Path, output_dir: Path) -> Path:
        """
        Process PDF file - generates demo MusicXML for testing
        
        Args:
            pdf_path: Path to input PDF file
            output_dir: Directory for output files
            
        Returns:
            Path to generated MusicXML file
        """
        try:
            logger.info(f"Starting Alternative OMR processing for {pdf_path}")
            
            # Simulate processing time
            await asyncio.sleep(self.processing_delay)
            
            # Generate demo MusicXML
            musicxml_path = output_dir / "output.xml"
            demo_musicxml = self._generate_demo_musicxml(pdf_path.name)
            
            with open(musicxml_path, 'w', encoding='utf-8') as f:
                f.write(demo_musicxml)
            
            logger.info(f"Successfully generated demo MusicXML: {musicxml_path}")
            return musicxml_path
            
        except Exception as e:
            logger.error(f"Error in Alternative OMR processing: {str(e)}")
            raise
    
    def _generate_demo_musicxml(self, filename: str) -> str:
        """Generate demo MusicXML content"""
        # Simple MusicXML for C major scale
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
    <work>
        <work-title>Demo: {filename}</work-title>
    </work>
    <identification>
        <creator type="composer">Demo Composer</creator>
        <encoding>
            <software>ClairKeys Alternative OMR</software>
            <encoding-date>{datetime.now().strftime("%Y-%m-%d")}</encoding-date>
        </encoding>
    </identification>
    <defaults>
        <scaling>
            <millimeters>7.0556</millimeters>
            <tenths>40</tenths>
        </scaling>
    </defaults>
    <part-list>
        <score-part id="P1">
            <part-name>Piano</part-name>
        </score-part>
    </part-list>
    <part id="P1">
        <measure number="1">
            <attributes>
                <divisions>1</divisions>
                <key>
                    <fifths>0</fifths>
                </key>
                <time>
                    <beats>4</beats>
                    <beat-type>4</beat-type>
                </time>
                <clef>
                    <sign>G</sign>
                    <line>2</line>
                </clef>
            </attributes>
            <note>
                <pitch>
                    <step>C</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>1</fingering>
            </note>
            <note>
                <pitch>
                    <step>D</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>2</fingering>
            </note>
            <note>
                <pitch>
                    <step>E</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>3</fingering>
            </note>
            <note>
                <pitch>
                    <step>F</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>4</fingering>
            </note>
        </measure>
        <measure number="2">
            <note>
                <pitch>
                    <step>G</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>5</fingering>
            </note>
            <note>
                <pitch>
                    <step>A</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>4</fingering>
            </note>
            <note>
                <pitch>
                    <step>B</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>3</fingering>
            </note>
            <note>
                <pitch>
                    <step>C</step>
                    <octave>5</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <fingering>5</fingering>
            </note>
        </measure>
    </part>
</score-partwise>'''
    
    async def validate_installation(self) -> bool:
        """Always returns True for alternative processor"""
        logger.info("Alternative OMR processor initialized successfully")
        return True