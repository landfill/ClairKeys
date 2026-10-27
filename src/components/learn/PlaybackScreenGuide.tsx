'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { spotAnchor, type PlaybackScreen, type ScreenVariant } from '@/lib/learn/practiceScreens'

/**
 * 재생 화면 캡처 위에 번호표를 붙이고, 고른 번호의 설명을 그림 바로 아래에 보여 준다.
 * 설명을 그림 아래 목록으로 길게 늘어놓으면 좁은 화면에서 그림과 설명을 함께 볼 수 없다.
 *
 * 본문 폭이 768px 이상이면 데스크톱 캡처, 그보다 좁으면 휴대폰 캡처를 원래 크기 이하로 쓴다.
 * 화면 폭이 아니라 본문 폭(container query)으로 고르는 이유: 1024px부터 목차가 옆에 붙어 본문이 다시 좁아진다.
 * 768px보다 좁은 본문에 데스크톱 캡처를 넣으면 글자가 10px 아래로 줄어 읽기 어렵다.
 * 같은 번호가 두 그림에서 같은 조작을 가리킨다. 숨겨진 쪽 그림은 `display: none`이라 지연 로딩으로 내려받지 않는다.
 *
 * `displayWidth`가 있는 그림(휴대폰의 가로 재생 화면)은 그 폭으로 그리고 옆으로 밀어 보게 한다.
 * 본문 폭에 맞춰 줄이면 글자가 5px대가 되고 번호표끼리 겹친다. 번호를 고르면 그 번호가 보이도록 옆으로 옮긴다.
 */
const VARIANTS: { variant: ScreenVariant; className: string; sizes: string }[] = [
  { variant: 'mobile', className: 'mx-auto max-w-[390px] @min-[768px]:hidden', sizes: '390px' },
  { variant: 'desktop', className: 'hidden @min-[768px]:block', sizes: '912px' },
]

/** `above` 번호표: 상자 윗변에서 4px 띄워 통째로 위에 놓는다. `practiceScreens.test.ts`의 겹침 계산과 같은 값이다. */
const BADGE_ABOVE = '-translate-y-[calc(100%_+_4px)]'

