import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { MAX_SCORE_ARTIFACT_BYTES } from '@/types/scoreArtifact'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    const { id } = await params
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return NextResponse.json({ error: 'Invalid sheet ID' }, { status: 400, headers })
    }
    const artifact = await prisma.sheetScoreArtifact.findFirst({
      where: { sheetMusicId: Number(id), sheetMusic: { userId: session.user.id } },
      select: { data: true },
    })
    if (!artifact) return NextResponse.json({ error: 'Score not found' }, { status: 404, headers })
    if (Buffer.byteLength(JSON.stringify(artifact.data), 'utf8') > MAX_SCORE_ARTIFACT_BYTES) {
      return NextResponse.json({ error: 'Score exceeds the display size limit' }, { status: 413, headers })
    }
    return NextResponse.json(artifact.data, { headers })
  } catch {
    return NextResponse.json({ error: 'Could not load score' }, { status: 500, headers })
  }
}
