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
