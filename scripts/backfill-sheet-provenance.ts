import { config } from 'dotenv'
import { PrismaClient, type SheetMusicProvenance } from '@prisma/client'
import {
  classifySheetProvenance,
  type ProvenanceClassification,
} from '../src/services/sheetProvenanceBackfill'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

function allowedStorageOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!configured) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required to constrain animation downloads')
  }
  return new URL(configured).origin
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
  const rows = await prisma.sheetMusic.findMany({
    select: {
      id: true,
      omrJobId: true,
      animationDataUrl: true,
    },
    orderBy: { id: 'asc' },
  })

  const classifications: ProvenanceClassification[] = []
  for (const row of rows) {
    const classification = await classifySheetProvenance(row, loadAnimation)
    if (classification.fetchFailed) console.error(`SheetMusic ${row.id}: animation could not be classified`)
    classifications.push(classification)
  }

  const idsByProvenance = (provenance: SheetMusicProvenance) =>
    classifications.filter((item) => item.provenance === provenance).map((item) => item.id)

  const omrIds = idsByProvenance('omr')
  const demoIds = idsByProvenance('demo')
  const unknownIds = idsByProvenance('unknown')
  const fetchFailures = classifications.filter((item) => item.fetchFailed).length

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    total: rows.length,
    omr: omrIds.length,
    demo: demoIds.length,
    unknown: unknownIds.length,
    fetchFailures,
  }, null, 2))

  if (!apply) return

  await prisma.$transaction([
    prisma.sheetMusic.updateMany({
      where: { id: { in: omrIds } },
      data: { provenance: 'omr' },
    }),
    prisma.sheetMusic.updateMany({
      where: { id: { in: demoIds } },
      data: { provenance: 'demo' },
    }),
  ])
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
