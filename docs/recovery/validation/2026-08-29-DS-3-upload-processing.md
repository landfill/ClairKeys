# Validation — DS-3/upload-processing

Date: 2026-08-29
Commit: `6a5eeea` (브랜치 `codex/ds-3-upload-processing` head, PR [#91](https://github.com/landfill/ClairKeys/pull/91))
최초 검증 `eace453` → CodeRabbit 대응 `bb08e7f` → Codex 워커 리뷰 대응 `6a5eeea`. 아래 수치는 최종본이다.
Environment: macOS(darwin 25.5.0), Node v22.18.0, 로컬 프로덕션 빌드(`npm start`)

## Claim being verified

업로드 화면이 D-026이 확정한 계약대로 **아는 것만** 말하는가. 구체적으로 (1) 단계 표시가 서비스가
보고한 지점만 쓰는가, (2) 실패 4종이 서로 다른 복구 행동을 갖는가, (3) 서비스에 닿지 못한 것을
실패로 그리지 않는가, (4) 스택 트레이스가 새어 나오지 않는가.

## 명령과 결과

| 명령 | 결과 |
|---|---|
| `npm run lint` | PASS — 경고 0 |
| `npx tsc --noEmit` | PASS — 출력 없음 |
| `npm test` | PASS — **73 suites / 751 tests** (`eace453` 736건 → `bb08e7f` 739건) |
| `npm run build` | PASS — 33개 정적 페이지 생성, `/upload` 7.58 kB |
| `npx playwright test --project=chromium --project='Mobile Chrome'` | PASS — 10/10 |

DS-2 종료 시점 기준선은 68 suites / 647 tests였다. **신규 회귀 104건**이 늘었다.

- `src/lib/upload/__tests__/` 46건 (단계 매핑 불변식, 실제 PDF 바이트 fixture, 실패 4종 분류,
  같은 이름·크기의 다른 파일, /Encrypt 오탐)
- `src/components/upload/__tests__/OMRUploadForm.test.tsx` 20건 (Tab 도달·포커스 가시성 포함)
- `src/components/upload/__tests__/OMRProcessingStatus.test.tsx` 20건 (+ 폴링 겹침·대비·중첩)
- `src/app/upload/__tests__/page.test.tsx` **5건 신규** — 폼과 패널을 합쳐야만 드러나는 결함용
- `src/app/api/omr/status/[jobId]/__tests__/lostJob.test.ts` 1건 (`OMR_JOB_LOST`)
- 기존 `OMRUploadForm` 테스트 2건은 문구 변경에 맞춰 갱신했다(내용은 유지 — D-013 빠르기 계약).

### 실행하지 못한 것

- **Firefox · WebKit · Mobile Safari E2E.** 로컬에 브라우저 바이너리가 없다
  (`browserType.launch: Executable doesn't exist ... firefox-1497`). 5개 프로젝트 전체를 돌리면
  15건이 이 이유로 실패한다. CI가 판정한다.
- **실제 PDF → 운영 OMR 서비스 → 이탈 → 재진입 수동 검증.** 로컬에 DB도 OMR 서비스도 없다.
  폴링 응답은 전부 mock이다. phase 문서의 "수동" 항목은 미이행 상태로 남는다.
- **실제 암호화 PDF(Acrobat 산출물)로 검사.** fixture는 손으로 만든 trailer(`/Encrypt 5 0 R`)다.

## 인증 뒤 화면을 실제 브라우저로 확인한 방법

`/upload`는 `AuthGuard` 안에 있고, 이 저장소는 PR #12에서 인증 E2E fixture를 제거했다(이슈 #7).
CI의 axe 검사도 홈만 훑는다. 즉 **이 화면은 자동 검사가 전혀 닿지 않는 곳**이다.

그래서 로컬에서 `NEXTAUTH_SECRET=test-secret`으로 프로덕션 서버를 띄우고, `next-auth/jwt`의
`encode`로 세션 토큰을 발급해 Playwright 쿠키로 넣은 뒤 직접 측정했다. `databaseUserId`를 토큰에
담으면 session 콜백이 DB를 조회하지 않으므로 DB 없이 인증 상태를 만들 수 있다.

### 반응형 (첫 화면 안에 들어오는가)

`boundingBox`로 좌표를 쟀다 — `toBeVisible`은 화면 밖 요소에도 통과한다.

| 뷰포트 | 드롭존 y / 높이 | 첫 화면 안 | PDF 조건 안내 | 가로 스크롤 |
|---|---|---|---|---|
| 1440×900 | 307 / 176 | 예 | 예 | 없음 |
| 1024×768 | 307 / 176 | 예 | 예 | 없음 |
| 390×844 | 307 / 196 | 예 | 예 | 없음 |

### 다섯 상태를 실제로 렌더해 확인

`/api/omr/status/**`를 가로채 각 응답을 주고 패널의 실제 텍스트를 읽었다.

| 상태 | 화면 텍스트(요약) |
|---|---|
| 처리 중 (`progress: 30`) | 이 페이지를 닫아도 계속 처리됩니다 / 대기 중·PDF 분석 **완료**, 음표 인식 **진행 중**, 나머지 미도달 |
| 변환 실패 (`error`에 Java 스택 트레이스) | 악보를 읽지 못했습니다 / 더 선명하게 다시 스캔하거나 악보 프로그램에서 내보낸 PDF로 |
| 작업 유실 (`code: OMR_JOB_LOST`) | 변환 작업이 사라졌습니다 / 같은 파일을 다시 올려 주세요 |
| 서비스 불가 (503) | 단계 표시 **유지** + 변환 서비스에 연결할 수 없습니다 / 진행 중이던 작업의 상태는 그대로 유지됩니다 |
| 완료 | 연습할 수 있습니다 / 연습하러 가기 → `/sheet/42` |

변환 실패 응답의 `error`에 `java.lang.NullPointerException ... at org.audiveris.Main`을 담았고,
화면 텍스트에 `java.lang`·`NullPointerException`·`Audiveris` 어느 것도 나타나지 않았다. 같은 것을
Jest 회귀로도 건다.

## Completion criteria 대조

| 조건 | 결과 | 근거 |
|---|---|---|
| 예상 처리 시간 + 백그라운드 안내가 제출 전에 보인다 | 충족 | 폼 회귀 2건. 홈의 "1~3분"과 같은 값을 쓴다 |
| `이 페이지를 닫아도 계속 처리됩니다` 고정 노출 | 충족(조건 하나 추가) | 남은 작업이 있는 동안 고정. 전부 끝난 화면에서는 내린다 — 그 화면에서는 사실이 아닌 문장이다. 양쪽 다 회귀로 건다 |
| 단계 표시가 `progress` 매핑만 사용 | 충족 | 어떤 입력에도 다섯 문구 중 하나만 나온다는 불변식 테스트. 59는 `음표 인식` |
| 업로드 화면을 떠난 뒤 단계 비노출 | 충족 | 단계는 `OMRProcessingStatus`에만 있고 이 컴포넌트는 업로드 화면에서만 렌더된다 |
| 실패 4종이 서로 다른 문구·복구 행동 | 충족 | `uploadFailures` 테스트가 title·action의 중복 없음을 건다 |
| 503일 때 저장된 `processingStatus`가 안 바뀐다 | 충족 | 서버는 이미 그랬다(`lostJob.test.ts`). **화면이 그러지 않던 것을 고쳤다** — 503·502를 실패로 그리고 폴링을 멈추던 동작 |
| 잘못된 파일·용량 초과·암호화 PDF에 각각 행동 | 충족 | 거부 6종 각각 다른 `detail`, 폼 회귀 3건 |
| 실패 화면에 스택 트레이스 비노출 | 충족 | fixture 회귀 + 실제 브라우저 확인. 실패 문구 생성 함수는 인자를 받지 않는다 |
| 버튼·안내 문구에 `OMR` 없음 | 충족 | 두 컴포넌트 테스트가 `document.body.textContent`에 `/OMR/i` 없음을 건다. `grep`은 식별자와 API 코드만 남긴다 |
| 6개 상태 회귀 테스트 | 충족 | 선택 전·검사 중·요청됨(폼) / 처리 중·완료·실패(패널) |

## 2차 검증 — Codex 워커 리뷰 대응 후 (`6a5eeea`)

Orca 오케스트레이션 워커가 찾은 7건 중 6건을 고친 뒤 전부 재실행했다(위 표의 수치가 최종본이다).
로컬 실제 브라우저 확인도 다시 했다.

| 상태 | 중첩 인터랙티브 | 확인 내용 |
|---|---|---|
| 처리 중 | 0 | 5단계 표시, 이탈 안내 노출 |
| 변환 실패 | 0 | 스택 트레이스 비노출, 이탈 안내 내려감 |
| 작업 유실 | 0 | **같은 파일 재선택 성공** (`duplicateBlock=0`, `filePicked=1`) |
| 완료 | 0 | 연습하러 가기 링크 |

**작업 유실 뒤 재업로드**가 이번 라운드의 핵심이다. 화면이 "같은 파일을 다시 올려 주세요"라고 한
직후 그 파일을 고르면 중복 가드가 막았다 — 실제 브라우저에서 막히지 않는 것까지 확인했다.

대비는 계산으로 확인했다: `--ck-ink-muted` #565c6b는 흰 표면에서 6.69:1이지만 `opacity-60`을
씌우면 합성색 #9a9da6이 되어 **2.71:1**이다. 불투명도를 걷어내고 도달 여부를 표식과 굵기로 옮겼다.

## 이 단계에서 새로 배운 것

- **테스트 대역이 결함을 숨긴다.** `jest.setup.js`의 `File` 대역에는 `slice`도 `arrayBuffer`도
  없었다. 바이트를 읽는 코드는 애초에 테스트할 수 없었고, 그래서 아무도 쓰지 않았다. 대역을
  걷어내니 기존 7개 suite가 그대로 통과한다 — 처음부터 필요 없던 것이다.
- **가짜 타이머를 render 뒤에 켜면 테스트가 조용히 무의미해진다.** "완료 뒤에는 더 묻지 않는다"가
  처음에 통과했는데, 폴링 간격이 진짜 타이머로 잡힌 뒤에 `useFakeTimers()`를 켰기 때문에 시간을
  아무리 돌려도 그 간격이 울리지 않았을 뿐이었다. 옆 테스트가 실패하지 않았다면 못 봤다.
- **인증 뒤 화면은 이 저장소에서 자동 검사가 0이다.** axe는 홈만, E2E는 공개 경로만 본다.
  DS-4(`/library`)와 DS-6(`/sheet/[id]`)도 같은 사각에 있다.
- **검증된 토큰에 `opacity-*`를 씌우면 대비 계산이 무효가 된다.** DS-1이 잰 6.69:1이 화면에서는
  2.71:1이었다. "DS-1 토큰만 썼다"는 회귀 기준은 이 경우를 잡지 못한다.
- **컴포넌트 단위 테스트가 둘 다 통과해도 합친 화면은 틀릴 수 있다.** 중복 가드(폼)와 작업의
  끝(패널)이 다른 컴포넌트에 있어서, 화면이 자기 복구 안내를 스스로 막는 것을 아무도 보지
  못했다. 상태가 두 컴포넌트에 걸치면 회귀는 페이지 수준에 둔다.
