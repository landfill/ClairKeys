/**
 * The single mapping between AudioContext time and score time.
 *
 * Audio scheduling converts score timestamps into AudioContext timestamps,
 * while the visual player converts the AudioContext playhead back into score
 * time. Keeping both directions on one immutable anchor prevents the audio,
 * falling notes, and active piano keys from accumulating independent drift.
 */
export interface PlaybackClockAnchor {
  /** AudioContext.currentTime at which playback starts. */
  audioTimeSec: number
  /** Score position represented by audioTimeSec. */
  songTimeSec: number
  /** Score seconds advanced per real AudioContext second. */
  tempoScale: number
}

/** Convert an AudioContext timestamp into score time without running backward. */
export function songTimeAtAudioTime(
  anchor: PlaybackClockAnchor,
  audioTimeSec: number
): number {
  const elapsedAudioSec = Math.max(0, audioTimeSec - anchor.audioTimeSec)
  return anchor.songTimeSec + elapsedAudioSec * Math.max(0, anchor.tempoScale)
}

/** Convert a score timestamp into the AudioContext timeline used for scheduling. */
export function audioTimeAtSongTime(
  anchor: PlaybackClockAnchor,
  songTimeSec: number
): number {
  if (anchor.tempoScale <= 0) return anchor.audioTimeSec
  return anchor.audioTimeSec + (songTimeSec - anchor.songTimeSec) / anchor.tempoScale
}
