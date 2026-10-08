import type { Metadata } from 'next'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import LearnCard from '@/components/learn/LearnCard'
import { COURSE_PIECES } from '@/lib/learn/course'
import { LEARN_LESSONS } from '@/lib/learn/lessons'

export const metadata: Metadata = {
  title: '배우기 | ClairKeys',
  description: '건반, 악보 읽기, 손 자세와 연습 방법을 순서대로 익히는 피아노 초보자를 위한 학습 단계 지도입니다.',
}

const sectionTitle = 'text-xl font-semibold text-ink'

export default function LearnPage() {
  return (
    <MainLayout>
      <PageHeader title="배우기" description="건반부터 연습 방법까지, 피아노의 기초를 순서대로 익혀요." />
      <Container className="space-y-10 py-6">
        <section aria-labelledby="learn-basics">
          <h2 id="learn-basics" className={sectionTitle}>기초 레슨</h2>
          <ol aria-label="학습 단계" className="mt-4 grid gap-4 md:grid-cols-2">
            {LEARN_LESSONS.map((lesson, index) => (
              <LearnCard key={lesson.id} as="li" eyebrow={`${index + 1}단계`} title={lesson.title}
                href={lesson.available ? lesson.href : undefined} description={lesson.description}
                topics={lesson.topics} detail={`해 보기 · ${lesson.activity}`} />
            ))}
          </ol>
        </section>
        <section aria-labelledby="learn-play">
          <h2 id="learn-play" className={sectionTitle}>쳐 보기</h2>
          <div className="mt-4">
            <LearnCard emphasis title="첫 곡 코스" href="/learn/course" description="배운 다섯 손가락 자리로 짧은 곡을 차례로 쳐 봐요."
              detail={`짧은 곡 ${COURSE_PIECES.length}곡`} />
          </div>
        </section>
        <section aria-labelledby="learn-lookup">
          <h2 id="learn-lookup" className={sectionTitle}>찾아보기</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            <LearnCard as="li" title="용어 사전" href="/learn/glossary" description="건반, 악보, 손가락과 연습 화면에서 만나는 낯선 말의 뜻을 찾아봐요." />
            <LearnCard as="li" title="내 연습 기록" href="/practice" description="연습한 곡의 횟수, 재생 시간과 최근 연습일을 돌아봐요."
              detail="로그인이 필요해요." />
          </ul>
        </section>
      </Container>
    </MainLayout>
  )
}
