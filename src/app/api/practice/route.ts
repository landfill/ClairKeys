import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import type { PracticeHistoryItem, PracticeHistoryResponse } from '@/types/practiceHistory'

const PAGE_SIZE = 20
const headers = { 'Cache-Control': 'private, no-store' }

interface Cursor { asOf: Date; after?: { at: Date; sheetId: number } }
const encodeCursor = (cursor: Cursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url')
function readCursor(raw: string | null): Cursor {
  if (raw === null) return { asOf: new Date() }
  if (!/^[A-Za-z0-9_-]{1,1024}$/.test(raw)) throw new Error('Invalid cursor')
  const value: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString())
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid cursor')
  const source = value as Record<string, unknown>
  const date = (input: unknown) => {
    if (typeof input !== 'string') throw new Error('Invalid cursor date')
    const parsed = new Date(input)
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== input) throw new Error('Invalid cursor date')
    return parsed
  }
  const asOf = date(source.asOf)
  if (source.after === undefined) return { asOf }
  if (!source.after || typeof source.after !== 'object') throw new Error('Invalid cursor position')
  const after = source.after as Record<string, unknown>
  const at = date(after.at)
  if (at > asOf || typeof after.sheetId !== 'number' || !Number.isInteger(after.sheetId) || after.sheetId < 1 || after.sheetId > 2147483647) throw new Error('Invalid cursor position')
  return { asOf, after: { at, sheetId: after.sheetId } }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  let cursor: Cursor
  try { cursor = readCursor(request.nextUrl.searchParams.get('cursor')) } catch {
    return NextResponse.json({ error: 'Invalid cursor' }, { status: 400, headers })
  }
  try {
    const readable = { OR: [{ isPublic: true }, { userId }] }
    const groups = await prisma.practiceSession.groupBy({
      by: ['sheetMusicId'],
      where: { userId, sheetMusic: readable, createdAt: { lte: cursor.asOf } },
      _count: { _all: true },
      _sum: { durationSeconds: true },
      _max: { completedPercentage: true, createdAt: true },
      orderBy: [{ _max: { createdAt: 'desc' } }, { sheetMusicId: 'desc' }],
      having: cursor.after ? { OR: [
        { createdAt: { _max: { lt: cursor.after.at } } },
        { AND: [{ createdAt: { _max: { equals: cursor.after.at } } }, { sheetMusicId: { lt: cursor.after.sheetId } }] },
      ] } : undefined,
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
    const last = visible.at(-1)
    const nextCursor = groups.length > PAGE_SIZE && last?._max.createdAt
      ? encodeCursor({ asOf: cursor.asOf, after: { at: last._max.createdAt, sheetId: last.sheetMusicId } }) : null
    return NextResponse.json({ cursor: encodeCursor(cursor), nextCursor, items } satisfies PracticeHistoryResponse, { headers })
  } catch {
    return NextResponse.json({ error: 'Could not load practice history' }, { status: 500, headers })
  }
}
