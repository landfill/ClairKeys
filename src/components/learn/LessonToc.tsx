'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LessonSectionItem } from './LessonSection'

interface LessonTocProps {
  sections: LessonSectionItem[]
  children?: ReactNode
}

/** 제목이 이 선(뷰포트 위에서 px) 이하로 올라오면 그 섹션을 읽는 중으로 본다. 좁은 화면의 목차 바(약 45px)와 제목의 scroll-mt-24(96px)보다 아래다. */
export const ACTIVE_SECTION_BASELINE = 120

/**
 * 현재 섹션의 인덱스를 고른다.
 * 기준선 이하로 올라온 제목 중 마지막 것, 없으면 첫 섹션. 문서 끝에서는 마지막 섹션이지만,
 * 목차나 해시로 고른 섹션(`chosenIndex`)이 있으면 그 섹션을 남긴다. 문서 끝 때문에 고른 제목이 기준선까지 올라오지 못할 수 있어서다.
 */
export function getActiveSectionIndex(
  tops: readonly number[],
  baseline: number,
  atBottom: boolean,
  chosenIndex = -1,
): number {
  if (tops.length === 0) return -1
  if (atBottom) {
    return chosenIndex >= 0 && chosenIndex < tops.length ? chosenIndex : tops.length - 1
  }
  let active = 0
  tops.forEach((top, index) => {
    if (top <= baseline) active = index
  })
  return active
}

export default function LessonToc({ sections, children }: LessonTocProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '')
  const [enhanced, setEnhanced] = useState(false)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  // 목차·해시로 고른 섹션. 그 제목이 화면 밖으로 나가면 풀린다.
  const chosenIdRef = useRef<string | null>(null)
  // 렌더마다 새 배열이 와도 리스너를 다시 달지 않도록 id 목록을 문자열 키로 쓴다.
  const idsKey = sections.map(section => section.id).join('\n')

  useEffect(() => {
    const details = detailsRef.current
    if (!details) return
    // details가 열려 있는 동안에는 enhancement를 미룬다 (목록이 absolute로 바뀌며 본문이 튀는 것 방지).
    if (!details.open) {
      setEnhanced(true)
      return
    }
    const handleToggle = () => {
      if (!details.open) {
        setEnhanced(true)
        details.removeEventListener('toggle', handleToggle)
      }
    }
    details.addEventListener('toggle', handleToggle)
    return () => details.removeEventListener('toggle', handleToggle)
  }, [])

  useEffect(() => {
    const ids = idsKey ? idsKey.split('\n') : []
    if (!ids.length) return

    const update = () => {
      const headings = ids.map(id => document.getElementById(id))
      const tops = headings.map(heading => heading?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY)
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (!atBottom) chosenIdRef.current = null
      const index = getActiveSectionIndex(
        tops,
        ACTIVE_SECTION_BASELINE,
        atBottom,
        chosenIdRef.current ? ids.indexOf(chosenIdRef.current) : -1,
      )
      if (index >= 0) setActiveId(ids[index])
    }

    let pending = false
    let frame = 0
    const schedule = () => {
      if (pending) return
      pending = true
      frame = window.requestAnimationFrame(() => {
        pending = false
        update()
      })
    }
    const chooseFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (ids.includes(id)) chosenIdRef.current = id
      schedule()
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('hashchange', chooseFromHash)
    // 해시가 붙은 주소로 바로 들어온 경우를 위해 마운트 직후 한 번 계산한다.
    chooseFromHash()

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('hashchange', chooseFromHash)
      window.cancelAnimationFrame(frame)
    }
  }, [idsKey])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDetailsElement>) => {
    if (e.key === 'Escape' && detailsRef.current?.open) {
      detailsRef.current.open = false
      summaryRef.current?.focus()
    }
  }

  const choose = (id: string) => {
    chosenIdRef.current = id
  }

  const handleMobileSelect = (id: string) => {
    choose(id)
    if (detailsRef.current) detailsRef.current.open = false
    // 닫힌 목록 안 링크에 포커스가 남지 않게 도착할 제목으로 옮긴다. 스크롤은 앵커 이동이 맡는다.
    document.getElementById(id)?.focus({ preventScroll: true })
  }

  const activeSection = sections.find(s => s.id === activeId)

  return (
    <>
      {/* 좁은 화면(lg 미만): 네이티브 details/summary로 동작하는 목차 열기 버튼 및 목록.
          스크립트 없이는 본문 위의 보통 블록이고, 스크립트가 동작하면(data-enhanced) 화면 위에 붙고 목록이 본문 위로 펼쳐진다. */}
      <details
        ref={detailsRef}
        onKeyDown={handleKeyDown}
        suppressHydrationWarning
        data-enhanced={enhanced ? '' : undefined}
        className="group z-20 -mx-4 mb-6 border-b border-rule bg-surface data-[enhanced]:sticky data-[enhanced]:top-0 sm:-mx-6 lg:hidden"
      >
        <summary
          ref={summaryRef}
          className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted [&::-webkit-details-marker]:hidden"
        >
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
        <div
          id="mobile-lesson-toc"
          className="border-t border-rule bg-surface px-4 py-2 group-data-[enhanced]:absolute group-data-[enhanced]:inset-x-0 group-data-[enhanced]:top-full group-data-[enhanced]:max-h-[60vh] group-data-[enhanced]:overflow-y-auto group-data-[enhanced]:border-b"
        >
          <nav aria-label="이 레슨의 내용">
            <ol className="divide-y divide-rule/40">
              {sections.map((sec) => (
                <li key={sec.id}>
                  <a
                    href={`#${sec.id}`}
                    onClick={() => handleMobileSelect(sec.id)}
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
                    onClick={() => choose(sec.id)}
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
