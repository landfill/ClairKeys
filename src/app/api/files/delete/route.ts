import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { fileStorageService } from '@/services/fileStorageService'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sheetMusicId, type } = body // type: 'animation' | 'sheet'

    if (!sheetMusicId || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify sheet music ownership
    const sheetMusic = await prisma.sheetMusic.findFirst({
      where: {
        id: sheetMusicId,
        userId: session.user.id
      }
    })

    if (!sheetMusic) {
      return NextResponse.json(
        { error: 'Sheet music not found or unauthorized' },
        { status: 404 }
      )
    }

    const deletionResults = []

    if (type === 'animation' || type === 'all') {
      // Delete animation data file
      if (sheetMusic.animationDataUrl) {
        try {
          const url = new URL(sheetMusic.animationDataUrl)
          const pathParts = url.pathname.split('/')
          const fileName = pathParts[pathParts.length - 1]
          const filePath = `${sheetMusic.userId}/${fileName}`

          const deleted = await fileStorageService.deleteFile('animation-data', filePath)
          deletionResults.push({ type: 'animation', success: deleted })

          // Clear URL from database
          if (deleted) {
            await prisma.sheetMusic.update({
              where: { id: sheetMusicId },
              data: { animationDataUrl: '' }
            })
          }
        } catch (error) {
          console.error('Failed to delete animation file:', error)
          deletionResults.push({ type: 'animation', success: false, error: error.message })
        }
      }
    }

    // Note: We don't delete the original sheet music file as it might be referenced elsewhere
    // Only delete derived/processed files

    return NextResponse.json({
      success: true,
      results: deletionResults
    })

  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Bulk delete API for cleanup operations
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, olderThanHours } = body

    if (action === 'cleanup-temp') {
      // Clean up temporary files
      const result = await fileStorageService.cleanupTempFiles(olderThanHours || 24)
      
      return NextResponse.json({
        success: true,
        deleted: result.deleted,
        errors: result.errors
      })
    }

    if (action === 'cleanup-orphaned') {
      // Find and delete orphaned files (files not referenced in database)
      const allSheetMusic = await prisma.sheetMusic.findMany({
        where: { userId: session.user.id },
        select: { id: true, animationDataUrl: true }
      })

      const referencedFiles = new Set(
        allSheetMusic
          .filter(sm => sm.animationDataUrl)
          .map(sm => {
            try {
              const url = new URL(sm.animationDataUrl!)
              const pathParts = url.pathname.split('/')
              return pathParts[pathParts.length - 1]
            } catch {
              return null
            }
          })
          .filter(Boolean)
      )

      // List files in user's animation data folder
      const userFiles = await fileStorageService.listFiles('animation-data', session.user.id)
      const orphanedFiles = userFiles.filter(file => !referencedFiles.has(file.name))

      if (orphanedFiles.length > 0) {
        const filePaths = orphanedFiles.map(file => `${session.user.id}/${file.name}`)
        const deleteResult = await fileStorageService.deleteFiles('animation-data', filePaths)

        return NextResponse.json({
          success: true,
          deleted: deleteResult.success.length,
          errors: deleteResult.failed
        })
      }

      return NextResponse.json({
        success: true,
        deleted: 0,
        errors: []
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}