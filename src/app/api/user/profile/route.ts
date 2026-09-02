import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/user/profile — the parts of the signed-in account that the session
 * token does not carry.
 *
 * Name, email and image already travel in the JWT, so this exists for
 * `createdAt` alone. The profile page showed a hardcoded join date before this
 * route existed (issue #104); the value was in the schema all along with
 * nothing to read it.
 *
 * Only the caller's own row is readable — there is no id parameter to point
 * somewhere else.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true }
    })

    if (!user) {
      // The JWT outlived the row. Say so rather than inventing a date.
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ createdAt: user.createdAt.toISOString() })
  } catch (error) {
    console.error('Failed to load user profile:', error)
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    )
  }
}
