/**
 * The volume slider carries the master gain itself; readers see how far along its
 * range it sits (D-080). The gain value stays the one `useFallingNotesAudio` clamps.
 */
export function formatVolumePercent(volume: number, maxVolume: number): string {
  if (!(maxVolume > 0)) return '0%'
  const share = Math.min(1, Math.max(0, volume / maxVolume))
  return `${Math.round(share * 100)}%`
}
