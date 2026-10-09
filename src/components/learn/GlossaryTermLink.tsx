import Link from 'next/link'
import { glossaryTermHref, type GlossaryTermId } from '@/lib/learn/glossary'

interface GlossaryTermLinkProps {
  term: GlossaryTermId
  children: string
}

// 두세 글자 용어는 폭이 44px에 못 미쳐 좌우로 넓힌다. 긴 용어까지 넓히면 이웃 링크와 겹친다.
export default function GlossaryTermLink({ term, children }: GlossaryTermLinkProps) {
  const isShort = children.replace(/\s+/g, '').length <= 3
  const paddingClass = isShort ? ' -mx-2 px-2' : ''

  return (
    <Link
      href={glossaryTermHref(term)}
      className={`inline${paddingClass} rounded-sm py-3.5 underline decoration-dotted decoration-rule-strong underline-offset-4 hover:text-accent`}
    >
      {children}
    </Link>
  )
}

