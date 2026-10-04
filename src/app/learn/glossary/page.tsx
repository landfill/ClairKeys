import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, MainLayout, PageHeader } from '@/components/layout'
import { GLOSSARY_GROUPS } from '@/lib/learn/glossary'

export const metadata: Metadata = {
  title: '용어 사전 | ClairKeys',
  description: '건반, 악보, 손가락과 연습 화면에서 만나는 용어의 뜻을 찾아보고 해당 레슨으로 이동해요.',
}

export default function GlossaryPage() {
  return (
    <MainLayout>
      <PageHeader title="용어 사전" description="낯선 말을 다시 찾아보고, 레슨에서 예시와 함께 익혀요." />
      <Container size="md" className="py-6">
        <nav aria-label="용어 분류" className="flex flex-wrap gap-2">
          {GLOSSARY_GROUPS.map(group => (
            <Link key={group.id} href={`#${group.id}`} className="inline-flex min-h-11 items-center rounded-md border border-rule bg-surface px-3 py-2 text-sm text-accent hover:underline">{group.title}</Link>
          ))}
        </nav>
        <div className="mt-8 space-y-8">
          {GLOSSARY_GROUPS.map(group => (
            <section key={group.id} aria-labelledby={group.id}>
              <h2 id={group.id} className="scroll-mt-24 text-lg font-semibold text-ink">{group.title}</h2>
              <dl className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-surface px-4">
                {group.terms.map(term => (
                  <div key={term.name} className="min-w-0 py-4">
                    <dt className="font-semibold text-ink">{term.name}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-ink-muted">
                      <p>{term.definition}</p>
                      <Link href={term.href} className="mt-1 inline-flex min-h-11 items-center rounded-sm text-accent hover:underline">{term.name} 레슨에서 보기</Link>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <Link href="/learn" className="mt-8 inline-flex min-h-11 items-center rounded-sm text-sm text-accent hover:underline">단계 지도로 돌아가기</Link>
      </Container>
    </MainLayout>
  )
}
