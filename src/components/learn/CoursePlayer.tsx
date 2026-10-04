'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import FallingNotesPlayer from '@/components/animation/FallingNotesPlayer'
import SongIntro from '@/components/sheet/SongIntro'
import type { CoursePiece } from '@/lib/learn/course'

export default function CoursePlayer({ piece, next }: { piece: CoursePiece; next?: { slug: string; title: string } }) {
  const [active, setActive] = useState(false)
  return <MainLayout>
    {!active && <PageHeader title={piece.title} description={piece.instruction} />}
    <Container size={active ? 'full' : 'lg'} className={active ? 'px-0 py-0 sm:px-0 lg:px-0' : 'py-6'}>
      <FallingNotesPlayer animationData={piece.data} scoreUrl={piece.scoreUrl} onSessionChange={setActive} />
      {!active && <div className="mt-6 rounded-lg border border-rule bg-surface p-5">
        <p className="text-sm text-ink-muted">ClairKeys 창작 연습곡 · 이 코스를 위해 작성한 원본 악보예요.</p>
        <p className="mt-2 text-sm text-ink-muted">이 코스의 연습 기록은 계정에 저장되지 않아요.</p>
        <a href={piece.sourceUrl} download className="mt-2 inline-flex min-h-11 items-center rounded-sm text-sm text-accent hover:underline">원본 악보 내려받기 (MusicXML)</a>
        <SongIntro data={piece.data} scoreUrl={piece.scoreUrl} />
        <nav aria-label="코스 이동" className="mt-6 flex flex-wrap gap-4 border-t border-rule pt-4 text-sm">
          <Link href="/learn/course" className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline">첫 곡 코스로 돌아가기</Link>
          {next && <Link href={`/learn/course/${next.slug}`} className="inline-flex min-h-11 items-center rounded-sm text-accent hover:underline">다음 곡: {next.title}</Link>}
        </nav>
      </div>}
    </Container>
  </MainLayout>
}
