import { act, renderHook } from '@testing-library/react'
import { useFallingNotesPlayer } from '../useFallingNotesPlayer'

jest.mock('../useFallingNotesAudio', () => ({
  DEFAULT_MASTER_GAIN: 0.8,
  useFallingNotesAudio: () => ({
    startAudio: jest.fn(async () => true),
    stopAudio: jest.fn(),
    getCurrentTime: jest.fn(() => 0),
    updateTempoScale: jest.fn(),
    setOffsetTime: jest.fn(),
    setVolume: jest.fn((value: number) => value),
    sampleStatus: 'ready',
    reset: jest.fn(),
  }),
}))

jest.mock('@/utils/visualUtils', () => ({
  calculateSongLength: () => 10,
  shouldAutoStop: () => false,
}))

describe('useFallingNotesPlayer loop markers', () => {
  it('commits B only when it makes a valid A–B interval', async () => {
    const { result } = renderHook(() => useFallingNotesPlayer([]))

    await act(async () => {
      await result.current.seek(4)
    })
    act(() => result.current.markLoopStart())

    act(() => result.current.markLoopEnd())
    expect(result.current.loopEnd).toBeNull()

    await act(async () => {
      await result.current.seek(6)
    })
    act(() => result.current.markLoopEnd())
    expect(result.current.loopEnd).toBe(6)
  })
})
