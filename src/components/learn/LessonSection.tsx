import type { ReactNode } from 'react'

export interface LessonSectionItem {
  id: string
  title: string
  summary?: string
}

interface LessonSectionProps {
  section: LessonSectionItem
  children: ReactNode
  className?: string
}

export default function LessonSection({
  section,
  children,
  className = '',
}: LessonSectionProps) {
  return (
    <section aria-labelledby={section.id} data-lesson-section className={className}>
      <h2 id={section.id} className="scroll-mt-24 text-lg font-semibold text-ink">
        {section.title}
      </h2>
      {section.summary && (
        <p className="mt-1 text-sm text-ink-muted">{section.summary}</p>
      )}
      <div data-lesson-prose>{children}</div>
    </section>
  )
}
