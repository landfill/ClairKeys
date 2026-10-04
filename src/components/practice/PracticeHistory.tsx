'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button, Loading, StatusState } from '@/components/ui'
import type { PracticeHistoryResponse } from '@/types/practiceHistory'

const linkClass = 'inline-flex min-h-11 items-center rounded-sm text-accent hover:underline'
const duration = (seconds: number) => `${Math.floor(seconds / 60)}분 ${seconds % 60}초`
type LoadState = { status: 'loading' } | { status: 'error'; expired: boolean } | { status: 'ready'; data: PracticeHistoryResponse }

function Records() {
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const cursor = cursors[cursors.length - 1]
  const page = cursors.length
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    void fetch(`/api/practice${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          if (!controller.signal.aborted) setState({ status: 'error', expired: response.status === 401 })
          return
        }
        const data: PracticeHistoryResponse = await response.json()
        if (!controller.signal.aborted) setState({ status: 'ready', data })
      })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error', expired: false }) })
    return () => controller.abort()
  }, [cursor, attempt])

  return <>
    <p className="mb-5 text-sm text-ink-muted">10초 이상 실제로 재생한 연습 기록을 모았어요. 최고 재생 위치는 곡에서 가장 멀리 재생한 지점이에요. 새 기록은 새로고침하면 반영돼요.</p>
    {state.status === 'loading' ? <div role="status" aria-label="연습 기록 불러오는 중" className="py-10"><Loading /></div>
      : state.status === 'error' ? <StatusState tone="error" title="연습 기록을 불러오지 못했습니다" detail={state.expired ? '다시 로그인하면 내 기록을 볼 수 있어요.' : '잠시 후 다시 시도해 주세요.'}
        action={state.expired ? <Link className={linkClass} href="/auth/signin?callbackUrl=%2Fpractice">다시 로그인</Link> : <Button onClick={() => setAttempt(value => value + 1)}>다시 시도</Button>} />
        : state.data.items.length === 0 ? <StatusState title={page === 1 ? '아직 연습 기록이 없습니다' : '이 페이지에 남은 기록이 없습니다'} detail={page === 1 ? '곡을 골라 로그인한 상태로 연습하면 여기에 기록이 쌓여요.' : '이전 페이지로 돌아가 기록을 확인해 주세요.'} action={<Link href="/explore" className={linkClass}>연습할 곡 찾기</Link>} />
          : <>
            <p role="status" className="mb-3 text-sm text-ink-muted">{page}페이지 · {state.data.items.length}곡</p>
            <ul aria-label="곡별 연습 기록" className="space-y-4">
              {state.data.items.map(item => <li key={item.sheetId} className="min-w-0 rounded-lg border border-rule bg-surface p-5">
                <h2 className="break-words text-lg font-semibold"><Link href={`/sheet/${item.sheetId}`} className={linkClass}>{item.title}</Link></h2>
                <p className="mt-1 break-words text-sm text-ink-muted">{item.composer}</p>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div><dt className="text-ink-muted">연습 기록</dt><dd className="mt-1 text-ink">{item.count}회</dd></div>
                  <div><dt className="text-ink-muted">총 재생 시간</dt><dd className="mt-1 text-ink">{duration(item.totalSeconds)}</dd></div>
                  <div><dt className="text-ink-muted">최고 재생 위치</dt><dd className="mt-1 text-ink">{item.bestPercentage === null ? '기록 없음' : `${Math.round(item.bestPercentage)}%`}</dd></div>
                  <div><dt className="text-ink-muted">최근 연습일</dt><dd className="mt-1 text-ink">{item.lastPracticedAt ? new Date(item.lastPracticedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '기록 없음'}</dd></div>
                </dl>
              </li>)}
            </ul>
          </>}
    <nav aria-label="연습 기록 페이지" className="mt-6 flex flex-wrap justify-between gap-3">
      <Button variant="outline" disabled={page === 1 || state.status === 'loading'} onClick={() => setCursors(value => value.slice(0, -1))}>이전 페이지</Button>
      <Button variant="outline" disabled={state.status !== 'ready' || !state.data.nextCursor} onClick={() => { if (state.status === 'ready' && state.data.nextCursor) setCursors(value => [...value.slice(0, -1), state.data.cursor, state.data.nextCursor]) }}>다음 페이지</Button>
    </nav>
  </>
}

export default function PracticeHistory() {
  const { data: session, status } = useSession()
  if (status === 'loading') return <div role="status" aria-label="로그인 확인 중"><Loading /></div>
  if (status !== 'authenticated' || !session?.user?.id) return <StatusState title="로그인하고 내 연습 기록을 확인하세요" detail="내 계정으로 연습한 곡의 기록을 볼 수 있어요." action={<Link href="/auth/signin?callbackUrl=%2Fpractice" className={linkClass}>로그인하고 기록 보기</Link>} />
  // A different account must never inherit the old account's page or rows.
  return <Records key={session.user.id} />
}
