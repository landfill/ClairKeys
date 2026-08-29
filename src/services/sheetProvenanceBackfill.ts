import type { SheetMusicProvenance } from '@prisma/client'
import { isKnownDemoAnimation } from '@/utils/demoProvenance'

export interface ProvenanceCandidate {
  id: number
  omrJobId: string | null
  animationDataUrl: string
}

export interface ProvenanceClassification {
  id: number
  provenance: SheetMusicProvenance
  fetchFailed: boolean
}

type AnimationLoader = (animationDataUrl: string) => Promise<unknown>

interface ProvenanceBackfillDependencies {
  listRows: () => Promise<ProvenanceCandidate[]>
  loadAnimation: AnimationLoader
  validateAnimationStorage: () => void
  updateProvenance: (ids: { omrIds: number[]; demoIds: number[] }) => Promise<unknown>
}

export interface ProvenanceBackfillResult {
  classifications: ProvenanceClassification[]
  omrIds: number[]
  demoIds: number[]
  unknownIds: number[]
  fetchFailures: number
}

/** Applies D-010's asymmetric rule: only exact evidence can produce demo. */
export async function classifySheetProvenance(
  row: ProvenanceCandidate,
  loadAnimation: AnimationLoader
): Promise<ProvenanceClassification> {
  if (row.omrJobId) {
    return { id: row.id, provenance: 'omr', fetchFailed: false }
  }

  if (!row.animationDataUrl) {
    return { id: row.id, provenance: 'unknown', fetchFailed: false }
  }

  try {
    const payload = await loadAnimation(row.animationDataUrl)
    return {
      id: row.id,
      provenance: isKnownDemoAnimation(payload) ? 'demo' : 'unknown',
      fetchFailed: false,
    }
  } catch {
    return { id: row.id, provenance: 'unknown', fetchFailed: true }
  }
}

/** Validates shared storage configuration before any candidate fetch or write. */
export async function runSheetProvenanceBackfill(
  dependencies: ProvenanceBackfillDependencies,
  apply: boolean
): Promise<ProvenanceBackfillResult> {
  const rows = await dependencies.listRows()
  const hasAnimationCandidate = rows.some((row) => !row.omrJobId && row.animationDataUrl)

  if (hasAnimationCandidate) {
    dependencies.validateAnimationStorage()
  }

  const classifications: ProvenanceClassification[] = []
  for (const row of rows) {
    classifications.push(await classifySheetProvenance(row, dependencies.loadAnimation))
  }

  const idsByProvenance = (provenance: SheetMusicProvenance) =>
    classifications.filter((item) => item.provenance === provenance).map((item) => item.id)

  const result = {
    classifications,
    omrIds: idsByProvenance('omr'),
    demoIds: idsByProvenance('demo'),
    unknownIds: idsByProvenance('unknown'),
    fetchFailures: classifications.filter((item) => item.fetchFailed).length,
  }

  if (apply) {
    await dependencies.updateProvenance({
      omrIds: result.omrIds,
      demoIds: result.demoIds,
    })
  }

  return result
}
