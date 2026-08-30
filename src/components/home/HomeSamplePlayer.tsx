/**
 * 홈의 낙하 노트 결과 자리 (DS-5).
 *
 * 이 영역은 후속 정적 예시가 들어올 안정적인 캔버스다. 실제 재생기는 악보 상세에만 남긴다.
 * `HOME_SAMPLE_ANIMATION` fixture는 예시 제작 소스로 보존하지만 여기서 소비하지 않는다.
 * 파일명은 외부 import를 깨지 않기 위해 유지한다. 컴포넌트 자체는 더 이상 재생기가 아니다.
 */
export default function HomeSamplePlayer() {
  return (
    <section aria-labelledby="home-result-heading">
      <h2 id="home-result-heading" className="sr-only">낙하 노트 학습 결과</h2>
      <div
        data-testid="falling-notes-result-area"
        className="min-h-[430px] rounded-2xl border border-rule bg-[#0b0b0c] shadow-sm"
      >
        <span className="sr-only">낙하 노트 결과 예시가 들어갈 영역</span>
      </div>
    </section>
  )
}
