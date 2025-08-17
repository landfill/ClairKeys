import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const OMR_SERVICE_URL = process.env.OMR_SERVICE_URL || 'https://clairkeys-omr.fly.dev'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Find the sheet music record with this job ID
    const sheetMusic = await prisma.sheetMusic.findFirst({
      where: {
        omrJobId: jobId,
        userId: session.user.id // Ensure user can only check their own jobs
      }
    })

    if (!sheetMusic) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      )
    }

    // Get status from OMR service
    const statusResponse = await fetch(`${OMR_SERVICE_URL}/status/${jobId}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Short timeout for status checks
      signal: AbortSignal.timeout(10000) // 10 seconds
    })

    if (!statusResponse.ok) {
      console.error('OMR service status error:', await statusResponse.text())
      return NextResponse.json(
        { error: 'Failed to get processing status' },
        { status: 500 }
      )
    }

    const omrStatus = await statusResponse.json()

    // Update database based on OMR status
    let updateData: any = {
      updatedAt: new Date()
    }

    if (omrStatus.status === 'completed' && omrStatus.result) {
      // OMR processing completed successfully
      updateData.processingStatus = 'completed'
      updateData.animationDataUrl = omrStatus.result.animation_data_url
      
      // Update metadata if available
      if (omrStatus.result.title && omrStatus.result.title !== sheetMusic.title) {
        updateData.title = omrStatus.result.title
      }
      if (omrStatus.result.composer && omrStatus.result.composer !== sheetMusic.composer) {
        updateData.composer = omrStatus.result.composer
      }
    } else if (omrStatus.status === 'failed') {
      // OMR processing failed
      updateData.processingStatus = 'failed'
    } else {
      // Still processing
      updateData.processingStatus = 'processing'
    }

    // Update database
    const updatedSheetMusic = await prisma.sheetMusic.update({
      where: { id: sheetMusic.id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Return combined status
    return NextResponse.json({
      success: true,
      jobId,
      sheetMusicId: sheetMusic.id,
      status: omrStatus.status,
      progress: omrStatus.progress || 0,
      message: omrStatus.message || 'Processing...',
      sheetMusic: {
        id: updatedSheetMusic.id,
        title: updatedSheetMusic.title,
        composer: updatedSheetMusic.composer,
        categoryId: updatedSheetMusic.categoryId,
        category: updatedSheetMusic.category,
        isPublic: updatedSheetMusic.isPublic,
        animationDataUrl: updatedSheetMusic.animationDataUrl,
        processingStatus: updatedSheetMusic.processingStatus,
        createdAt: updatedSheetMusic.createdAt,
        updatedAt: updatedSheetMusic.updatedAt
      },
      // Include raw OMR status for debugging
      omrDetails: process.env.NODE_ENV === 'development' ? omrStatus : undefined
    })

  } catch (error) {
    console.error('OMR status check error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}