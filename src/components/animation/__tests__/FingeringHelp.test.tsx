import { render, screen } from '@testing-library/react'
import FallingNotesPlayer from '../FallingNotesPlayer'
import { canonicalToFallingNotes } from '@/utils/dataConverter'
import type { CanonicalAnimationData } from '@/types/animationContract'

jest.mock('@/utils/dataConverter', () => ({ ...jest.requireActual('@/utils/dataConverter'), canonicalToFallingNotes: jest.fn() }))
jest.mock('@/hooks/usePlaybackOrientation', () => ({ usePlaybackOrientation: () => ({ rotate: false, enter: jest.fn(), exit: jest.fn() }) }))
jest.mock('@/hooks/useFallingNotesPlayer', () => ({ useFallingNotesPlayer: () => ({
  isPlaying: false, isSessionActive: false, currentTime: 0, tempoScale: 1, lookAheadSec: 1.5,
  volume: 0.22, waitingFor: null, countInLeft: null, sampleStatus: 'ready', totalLength: 8,
  play: jest.fn(), pause: jest.fn(), stop: jest.fn(), seek: jest.fn(), setTempoScale: jest.fn(), setVolume: jest.fn(),
  pressKey: jest.fn(), playNoteNow: jest.fn(), markLoopStart: jest.fn(), markLoopEnd: jest.fn(), clearLoop: jest.fn(), loopStart: null, loopEnd: null,
}) }))

const animation: CanonicalAnimationData = {
  version: '1.1', title: 'No finger injection', composer: 'fixture', duration: 8,
  tempo: 60, tempoSource: 'score', timingReferenceBpm: 60, timeSignature: '4/4',
  notes: [{ midi: 60, start: 0, duration: 4, hand: 'R' }, { midi: 48, start: 4, duration: 4, hand: 'L' }],
}
const controls = 'button, a[href], input, select, textarea, [role=slider], [role=switch], [role=checkbox], [role=tab], summary'
beforeEach(() => localStorage.clear())
it.each([false, true])('shows the link exactly when converted notes have numbers (%s)', numbered => {
  // 유효한 비어 있지 않은 입력에는 자동 번호가 붙으므로 변환 결과를 주입해 표시 경계를 검증한다.
  jest.mocked(canonicalToFallingNotes).mockReturnValue(animation.notes.map(note => ({ ...note, handSource: 'source', finger: numbered ? 1 : undefined, fingerSource: numbered ? 'inferred' : undefined })))
  const { container } = render(<FallingNotesPlayer animationData={animation} />)
  expect(container.querySelectorAll(controls)).toHaveLength(numbered ? 17 : 16)
  if (numbered) expect(screen.getByRole('link', { name: '손가락 번호 보기' })).toHaveAttribute('href', '/learn/hands')
  else expect(screen.queryByRole('link', { name: '손가락 번호 보기' })).toBeNull()
})
