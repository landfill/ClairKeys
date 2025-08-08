import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheService } from '@/lib/cache'

// GET /api/sheet/public - Get public sheet music list (with caching)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Create cache key based on query parameters
    const cacheKey = `public_sheets_${search || 'all'}_${categoryId || 'all'}_${limit}_${offset}`
    
    // Try to get from cache first (longer cache for public data)
    const cachedData = await cacheService.get(cacheKey, {
      ttl: 5 * 60 * 1000, // 5 minutes cache for public data
      version: '1.0'
    })
    
    if (cachedData) {
      console.log('Returning cached public sheets')
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      })
    }

    // Build where clause for public sheets only
    const where: any = {
      isPublic: true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { composer: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (categoryId) {
      const catId = parseInt(categoryId)
      if (!isNaN(catId)) {
        where.categoryId = catId
      }
    }

    // Get public sheet music list
    const [sheetMusic, total] = await Promise.all([
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
        orderBy: {
          createdAt: 'desc'
        },
        take: Math.min(limit, 50), // Max 50 items per request
        skip: offset
      }),
      prisma.sheetMusic.count({ where })
    ])

    const responseData = {
      success: true,
      sheetMusic: sheetMusic.map(sheet => ({
        id: sheet.id,
        title: sheet.title,
        composer: sheet.composer,
        categoryId: sheet.categoryId,
        category: sheet.category,
        createdAt: sheet.createdAt,
        owner: sheet.user
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    }

    // Cache the result
    await cacheService.set(cacheKey, responseData, {
      ttl: 5 * 60 * 1000, // 5 minutes cache
      version: '1.0'
    })

    return NextResponse.json(responseData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })

  } catch (error) {
    console.error('Get public sheet music error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}