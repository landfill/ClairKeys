import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

// GET /api/sheet/search - Enhanced search functionality
export async function GET(request: NextRequest) {
  try {
    const requestStartedAt = performance.now()
    const { searchParams } = new URL(request.url)
    
    // Parse search parameters
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const isPublic = searchParams.get('isPublic')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') as 'newest' | 'oldest' | 'title' | 'composer' || 'newest'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    const publicOnly = isPublic === 'true'

    // Public-only results are independent of the viewer. Avoid the session
    // lookup entirely so this path can be cached and does not pay auth latency.
    const authStartedAt = performance.now()
    const session = publicOnly ? null : await getServerSession(authOptions)
    const authDurationMs = performance.now() - authStartedAt
    
    // Build where clause
    const where: Prisma.SheetMusicWhereInput = {}
    
    // Public/Private filter
    if (isPublic === 'true') {
      where.isPublic = true
      where.provenance = { not: 'demo' }
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
          { isPublic: true, provenance: { not: 'demo' } },
          { userId: session.user.id }
        ]
      } else {
        where.isPublic = true
        where.provenance = { not: 'demo' }
      }
    }
    
    // Text search
    if (search && search.trim()) {
      const searchCondition: Prisma.SheetMusicWhereInput = {
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
          ;(where.AND as Prisma.SheetMusicWhereInput[]).push({ categoryId: catId })
        } else {
          where.categoryId = catId
        }
      }
    }
    
    // Sort configuration
    let orderBy: Prisma.SheetMusicOrderByWithRelationInput = { createdAt: 'desc' } // default
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
    
    const categoryVisibilityWhere = session?.user?.id ? {
      OR: [
        { isPublic: true, provenance: { not: 'demo' as const } },
        { userId: session.user.id }
      ]
    } : { isPublic: true, provenance: { not: 'demo' as const } }

    // Dispatch results, pagination, filter metadata, and counts in one database
    // wave. Previously the public/private counts started only after the first
    // three queries completed, adding a full extra round trip.
    const databaseStartedAt = performance.now()
    const databaseQueryCount = session?.user?.id ? 5 : 4
    const [sheetMusic, total, categoryStats, totalPublic, totalPrivate] = await Promise.all([
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
                where: categoryVisibilityWhere
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),

      prisma.sheetMusic.count({ where: { isPublic: true, provenance: { not: 'demo' } } }),

      session?.user?.id
        ? prisma.sheetMusic.count({
            where: {
              isPublic: false,
              userId: session.user.id
            }
          })
        : Promise.resolve(0)
    ])
    const databaseDurationMs = performance.now() - databaseStartedAt
    const totalDurationMs = performance.now() - requestStartedAt

    const headers: Record<string, string> = {
      'Server-Timing': [
        `auth;dur=${authDurationMs.toFixed(1)}`,
        `db;dur=${databaseDurationMs.toFixed(1)};desc="${databaseQueryCount} queries"`,
        `total;dur=${totalDurationMs.toFixed(1)}`
      ].join(', '),
      'X-Database-Queries': String(databaseQueryCount)
    }
    if (publicOnly) {
      headers['Cache-Control'] = 'public, s-maxage=60, stale-while-revalidate=300'
    }

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
        provenance: sheet.provenance,
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
    }, { headers })
    
  } catch (error) {
    console.error('Search sheet music error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
