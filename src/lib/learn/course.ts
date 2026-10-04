import { normalizeAnimationData } from '@/utils/animationContract'
import type { CanonicalAnimationData } from '@/types/animationContract'
import right from '../../../public/learn/course/right-hand.animation.json'
import left from '../../../public/learn/course/left-hand.animation.json'
import both from '../../../public/learn/course/both-hands.animation.json'

export interface CoursePiece {
  slug: string
  title: string
  instruction: string
  data: CanonicalAnimationData
  sourceUrl: string
  scoreUrl: string
}

export const COURSE_PIECES: CoursePiece[] = [
  { slug: 'right-hand', raw: right, instruction: '오른손 엄지를 가운데 도에 놓고 도~솔 다섯 건반을 차례로 익혀요.' },
  { slug: 'left-hand', raw: left, instruction: '왼손 새끼손가락을 한 옥타브 아래 도에 놓아요. 도~솔을 5·4·3·2·1로 눌러요.' },
  { slug: 'both-hands', raw: both, instruction: '오른손 멜로디에 왼손의 긴 음을 더해요. 어렵다면 한 손씩 연습한 뒤 양손으로 합쳐 보세요.' },
].map(({ slug, raw, instruction }) => ({
  slug, title: raw.title, instruction, data: normalizeAnimationData(raw),
  sourceUrl: `/learn/course/${slug}.musicxml`, scoreUrl: `/learn/course/${slug}.score.json`,
}))

export const getCoursePiece = (slug: string) => COURSE_PIECES.find(piece => piece.slug === slug)
