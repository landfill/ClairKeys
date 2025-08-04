import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

// GET /api/sheet - Get user's sheet music list
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const isPublic = searchParams.get('public')

    // Build where clause
    const where: any = {
      userId: session.user.id
    }

    if (categoryId) {
      const catId = parseInt(categoryId)
      if (!isNaN(catId)) {
        where.categoryId = catId
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { composer: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (isPublic !== null) {
      where.isPublic = isPublic === 'true'
    }

    // Get sheet music list
    const sheetMusic = await prisma.sheetMusic.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      sheetMusic: sheetMusic.map(sheet => ({
        id: sheet.id,
        title: sheet.title,
        composer: sheet.composer,
        categoryId: sheet.categoryId,
        category: sheet.category,
        isPublic: sheet.isPublic,
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt
      }))
    })

  } catch (error) {
    console.error('Get sheet music list error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sheet - Create new sheet music metadata
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, composer, categoryId, isPublic, animationDataUrl } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!composer?.trim()) {
      return NextResponse.json(
        { error: 'Composer is required' },
        { status: 400 }
      )
    }

    if (!animationDataUrl?.trim()) {
      return NextResponse.json(
        { error: 'Animation data URL is required' },
        { status: 400 }
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

    // Create sheet music
    const newSheet = await prisma.sheetMusic.create({
      data: {
        title: title.trim(),
        composer: composer.trim(),
        userId: session.user.id,
        categoryId: categoryId || null,
        isPublic: isPublic || false,
        animationDataUrl: animationDataUrl.trim()
      },
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
        id: newSheet.id,
        title: newSheet.title,
        composer: newSheet.composer,
        categoryId: newSheet.categoryId,
        category: newSheet.category,
        isPublic: newSheet.isPublic,
        createdAt: newSheet.createdAt,
        updatedAt: newSheet.updatedAt,
        animationDataUrl: newSheet.animationDataUrl
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create sheet music error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}