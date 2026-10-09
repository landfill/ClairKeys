import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import { GLOSSARY_GROUPS } from '@/lib/learn/glossary'
import GlossaryExplorer from '@/components/learn/GlossaryExplorer'

export const metadata: Metadata = {
  title: '용어 사전 | ClairKeys',
  description: '건반, 악보, 손가락과 연습 화면에서 만나는 용어의 뜻을 찾아보고 해당 레슨으로 이동해요.',
}

export default function GlossaryPage() {
  return (
    <MainLayout>
      <PageHeader title="용어 사전" description="낯선 말을 다시 찾아보고, 레슨에서 예시와 함께 익혀요." />
      <Container size="md" className="py-6">
        <GlossaryExplorer groups={GLOSSARY_GROUPS} />
        <Link href="/learn" className="mt-8 inline-flex min-h-11 items-center rounded-sm text-sm text-accent hover:underline">단계 지도로 돌아가기</Link>
      </Container>
    </MainLayout>
  )
}
