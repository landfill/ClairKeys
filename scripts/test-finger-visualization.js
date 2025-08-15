/**
 * Test finger visualization by creating sample animation data with finger info
 */

const fs = require('fs');
const path = require('path');

// Create test animation data with finger information
const testAnimationData = {
  version: '1.0',
  title: 'Finger Visualization Test',
  composer: 'ClairKeys',
  duration: 8,
  tempo: 120,
  timeSignature: '4/4',
  notes: [
    // Right hand C major scale with proper fingering
    { note: 'C4', startTime: 0, duration: 0.5, velocity: 0.8, hand: 'right', finger: 1 },
    { note: 'D4', startTime: 0.5, duration: 0.5, velocity: 0.8, hand: 'right', finger: 2 },
    { note: 'E4', startTime: 1, duration: 0.5, velocity: 0.8, hand: 'right', finger: 3 },
    { note: 'F4', startTime: 1.5, duration: 0.5, velocity: 0.8, hand: 'right', finger: 1 },
    { note: 'G4', startTime: 2, duration: 0.5, velocity: 0.8, hand: 'right', finger: 2 },
    { note: 'A4', startTime: 2.5, duration: 0.5, velocity: 0.8, hand: 'right', finger: 3 },
    { note: 'B4', startTime: 3, duration: 0.5, velocity: 0.8, hand: 'right', finger: 4 },
    { note: 'C5', startTime: 3.5, duration: 0.5, velocity: 0.8, hand: 'right', finger: 5 },
    
    // Left hand bass notes with fingering
    { note: 'C3', startTime: 0, duration: 1, velocity: 0.7, hand: 'left', finger: 5 },
    { note: 'G2', startTime: 1, duration: 1, velocity: 0.7, hand: 'left', finger: 3 },
    { note: 'A2', startTime: 2, duration: 1, velocity: 0.7, hand: 'left', finger: 2 },
    { note: 'F2', startTime: 3, duration: 1, velocity: 0.7, hand: 'left', finger: 4 },
    
    // Chords with multiple fingers
    { note: 'C4', startTime: 4, duration: 1, velocity: 0.8, hand: 'right', finger: 1 },
    { note: 'E4', startTime: 4, duration: 1, velocity: 0.8, hand: 'right', finger: 3 },
    { note: 'G4', startTime: 4, duration: 1, velocity: 0.8, hand: 'right', finger: 5 },
    { note: 'C3', startTime: 4, duration: 1, velocity: 0.7, hand: 'left', finger: 5 },
    
    // More complex patterns
    { note: 'D4', startTime: 5, duration: 0.25, velocity: 0.9, hand: 'right', finger: 2 },
    { note: 'F4', startTime: 5.25, duration: 0.25, velocity: 0.9, hand: 'right', finger: 4 },
    { note: 'A4', startTime: 5.5, duration: 0.25, velocity: 0.9, hand: 'right', finger: 1 },
    { note: 'D5', startTime: 5.75, duration: 0.25, velocity: 0.9, hand: 'right', finger: 5 },
    
    // Black keys (should avoid finger 1)
    { note: 'F#4', startTime: 6, duration: 0.5, velocity: 0.8, hand: 'right', finger: 3 },
    { note: 'G#4', startTime: 6.5, duration: 0.5, velocity: 0.8, hand: 'right', finger: 4 },
    { note: 'A#4', startTime: 7, duration: 0.5, velocity: 0.8, hand: 'right', finger: 2 },
  ],
  metadata: {
    originalFileName: 'finger-visualization-test.json',
    fileSize: 2048,
    processedAt: new Date().toISOString(),
    pagesProcessed: 1,
    staffLinesDetected: 2,
    notesDetected: 22
  }
};

// Save to sample data directory
const outputPath = path.join(__dirname, '..', 'sample-data', 'finger-test.json');
fs.writeFileSync(outputPath, JSON.stringify(testAnimationData, null, 2));

console.log('✅ Created finger visualization test data at:', outputPath);
console.log('📊 Generated', testAnimationData.notes.length, 'notes with finger information');
console.log('👆 Finger distribution:');

const fingerCounts = {};
testAnimationData.notes.forEach(note => {
  if (note.finger) {
    fingerCounts[note.finger] = (fingerCounts[note.finger] || 0) + 1;
  }
});

Object.entries(fingerCounts).forEach(([finger, count]) => {
  console.log(`   Finger ${finger}: ${count} notes`);
});

console.log('🎨 Hand distribution:');
const leftHand = testAnimationData.notes.filter(n => n.hand === 'left').length;
const rightHand = testAnimationData.notes.filter(n => n.hand === 'right').length;
console.log(`   Left hand: ${leftHand} notes`);
console.log(`   Right hand: ${rightHand} notes`);