import { render, screen } from '@testing-library/react'
import CoursePlayer from '../CoursePlayer'
import { COURSE_PIECES } from '@/lib/learn/course'
import { clearScoreArtifactCache } from '@/utils/scoreArtifactCache'
import right from '../../../../public/learn/course/right-hand.score.json'
import left from '../../../../public/learn/course/left-hand.score.json'
import both from '../../../../public/learn/course/both-hands.score.json'

jest.mock('@/components/animation/FallingNotesPlayer', () => ({ __esModule: true, default: () => <div data-testid="course-player" /> }))
const artifacts = [right, left, both]
beforeEach(() => { clearScoreArtifactCache(); global.fetch = jest.fn() })
it.each(COURSE_PIECES.map((piece, index) => ({ piece, artifact: artifacts[index] })))('connects $piece.slug to its real authored meter and key', async ({ piece, artifact }) => {
  ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => artifact })
  render(<CoursePlayer piece={piece} />)
  expect(await screen.findByText('샵·플랫 없음')).toBeInTheDocument()
  expect(screen.getByText('4/4')).toBeInTheDocument()
  expect(screen.getAllByText('원본 악보 기준')).toHaveLength(2)
  expect(fetch).toHaveBeenCalledWith(piece.scoreUrl, { cache: 'no-store' })
})
