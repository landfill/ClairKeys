/** Prerecorded introduction; the practice engine is not mounted on the home page. */
export default function HomeSamplePlayer() {
  return (
    <section aria-labelledby="home-result-heading">
      <h2 id="home-result-heading" className="sr-only">ClairKeys 소개 영상</h2>
      <figure
        data-testid="falling-notes-result-area"
        className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-sm"
      >
        <video
          aria-label="ClairKeys 소개 영상"
          controls
          playsInline
          preload="none"
          poster="/videos/clairkeys-intro-poster.jpg"
          width={1280}
          height={720}
          className="block aspect-video h-auto w-full"
        >
          <source src="/videos/clairkeys-intro.mp4" type="video/mp4" />
          <a href="/videos/clairkeys-intro.mp4">ClairKeys 소개 영상 내려받기</a>
        </video>
      </figure>
    </section>
  )
}
