/**
 * Update existing animation data in Supabase Storage with finger information
 */

const { PrismaClient } = require('@prisma/client')
const { fileStorageService } = require('../src/services/fileStorageService')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Function to add finger information to existing animation data
function addFingeringToAnimationData(animationData) {
  const notes = animationData.notes.map(note => {
    // Skip if already has finger info
    if (note.finger) return note;
    
    // Simple fingering assignment logic
    const isBlackKey = ['C#', 'D#', 'F#', 'G#', 'A#'].some(bKey => note.note.includes(bKey));
    
    let finger;
    if (note.hand === 'left') {
      if (isBlackKey) {
        finger = Math.floor(Math.random() * 3) + 2; // 2-4
      } else {
        // Simple left hand pattern
        const noteNum = parseInt(note.note.slice(-1)); // Get octave number
        if (noteNum <= 2) finger = 5; // Low notes - pinky
        else if (noteNum <= 3) finger = Math.floor(Math.random() * 2) + 4; // 4-5
        else finger = Math.floor(Math.random() * 3) + 1; // 1-3
      }
    } else {
      // Right hand
      if (isBlackKey) {
        finger = Math.floor(Math.random() * 3) + 2; // 2-4
      } else {
        // Simple right hand pattern
        const noteNum = parseInt(note.note.slice(-1)); // Get octave number
        if (noteNum >= 6) finger = 5; // High notes - pinky
        else if (noteNum >= 5) finger = Math.floor(Math.random() * 2) + 4; // 4-5
        else finger = Math.floor(Math.random() * 3) + 1; // 1-3
      }
    }
    
    return {
      ...note,
      finger: Math.max(1, Math.min(5, finger)) // Ensure 1-5 range
    };
  });
  
  return {
    ...animationData,
    notes
  };
}

async function updateAnimationData() {
  try {
    console.log('🔍 Fetching all sheet music records...');
    
    const allSheetMusic = await prisma.sheetMusic.findMany({
      select: {
        id: true,
        title: true,
        composer: true,
        animationDataUrl: true,
        userId: true,
        isPublic: true
      }
    });
    
    console.log(`📊 Found ${allSheetMusic.length} sheet music records`);
    
    for (const sheet of allSheetMusic) {
      console.log(`\n🎵 Processing: "${sheet.title}" by ${sheet.composer}`);
      
      if (!sheet.animationDataUrl) {
        console.log('⚠️  No animation data URL, skipping...');
        continue;
      }
      
      try {
        // Download current animation data
        console.log('📥 Downloading current animation data...');
        const response = await fetch(sheet.animationDataUrl);
        
        if (!response.ok) {
          console.log(`❌ Failed to download: ${response.status}`);
          continue;
        }
        
        const currentData = await response.json();
        console.log(`📊 Current data has ${currentData.notes.length} notes`);
        
        // Check if already has finger info
        const hasFingerInfo = currentData.notes.some(note => note.finger);
        if (hasFingerInfo) {
          console.log('✅ Already has finger information, skipping...');
          continue;
        }
        
        // Add finger information
        console.log('👆 Adding finger information...');
        const updatedData = addFingeringToAnimationData(currentData);
        
        // Verify finger info was added
        const fingersAdded = updatedData.notes.filter(note => note.finger).length;
        console.log(`📝 Added finger info to ${fingersAdded}/${updatedData.notes.length} notes`);
        
        // Upload updated data
        console.log('📤 Uploading updated animation data...');
        const uploadResult = await fileStorageService.uploadAnimationData(
          updatedData,
          {
            name: `${sheet.title}_animation_with_fingers.json`,
            size: JSON.stringify(updatedData).length,
            type: 'application/json',
            userId: sheet.userId,
            isPublic: sheet.isPublic
          }
        );
        
        if (uploadResult.success) {
          // Update database with new URL
          await prisma.sheetMusic.update({
            where: { id: sheet.id },
            data: { animationDataUrl: uploadResult.url }
          });
          
          console.log('✅ Successfully updated with finger information!');
        } else {
          console.log(`❌ Upload failed: ${uploadResult.error}`);
        }
        
      } catch (error) {
        console.log(`❌ Error processing "${sheet.title}": ${error.message}`);
      }
    }
    
    console.log('\n🎉 Animation data update completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAnimationData();