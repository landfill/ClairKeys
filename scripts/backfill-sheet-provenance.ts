import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { runSheetProvenanceBackfill } from '../src/services/sheetProvenanceBackfill'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

function allowedStorageOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!configured) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required to constrain animation downloads')
  }
  const url = new URL(configured)
  if (url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must use HTTPS')
  }
  return url.origin
}

async function loadAnimation(animationDataUrl: string): Promise<unknown> {
  const url = new URL(animationDataUrl)
  if (url.protocol !== 'https:' || url.origin !== allowedStorageOrigin()) {
    throw new Error('animationDataUrl is outside the configured Supabase origin')
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`animation fetch returned ${response.status}`)
  return response.json()
}

async function main() {
  const result = await runSheetProvenanceBackfill({
    listRows: () => prisma.sheetMusic.findMany({
      select: {
        id: true,
        omrJobId: true,
        animationDataUrl: true,
      },
      orderBy: { id: 'asc' },
    }),
    loadAnimation,
    validateAnimationStorage: allowedStorageOrigin,
    updateProvenance: ({ omrIds, demoIds }) => prisma.$transaction([
      prisma.sheetMusic.updateMany({
        where: { id: { in: omrIds } },
        data: { provenance: 'omr' },
      }),
      prisma.sheetMusic.updateMany({
        where: { id: { in: demoIds } },
        data: { provenance: 'demo' },
      }),
    ]),
  }, apply)

  for (const classification of result.classifications) {
    if (classification.fetchFailed) {
      console.error(`SheetMusic ${classification.id}: animation could not be classified`)
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    total: result.classifications.length,
    omr: result.omrIds.length,
    demo: result.demoIds.length,
    unknown: result.unknownIds.length,
    fetchFailures: result.fetchFailures,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