export default function PlaybackScreenGuide({ screen }: { screen: PlaybackScreen }) {
  const [active, setActive] = useState(0)
  const baseId = useId()
  const titleId = `${baseId}-title`
  const captionId = `${baseId}-caption`
  const spot = screen.spots[active]
  const total = screen.spots.length
  const pictureRefs = useRef<Partial<Record<ScreenVariant, HTMLDivElement | null>>>({})

  useEffect(() => {
    for (const picture of Object.values(pictureRefs.current)) {
      const scroller = picture?.querySelector<HTMLElement>('[data-screen-scroller]')
      const badge = scroller?.querySelector<HTMLElement>(`[data-screen-badge="${screen.spots[active].id}"]`)
      // 숨겨진 그림(폭 0)이나 넘치지 않는 그림은 건드리지 않는다. 세로 스크롤은 하지 않는다.
      if (!scroller || !badge || scroller.clientWidth === 0 || scroller.scrollWidth <= scroller.clientWidth) continue
      const view = scroller.getBoundingClientRect()
      const mark = badge.getBoundingClientRect()
      if (mark.left >= view.left && mark.right <= view.right) continue
      scroller.scrollBy?.({ left: mark.left + mark.width / 2 - (view.left + view.width / 2), behavior: 'smooth' })
    }
  }, [active, screen.spots])

  /**
   * 번호표는 Tab 한 번으로 들어가고(고른 번호만 tabIndex 0) 방향키로 옮긴다. 번호표마다 Tab을 받으면
   * 두 그림에서 스물두 번을 눌러야 본문을 지나간다. 휴대폰 그림에 없는 번호(악보 보기)는 건너뛴다.
   */
  const presentIn = (variant: ScreenVariant) => screen.spots
    .map((item, index) => (screen.shots[variant].hotspots[item.id]?.length ? index : -1))
    .filter(index => index >= 0)
  /** Tab이 들어갈 번호표. 고른 번호가 이 그림에 없으면 그 앞의 가장 가까운 번호다. */
  const focusableIn = (variant: ScreenVariant) => {
    const present = presentIn(variant)
    return present.includes(active) ? active : present.filter(index => index < active).at(-1) ?? present[0]
  }
  const moveFocus = (variant: ScreenVariant, event: KeyboardEvent<HTMLButtonElement>) => {
    const present = presentIn(variant)
    const at = present.indexOf(focusableIn(variant))
    const target = {
      ArrowRight: present[Math.min(at + 1, present.length - 1)],
      ArrowDown: present[Math.min(at + 1, present.length - 1)],
      ArrowLeft: present[Math.max(at - 1, 0)],
      ArrowUp: present[Math.max(at - 1, 0)],
      Home: present[0],
      End: present[present.length - 1],
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    setActive(target)
    pictureRefs.current[variant]?.querySelector<HTMLButtonElement>(`[data-screen-badge="${screen.spots[target].id}"]`)?.focus()
  }

  return (
    <div data-screen-guide={screen.id} className="mt-6">
      <h3 id={titleId} className="text-base font-semibold text-ink">{screen.title}</h3>
      <p className="mt-1 text-base text-ink leading-relaxed max-w-[45rem]">{screen.intro}</p>
      <figure aria-labelledby={titleId} className="@container mt-3">
        {VARIANTS.map(({ variant, className, sizes }) => {
          const shot = screen.shots[variant]
          const rects = shot.hotspots[spot.id] ?? []
          const focusable = focusableIn(variant)
          return (
            <div key={variant} data-variant={variant} className={className} ref={node => { pictureRefs.current[variant] = node }}>
              {/* 번호표가 그림 가장자리 밖으로 반쯤 나가도 잘리지 않도록 여백을 둔다. 옆으로 미는 그림은 여백까지 스크롤 안에 둔다. */}
              <div className={`rounded-xl border border-rule bg-surface-muted ${shot.displayWidth ? '' : 'p-3'}`}>
                <div
                  data-screen-scroller={shot.displayWidth ? '' : undefined}
                  className={shot.displayWidth ? 'overflow-x-auto p-3' : undefined}
                >
                <div className="relative" style={shot.displayWidth ? { width: shot.displayWidth } : undefined}>
                  <Image
                    src={shot.src}
                    alt={screen.alt}
                    width={shot.width}
                    height={shot.height}
                    sizes={shot.displayWidth ? `${shot.displayWidth}px` : sizes}
                    className="block h-auto w-full rounded-md"
                  />
                  {rects.map(([left, top, width, height], index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      data-testid="screen-guide-highlight"
                      className="pointer-events-none absolute rounded-md bg-accent/10 ring-2 ring-accent"
                      style={{
                        left: `calc(${left}% - 4px)`,
                        top: `calc(${top}% - 4px)`,
                        width: `calc(${width}% + 8px)`,
                        height: `calc(${height}% + 8px)`,
                      }}
                    />
                  ))}
                  {screen.spots.map((item, index) => {
                    const itemRects = shot.hotspots[item.id]
                    if (!itemRects?.length) return null
                    const position = spotAnchor(item, itemRects, variant)
                    const selected = index === active
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`${index + 1}. ${item.label}`}
                        aria-pressed={selected}
                        aria-controls={captionId}
                        title={item.label}
                        data-screen-badge={item.id}
                        tabIndex={index === focusable ? 0 : -1}
                        onClick={() => setActive(index)}
                        onKeyDown={event => moveFocus(variant, event)}
                        // 보이는 원은 28px. before는 테두리 안쪽(24px) 기준이라 10px씩 넓혀야 누르는 자리가 44px이 된다.
                        className={`absolute flex h-7 w-7 -translate-x-1/2 ${position.above ? BADGE_ABOVE : '-translate-y-1/2'} items-center justify-center rounded-full border-2 border-surface text-xs font-semibold tabular-nums shadow-md transition-transform before:absolute before:-inset-2.5 before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          selected ? 'z-20 scale-110 bg-accent text-on-accent' : 'z-10 bg-ink text-surface hover:bg-accent'
                        }`}
                        style={{ left: `${position.left}%`, top: `${position.top}%` }}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
                </div>
              </div>
              {shot.displayWidth && screen.scrollNote && (
                <p data-lesson-note className="mt-2 text-sm text-ink-muted">{screen.scrollNote}</p>
              )}
            </div>
          )
        })}
        <figcaption id={captionId} className="mt-3 rounded-lg border border-rule bg-surface p-4">
          <div aria-live="polite" className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold tabular-nums text-on-accent"
            >
              {active + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{spot.label}</p>
              <p className="mt-1 text-base text-ink leading-relaxed">{spot.description}</p>
              {spot.more && (
                <Link href={spot.more.href} className="mt-1 inline-flex min-h-11 items-center rounded-sm text-sm text-accent hover:underline">
                  {spot.more.label}
                </Link>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-rule pt-2">
            <button
              type="button"
              onClick={() => setActive(index => index - 1)}
              disabled={active === 0}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-ink hover:bg-surface-muted disabled:text-ink-muted disabled:opacity-50 disabled:hover:bg-transparent"
            >
              ← 이전
            </button>
            <span className="text-sm tabular-nums text-ink-muted">{active + 1} / {total}</span>
            <button
              type="button"
              onClick={() => setActive(index => index + 1)}
              disabled={active === total - 1}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-ink hover:bg-surface-muted disabled:text-ink-muted disabled:opacity-50 disabled:hover:bg-transparent"
            >
              다음 →
            </button>
          </div>
        </figcaption>
      </figure>
    </div>
  )
}
