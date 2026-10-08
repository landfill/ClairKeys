import type { ReactNode } from 'react'
import Link from 'next/link'
import { Container, MainLayout } from '@/components/layout'
import { getLessonNavigation, LEARN_LESSONS } from '@/lib/learn/lessons'
import type { LessonSectionItem } from './LessonSection'
import LessonToc from './LessonToc'

interface LessonLayoutProps {
  lessonId: string
  sections?: LessonSectionItem[]
  children: ReactNode
}

export default function LessonLayout({ lessonId, sections, children }: LessonLayoutProps) {
  const lesson = LEARN_LESSONS.find(item => item.id === lessonId)
  if (!lesson) throw new Error(`Unknown learn lesson: ${lessonId}`)
  const { previous, next } = getLessonNavigation(lessonId, LEARN_LESSONS)

  const lessonIndex = LEARN_LESSONS.findIndex(item => item.id === lessonId)
  const totalSteps = LEARN_LESSONS.length
  const currentStep = lessonIndex + 1

  const hasToc = Boolean(sections && sections.length >= 4)

  const mainContent = (
    <>
      <div className="text-ink">{children}</div>
      <nav aria-label="레슨 이동" className="mt-12 border-t border-rule pt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {previous ? (
            <Link
              href={previous.href}
              aria-label={`이전 레슨: ${previous.title}`}
              className="group flex min-h-11 flex-col justify-center rounded-lg border border-rule bg-surface p-4 transition-colors hover:bg-surface-muted"
            >
              <span aria-hidden="true" className="text-xs text-ink-muted">이전 레슨</span>
              <span aria-hidden="true" className="mt-0.5 text-base font-semibold text-ink group-hover:text-accent">
                {previous.title}
              </span>
            </Link>
          ) : (
            <div aria-hidden="true" className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={next.href}
              aria-label={`다음 레슨: ${next.title}`}
              className="group flex min-h-11 flex-col justify-center rounded-lg border border-rule bg-surface p-4 text-right transition-colors hover:bg-surface-muted"
            >
              <span aria-hidden="true" className="text-xs text-ink-muted">다음 레슨</span>
              <span aria-hidden="true" className="mt-0.5 text-base font-semibold text-ink group-hover:text-accent">
                {next.title}
              </span>
            </Link>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href="/learn"
            className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline"
          >
            단계 지도로 돌아가기
          </Link>
          <Link
            href="/learn/glossary"
            className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline"
          >
            용어 사전
          </Link>
        </div>
      </nav>
    </>
  )

  return (
    <MainLayout>
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="현재 위치" className="flex items-center text-sm">
              <Link
                href="/learn"
                className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline"
              >
                배우기
              </Link>
              <span aria-hidden="true" className="mx-2 text-ink-muted">›</span>
              <span
                aria-current="page"
                className="inline-flex min-h-11 items-center font-medium text-ink"
              >
                {lesson.title}
              </span>
            </nav>
            <span className="text-sm text-ink-muted">
              {totalSteps}단계 중 {currentStep}단계
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{lesson.title}</h1>
          {lesson.description && (
            <p className="mt-2 text-sm text-ink-muted">{lesson.description}</p>
          )}
          {lesson.activity && (
            <p className="mt-2 text-sm text-ink-muted">해 보기 · {lesson.activity}</p>
          )}
        </div>
      </header>
      <Container size="xl" className="py-8">
        {hasToc && sections ? (
          <LessonToc sections={sections}>
            {mainContent}
          </LessonToc>
        ) : (
          <div className="max-w-4xl">
            {mainContent}
          </div>
        )}
      </Container>
    </MainLayout>
  )
}
