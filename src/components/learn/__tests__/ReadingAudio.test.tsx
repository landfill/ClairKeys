import { act, fireEvent, render, screen } from '@testing-library/react'
import { ListenButton, ReadingAudioProvider } from '../ReadingAudio'
const playNoteNow = jest.fn().mockResolvedValue(true)
jest.mock('@/hooks/useFallingNotesAudio', () => ({ useFallingNotesAudio: () => ({ playNoteNow }) }))
beforeEach(() => { playNoteNow.mockReset().mockResolvedValue(true); jest.useFakeTimers() })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

it('plays the provided MIDI sequence in order and cancels queued notes on unmount', async () => {
  const { unmount } = render(<ReadingAudioProvider><ListenButton midis={[64, 67, 71]} label="줄 음 들어 보기" /></ReadingAudioProvider>)
  expect(playNoteNow).not.toHaveBeenCalled()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^줄 음 들어 보기$/ })) })
  expect(playNoteNow.mock.calls).toEqual([[64]])
  await act(async () => { await jest.advanceTimersByTimeAsync(1200) })
  expect(playNoteNow.mock.calls).toEqual([[64], [67]])
  unmount()
  await act(async () => { await jest.advanceTimersByTimeAsync(5000) })
  expect(playNoteNow.mock.calls).toEqual([[64], [67]])
})
it('reports silent playback without removing the example', async () => {
  playNoteNow.mockResolvedValue(false)
  render(<ReadingAudioProvider><p>음 설명</p><ListenButton midis={[60]} label="들어 보기" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^들어 보기$/ })) })
  expect(screen.getByRole('status')).toHaveTextContent('소리를 재생하지 못했어요')
  expect(screen.getByText('음 설명')).toBeInTheDocument()
})
