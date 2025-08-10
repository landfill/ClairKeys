import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { sheetMusicCache } from '@/services/cacheService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const resolvedParams = await params
    const sheetId = parseInt(resolvedParams.id)

    if (!sheetId || isNaN(sheetId)) {
      return NextResponse.json(
        { error: 'Valid sheet ID is required' },
        { status: 400 }
      )
    }

    // Find the sheet music
    const sheetMusic = await prisma.sheetMusic.findUnique({
      where: { id: sheetId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!sheetMusic) {
      return NextResponse.json(
        { error: 'Sheet music not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const isOwner = session?.user?.id === sheetMusic.userId
    const isPublic = sheetMusic.isPublic

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Return sheet music data
    return NextResponse.json({
      success: true,
      sheetMusic: {
        id: sheetMusic.id,
        title: sheetMusic.title,
        composer: sheetMusic.composer,
        categoryId: sheetMusic.categoryId,
        category: sheetMusic.category?.name || null,
        isPublic: sheetMusic.isPublic,
        createdAt: sheetMusic.createdAt,
        updatedAt: sheetMusic.updatedAt,
        animationDataUrl: sheetMusic.animationDataUrl,
        owner: isOwner ? sheetMusic.user : null
      }
    })

  } catch (error) {
    console.error('Get sheet music error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const sheetId = parseInt(resolvedParams.id)
    if (!sheetId || isNaN(sheetId)) {
      return NextResponse.json(
        { error: 'Valid sheet ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { title, composer, categoryId, isPublic } = body

    // Validate required fields only if they are being updated
    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (composer !== undefined && !composer?.trim()) {
      return NextResponse.json(
        { error: 'Composer is required' },
        { status: 400 }
      )
    }

    // Find and verify ownership
    const existingSheet = await prisma.sheetMusic.findUnique({
      where: { id: sheetId }
    })

    if (!existingSheet) {
      return NextResponse.json(
        { error: 'Sheet music not found' },
        { status: 404 }
      )
    }

    if (existingSheet.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Verify category exists if provided
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: session.user.id
        }
      })

      if (!category) {
        return NextResponse.json(
          { error: 'Category not found or access denied' },
          { status: 400 }
        )
      }
    }

    // Update sheet music
    const updateData: any = {}
    
    if (title !== undefined) {
      updateData.title = title.trim()
    }
    if (composer !== undefined) {
      updateData.composer = composer.trim()
    }
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId || null
    }
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic
    }

    const updatedSheet = await prisma.sheetMusic.update({
      where: { id: sheetId },
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

    return NextResponse.json({
      success: true,
      sheetMusic: {
        id: updatedSheet.id,
        title: updatedSheet.title,
        composer: updatedSheet.composer,
        categoryId: updatedSheet.categoryId,
        category: updatedSheet.category?.name || null,
        isPublic: updatedSheet.isPublic,
        updatedAt: updatedSheet.updatedAt
      }
    })

  } catch (error) {
    console.error('Update sheet music error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const sheetId = parseInt(resolvedParams.id)
    if (!sheetId || isNaN(sheetId)) {
      return NextResponse.json(
        { error: 'Valid sheet ID is required' },
        { status: 400 }
      )
    }

    // Find and verify ownership
    const existingSheet = await prisma.sheetMusic.findUnique({
      where: { id: sheetId }
    })

    if (!existingSheet) {
      return NextResponse.json(
        { error: 'Sheet music not found' },
        { status: 404 }
      )
    }

    if (existingSheet.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete associated files first
    if (existingSheet.animationDataUrl) {
      try {
        // Extract file path from URL for deletion
        const url = new URL(existingSheet.animationDataUrl)
        const pathParts = url.pathname.split('/')
        const fileName = pathParts[pathParts.length - 1]
        
        // Delete from file storage
        const { fileStorageService } = await import('@/services/fileStorageService')
        await fileStorageService.deleteFile('animation-data', fileName)
      } catch (fileError) {
        console.warn('Failed to delete animation data file:', fileError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete sheet music (cascade will handle practice sessions)
    await prisma.sheetMusic.delete({
      where: { id: sheetId }
    })

    // Clear relevant caches
    sheetMusicCache.invalidateUser(existingSheet.userId)
    if (existingSheet.isPublic) {
      sheetMusicCache.invalidatePublic()
    }

    return NextResponse.json({
      success: true,
      message: 'Sheet music deleted successfully'
    })

  } catch (error) {
    console.error('Delete sheet music error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}