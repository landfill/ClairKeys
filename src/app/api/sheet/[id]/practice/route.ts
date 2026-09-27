import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

/** A run longer than this is not a practice run; it is a tab left open. */
const MAX_RUN_SECONDS = 6 * 60 * 60

const noStore = { 'Cache-Control': 'private, no-store' }

async function readSheetId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params
  const sheetId = Number(id)
  return Number.isInteger(sheetId) && sheetId > 0 ? sheetId : null
}

/**
 * Records one practice run (D-085). Only the reader's own runs on a sheet they
 * may play: a private sheet of someone else answers as if it did not exist.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

  const sheetId = await readSheetId(params)
  if (!sheetId) return NextResponse.json({ error: 'Valid sheet ID is required' }, { status: 400, headers: noStore })

  let body: unknown
  try { body = await request.json() } catch { body = null }
  const { durationSeconds, completedPercentage } = (body ?? {}) as Record<string, unknown>
  if (
    typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) ||
    durationSeconds < 1 || durationSeconds > MAX_RUN_SECONDS ||
    typeof completedPercentage !== 'number' || !Number.isFinite(completedPercentage) ||
    completedPercentage < 0 || completedPercentage > 100
  ) {
    return NextResponse.json({ error: 'Invalid practice run' }, { status: 400, headers: noStore })
  }

  try {
    const sheet = await prisma.sheetMusic.findUnique({
      where: { id: sheetId },
      select: { id: true, userId: true, isPublic: true },
    })
    if (!sheet || (!sheet.isPublic && sheet.userId !== userId)) {
      return NextResponse.json({ error: 'Sheet music not found' }, { status: 404, headers: noStore })
    }

    const created = await prisma.practiceSession.create({
      data: {
        userId,
        sheetMusicId: sheetId,
        durationSeconds: Math.round(durationSeconds),
        completedPercentage: Math.round(completedPercentage * 100) / 100,
      },
      select: { id: true },
    })
    return NextResponse.json({ id: created.id }, { status: 201, headers: noStore })
  } catch (error) {
    console.error('Record practice run error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore })
  }
}

/** The signed-in reader's own history for one sheet. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

  const sheetId = await readSheetId(params)
  if (!sheetId) return NextResponse.json({ error: 'Valid sheet ID is required' }, { status: 400, headers: noStore })

  try {
    const summary = await prisma.practiceSession.aggregate({
      where: { userId, sheetMusicId: sheetId },
      _count: { _all: true },
      _sum: { durationSeconds: true },
      _max: { completedPercentage: true, createdAt: true },
    })
    return NextResponse.json({
      count: summary._count._all,
      totalSeconds: summary._sum.durationSeconds ?? 0,
      bestPercentage: summary._max.completedPercentage ?? null,
      lastPracticedAt: summary._max.createdAt ? summary._max.createdAt.toISOString() : null,
    }, { headers: noStore })
  } catch (error) {
    console.error('Read practice history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore })
  }
}
