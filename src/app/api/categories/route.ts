import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { cacheService } from '@/lib/cache'

// GET /api/categories - Get user's categories (with caching)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session in categories GET API:', session)
    
    if (!session?.user?.id) {
      console.log('No session or user ID found in GET')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const cacheKey = `categories_${session.user.id}`
    
    // Try to get from cache first
    const cachedCategories = await cacheService.get(cacheKey, {
      ttl: 60 * 1000, // 1 minute cache
      version: '1.0'
    })
    
    if (cachedCategories) {
      console.log('Returning cached categories')
      return NextResponse.json(cachedCategories, {
        headers: {
          'X-Cache': 'HIT'
        }
      })
    }

    // Fetch from database
    const categories = await prisma.category.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Cache the result
    await cacheService.set(cacheKey, categories, {
      ttl: 60 * 1000, // 1 minute cache
      version: '1.0'
    })

    return NextResponse.json(categories, {
      headers: {
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session in categories API:', JSON.stringify(session, null, 2))
    console.log('Auth options:', JSON.stringify(authOptions, null, 2))
    
    if (!session?.user?.id) {
      console.log('No session or user ID found')
      console.log('Session user:', session?.user)
      return NextResponse.json(
        { error: 'Unauthorized - No valid session found' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category with same name already exists for this user
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim(),
      },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        userId: session.user.id,
      },
    })

    // Invalidate cache after creating new category
    const cacheKey = `categories_${session.user.id}`
    await cacheService.delete(cacheKey)

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Failed to create category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}