/**
 * Script to add finger information to existing sample data files
 */

const fs = require('fs');
const path = require('path');

/**
 * Simple fingering assignment based on MIDI ranges and hand
 */
function assignFinger(midi, hand) {
  const isBlackKey = [1, 3, 6, 8, 10].includes(midi % 12);
  
  if (hand === "L") {
    // Left hand fingering
    if (isBlackKey) return Math.floor(Math.random() * 3) + 2; // 2-4
    if (midi < 36) return 5; // Very low - pinky
    if (midi < 48) return Math.floor(Math.random() * 2) + 4; // 4-5
    if (midi < 55) return Math.floor(Math.random() * 3) + 2; // 2-4
    return Math.floor(Math.random() * 3) + 1; // 1-3
  } else {
    // Right hand fingering
    if (isBlackKey) return Math.floor(Math.random() * 3) + 2; // 2-4
    if (midi > 84) return 5; // Very high - pinky
    if (midi > 76) return Math.floor(Math.random() * 2) + 4; // 4-5
    if (midi > 67) return Math.floor(Math.random() * 3) + 2; // 2-4
    return Math.floor(Math.random() * 3) + 1; // 1-3
  }
}

/**
 * Process a single sample file
 */
function processSampleFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Add finger information to notes
    if (data.notes && Array.isArray(data.notes)) {
      data.notes = data.notes.map(note => {
        if (note.hand && !note.finger) {
          return {
            ...note,
            finger: assignFinger(note.midi, note.hand)
          };
        }
        return note;
      });
    }
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Updated ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main execution
 */
function main() {
  const sampleDir = path.join(__dirname, '..', 'sample-data');
  
  if (!fs.existsSync(sampleDir)) {
    console.error('Sample data directory not found:', sampleDir);
    return;
  }
  
  const files = fs.readdirSync(sampleDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(sampleDir, file));
  
  console.log(`Found ${files.length} sample files to process:`, files.map(f => path.basename(f)));
  
  files.forEach(processSampleFile);
  
  console.log('✅ All sample files processed successfully!');
}

main();