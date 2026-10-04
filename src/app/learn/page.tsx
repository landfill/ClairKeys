import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import { LEARN_LESSONS } from '@/lib/learn/lessons'

export const metadata: Metadata = {
  title: '배우기 | ClairKeys',
  description: '건반, 악보 읽기, 손 자세와 연습 방법을 순서대로 익히는 피아노 초보자를 위한 학습 단계 지도입니다.',
}

export default function LearnPage() {
  return (
    <MainLayout>
      <PageHeader title="배우기" description="건반부터 연습 방법까지, 피아노의 기초를 순서대로 익혀요." />
      <Container className="py-6">
        <ol aria-label="학습 단계" className="grid gap-4 md:grid-cols-2">
          {LEARN_LESSONS.map((lesson, index) => (
            <li key={lesson.id} className="min-w-0 rounded-lg border border-rule bg-surface p-5">
              <p className="text-sm text-ink-muted">{index + 1}단계</p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                {lesson.available ? (
                  <Link href={lesson.href} className="rounded-sm text-accent hover:underline">{lesson.title}</Link>
                ) : lesson.title}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">{lesson.description}</p>
              {!lesson.available && <p className="mt-4 text-sm text-ink-muted">준비 중</p>}
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-ink-muted">배운 것을 쳐 보고 싶다면 <Link href="/learn/course" className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline">첫 곡 코스</Link>를 시작해 보세요.</p>
        <p className="mt-6 text-sm text-ink-muted">낯선 말이 있다면 <Link href="/learn/glossary" className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline">용어 사전</Link>에서 찾아보세요.</p>
      </Container>
    </MainLayout>
  )
}
