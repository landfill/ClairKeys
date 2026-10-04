import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import { COURSE_PIECES } from '@/lib/learn/course'

export const metadata: Metadata = { title: '첫 곡 코스 | ClairKeys', description: '도~솔 다섯 손가락 자리로 오른손, 왼손, 양손의 짧은 연습곡을 쳐 봐요.' }

export default function CoursePage() {
  return <MainLayout>
    <PageHeader title="첫 곡 코스" description="도~솔 다섯 건반으로 짧은 곡을 연습해요. 익숙해지면 다음 곡으로 넘어가세요." />
    <Container size="md" className="py-6">
      <p className="text-sm text-ink-muted">ClairKeys에서 이 코스를 위해 만든 창작 연습곡이에요. 원본 악보의 음과 손가락 번호를 그대로 사용해요.</p>
      <p className="mt-3 text-sm text-ink-muted">먼저 <Link href="/learn/hands#five-fingers" className="rounded-sm text-accent hover:underline">다섯 손가락 자리</Link>를 확인하고, <Link href="/learn/practice" className="rounded-sm text-accent hover:underline">느리게 재생하거나 구간을 반복하는 방법</Link>을 익혀 보세요.</p>
      <ol aria-label="첫 곡 순서" className="mt-6 space-y-4">
        {COURSE_PIECES.map((piece, i) => <li key={piece.slug} className="rounded-lg border border-rule bg-surface p-5">
          <p className="text-sm text-ink-muted">{i + 1}번째 곡</p>
          <h2 className="mt-2 text-lg font-semibold text-ink"><Link href={`/learn/course/${piece.slug}`} className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline">{piece.title}</Link></h2>
          <p className="mt-2 text-sm text-ink-muted">{piece.instruction}</p>
        </li>)}
      </ol>
      <Link href="/learn" className="mt-6 inline-flex min-h-11 items-center rounded-sm text-sm text-accent hover:underline">단계 지도로 돌아가기</Link>
    </Container>
  </MainLayout>
}
