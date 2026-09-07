import Image from 'next/image'

/** Static capture of the existing player and repository home sample; no audio or live data. */
export default function HomeSamplePlayer() {
  return (
    <section aria-labelledby="home-result-heading">
      <h2 id="home-result-heading" className="sr-only">낙하 노트 학습 결과</h2>
      <figure
        data-testid="falling-notes-result-area"
        className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-sm"
      >
        <Image
          src="/images/practice-example.jpg"
          alt="양손의 낙하 노트와 피아노 건반을 함께 보여주는 연습 화면"
          width={800}
          height={400}
          priority
          sizes="(min-width: 1024px) 65vw, 100vw"
          className="h-auto w-full"
        />
        <figcaption className="px-5 py-4">
          <p className="font-semibold text-ink">연습 화면 예시</p>
          <p className="mt-1 text-sm text-ink-muted">노트가 건반에 닿는 순간에 맞춰 연주하세요.</p>
          <p className="mt-1 text-xs text-ink-muted">환희의 송가 · 샘플로 만든 정적 예시</p>
        </figcaption>
      </figure>
    </section>
  )
}
