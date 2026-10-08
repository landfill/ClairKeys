'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LessonSectionItem } from './LessonSection'

interface LessonTocProps {
  sections: LessonSectionItem[]
  children?: ReactNode
}

export default function LessonToc({ sections, children }: LessonTocProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '')
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!sections.length) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      if (windowHeight + scrollY >= docHeight - 50) {
        setActiveId(sections[sections.length - 1].id)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter(e => e.isIntersecting)
        if (intersecting.length > 0) {
          intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActiveId(intersecting[0].target.id)
        }
      },
      {
        rootMargin: '-10% 0px -65% 0px',
        threshold: [0, 0.2, 0.5, 0.8, 1],
      }
    )

    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [sections])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && detailsRef.current?.open) {
        detailsRef.current.open = false
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClose = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  const activeSection = sections.find(s => s.id === activeId)

  return (
    <>
      {/* 좁은 화면(lg 미만): 네이티브 details/summary로 동작하는 목차 열기 버튼 및 목록 */}
      <details
        ref={detailsRef}
        className="group sticky top-0 z-20 -mx-4 mb-6 border-b border-rule bg-surface sm:-mx-6 lg:hidden"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
          <span>
            이 레슨의 내용
            {activeSection ? (
              <span className="ml-1 text-ink-muted">· {activeSection.title}</span>
            ) : null}
          </span>
          <svg
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div id="mobile-lesson-toc" className="border-t border-rule bg-surface px-4 py-2">
          <nav aria-label="이 레슨의 내용">
            <ol className="divide-y divide-rule/40">
              {sections.map((sec) => (
                <li key={sec.id}>
                  <a
                    href={`#${sec.id}`}
                    onClick={handleClose}
                    aria-current={activeId === sec.id ? 'location' : undefined}
                    className={`flex min-h-11 items-center text-sm transition-colors ${
                      activeId === sec.id
                        ? 'font-semibold text-accent'
                        : 'text-ink hover:text-accent'
                    }`}
                  >
                    {sec.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </details>

      {/* 본문 및 넓은 화면(lg 이상) sticky 목차 */}
      <div className="lg:flex lg:gap-12">
        {children && <div className="min-w-0 flex-1">{children}</div>}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <nav aria-label="이 레슨의 내용" className="sticky top-6">
            <p className="text-sm font-semibold text-ink">이 레슨의 내용</p>
            <ol className="mt-3 space-y-1 border-l-2 border-rule">
              {sections.map((sec) => (
                <li key={sec.id}>
                  <a
                    href={`#${sec.id}`}
                    aria-current={activeId === sec.id ? 'location' : undefined}
                    className={`-ml-[2px] flex min-h-11 items-center border-l-2 pl-4 text-sm transition-colors ${
                      activeId === sec.id
                        ? 'border-accent font-medium text-ink'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    {sec.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>
    </>
  )
}
