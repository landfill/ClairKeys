import {
  ANIMATION_CONTRACT_VERSION,
  type CanonicalAnimationData,
} from '@/types/animationContract'

/**
 * 홈의 로그인 전 체험용 샘플 (DS-2).
 *
 * **운영 데이터를 쓰지 않는다.** 이유는 두 가지다. `/sheet/[id]`와 그 인증 경계는 DS-6 소유라
 * 두 단계가 같은 파일을 건드리면 충돌하고, 운영 공개 악보는 제목이 파일명이고 저작자가 미검증
 * 값이라(DS0-4) 첫 인상으로 쓸 수 없다.
 *
 * 곡은 베토벤 교향곡 9번의 「환희의 송가」 주제 8마디다. 1824년 작품이라 공개 도메인이고,
 * 양손이 동시에 움직여 이 앱이 무엇을 보여주는지가 한눈에 드러난다.
 *
 * `tempoSource`는 `'user'`다. 이 값을 우리가 정했기 때문이다 — 악보 인식 결과가 아니므로
 * `'score'`("악보에서 읽음")는 거짓이고, 어디서 왔는지 알고 있으므로 `'unknown'`("출처 미상")도
 * 거짓이다. 세 값 중 사실인 것은 사람이 직접 정했다는 것뿐이다 (D-013).
 *
 * 음표는 ♩=100(박당 0.6초)으로 계산했다. 8마디 × 4박 = 19.2초.
 */
export const HOME_SAMPLE_ANIMATION: CanonicalAnimationData = {
  version: ANIMATION_CONTRACT_VERSION,
  title: '환희의 송가',
  composer: '루트비히 판 베토벤',
  duration: 19.2,
  tempo: 100,
  tempoSource: 'user',
  timingReferenceBpm: 100,
  timeSignature: '4/4',
  keySignature: 'C',
  notes: [
  { midi: 48, start: 0.0, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 64, start: 0.0, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 64, start: 0.6, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 1.2, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 65, start: 1.2, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 67, start: 1.8, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 43, start: 2.4, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 67, start: 2.4, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 65, start: 3.0, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 3.6, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 64, start: 3.6, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 62, start: 4.2, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 4.8, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 60, start: 4.8, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 60, start: 5.4, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 62, start: 6.0, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 43, start: 6.0, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 64, start: 6.6, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 43, start: 7.2, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 64, start: 7.2, duration: 0.9, hand: 'R', voice: 1, staff: 1 },
  { midi: 62, start: 8.1, duration: 0.3, hand: 'R', voice: 1, staff: 1 },
  { midi: 43, start: 8.4, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 62, start: 8.4, duration: 1.2, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 9.6, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 64, start: 9.6, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 64, start: 10.2, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 10.8, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 65, start: 10.8, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 67, start: 11.4, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 43, start: 12.0, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 67, start: 12.0, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 65, start: 12.6, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 13.2, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 64, start: 13.2, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 62, start: 13.8, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 14.4, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 60, start: 14.4, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 60, start: 15.0, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 43, start: 15.6, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 62, start: 15.6, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 64, start: 16.2, duration: 0.6, hand: 'R', voice: 1, staff: 1 },
  { midi: 43, start: 16.8, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 62, start: 16.8, duration: 0.9, hand: 'R', voice: 1, staff: 1 },
  { midi: 60, start: 17.7, duration: 0.3, hand: 'R', voice: 1, staff: 1 },
  { midi: 48, start: 18.0, duration: 1.2, hand: 'L', voice: 2, staff: 2 },
  { midi: 60, start: 18.0, duration: 1.2, hand: 'R', voice: 1, staff: 1 },
  ],
  metadata: {
    notesDetected: 46,
  },
}
