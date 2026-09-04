import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * The old endpoint permanently wrote random finger numbers into stored JSON.
 * Ordinary scores do not contain source fingering, and the player now performs
 * deterministic phrase inference without mutating that source document. Keep a
 * guarded tombstone so bookmarked admin clients receive an explicit answer
 * instead of silently corrupting data or mistaking a 404 for an auth problem.
 */

function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
}

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 },
    )
  }

  if (!getAdminEmails().includes(session.user.email)) {
    return NextResponse.json(
      { success: false, error: 'Admin privileges required' },
      { status: 403 },
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Stored fingering backfill has been retired',
      message: 'ClairKeys now infers deterministic fingering at playback without overwriting score data.',
    },
    { status: 410 },
  )
}
