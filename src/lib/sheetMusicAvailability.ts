export type SheetMusicAvailability = 'ready' | 'processing' | 'failed' | 'unknown'

/**
 * Converts persisted processing details into the only status a library client may read.
 * Stored animation data is authoritative because legacy rows may retain `pending`.
 */
export function deriveSheetMusicAvailability({
  animationDataUrl,
  processingStatus,
}: {
  animationDataUrl: string
  processingStatus: string
}): SheetMusicAvailability {
  if (animationDataUrl !== '') return 'ready'
  if (processingStatus === 'processing') return 'processing'
  if (processingStatus === 'failed') return 'failed'
  return 'unknown'
}
