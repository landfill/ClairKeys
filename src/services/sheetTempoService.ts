import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSupabaseServer } from '@/lib/supabase/server'
import { normalizeAnimationData } from '@/utils/animationContract'
import { retimeAnimation } from '@/utils/tempoInput'

export class TempoEditError extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

interface SourceRevision {
  id: number
  userId: string
  animationDataUrl: string
  updatedAt: Date
}

/** Called only after the route verifies ownership and validates metadata. */
export async function saveSheetTempo(source: SourceRevision, bpm: number, metadata: Prisma.SheetMusicUncheckedUpdateManyInput) {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!configured) throw new TempoEditError('Storage is unavailable', 503)
  const prefix = '/storage/v1/object/public/animation-data/'
  let path: string
  try {
    const url = new URL(source.animationDataUrl)
    if (url.origin !== new URL(configured).origin || !url.pathname.startsWith(prefix)) throw new Error()
    path = decodeURIComponent(url.pathname.slice(prefix.length))
    if (!path || path.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error()
  } catch {
    throw new TempoEditError('This score cannot be edited; upload it again', 422)
  }

  const bucket = getSupabaseServer().storage.from('animation-data')
  const downloaded = await bucket.download(path)
  if (downloaded.error || !downloaded.data) throw new TempoEditError('Could not load the score', 502)
  let updated
  try {
    updated = retimeAnimation(normalizeAnimationData(JSON.parse(await downloaded.data.text())), bpm)
  } catch {
    throw new TempoEditError('The score data or tempo is invalid', 422)
  }
  const newPath = `${source.userId}/tempo_${randomUUID()}.json`
  const uploaded = await bucket.upload(newPath, Buffer.from(JSON.stringify(updated)), {
    contentType: 'application/json', cacheControl: '3600', upsert: false,
  })
  if (uploaded.error) throw new TempoEditError('Could not save the new tempo', 502)
  const { data: { publicUrl } } = bucket.getPublicUrl(newPath)

  // An ambiguous DB/network failure may have committed. Do not delete the new
  // object in a catch block: that could erase the document the row now names.
  const result = await prisma.sheetMusic.updateMany({
    where: source,
    data: { ...metadata, animationDataUrl: publicUrl },
  })
  if (result.count !== 1) {
    await bucket.remove([newPath])
    throw new TempoEditError('The score changed; reload it before saving again', 409)
  }
  // Keep the prior object: another row may reference it and it remains a
  // recovery copy. Old-object lifecycle is deliberately separate (D-046).
  return prisma.sheetMusic.findUnique({
    where: { id: source.id },
    include: { category: { select: { id: true, name: true } } },
  })
}
