import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fileStorageService } from '@/services/fileStorageService'

/**
 * Admin API to update existing animation data with finger information
 * POST /api/admin/update-finger-data
 * Requires authentication and admin privileges
 */

// Get admin emails from environment variable
function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
}

// Simple fingering assignment logic
function assignFinger(note: any): number {
  const isBlackKey = ['C#', 'D#', 'F#', 'G#', 'A#'].some(bKey => note.note?.includes(bKey));
  
  if (note.hand === 'left') {
    if (isBlackKey) {
      return Math.floor(Math.random() * 3) + 2; // 2-4
    } else {
      // Simple left hand pattern based on octave
      const octave = parseInt(note.note?.slice(-1) || '4');
      if (octave <= 2) return 5; // Low notes - pinky
      if (octave <= 3) return Math.floor(Math.random() * 2) + 4; // 4-5
      return Math.floor(Math.random() * 3) + 1; // 1-3
    }
  } else {
    // Right hand
    if (isBlackKey) {
      return Math.floor(Math.random() * 3) + 2; // 2-4
    } else {
      // Simple right hand pattern based on octave
      const octave = parseInt(note.note?.slice(-1) || '4');
      if (octave >= 6) return 5; // High notes - pinky
      if (octave >= 5) return Math.floor(Math.random() * 2) + 4; // 4-5
      return Math.floor(Math.random() * 3) + 1; // 1-3
    }
  }
}

// Add finger information to animation data
function addFingeringToAnimationData(animationData: any) {
  const notes = animationData.notes.map((note: any) => {
    // Skip if already has finger info
    if (note.finger) return note;
    
    const finger = assignFinger(note);
    
    return {
      ...note,
      finger: Math.max(1, Math.min(5, finger)) // Ensure 1-5 range
    };
  });
  
  return {
    ...animationData,
    notes,
    // Update metadata to indicate finger info was added
    metadata: {
      ...animationData.metadata,
      fingeringAdded: true,
      fingeringAddedAt: new Date().toISOString()
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin privileges
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('❌ Unauthorized: No session found')
      return NextResponse.json(
        { success: false, error: 'Authentication required', message: 'Please log in to access admin features' },
        { status: 401 }
      )
    }

    if (!getAdminEmails().includes(session.user.email)) {
      console.log(`❌ Forbidden: User ${session.user.email} is not an admin`)
      return NextResponse.json(
        { success: false, error: 'Admin privileges required', message: 'You do not have permission to access this feature' },
        { status: 403 }
      )
    }

    console.log(`✅ Admin access granted for: ${session.user.email}`)
    console.log('🔧 Starting finger data update process...')

    // Get all sheet music records
    const allSheetMusic = await prisma.sheetMusic.findMany({
      select: {
        id: true,
        title: true,
        composer: true,
        animationDataUrl: true,
        userId: true,
        isPublic: true
      }
    })

    console.log(`📊 Found ${allSheetMusic.length} sheet music records`)

    const results = []

    for (const sheet of allSheetMusic) {
      const result = {
        id: sheet.id,
        title: sheet.title,
        composer: sheet.composer,
        status: 'pending',
        error: null,
        fingersAdded: 0
      }

      try {
        console.log(`🎵 Processing: "${sheet.title}" by ${sheet.composer}`)

        if (!sheet.animationDataUrl) {
          result.status = 'skipped'
          result.error = 'No animation data URL'
          results.push(result)
          continue
        }

        // Download current animation data
        console.log('📥 Downloading current animation data...')
        const response = await fetch(sheet.animationDataUrl)

        if (!response.ok) {
          result.status = 'error'
          result.error = `Failed to download: ${response.status}`
          results.push(result)
          continue
        }

        const currentData = await response.json()
        console.log(`📊 Current data has ${currentData.notes.length} notes`)

        // Check if already has finger info
        const hasFingerInfo = currentData.notes.some((note: any) => note.finger)
        if (hasFingerInfo) {
          result.status = 'already_updated'
          result.error = 'Already has finger information'
          results.push(result)
          continue
        }

        // Add finger information
        console.log('👆 Adding finger information...')
        const updatedData = addFingeringToAnimationData(currentData)

        // Count fingers added
        result.fingersAdded = updatedData.notes.filter((note: any) => note.finger).length

        // Update existing file (overwrite approach)
        console.log('📤 Updating existing animation data file...')
        const updateResult = await fileStorageService.updateExistingAnimationData(
          sheet.animationDataUrl,
          updatedData
        )

        if (updateResult.success) {
          // No DB update needed - same URL preserved
          result.status = 'success'
          console.log('✅ Successfully updated existing file with finger information!')
        } else {
          result.status = 'error'
          result.error = `File update failed: ${updateResult.error}`
        }

      } catch (error) {
        result.status = 'error'
        result.error = error instanceof Error ? error.message : 'Unknown error'
        console.log(`❌ Error processing "${sheet.title}": ${result.error}`)
      }

      results.push(result)
    }

    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      alreadyUpdated: results.filter(r => r.status === 'already_updated').length
    }

    console.log('🎉 Finger data update completed!')
    console.log('📊 Summary:', summary)

    return NextResponse.json({
      success: true,
      message: 'Finger data update completed',
      summary,
      results
    })

  } catch (error) {
    console.error('❌ Admin update failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update finger data'
      },
      { status: 500 }
    )
  }
}