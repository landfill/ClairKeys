import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

const OMR_SERVICE_URL = process.env.OMR_SERVICE_URL || 'https://clairkeys-omr.fly.dev'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use OAuth ID as user identifier
    const userId = session.user.id || session.user.email || 'anonymous'

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const composer = formData.get('composer') as string
    const categoryId = formData.get('categoryId') as string
    const isPublic = formData.get('isPublic') === 'true'

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Check file size (limit to 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      )
    }

    // Create sheet music record in database with pending status
    const sheetMusic = await prisma.sheetMusic.create({
      data: {
        title,
        composer: composer || 'Unknown',
        userId: userId,
        categoryId: categoryId ? parseInt(categoryId) : null,
        isPublic,
        animationDataUrl: '', // Will be updated when OMR processing completes
        processingStatus: 'processing',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Prepare form data for OMR service
    const omrFormData = new FormData()
    omrFormData.append('file', file)
    omrFormData.append('title', title)
    omrFormData.append('composer', composer || 'Unknown')
    omrFormData.append('user_id', userId)
    omrFormData.append('sheet_music_id', sheetMusic.id.toString())

    // Send to OMR service
    const omrResponse = await fetch(`${OMR_SERVICE_URL}/process`, {
      method: 'POST',
      body: omrFormData,
      headers: {
        // Don't set Content-Type header for FormData, let fetch set it with boundary
      },
      // Increase timeout for file upload
      signal: AbortSignal.timeout(60000) // 60 seconds
    })

    if (!omrResponse.ok) {
      // Update database to failed status
      await prisma.sheetMusic.update({
        where: { id: sheetMusic.id },
        data: { 
          processingStatus: 'failed',
          updatedAt: new Date()
        }
      })

      const errorText = await omrResponse.text()
      console.error('OMR service error:', errorText)
      
      return NextResponse.json(
        { error: 'Failed to start OMR processing' },
        { status: 500 }
      )
    }

    const omrResult = await omrResponse.json()

    // Update database with job ID
    await prisma.sheetMusic.update({
      where: { id: sheetMusic.id },
      data: {
        omrJobId: omrResult.job_id,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      sheetMusicId: sheetMusic.id,
      jobId: omrResult.job_id,
      status: omrResult.status,
      message: 'OMR processing started. You can check the status or wait for completion.'
    })

  } catch (error) {
    console.error('OMR upload error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}