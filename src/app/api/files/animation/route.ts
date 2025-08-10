import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { fileStorageService } from '@/services/fileStorageService'
import { prisma } from '@/lib/prisma'

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
    const { animationData, sheetMusicId, metadata } = body

    if (!animationData || !sheetMusicId) {
      return NextResponse.json(
        { error: 'Missing required data' },
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

    // Upload animation data to storage
    const uploadResult = await fileStorageService.uploadAnimationData(
      animationData,
      {
        name: `${sheetMusic.title}_animation.json`,
        size: JSON.stringify(animationData).length,
        type: 'application/json',
        userId: session.user.id,
        isPublic: sheetMusic.isPublic
      }
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: 'Failed to upload animation data', details: uploadResult.error },
        { status: 500 }
      )
    }

    // Update sheet music with animation data URL
    await prisma.sheetMusic.update({
      where: { id: sheetMusicId },
      data: { 
        animationDataUrl: uploadResult.url
      }
    })

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      path: uploadResult.path
    })

  } catch (error) {
    console.error('Animation data upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sheetMusicId = searchParams.get('sheetMusicId')

    if (!sheetMusicId) {
      console.log('❌ GET /api/files/animation - Missing sheetMusicId parameter')
      return NextResponse.json(
        { error: 'Missing sheetMusicId parameter' },
        { status: 400 }
      )
    }

    console.log(`🔍 GET /api/files/animation - Request for sheetMusicId: ${sheetMusicId}, User: ${session.user.id}`)

    // Get sheet music with access check
    const sheetMusic = await prisma.sheetMusic.findFirst({
      where: {
        id: parseInt(sheetMusicId),
        OR: [
          { userId: session.user.id }, // User owns it
          { isPublic: true }          // Or it's public
        ]
      }
    })

    if (!sheetMusic) {
      console.log(`❌ Sheet music not found or no access for ID ${sheetMusicId}`)
      return NextResponse.json(
        { error: 'Sheet music not found or no access' },
        { status: 404 }
      )
    }

    console.log(`✅ Found sheet music: "${sheetMusic.title}" by ${sheetMusic.composer}`)
    console.log(`📄 animationDataUrl: ${sheetMusic.animationDataUrl}`)
    console.log(`🔓 isPublic: ${sheetMusic.isPublic}`)

    if (!sheetMusic.animationDataUrl) {
      console.log(`❌ No animation data URL found for sheet music ID ${sheetMusicId}`)
      return NextResponse.json(
        { error: 'Animation data not found' },
        { status: 404 }
      )
    }

    // Check if animationDataUrl contains malformed data (JSON instead of URL)
    if (sheetMusic.animationDataUrl.startsWith('{') || sheetMusic.animationDataUrl.startsWith('[')) {
      console.error(`Malformed data detected for sheet music ID ${sheetMusicId}: JSON data stored in URL field`)
      return NextResponse.json(
        { error: 'Animation data is corrupted. Please contact support.' },
        { status: 422 }
      )
    }

    // Validate URL format
    let validUrl
    try {
      validUrl = new URL(sheetMusic.animationDataUrl)
    } catch (error) {
      console.error(`Invalid URL format for sheet music ID ${sheetMusicId}:`, sheetMusic.animationDataUrl)
      return NextResponse.json(
        { error: 'Animation data URL is invalid. Please contact support.' },
        { status: 422 }
      )
    }

    // For public sheet music, return the URL directly
    if (sheetMusic.isPublic) {
      console.log(`✅ Returning public URL: ${sheetMusic.animationDataUrl}`)
      return NextResponse.json({
        url: sheetMusic.animationDataUrl
      })
    }

    // For private sheet music, create a signed URL
    try {
      // Extract path from URL
      const url = validUrl
      const pathParts = url.pathname.split('/')
      const fileName = pathParts[pathParts.length - 1]
      const filePath = `${sheetMusic.userId}/${fileName}`

      const signedUrl = await fileStorageService.getSignedUrl('animation-data', filePath, 3600)

      console.log(`✅ Generated signed URL for private file: ${filePath}`)
      return NextResponse.json({
        url: signedUrl
      })

    } catch (error) {
      console.error('Failed to create signed URL:', error)
      return NextResponse.json({
        url: sheetMusic.animationDataUrl // Fallback to original URL
      })
    }

  } catch (error) {
    console.error('Get animation data error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}