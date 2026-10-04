'use client'

import { useEffect, useState } from 'react'
import { loadScoreArtifact } from '@/utils/scoreArtifactCache'
import { readScoreProvenance, type ScoreProvenance } from '@/lib/learn/scoreProvenance'

/** The player and introduction share the same validated artifact download. */
export function useScoreProvenance(url?: string): ScoreProvenance {
  const [loaded, setLoaded] = useState<{ url: string; value: ScoreProvenance } | null>(null)
  useEffect(() => {
    if (!url) return
    let current = true
    loadScoreArtifact(url)
      .then(artifact => { if (current) setLoaded({ url, value: readScoreProvenance(artifact.musicxml) }) })
      .catch(() => { if (current) setLoaded({ url, value: {} }) })
    return () => { current = false }
  }, [url])
  return url && loaded?.url === url ? loaded.value : {}
}
