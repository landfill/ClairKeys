'use client'

import { useState, useEffect, useCallback, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Badge, Button, Card, StatusState } from '@/components/ui'
import { SheetMusicWithOwner } from '@/types/sheet-music'

interface PublicSheetMusicBrowserProps {
  onSheetMusicClick?: (sheetMusic: SheetMusicWithOwner) => void
  className?: string
}

/** One page of the newest-first feed; the explore page has no pagination yet. */
const PAGE_SIZE = 12

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

export default function PublicSheetMusicBrowser({
  onSheetMusicClick,
  className = ''
}: PublicSheetMusicBrowserProps) {
  const [recentSheets, setRecentSheets] = useState<SheetMusicWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPublicSheets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Newest first is the only ordering the data can back. "추천"/"인기" used to be
      // slices of this same feed; a ranking needs a real signal first (D-080).
      const recentResponse = await fetch(`/api/sheet/public?limit=${PAGE_SIZE}&sortBy=newest`)
      if (!recentResponse.ok) throw new Error('Failed to load recent sheets')
      const recentData = await recentResponse.json()
      setRecentSheets(recentData.sheetMusic || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sheets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPublicSheets()
  }, [loadPublicSheets])

  // The card is a real link so keyboard, middle-click and open-in-new-tab all work.
  // When a caller supplies onSheetMusicClick we defer to it exactly as before, so the
  // existing router-push navigation contract is unchanged — but only for a plain
  // activation. A modified click (Cmd/Ctrl/Shift/Alt) or a non-primary button is the
  // reader asking for a new tab or window, and swallowing it here would defeat the
  // reason these cards became links at all.
  const linkProps = (sheetMusic: SheetMusicWithOwner) => ({
    href: `/sheet/${sheetMusic.id}`,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (!onSheetMusicClick) return
      const wantsNewContext =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
      if (wantsNewContext) return
      event.preventDefault()
      onSheetMusicClick(sheetMusic)
    }
  })

  const Meta = ({ sheetMusic }: { sheetMusic: SheetMusicWithOwner }) => (
    <p className="flex min-w-0 items-center gap-1 text-xs text-ink-muted">
      <span className="truncate">{sheetMusic.owner?.name || '익명'}</span>
      <span aria-hidden="true">·</span>
      <span className="shrink-0">{formatDate(sheetMusic.createdAt)}</span>
    </p>
  )

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2 className="text-xl font-bold text-ink mb-3">{title}</h2>
      {children}
    </section>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        <span className="ml-3 text-ink-muted">악보를 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <StatusState
        title="공개 악보를 불러오지 못했습니다"
        detail="잠시 연결이 끊겼습니다. 다시 시도해 주세요."
        tone="error"
        action={<Button variant="outline" size="sm" onClick={loadPublicSheets}>다시 시도</Button>}
      />
    )
  }

  return (
    <div className={`public-sheet-music-browser space-y-6 ${className}`}>
      {recentSheets.length > 0 && (
        <Section title="최근 공개된 악보">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSheets.map((sheetMusic) => (
              <Link
                key={sheetMusic.id}
                {...linkProps(sheetMusic)}
                className="group block"
              >
                {/* No stored preview image exists, so the card leads with the title
                    instead of a placeholder surface that implies one does. */}
                <Card padding="none" className="h-full min-w-0 flex flex-col group-hover:shadow-md group-focus-visible:shadow-md transition-shadow duration-200">
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <h3
                      title={sheetMusic.title}
                      className="font-semibold text-base text-ink break-words line-clamp-2 group-hover:text-accent transition-colors"
                    >
                      {sheetMusic.title}
                    </h3>
                    <p className="text-sm text-ink-muted break-words line-clamp-1">
                      {sheetMusic.composer}
                    </p>
                    {sheetMusic.category && (
                      <div className="mt-1">
                        <Badge className="truncate">{sheetMusic.category.name}</Badge>
                      </div>
                    )}
                    <div className="flex-1" />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Meta sheetMusic={sheetMusic} />
                      <span className="shrink-0 text-xs font-medium text-accent">연습 시작 →</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Empty State */}
      {recentSheets.length === 0 && (
        <StatusState
          title="아직 공개된 악보가 없습니다"
          detail="공개 악보가 올라오면 여기에서 함께 연습할 수 있습니다."
          action={<a href="/upload"><Button>첫 악보 올리기</Button></a>}
        />
      )}
    </div>
  )
}
