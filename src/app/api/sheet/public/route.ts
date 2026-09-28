import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 50

/**
 * The one definition of "public" for listing (D-075). The explore page reads
 * only this endpoint (#197, D-091), so a change here reaches every public list.
 */
const PUBLIC_ONLY = {
  isPublic: true,
  provenance: { not: 'demo' as const },
} satisfies Prisma.SheetMusicWhereInput

/**
 * Offset pages need a total order: rows that tie on the sort key would
 * otherwise be free to swap between requests and show up on two pages.
 */
const ORDER_BY: Record<string, Prisma.SheetMusicOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  title: [{ title: 'asc' }, { id: 'asc' }],
  composer: [{ composer: 'asc' }, { id: 'asc' }],
}

const intParam = (value: string | null, fallback: number) => {
  const parsed = parseInt(value ?? '', 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

// GET /api/sheet/public - Public sheet music list, search and filters
export async function GET(request: NextRequest) {
  try {
    const requestStartedAt = performance.now()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const categoryId = searchParams.get('categoryId')
    const orderBy = ORDER_BY[searchParams.get('sortBy') ?? ''] ?? ORDER_BY.newest
    const limit = Math.min(MAX_LIMIT, Math.max(1, intParam(searchParams.get('limit'), DEFAULT_LIMIT)))
    const offset = Math.max(0, intParam(searchParams.get('offset'), 0))

    const where: Prisma.SheetMusicWhereInput = { ...PUBLIC_ONLY }

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

    // Categories belong to their owners, and /api/categories is the signed-in
    // reader's own list. The public page may name a category only while it
    // holds a public sheet, and it gets that list with the first page so that
    // opening the page is one request. It ignores the current search and
    // category, or choosing one would empty the menu of every other.
    const databaseStartedAt = performance.now()
    const [sheetMusic, total, categories] = await Promise.all([
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
      prisma.sheetMusic.count({ where }),
      offset === 0
        ? prisma.category.findMany({
            include: { _count: { select: { sheetMusic: { where: PUBLIC_ONLY } } } },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          })
        : Promise.resolve(null),
    ])

    const databaseDurationMs = performance.now() - databaseStartedAt
    const databaseQueryCount = categories ? 3 : 2

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
      },
      ...(categories ? {
        categories: categories
          .map(category => ({ id: category.id, name: category.name, count: category._count.sheetMusic }))
          .filter(category => category.count > 0),
      } : {}),
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        // Latency evidence for #187, which the retired search route used to carry.
        'Server-Timing': [
          `db;dur=${databaseDurationMs.toFixed(1)};desc="${databaseQueryCount} queries"`,
          `total;dur=${(performance.now() - requestStartedAt).toFixed(1)}`,
        ].join(', ')
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
