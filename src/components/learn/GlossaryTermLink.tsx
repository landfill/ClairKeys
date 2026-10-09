import type { ReactNode } from 'react'
import Link from 'next/link'
import { glossaryTermHref, type GlossaryTermId } from '@/lib/learn/glossary'

interface GlossaryTermLinkProps {
  term: GlossaryTermId
  children: ReactNode
}

export default function GlossaryTermLink({ term, children }: GlossaryTermLinkProps) {
  return (
    <Link
      href={glossaryTermHref(term)}
      className="inline -mx-2 px-2 rounded-sm py-3.5 underline decoration-dotted decoration-rule-strong underline-offset-4 hover:text-accent"
    >
      {children}
    </Link>
  )
}
