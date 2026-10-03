import type { ReactNode } from 'react'
import Link from 'next/link'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import { getLessonNavigation, LEARN_LESSONS } from '@/lib/learn/lessons'

interface LessonLayoutProps {
  lessonId: string
  children: ReactNode
}

export default function LessonLayout({ lessonId, children }: LessonLayoutProps) {
  const lesson = LEARN_LESSONS.find(item => item.id === lessonId)
  if (!lesson) throw new Error(`Unknown learn lesson: ${lessonId}`)
  const { previous, next } = getLessonNavigation(lessonId, LEARN_LESSONS)

  return (
    <MainLayout>
      <PageHeader title={lesson.title} description={lesson.description} />
      <Container size="md" className="py-6">
        <div className="text-ink">{children}</div>
        <nav aria-label="레슨 이동" className="mt-8 flex flex-wrap gap-4 border-t border-rule pt-4 text-sm">
          {previous && <Link href={previous.href} className="rounded-sm text-accent hover:underline">이전 레슨: {previous.title}</Link>}
          <Link href="/learn" className="rounded-sm text-accent hover:underline">단계 지도로 돌아가기</Link>
          {next && <Link href={next.href} className="rounded-sm text-accent hover:underline">다음 레슨: {next.title}</Link>}
        </nav>
      </Container>
    </MainLayout>
  )
}
