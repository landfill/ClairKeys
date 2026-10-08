import Link from 'next/link'
import type { ReactNode } from 'react'

interface LearnCardProps {
  title: string
  // 없으면 공개 전 카드다. 링크 없이 제목과 `준비 중`만 보인다.
  href?: string
  eyebrow?: string
  description: string
  topics?: readonly string[]
  detail?: ReactNode
  emphasis?: boolean
  as?: 'li' | 'div'
}

/*
  카드 전체가 눌리는 stretched link다. 카드는 `relative`, 제목 링크의 `::after`가 `absolute inset-0`으로 카드를 덮는다.
  링크 이름은 제목 그대로이고 카드 안 링크는 하나다. 칩·설명·`시작하기`는 링크 밖에 둔다.
  포커스 링은 전역 `:focus-visible`을 그대로 두고, 카드에도 `has-[a:focus-visible]`로 링을 더해 카드 단위로 보이게 한다.
*/
export default function LearnCard({ title, href, eyebrow, description, topics, detail, emphasis = false, as: Tag = 'div' }: LearnCardProps) {
  const frame = emphasis ? 'border-accent' : 'border-rule'
  const interactive = href
    ? 'transition-colors hover:border-rule-strong hover:bg-surface-muted has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-canvas'
    : ''

  return (
    <Tag data-learn-card="" className={`relative flex min-w-0 flex-col rounded-lg border bg-surface p-5 ${frame} ${interactive}`}>
      {eyebrow && <p className="text-sm text-ink-muted">{eyebrow}</p>}
      <h3 className={`${eyebrow ? 'mt-2 ' : ''}text-lg font-semibold text-ink`}>
        {href ? (
          <Link href={href} className="rounded-sm text-accent after:absolute after:inset-0 after:rounded-lg">{title}</Link>
        ) : title}
      </h3>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
      {topics && topics.length > 0 && (
        <>
          <p className="sr-only">다루는 내용: {topics.join(', ')}</p>
          <div aria-hidden="true" className="mt-3 flex flex-wrap gap-1.5">
            {topics.map(topic => <span key={topic} className="rounded-full border border-rule bg-surface-muted px-2.5 py-0.5 text-xs text-ink-muted">{topic}</span>)}
          </div>
        </>
      )}
      {detail && <p className="mt-3 text-sm text-ink">{detail}</p>}
      <div className="mt-auto pt-4 text-sm">
        {href
          ? <span aria-hidden="true" className="font-medium text-accent">시작하기 →</span>
          : <p className="text-ink-muted">준비 중</p>}
      </div>
    </Tag>
  )
}
