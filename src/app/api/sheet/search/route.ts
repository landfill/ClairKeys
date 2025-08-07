import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

// GET /api/sheet/search - Enhanced search functionality
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    // Parse search parameters
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const isPublic = searchParams.get('isPublic')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') as 'newest' | 'oldest' | 'title' | 'composer' || 'newest'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    
    // Build where clause
    const where: any = {}
    
    // Public/Private filter
    if (isPublic === 'true') {
      where.isPublic = true
    } else if (isPublic === 'false') {
      // Only show user's private sheets if logged in
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required for private sheets' },
          { status: 401 }
        )
      }
      where.isPublic = false
      where.userId = session.user.id
    } else {
      // Show public sheets + user's private sheets
      if (session?.user?.id) {
        where.OR = [
          { isPublic: true },
          { userId: session.user.id }
        ]
      } else {
        where.isPublic = true
      }
    }
    
    // Text search
    if (search && search.trim()) {
      const searchCondition = {
        OR: [
          { title: { contains: search.trim(), mode: 'insensitive' } },
          { composer: { contains: search.trim(), mode: 'insensitive' } }
        ]
      }
      
      if (where.OR) {
        // Combine with existing OR conditions
        where.AND = [
          { OR: where.OR },
          searchCondition
        ]
        delete where.OR
      } else {
        Object.assign(where, searchCondition)
      }
    }
    
    // Category filter
    if (categoryId && categoryId !== 'all') {
      const catId = parseInt(categoryId)
      if (!isNaN(catId)) {
        if (where.AND) {
          where.AND.push({ categoryId: catId })
        } else {
          where.categoryId = catId
        }
      }
    }
    
    // Sort configuration
    let orderBy: any = { createdAt: 'desc' } // default
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'title':
        orderBy = { title: sortOrder }
        break
      case 'composer':
        orderBy = { composer: sortOrder }
        break
      case 'newest':
      default:
        orderBy = { createdAt: sortOrder }
        break
    }
    
    // Execute queries in parallel
    const [sheetMusic, total, categoryStats] = await Promise.all([
      // Main search results
      prisma.sheetMusic.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy,
        take: limit,
        skip: offset
      }),
      
      // Total count for pagination
      prisma.sheetMusic.count({ where }),
      
      // Category statistics for filters
      prisma.category.findMany({
        include: {
          _count: {
            select: {
              sheetMusic: {
                where: session?.user?.id ? {
                  OR: [
                    { isPublic: true },
                    { userId: session.user.id }
                  ]
                } : { isPublic: true }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      })
    ])
    
    // Get public/private counts
    const [totalPublic, totalPrivate] = await Promise.all([
      prisma.sheetMusic.count({ where: { isPublic: true } }),
      session?.user?.id ? 
        prisma.sheetMusic.count({ 
          where: { 
            isPublic: false, 
            userId: session.user.id 
          } 
        }) : 0
    ])
    
    return NextResponse.json({
      success: true,
      sheetMusic: sheetMusic.map(sheet => ({
        id: sheet.id,
        title: sheet.title,
        composer: sheet.composer,
        userId: sheet.userId,
        categoryId: sheet.categoryId,
        category: sheet.category,
        isPublic: sheet.isPublic,
        animationDataUrl: sheet.animationDataUrl,
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt,
        owner: sheet.user
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      filters: {
        categories: categoryStats.map(cat => ({
          id: cat.id,
          name: cat.name,
          count: cat._count.sheetMusic
        })).filter(cat => cat.count > 0),
        totalPublic,
        totalPrivate
      }
    })
    
  } catch (error) {
    console.error('Search sheet music error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}