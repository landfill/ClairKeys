/**
 * Convert MIDI format JSON to ClairKeys animation format
 */

const fs = require('fs');
const path = require('path');

// MIDI note number to note name conversion
function midiToNoteName(midi) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

// Determine hand based on MIDI note (simple heuristic)
function determineHand(midi) {
  // Middle C (MIDI 60) and above typically right hand
  // Below middle C typically left hand
  return midi >= 60 ? 'right' : 'left';
}

// Simple fingering assignment based on hand and note range
function assignFinger(midi, hand) {
  if (hand === 'left') {
    // Left hand fingering (5 = pinky, 1 = thumb)
    if (midi < 48) return 5; // Very low notes - pinky
    if (midi < 52) return 4; // Low notes - ring finger
    if (midi < 57) return 3; // Medium notes - middle finger
    if (midi < 60) return 2; // Higher notes - index finger
    return 1; // Highest notes for left hand - thumb
  } else {
    // Right hand fingering (1 = thumb, 5 = pinky)
    if (midi < 65) return 1; // Lower notes for right hand - thumb
    if (midi < 70) return 2; // Low-medium notes - index finger
    if (midi < 75) return 3; // Medium notes - middle finger
    if (midi < 80) return 4; // High notes - ring finger
    return 5; // Very high notes - pinky
  }
}

// Convert MIDI JSON to ClairKeys format
function convertToClairKeys(midiData, title = "Converted Song", composer = "Unknown") {
  // Convert notes
  const notes = midiData.map(note => {
    const noteName = midiToNoteName(note.midi);
    const hand = determineHand(note.midi);
    const finger = assignFinger(note.midi, hand);
    
    return {
      note: noteName,
      startTime: note.start,
      duration: note.duration,
      velocity: note.velocity,
      hand: hand,
      finger: finger
    };
  });

  // Calculate total duration
  const totalDuration = Math.max(...notes.map(note => note.startTime + note.duration));

  // Create ClairKeys format
  return {
    version: "1.0",
    title: title,
    composer: composer,
    duration: totalDuration,
    tempo: 120,
    timeSignature: "4/4",
    notes: notes,
    metadata: {
      convertedFrom: "MIDI format",
      convertedAt: new Date().toISOString(),
      totalNotes: notes.length,
      fingeringAdded: true
    }
  };
}

// Main conversion function
function convertFile(inputPath, outputPath, title, composer) {
  try {
    console.log(`🔄 Converting ${inputPath}...`);
    
    // Read input file
    const midiData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`📊 Found ${midiData.length} notes to convert`);
    
    // Convert to ClairKeys format
    const clairKeysData = convertToClairKeys(midiData, title, composer);
    
    // Write output file
    fs.writeFileSync(outputPath, JSON.stringify(clairKeysData, null, 2));
    
    console.log(`✅ Conversion completed!`);
    console.log(`📄 Input: ${inputPath}`);
    console.log(`📄 Output: ${outputPath}`);
    console.log(`🎵 Title: ${title}`);
    console.log(`👨‍🎼 Composer: ${composer}`);
    console.log(`📊 Notes: ${clairKeysData.notes.length}`);
    console.log(`⏱️ Duration: ${clairKeysData.duration} seconds`);
    console.log(`👆 Fingering: Added`);
    
    return clairKeysData;
    
  } catch (error) {
    console.error(`❌ Conversion failed:`, error.message);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];
  const title = process.argv[4] || "Converted Song";
  const composer = process.argv[5] || "Unknown";
  
  if (!inputFile || !outputFile) {
    console.log('Usage: node convert-midi-to-clairkeys.js <input.json> <output.json> [title] [composer]');
    process.exit(1);
  }
  
  convertFile(inputFile, outputFile, title, composer);
}

module.exports = { convertToClairKeys, convertFile };