# Validation — LEARN L-5 손 자세와 손가락 번호 `/learn/hands` (#214)

Date: 2026-10-04 KST
Branch/commits: `codex/learn-5-hands` — `ed240a3`(구현), `d3fcb74`(main 병합), `0965c5a`(리뷰 수정)
Environment: macOS, production 빌드, `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Jest의 OMR 회귀는 기존 `ci-venv`.

## Claim being verified

`/learn/hands`가 손가락 번호, 기본 손 모양, 다섯 손가락 자리(도~솔)를 설명하고, 손을 고르면 레슨 건반의 다섯 건반에 번호가 표시된다.
재생 화면에는 재생 전에만 `손가락 번호 보기` 링크가 생기고, 재생 중·일시정지의 조작 요소와 설명 텍스트는 늘지 않는다(D-094 6).

## 착수 후 정한 것

지시문은 "운지 정보가 없는 곡에는 숫자가 나오지 않는다"를 전제했는데 사실이 아니었다(구현 워커가 발견, 오케스트레이터가 코드로 확인).
`dataConverter.ts`는 저장된 문서에 번호가 없는 음에 초보자용 자동 제안을 채운다(`addFingeringToNotes`, `fingeringUtils.ts`의 `fingerSource: 'inferred'`).
- 재생 화면의 표시 동작은 바꾸지 않는다(이슈 범위 밖).
- 레슨은 "악보에 적힌 번호이거나 앱이 계산한 연습 제안"이라고 쓰고, 최선의 운지라는 주장은 하지 않는다.
- 링크는 표시될 숫자가 하나라도 있는 곡이면 출처와 무관하게 재생 전에 둔다. 유효한 음이 있는 곡은 항상 번호가 채워지므로 사실상 모든 곡에 보인다.
- 손 그림은 넣지 않았다(자세 그림을 검수할 사람이 없다). 글로만 설명한다.

## 재생 화면 요소 수 (D-094 3·6)

`e2e/playback-element-count.spec.ts`, 기준값은 `9d18ce2`에서 측정(L-3 검증 기록). 표기 `controls / textBlocks`, 재생 전은 화면 아래 포함 합계.

| 환경 | 상태 | 기준 | L-3 후 | L-5 후 |
|---|---|---|---|---|
| 데스크톱 1280×720 | 재생 전 | 합 31 | 16 / 10 (합 26) | 17 / 10 (합 27) |
| 데스크톱 | 재생 중·일시정지 | 8 / 3 | 8 / 3 | 8 / 3 |
| 터치 393×727 | 재생 전 | 합 27 | 합 26 | 합 27 (controls 17, text 7, 화면 아래 3) |
| 터치 | 재생 중·일시정지 | 7 / 1 | 7 / 1 | 7 / 1 |

건반 안의 표시(재생 중): 계이름 꺼짐 옥타브 표식 7·2, 켜짐 계이름 50·16. L-3 후와 같다.
새 요소는 링크 하나이고 재생 전에만 보인다. **터치 재생 전 합계가 기준과 같아 여유가 0이다.** 다음에 재생 전 화면에 요소를 더하려면 다른 것을 빼야 한다.
링크가 없는 경우(표시할 숫자가 전혀 없음)는 정상 곡으로 만들 수 없어, 변환 결과를 직접 주입하는 단위 테스트로 조작 요소 16개·링크 부재를 검증했다.

## 표준 자료 대조표

청취·시범 판단은 완료 조건이 아니다. 본문의 연주·음악 사실을 공개 자료와 대조했다.

| # | 레슨의 주장 | 대조 자료 | 판정 |
|---|---|---|---|
| 1 | 양손 모두 엄지 1, 검지 2, 중지 3, 약지 4, 새끼손가락 5 | Wikipedia *Fingering (music)*: "the fingers are numbered from 1 to 5 on each hand: the thumb is 1, the index finger is 2, the middle finger is 3, the ring finger is 4 and the little finger is 5"; Yamaha *The Basics of Piano Keyboard Fingering* (리뷰어 대조) | 일치 |
| 2 | 두 손의 번호 배치는 거울처럼 대칭(같은 번호 = 같은 손가락) | 1의 정의에서 따라 나온다(양손 모두 엄지가 1). Yamaha 운지 안내 (리뷰어 대조). Wikipedia 문서에는 "대칭"이라는 직접 문장이 없다 | 일치(직접 인용 없음) |
| 3 | 오른손은 엄지(1)를 가운데 도(C4)에, 도·레·미·파·솔에 1·2·3·4·5 | Alfred *C Position* (리뷰어 대조) | 일치 |
| 4 | 왼손은 새끼손가락(5)을 C3에, 도·레·미·파·솔에 5·4·3·2·1 | Alfred *C Position* (리뷰어 대조) | 일치 |
| 5 | 이 자리는 한 가지 연습이며 도를 언제나 같은 손가락으로 치는 것은 아니다 | Wikipedia *Fingering (music)*: "A fingering can be the result of the working process of the composer … an editor … or the performer", "A substitute fingering is an alternative to the indicated fingering"; Alfred 교수법 안내 (리뷰어 대조) | 일치 |
| 6 | 손가락을 자연스럽게 둥글게, 손끝으로 누른다 | Hoffman Academy *Developing good piano posture*(검색 요약): "The fingers should be curved and comfortable … let your hand hang limply to your side. Notice how fingers at rest naturally assume a curved shape"; Yamaha 자세 안내 (리뷰어 대조) | 일치 |
| 7 | 손목·팔에 불필요한 힘을 빼고 손목이 건반보다 처지지 않게 | Hoffman Academy(검색 요약): "Wrists should be in a neutral, level position at rest"; Yamaha 자세 안내 (리뷰어 대조) | 일치 |
| 8 | 팔꿈치가 건반 높이와 비슷하도록 의자 높이를 맞춘다 | Merriam Music *5 keys to piano posture*(검색 요약): "The height of the piano bench should be adjusted to make sure that your elbows are aligned with the keyboard"; Yamaha 자세 안내 (리뷰어 대조) | 일치 |
| 9 | 건반을 정면으로 보고 팔과 손을 편하게 움직일 거리에 앉는다 | Hoffman Academy(검색 요약): "The bench should be pulled out far enough that the elbows are slightly in front of the body, but comfortably so"; Yamaha 자세 안내 (리뷰어 대조) | 일치. 레슨은 수치(거리·각도)를 쓰지 않았다 |
| 10 | 재생 화면의 숫자는 악보의 번호이거나 앱의 제안 | 코드: `src/utils/dataConverter.ts`("add a deterministic beginner hint only where the stored document has a gap"), `src/utils/fingeringUtils.ts`(`fingerSource`) | 코드와 일치 |
| 11 | 낙하 음표의 숫자는 번호가 있고 다른 손으로 흐려지지 않은 음표에 보인다. 악보 패널을 켜면 연습 대상 음의 건반에도 보인다 | 코드: `src/components/animation/FallingNotes.tsx`(`showFingerBadge`), `FallingNotesPlayer.tsx`(`activeFingers`, `showScore`) | 코드와 일치 |

자료: Wikipedia *Fingering (music)*; Hoffman Academy *Developing good piano posture*; Merriam Music *5 keys to piano posture*;
Yamaha *The Basics of Piano Keyboard Fingering*, Yamaha *Musical Instrument Guide: Piano — How to Play*; Alfred *C Position*, *Alfred's Basic Piano Course overview*(Yamaha·Alfred는 리뷰어가 대조).
한계: Hoffman·Merriam 인용은 검색 결과 요약에서 가져왔고 원문 페이지를 직접 열어 확인하지는 않았다. Yamaha 자세 안내는 오케스트레이터의 직접 조회가 403으로 막혀 리뷰어의 대조에 기댄다.
인쇄 교재 쪽수 대조와 피아노 교사의 검토는 없다. 자세 설명은 공통으로 가르치는 내용으로 제한했고 각도·거리 수치, 의학적 효과는 쓰지 않았다.

## Commands and results

구현은 Codex `gpt-6.1-sol`(Orca 터미널). E2E·측정·화면 확인은 Claude가 실행했다.

| Command | Result | Evidence |
|---|---|---|
| 구현 전 Jest (Codex) | FAIL (의도) | 신규 모듈 부재, 링크·이동 테스트 6개 실패 확인. 리뷰 수정 전 live region 테스트 실패 확인 |
| `PATH=<ci-venv>/bin:$PATH npx jest` (최종 `0965c5a`) | PASS | 149 suites, 1477 tests |
| `npx tsc --noEmit --incremental false`, `npm run lint` | PASS | exit 0, no warnings |
| `npx playwright test` learn-hands, learn-reading, learn-keyboard, learn-practice, learn-home, console-quiet, application-smoke, playback-element-count, playback-note-names, playback-shortcuts, hand-practice `--project=chromium --project=firefox --project="Mobile Chrome"` (`d3fcb74`) | PASS | 162 passed, 6 skipped |
| 같은 명령 중 learn-hands, learn-keyboard, learn-home, console-quiet, playback-element-count (`0965c5a`) | PASS | 76 passed, 2 skipped |

L-4a의 교훈대로 처음부터 Firefox를 포함했다. WebKit·Mobile Safari는 PR CI에 맡긴다(macOS WebKit은 Tab 포커스 단언이 설정 탓에 실패한다).

## 화면 확인 (chromium 스크린샷)

- 1280px 전체: 오른손 선택 시 C4~G4에 `도 1 … 솔 5` 표시, 이전 레슨 건반·다음 레슨 연습 방법.
- 390px 새로 연 화면: 오른손 다섯 건반이 건반 영역 안에 모두 보임. (1280px로 연 뒤 줄인 화면은 초기 스크롤이 다시 맞춰지지 않아 잘려 보인다. 촬영 방식 문제였다.)

## main 병합 (`d3fcb74`)

PR220(L-4a) 병합 후 main을 브랜치에 병합. 충돌 없음. 바뀐 사실: `hands` 공개로 악보 읽기 페이지의 다음 레슨이 손이 됨(테스트 수정).
`HandsKeyboard`의 건반 영역 스크롤을 L-4a의 공용 `revealKeyboardKey`로 교체.

## 로컬 리뷰 (Codex `gpt-6-astra` high, read-only, Orca 터미널, 대상 `d3fcb74`)

연주·음악 사실: 오류 없음(위 표의 리뷰어 대조 항목).

| # | Finding | State | Handling |
|---|---|---|---|
| 1 | P3: 소리 실패 안내가 live region 밖에 있어 낭독되지 않음 | FIXED | `0965c5a`: 건반 아래 `role="status"`, 성공 시 제거 |
| 2 | P3: 번호 없는 건반 안내와 손 전환 후 초기화를 단언하지 않음 | FIXED | `0965c5a`: 두 경우 테스트 추가(동작은 원래 정상) |

## Gaps and risks

- WebKit·Mobile Safari E2E는 PR CI에 맡긴다(D-088).
- 스크린리더 낭독, 실제 청취, 실기기 터치, 피아노 교사의 내용 검토는 없다.
- 리뷰 수정 커밋 `0965c5a`는 로컬 재리뷰를 하지 않았다.
- Codex 주간 사용 한도가 25% 미만으로 남았다는 경고가 구현 워커 터미널에 표시됐다(2026-10-04). 남은 단계(L-4b, L-6)의 워커 사용에 영향을 줄 수 있다.
