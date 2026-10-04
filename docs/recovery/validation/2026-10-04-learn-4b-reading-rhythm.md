# Validation — LEARN L-4b 악보 읽기: 음표·쉼표 길이와 박자표, 지도 공개 (#213 둘째 PR)

Date: 2026-10-04 KST
Branch/commits: `codex/learn-4b-reading-rhythm` — `7e5ecfa`(구현), `153fd40`(main 병합·`reading` 공개), `a26394d`(리뷰 수정)
Environment: macOS, production 빌드, `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Jest의 OMR 회귀는 기존 `ci-venv`.

## Claim being verified

`/learn/reading`이 음표·쉼표 길이(온·2분·4분·8분), 점음표, 박자표(4/4·3/4·6/8)를 설명하고 각 예시를 OSMD 그림과 박에 맞는 소리로 보여 준다.
예시의 마디 길이는 박자표와 정확히 같다. 음높이 예시의 모습과 동작은 그대로다. 단계 지도의 네 레슨이 모두 공개된다. 이 PR이 #213을 닫는다.
음높이 부분(L-4a)의 검증은 [L-4a 기록](2026-10-04-learn-4a-reading-pitch.md)에 있다.

## 정한 것

- 리듬 데이터는 `src/lib/learn/rhythm.ts`로 분리. 한 예시(박자표 + 음표·쉼표 목록)에서 MusicXML, 설명 문장, 재생 타임라인, 강세가 모두 나온다.
  마디 길이 합이 박자표와 다르면 `validate`가 던진다(덜 찬·넘친 마디가 페이지에 나가지 않는다).
- 음높이는 솔(G4) 하나로 고정해 길이에 집중한다. 빠르기는 4분음표 = 80으로 고정.
- 박자표는 리듬 예시에만 표시한다(L-4a 음높이 예시는 숨김 유지).
- 범위 밖이라 본문에서 언급하지 않은 것: 조표, 임시표, 셋잇단음표, 16분음표, 붙임줄, 못갖춘마디, 빠르기말.
- 쉼표의 모양·위치는 글로 설명하지 않고 조판 엔진의 그림에 맡겼다. 8분음표를 잇는 줄은 용어 없이 풀어 썼다(`묶음줄`이 표준 용어인지 확인하지 못했다).
- `reading`의 `available`을 켰다. 지도 설명("음높이와 길이, 박자")이 이제 내용과 맞는다.

## 표준 자료 대조표

청취 판단은 완료 조건이 아니다.

| # | 레슨의 주장 | 대조 자료 | 판정 |
|---|---|---|---|
| 1 | 4분음표를 한 박으로 놓으면 온음표 4박, 2분음표 2박, 4분음표 1박, 8분음표 반 박 | Wikipedia *Note value*: "Unmodified note values are fractional powers of two"(온 1, 2분 1/2, 4분 1/4, 8분 1/8); Open Music Theory *Rhythmic and Rest Values* (리뷰어 대조) | 일치 |
| 2 | 온음표는 빈 머리만, 2분음표는 빈 머리에 기둥, 4분음표는 찬 머리에 기둥, 8분음표는 꼬리 하나 | *Note value*: 길이는 "the texture or shape of the notehead, the presence or absence of a stem, and the presence or absence of flags/beams"로 나타낸다; 글로벌 세계 대백과사전 「악전」의 용어 "꼬리·기둥·머리"; Open Music Theory (리뷰어 대조) | 일치 |
| 3 | 이어지는 8분음표는 꼬리 대신 굵은 가로줄로 서로 이어 그리기도 한다 | 「악전」: "꼬리를 가진 음표가 2개 이상 있을 때에는 음표의 꼬리를 굵은 줄로 묶을 수 있다"; *Note value*: "A single eighth note … is always stemmed with flags, while two or more are usually beamed in groups" | 일치 |
| 4 | 쉼표는 같은 이름의 음표와 같은 길이만큼 쉰다 | *Note value*: "A rest indicates a silence of an equivalent duration"; 「악전」(음표와 쉼표의 상대적 길이 표); Open Music Theory (리뷰어 대조) | 일치 |
| 5 | 점이 붙으면 원래 길이의 절반만큼 길어진다(1.5배). 점2분음표 3박, 점4분음표 1박 반 | *Note value*: "This dot adds the next briefer note value, making it one and a half times its original duration"; 「악전」: "이 점은 붙여진 음(쉼)표의 1/2의 길이를 표시한다" | 일치 |
| 6 | 세로줄(마디줄)로 나눈 구간이 마디 | 「악전」: "세로줄과 세로줄 사이를 마디라 하며"; Open Music Theory *Simple Meter and Time Signatures* (리뷰어 대조) | 일치 |
| 7 | 박자표의 아래 숫자는 세는 기준 음표, 위 숫자는 그 음표 몇 개가 한 마디에 들어가는지 | Wikipedia *Time signature*: "The lower numeral indicates the note value that the signature is counting", "The upper numeral indicates how many such note values constitute a bar"; 「악전」: "분모인 4는 4분음표를 1박의 단위로 기보한 것을 표시" | 일치 |
| 8 | 4분의 4박자는 4분음표를 한 박으로 네 박, 4분의 3박자는 세 박 | *Time signature*: 단순 박자에서 "the beat is the same as the note value of the signature"; Open Music Theory (리뷰어 대조) | 일치 |
| 9 | 8분의 6박자는 8분음표 여섯 개, 셋씩 두 묶음, 전체 길이는 4분음표 셋 | *Time signature*: "two beats, each being a dotted quarter note, and each containing subdivisions of three eighth notes"; Open Music Theory *Compound Meters and Time Signatures* (리뷰어·구현 워커 대조) | 일치 |
| 10 | 그림에서 4/4·3/4는 8분음표를 둘씩, 6/8은 셋씩 이어 그린다 | 9와 같은 자료. 스크린샷으로 확인 | 일치 |
| 11 | 예시의 쉼표 배치(8분음표 둘, 4분쉼표, 2분쉼표 / 2분쉼표 둘 / 한 마디 온쉼표) | 표준 기보 관례(쉼표는 박의 구조가 보이게 적는다, 2분쉼표는 4/4의 첫째·셋째 박에서 시작). 온쉼표의 `measure="yes"`는 MusicXML 4.0 `rest` 규격 (리뷰어 대조) | 일치. 1차 구현의 8분쉼표·2분쉼표·4분쉼표 순서는 관례에 어긋나 고쳤다(오케스트레이터 검토) |
| 12 | 들어 보기에서 3/4는 "강 약 중 약 중 약", 6/8은 "강 약 약 중 약 약" | 9의 묶음 구조를 강세로 옮긴 것. 단위 테스트가 두 패턴을 표준값으로 직접 적어 고정 | 일치(강세의 세기 값 0.85·0.65·0.45는 구현 선택이다) |

자료: Wikipedia *Note value*, *Time signature*; 글로벌 세계 대백과사전 「악전」(ko.wikisource.org);
Open Music Theory *Rhythmic and Rest Values*, *Simple Meter and Time Signatures*, *Compound Meters and Time Signatures*; W3C MusicXML 4.0 `rest` (Open Music Theory·MusicXML은 리뷰어가 대조).
한계: 인쇄 교재 쪽수 대조는 하지 못했다. 11의 쉼표 배치 관례는 오케스트레이터의 지식과 리뷰어 확인에 기대며 직접 인용한 출처가 없다.

## Commands and results

구현은 Codex `gpt-6.1-sol`(Orca 터미널). E2E와 화면 확인은 Claude가 실행했다.

| Command | Result | Evidence |
|---|---|---|
| 구현 전 Jest (Codex) | FAIL (의도) | 새 모듈·렌더 옵션·페이지 제목/표·리듬 듣기 테스트 실패, 내용 수정 전 5건, 공개 전 6건, 리뷰 수정 전 11건 실패 확인 |
| `PATH=<ci-venv>/bin:$PATH npx jest` (최종 `a26394d`) | PASS | 151 suites, 1507 tests |
| `npx tsc --noEmit --incremental false`, `npm run lint` | PASS | exit 0, no warnings |
| `npx playwright test` learn-reading, learn-keyboard, learn-hands, learn-home, console-quiet, application-smoke, playback-element-count, playback-note-names, playback-shortcuts, playback-controls-responsive, playback-session-transition, first-play-sample-loading, hand-practice, wait-mode-midi, metronome-count-in `--project=chromium --project=firefox --project="Mobile Chrome"` (`a26394d`) | PASS | 201 passed, 6 skipped |

리뷰 수정이 재생 화면도 쓰는 오디오 훅(`useFallingNotesAudio`)에 `stopTappedNotes`를 더했으므로 재생 회귀 spec 9개를 함께 돌렸다.
훅의 기존 정지·재시작은 탭 소리를 유지하는 동작 그대로다(기다리기 모드용). 요소 수 측정 spec도 통과(재생 화면 변경 없음).

## 화면 확인 (chromium 스크린샷)

- 1100px 네 절: 온쉼표가 넷째 줄 아래에 매달리고 2분쉼표가 셋째 줄 위에 얹힘, 4분·8분쉼표, 점, 박자표 숫자, 8분음표 묶음(4/4·3/4 둘씩, 6/8 셋씩) 정상.
- 1차 구현의 `8분음표와 쉼표` 예시가 8분음표·8분쉼표·2분쉼표·4분쉼표로 그려진 것을 확인하고 수정, 재촬영(390px)에서 8분음표 둘·4분쉼표·2분쉼표.
- 1280px `/learn`: 네 단계 모두 링크, "준비 중" 없음.

## main 병합과 공개 (`153fd40`)

PR221(L-5) 병합 후 main을 브랜치에 병합. 충돌 없음. `reading` 공개에 맞춰 지도(링크 4개), 레슨 이동(건반 → 악보 읽기 → 손 → 연습 방법),
각 레슨 페이지 테스트, 학습 E2E, `console-quiet` 경로 목록을 갱신. 악보 읽기 본문 끝에 손·연습 방법 레슨 링크 추가.

## 로컬 리뷰 (Codex `gpt-6-astra` high, read-only, Orca 터미널, 대상 `153fd40`)

음악 사실: 오류 없음(위 표의 리뷰어 대조 항목).

| # | Finding | State | Handling |
|---|---|---|---|
| 1 | P2: 음높이 예시의 탭 소리가 취소되지 않아 리듬 예시 시작 시 이전 음이 겹침 | FIXED | `a26394d`: 훅에 `stopTappedNotes` 추가, 예시 전환 시 호출, 전환 테스트 |
| 2 | P2: 샘플 준비 전부터 첫 음의 재생 차례를 표시해 대기 시간을 음 길이로 오해 | FIXED | `a26394d`: 준비 상태와 재생 상태 분리, 차례는 오디오 시작부터 |
| 3 | P2: 3/4와 6/8 예시의 재생 데이터가 같아 묶음의 차이를 들을 수 없음 | FIXED | `a26394d`: 묶음 첫 음 강세, 두 패턴을 표준값으로 테스트, 본문에 한 문장 |

온음표·2분음표의 지속: 구현 워커가 코드로 확인. 각각 3초·1.5초(80bpm에서 4박·2박) 종료 시점으로 예약되고 피아노 감쇠가 적용된다. 0.8초 탭 경로를 쓰지 않는다.

## Gaps and risks

- WebKit·Mobile Safari E2E는 PR CI에 맡긴다(D-088).
- 실제 청취(강세가 들리는지, 긴 음이 길게 들리는지), 스크린리더 낭독, 실기기 터치는 확인하지 않았다.
- 페이지의 OSMD 인스턴스가 8개에서 21개로 늘었다. 저사양 기기의 로드 시간은 측정하지 않았다. 리뷰어는 이 점을 지적으로 올리지 않았다.
- 리뷰 수정 커밋 `a26394d`는 로컬 재리뷰를 하지 않았다.
- Codex 주간 한도가 10% 미만이라는 경고와 가벼운 모델로 바꿀지 묻는 창이 구현 워커 터미널에 떴다(2026-10-04). 모델은 사용자가 지정한 `gpt-6.1-sol`을 유지했다.

## PR CI 이후 추가 (2026-10-04, `bb23f55`)

- CI Firefox 실패(`learn-reading.spec.ts:22`): 리뷰 수정으로 재생 차례를 오디오 시작에 묶으면서 소리 시작을 상한 없이 기다리게 됐다. 소리가 시작되지 않는 환경에서
  "소리를 준비하고 있어요"가 끝나지 않는다. 대기 상한 4000ms와 벽시계 진행으로 수정, `resume`이 끝나지 않는 재현 E2E 추가.
- CI Mobile Safari 실패(`:254`)와 로컬 WebKit: 가시 비율 1 단언이 소수점 반올림(0.993)으로 실패. 0.95로 완화.
- 로컬 재검증: Jest 1513/1513, tsc, lint PASS. E2E 8개 spec × 5개 프로젝트 188 passed / 6 failed(macOS WebKit Tab 포커스, 기존 환경 문제) / 6 skipped. CI `bb23f55`: 전부 PASS(E2E 630 passed, 2 flaky #222).
- 로컬 macOS Firefox에서는 원래 실패가 재현되지 않았다. 재현 테스트는 `AudioContext.resume`을 끝나지 않는 Promise로 바꿔 만든 것이다.
