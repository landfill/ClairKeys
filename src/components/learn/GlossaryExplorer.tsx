'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  type GlossaryGroup,
  filterGlossary,
  lessonForHref,
} from '@/lib/learn/glossary'

interface GlossaryExplorerProps {
  groups: readonly GlossaryGroup[]
}

export default function GlossaryExplorer({ groups }: GlossaryExplorerProps) {
  const [query, setQuery] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<'all' | string>('all')

  const filteredGroups = filterGlossary(groups, {
    query,
    groupId: selectedGroupId === 'all' ? undefined : selectedGroupId,
  })

  const totalTermCount = filteredGroups.reduce(
    (count, group) => count + group.terms.length,
    0
  )

  return (
    <div className="space-y-6">
      {/* 상단 검색 및 칩 컨트롤 바 */}
      <div
        data-glossary-controls
        className="[@media(min-height:600px)]:sticky [@media(min-height:600px)]:top-0 z-10 -mx-4 border-b border-rule bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div className="mx-auto max-w-4xl space-y-2">
          <div>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="glossary-search"
                className="block text-sm font-medium text-ink"
              >
                용어 찾기
              </label>
              <p
                role="status"
                aria-live="polite"
                className="text-xs font-medium text-ink-muted"
              >
                용어 {totalTermCount}개
              </p>
            </div>
            <input
              id="glossary-search"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="예: 박자표"
              className="mt-1 block h-11 min-h-11 w-full rounded-md border border-rule-strong bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted"
            />
          </div>

          <div
            role="group"
            aria-label="용어 분류"
            className="flex gap-2 overflow-x-auto whitespace-nowrap py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              aria-pressed={selectedGroupId === 'all'}
              onClick={() => setSelectedGroupId('all')}
              className={`inline-flex h-11 min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                selectedGroupId === 'all'
                  ? 'border-accent bg-surface-muted text-accent ring-1 ring-accent'
                  : 'border-rule bg-surface text-ink hover:border-rule-strong hover:bg-surface-muted'
              }`}
            >
              전체
            </button>
            {groups.map(group => {
              const isSelected = selectedGroupId === group.id
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`inline-flex h-11 min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-accent bg-surface-muted text-accent ring-1 ring-accent'
                      : 'border-rule bg-surface text-ink hover:border-rule-strong hover:bg-surface-muted'
                  }`}
                >
                  {group.title}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 필터된 용어 목록 또는 빈 상태 안내 */}
      {filteredGroups.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-base text-ink-muted">
            찾는 용어가 없어요. 다른 말로 찾아보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map(group => (
            <section key={group.id} aria-labelledby={group.id}>
              <h2
                id={group.id}
                className="scroll-mt-40 text-lg font-semibold text-ink"
              >
                {group.title}
              </h2>
              <dl className="mt-3 grid gap-2 md:grid-cols-2">
                {group.terms.map(term => {
                  const lesson = lessonForHref(term.href)
                  const lessonTitle = lesson?.title ?? ''
                  return (
                    <div
                      key={term.id}
                      id={`term-${term.id}`}
                      className="relative grid min-w-0 scroll-mt-40 grid-cols-[1fr_auto] items-baseline gap-x-2 gap-y-1 rounded-lg border border-rule bg-surface p-3 transition-colors hover:border-rule-strong hover:bg-surface-muted has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-canvas"
                    >
                      <dt className="min-w-0 font-semibold text-ink">
                        {term.name}
                      </dt>
                      <dd className="shrink-0 text-xs">
                        <Link
                          href={term.href}
                          aria-label={`${term.name}: ${lessonTitle} 레슨에서 보기`}
                          className="rounded-sm font-medium text-accent hover:underline after:absolute after:inset-0 after:rounded-lg"
                        >
                          {lessonTitle}
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </dd>
                      <dd className="col-span-2 text-sm leading-relaxed text-ink-muted">
                        {term.definition}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
