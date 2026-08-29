'use client'

import FallingNotesPlayer from '@/components/animation/FallingNotesPlayer'
import { HOME_SAMPLE_ANIMATION } from '@/fixtures/homeSample'

/**
 * 홈의 로그인 전 체험 (DS-2).
 *
 * 운영 플레이어를 **그대로** 쓴다. 홈 전용으로 축소판을 만들면 방문자가 첫 화면에서 본 것과 로그인
 * 뒤에 만나는 것이 달라지고, 그 차이가 전환을 깨는 자리가 된다.
 *
 * `/sheet/[id]`나 운영 DB는 쓰지 않는다 — 그 경로는 DS-6 소유이고, 운영 공개 악보는 제목이
 * 파일명이라(DS0-4) 첫 인상으로 쓸 수 없다. 데이터는 저장소 안의 `HOME_SAMPLE_ANIMATION`이다.
 *
 * 자동 재생하지 않는다. 오디오는 사용자 제스처 뒤에만 시작할 수 있고, 첫 화면에서 소리가 나는
 * 것 자체가 결함이다.
 */
export default function HomeSamplePlayer() {
  return (
    <section aria-labelledby="home-sample-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 id="home-sample-heading" className="text-sm font-semibold tracking-wide uppercase text-ink-muted">
          지금 눌러 보세요
        </h2>
        <p className="text-sm text-ink-muted">
          샘플: {HOME_SAMPLE_ANIMATION.title} · {HOME_SAMPLE_ANIMATION.composer}
        </p>
      </div>

      <FallingNotesPlayer animationData={HOME_SAMPLE_ANIMATION} />
    </section>
  )
}
