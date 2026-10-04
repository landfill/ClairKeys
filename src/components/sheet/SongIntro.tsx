'use client'

import { useId, useMemo } from 'react'
import Link from 'next/link'
import type { CanonicalAnimationData } from '@/types/animationContract'
import { canonicalToFallingNotes } from '@/utils/dataConverter'
import { useScoreProvenance } from '@/hooks/useScoreProvenance'
import { analyzeSongIntro } from '@/lib/learn/songIntro'

const linkClass = 'rounded-sm text-accent hover:underline'
export default function SongIntro({ data, scoreUrl }: { data: CanonicalAnimationData; scoreUrl?: string }) {
  const provenance = useScoreProvenance(scoreUrl)
  const headingId = useId()
  const intro = useMemo(() => analyzeSongIntro(data, canonicalToFallingNotes(data)), [data])
  const range = intro.range.value
  const hands = intro.hands.value
  const tempo = intro.tempo.value
  return <section aria-labelledby={headingId} className="mt-6 min-w-0 border-t border-rule pt-6">
    <h3 id={headingId} className="mb-4 text-lg font-semibold text-ink">이 곡 소개</h3>
    <dl className="grid min-w-0 gap-4 text-sm md:grid-cols-2">
      <div className="min-w-0">
        <dt className="font-medium text-ink-muted">음역</dt>
        <dd className="mt-1 text-ink">{range ? <>{range.low} ~ {range.high}<p className="mt-1">{range.middleC}</p></> : '음표 데이터가 없어 음역을 확인할 수 없어요.'}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2"><Link href="/learn/keyboard" className={linkClass}>건반 레슨에서 음역 익히기</Link><Link href="/learn/reading#pitch-explorer" className={linkClass}>악보 읽기에서 음높이 연결하기</Link></div>
        </dd>
      </div>
      <div>
        <dt className="font-medium text-ink-muted">재생 시간</dt>
        <dd className="mt-1 text-ink">{Math.floor((intro.duration.value ?? 0) / 60)}분 {Math.floor((intro.duration.value ?? 0) % 60)}초</dd>
      </div>
      <div>
        <dt className="font-medium text-ink-muted">손 구분</dt>
        <dd className="mt-1 text-ink">{hands ? hands.partial ? `원본에서 확인한 손은 ${hands.label}이에요. 일부 손 구분은 확인되지 않았거나 앱이 추정했어요.` : hands.label : intro.hands.status === 'inferred' ? '손 구분은 앱이 추정했어요.' : '손 정보는 확인되지 않았어요.'}
          <div className="mt-2"><Link href="/learn/hands" className={linkClass}>손 레슨에서 손가락 번호 익히기</Link></div>
        </dd>
      </div>
      <div>
        <dt className="font-medium text-ink-muted">빠르기</dt>
        <dd className="mt-1 text-ink">{tempo ? <>{tempo.primary}{tempo.secondary && <p className="mt-1 text-ink-muted">{tempo.secondary}</p>}</> : '확인된 빠르기 정보가 없어요.'}
          <div className="mt-2"><Link href="/learn/practice" className={linkClass}>연습 방법에서 빠르기와 연습 알아보기</Link></div>
        </dd>
      </div>
      {provenance.meter && <div>
        <dt className="font-medium text-ink-muted">박자</dt>
        <dd className="mt-1 text-ink">{provenance.meter}<p className="mt-1 text-ink-muted">원본 악보 기준</p>
          <Link href="/learn/reading#meters" className={`mt-2 inline-flex min-h-11 items-center ${linkClass}`}>악보 읽기에서 박자표 익히기</Link>
        </dd>
      </div>}
      {provenance.key && <div>
        <dt className="font-medium text-ink-muted">조표</dt>
        <dd className="mt-1 text-ink">{provenance.key}<p className="mt-1 text-ink-muted">원본 악보 기준</p></dd>
      </div>}
    </dl>
  </section>
}
