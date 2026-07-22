import {
  audioTimeAtSongTime,
  songTimeAtAudioTime,
  type PlaybackClockAnchor,
} from '../playbackClock'

const anchor: PlaybackClockAnchor = {
  audioTimeSec: 100,
  songTimeSec: 12.5,
  tempoScale: 1,
}

function measureMaxDrift(realDurationSec: number, tempoScale: number): number {
  const framesPerSecond = 60
  const testAnchor = { ...anchor, tempoScale }
  let maxDrift = 0

  for (let frame = 0; frame <= realDurationSec * framesPerSecond; frame++) {
    const realElapsedSec = frame / framesPerSecond
    const audioTimeSec = testAnchor.audioTimeSec + realElapsedSec
    const expectedSongTimeSec = testAnchor.songTimeSec + realElapsedSec * tempoScale
    const actualSongTimeSec = songTimeAtAudioTime(testAnchor, audioTimeSec)

    maxDrift = Math.max(maxDrift, Math.abs(actualSongTimeSec - expectedSongTimeSec))
  }

  return maxDrift
}

describe('playbackClock', () => {
  it('maps song time and AudioContext time through the same anchor', () => {
    const songTimeSec = songTimeAtAudioTime(anchor, 142.25)

    expect(songTimeSec).toBeCloseTo(54.75, 10)
    expect(audioTimeAtSongTime(anchor, songTimeSec)).toBeCloseTo(142.25, 10)
  })

  it.each([
    ['1 minute', 60, 1],
    ['5 minutes', 300, 1],
    ['5 minutes at 2x', 300, 2],
    ['5 minutes at 0.5x', 300, 0.5],
  ])('keeps %s playback drift below 1ms', (_label, durationSec, tempoScale) => {
    expect(measureMaxDrift(durationSec, tempoScale)).toBeLessThan(0.001)
  })

  it('does not run backwards before the audio anchor begins', () => {
    expect(songTimeAtAudioTime(anchor, 99)).toBe(anchor.songTimeSec)
  })
})
