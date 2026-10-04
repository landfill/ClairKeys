import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import type { PracticeHistoryItem, PracticeHistoryResponse } from '@/types/practiceHistory'

const PAGE_SIZE = 20
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const rawPage = request.nextUrl.searchParams.get('page') ?? '1'
  const page = Number(rawPage)
  if (!/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page) || page > 10000) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400, headers })
  }
  try {
    const readable = { OR: [{ isPublic: true }, { userId }] }
    const groups = await prisma.practiceSession.groupBy({
      by: ['sheetMusicId'],
      where: { userId, sheetMusic: readable },
      _count: { _all: true },
      _sum: { durationSeconds: true },
      _max: { completedPercentage: true, createdAt: true },
      orderBy: [{ _max: { createdAt: 'desc' } }, { sheetMusicId: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    })
    const visible = groups.slice(0, PAGE_SIZE)
    const sheets = visible.length ? await prisma.sheetMusic.findMany({
      where: { id: { in: visible.map(group => group.sheetMusicId) }, ...readable },
      select: { id: true, title: true, composer: true },
    }) : []
    const byId = new Map(sheets.map(sheet => [sheet.id, sheet]))
    const items: PracticeHistoryItem[] = visible.flatMap(group => {
      // Recheck access in the title lookup; a sheet can become private mid-request.
      const sheet = byId.get(group.sheetMusicId)
      return sheet ? [{
        sheetId: sheet.id, title: sheet.title, composer: sheet.composer,
        count: group._count._all, totalSeconds: group._sum.durationSeconds ?? 0,
        bestPercentage: group._max.completedPercentage,
        lastPracticedAt: group._max.createdAt?.toISOString() ?? null,
      }] : []
    })
    return NextResponse.json({ page, hasMore: groups.length > PAGE_SIZE, items } satisfies PracticeHistoryResponse, { headers })
  } catch {
    return NextResponse.json({ error: 'Could not load practice history' }, { status: 500, headers })
  }
}
