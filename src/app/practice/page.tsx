import type { Metadata } from 'next'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import PracticeHistory from '@/components/practice/PracticeHistory'

export const metadata: Metadata = { title: '내 연습 기록 | ClairKeys', description: '내 계정으로 연습한 곡의 횟수, 재생 시간과 최근 연습일을 확인해요.' }
export default function PracticePage() {
  return <MainLayout>
    <PageHeader title="내 연습 기록" description="최근에 연습한 곡부터 차근차근 돌아봐요." />
    <Container size="md" className="py-6"><PracticeHistory /></Container>
  </MainLayout>
}
