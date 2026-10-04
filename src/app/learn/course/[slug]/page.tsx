import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { COURSE_PIECES, getCoursePiece } from '@/lib/learn/course'
import CoursePlayer from '@/components/learn/CoursePlayer'

type Props = { params: Promise<{ slug: string }> }
export const generateStaticParams = () => COURSE_PIECES.map(({ slug }) => ({ slug }))
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const piece = getCoursePiece((await params).slug)
  return { title: piece ? `${piece.title} | 첫 곡 코스 | ClairKeys` : '곡을 찾을 수 없습니다 | ClairKeys' }
}
export default async function CoursePiecePage({ params }: Props) {
  const piece = getCoursePiece((await params).slug)
  if (!piece) notFound()
  const index = COURSE_PIECES.indexOf(piece)
  const next = COURSE_PIECES[index + 1]
  return <CoursePlayer key={piece.slug} piece={piece} next={next ? { slug: next.slug, title: next.title } : undefined} />
}
