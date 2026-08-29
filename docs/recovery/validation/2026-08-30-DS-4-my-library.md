# Validation — DS-4/my-library

Date: 2026-08-30
Commit: `fc27178` (branch `codex/ds-4-my-library`, PR [#92](https://github.com/landfill/ClairKeys/pull/92))
Environment: macOS (darwin 25.5.0), Node v22.18.0

## Claim being verified

내 악보가 저장된 원시 `processingStatus`를 읽지 않고 D-026의 파생 상태만 사용하며, 각 상태가
실제 행동을 갖는가. 또한 제목 편집·빈 상태 업로드·삭제 오류가 키보드와 보조 기술에 도달 가능한가.

## Commands and results

| Command | Result |
|---|---|
| `npm run lint` | PASS — warnings 0 |
| `npx tsc --noEmit` | PASS — output 0 |
| `npm test -- --runInBand` | PASS — **75 suites / 760 tests** |
| `npm run test:e2e` | PARTIAL — Chromium + Mobile Chrome **10/10 pass**; Firefox, WebKit, Mobile Safari 15개는 로컬 브라우저 실행 파일 부재로 시작 불가 |
| `npm run build` | PASS — 33 static pages, `/library` 6.18 kB |
| `rg -n 'alert\\(' src/components/library` | PASS — output 0 |
| `rg -n 'processingStatus' src/components/library` | PASS — output 0 |

## Contract regression evidence

- `deriveSheetMusicAvailability`는 애니메이션 URL이 있으면 legacy `pending`이어도 `ready`로,
  빈 URL의 `processing`·`failed`를 각각 `processing`·`failed`로, 나머지를 `unknown`으로 매핑한다.
- 목록과 상세 API 회귀는 `availability`를 포함하고 `processingStatus`와 `omrJobId`를 포함하지
  않는 것을 확인한다.
- 라이브러리 회귀는 네 상태 배지, 연습 링크, 오류/알 수 없음의 재업로드 링크, 제목 편집 dialog,
  빈 상태의 업로드 링크를 확인한다. 공백만 든 제목은 모달 내부 오류가 나타나고 API update를 호출하지
  않는 회귀도 포함한다.

## Not run / known limits

- Firefox·WebKit·Mobile Safari E2E는 실행 파일이 없다. `npx playwright install`이 필요하며 CI가
  그 브라우저들을 판정한다.
- `/library`는 인증 뒤 화면이다. 현재 공개 E2E와 axe 자동 검사는 이 화면을 통과하지 않는다.
  실제 DB가 없는 로컬 환경에서는 운영 데이터로 인증 브라우저 측정을 수행하지 못했다.
- `PracticeSession`에는 재생 위치를 저장하거나 복원하는 경로가 없다. ‘이어하기’는 거짓 UI가 되므로
  구현하지 않았다; 저장 계약을 정하는 후속 작업이 필요하다.

## 병합 후 재확인 (2026-08-30 KST)

DS-4는 PR #92 이후 #93(merge `d13bb23`), #94(merge `cb42fe4`)까지 병합됐다. 위 표는 PR #92의
브랜치 커밋 `fc27178`에서 잰 값이므로, 병합된 `main` `cb42fe4`에서 계약 grep과 CI를 다시 확인했다.

| 확인 | 명령 | 결과 |
|---|---|---|
| `alert()` 미사용 | `grep -rn 'alert(' src/components/library/` (`role="alert"` 제외) | 0건 |
| 원값 미사용 | `grep -rn 'processingStatus' src/components/library/` | 0건 |
| `omrJobId` 미노출 | `grep -rn 'omrJobId' src/app/api/sheet/` | 라우트 코드 0건. 3건은 모두 테스트 파일 — 2건은 `not.toHaveProperty('omrJobId')` 단언, 1건은 fixture 입력이다 |
| 파생 상태 반환 | `grep -rn 'availability' src/app/api/sheet/` | `route.ts:72`, `[id]/route.ts:74`에서 `deriveSheetMusicAvailability` 호출 |
| 오류 전달 유지 | `grep -rn 'role="alert"' src/components/library/` | 2건 (목록 오류, 제목 편집 오류) — D-029가 유지하기로 한 경로 |
| merge commit CI | `gh api repos/landfill/ClairKeys/commits/cb42fe4/check-runs` | **6/6 성공** — Lint, Security Audit, Run Tests, Post-merge tests, Post-merge build, E2E Tests |

**주의**: phase 문서의 검증 명령은 `grep -rn 'omrJobId' src/app/api/sheet/`가 0건일 것을 요구하지만,
회귀 테스트가 "노출하지 않음"을 단언하려면 그 식별자를 반드시 언급해야 한다. 이 grep은 라우트
**구현 코드**에 대한 기준으로 읽는다 — 0건이 되도록 테스트를 지우면 계약을 지키는 근거가 사라진다.
