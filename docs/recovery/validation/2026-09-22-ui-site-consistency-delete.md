# UI-2026 화면 점검·삭제 흐름 검증

Date: 2026-09-22 KST
Branch: `codex/ui-site-consistency-delete`
Decision: [D-078](../DECISIONS.md)
Phase: [UI-2026](../phases/UI-2026-site-consistency-delete.md)

## 현재 화면 점검

운영 `https://clairkeys.vercel.app`와 로컬 빌드를 브라우저에서 확인했다. 운영 데이터에는 쓰지 않았다.

| 단계 | 화면·상태 | 건강도와 관찰 |
|---|---|---|
| 1 | 홈 첫 화면, 데스크톱 | 양단 배치, 악보 연습 예시, 두 CTA가 첫 화면에 함께 보인다. 기존 아이보리/잉크/테라코타 기준과 맞는다. |
| 2 | 공개 악보 탐색 로딩→오류, 로컬 DB 미설정 | 로딩 이름과 오류 문구·재시도 동작이 있다. DB 부재는 로컬 환경 제약이며 운영 상태 판단 근거가 아니다. |
| 3 | 새 악보 업로드, 운영 데스크톱 | 파일·곡 정보·선택 설정 그룹, 필수 표시와 비활성 제출이 명확하다. 실제 업로드는 실행하지 않았다. |
| 4 | 내 악보 목록, 운영 1280px/390px | 카드·검색·정렬은 토큰을 공유한다. 탭/배지의 이모지가 선형 아이콘 체계와 달랐다. 삭제는 동일 크기의 관리 버튼 중 하나여서 위험 동작의 구분이 약했다. 모바일 플로팅 업로드 버튼은 첫 카드의 버튼은 가리지 않았다. |
| 5 | 삭제 확인, 운영 1280px/390px | 제목만 있어 같은 제목을 구별하기 어렵고, 단정적인 파일 완전 제거 문구가 서버 계약과 다르다. 모달에 원색·이모지·사각 버튼이 남아 있었다. 취소 기본 포커스는 유지됐다. 실제 삭제는 실행하지 않았다. |
| 6 | 변경 후 삭제 확인, 로컬 1280px/390px 모의 데이터 | [데스크톱](assets/ui-2026/delete-dialog-1280.png) · [모바일](assets/ui-2026/delete-dialog-390.png). 제목·저작자·분류·업로드 시각, 영구 삭제 결과, 별도 확인 선택을 볼 수 있다. 가로 넘침이 없고 모바일 하단 버튼이 화면 안에 있다. |

## 기준 적용

기존 DS-1 토큰을 재사용했다. `ConfirmDialog`는 공통 표면·경계·타이포·`Button`·선형 경고 아이콘을 쓰며, 내 악보 편집 모달도 같은 배경·표면·버튼 영역을 쓴다. 내 악보 탭과 카드의 이모지는 기존 선형 아이콘 계열로 정리했다. 로딩/빈 목록/검색 결과 없음/처리 중/변환 오류/불러오기 실패는 기존 `StatusState`와 카드 상태 계약을 유지한다. 별도 이미지 에셋은 삭제를 이해하는 데 도움을 주지 않아 만들지 않았다.

## 변경 전 회귀 근거

`npm test -- --runInBand src/components/sheet/__tests__/SheetMusicCard.test.tsx`: 5 passed, 2 failed. 새 테스트는 삭제 대상의 보조 정보와 별도 확인 선택을 요구했고, 기존 창에 둘 다 없어 실패했다. 구현 후 취소 기본 포커스, 진행 중 중복 실행/닫기 방지, 실패 후 같은 창에서 재시도도 추가로 고정했다.

## 검증

- `npm run lint`: PASS, 경고 0.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS. Next 설정에 따라 타입·린트를 생략하므로 위 두 명령을 별도 실행했다.
- `PYTHON_BIN=/private/tmp/clairkeys-ui-python312/bin/python npm test -- --runInBand --silent`: 114 suites / 1101 tests PASS. 최초 시스템 Python 실행은 FastAPI 부재로 OMR 브리지 2건이 실패했다. `requirements-ci.txt`를 Python 3.12 격리 환경에 설치한 뒤 같은 전체 스위트를 재실행해 통과했다.
- `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 npx playwright test e2e/library-delete-dialog.spec.ts --project=chromium --project='Mobile Chrome' --reporter=line`: 4 PASS. 390/1280에서 대상 정보·비활성 확인·취소 시 DELETE 0·포커스 복귀·실패 문구/창 유지, 가로 경계를 검사했다. 요청은 모의 500 응답이며 운영 데이터에 영향이 없다.
- `npx playwright test e2e/library-states-responsive.spec.ts e2e/upload-form-grouping.spec.ts e2e/explore-cards-responsive.spec.ts --project=chromium --project='Mobile Chrome' --reporter=line` (위와 같은 테스트 인증 변수): 68 PASS. 320/390/844/1280/1440 및 CSS 200% 사례 포함. 로컬 DB 부재로 서버 로그는 발생했으나 모의 응답에 대한 테스트 판정은 모두 통과했다.
- 수정 후 390/1280 스크린샷을 열어 확인했다. 모달 제목, 정보 카드, 확인 선택, 버튼이 모두 보이며 잘림/가로 넘침이 없다.

## PR182 review round (2026-09-22)

Codex inline P2 `4069413627`: 요청 중 확인 버튼을 비롯한 모든 컨트롤이 비활성화되면
Chromium 포커스가 `body`로 이동해 Tab으로 모달 뒤에 접근할 수 있었다. 새 E2E가 수정 전
`document.activeElement.closest('[role="dialog"]') === false`로 실패했다. `d9fdf71`에서
진행 중 대화상자 루트로 포커스를 옮기고 컨트롤이 없을 때 Tab을 가둔다. 수정 후
`e2e/library-delete-dialog.spec.ts` Chromium/Mobile Chrome **6/6 PASS**; 진행 중 Tab/Escape,
실패 후 오류 표시를 포함한다. `SheetMusicCard`/`ConfirmDialog` Jest 21/21, 린트·타입
검사도 통과했다. 최신 hosted CI·재리뷰는 별도로 확인한다.

초기/직전 head의 전체 E2E에서 WebKit 계열 삭제 테스트가 실패했다. 로컬 WebKit
재현은 취소 뒤 호출 버튼 포커스가 돌아오지 않는 것을 보여줬다. WebKit은 마우스로
클릭한 버튼을 항상 포커스하지 않으므로 `document.activeElement`에 의존할 수 없었다.
또 호스팅 로그에서 모의 요청 계수 0인데 실패 안내가 나왔고, 로컬 재현의 서버 로그는
DELETE가 Prisma까지 도달했음을 보여줬다. `7f27beb`은 카드 버튼 ref를 복귀 대상으로
넘기고 Playwright fixture에서 서비스 워커를 차단해 모의 요청 우회를 막는다. 수정 후
`e2e/library-delete-dialog.spec.ts` 전체 Chromium/Firefox/WebKit/Mobile Chrome/Mobile
Safari **15/15 PASS**. `npm run lint` 경고 0, `npx tsc --noEmit`, focused Jest 21/21 PASS.
실제 운영 DELETE는 실행하지 않았다. 최신 hosted full E2E는 재실행 중이다.

다음 Codex 리뷰 P2 `4069555026`은 성공 응답 후 카드 제거가 호출 버튼도 제거하므로
초점이 `body`로 떨어지는 문제였다. 모의 성공 DELETE E2E를 추가했고, 마지막 카드 삭제 뒤
`내 악보` 제목의 `toBeFocused()`가 수정 전 실패했다. `d27a4c6`은 원래 버튼이 DOM에
남으면 거기로, 사라지면 안정적인 페이지 `<h1>`으로 포커스를 보낸다. 수정 후
Chromium/Firefox/WebKit/Mobile Chrome/Mobile Safari 삭제 스위트 **20/20 PASS**,
린트 경고 0·타입 검사 PASS. 리뷰 스레드 해결. 최신 hosted 전체 CI·재리뷰는 진행 중이다.

최종 PR head `d27a4c6`의 hosted CI는 전체 성공했다. PR Checks와 Tests의 E2E 두
작업 모두 성공, Build/Unit/Run Tests/Lint/Type/Security Scan/Security Audit/CodeQL,
Vercel preview 및 `All Checks Complete` 성공을 GitHub live state로 확인했다. Codex
같은 head 재리뷰는 완료됐고 새 인라인 지적은 없으며 미해결 스레드는 0이다. PR은
non-draft OPEN·mergeable `MERGEABLE`로 확인했다. 이 검증은 병합 승인이 아니며
실제 운영 DELETE/실기기 검증을 대신하지 않는다.

## 승인 병합·운영 확인 (2026-09-22)

사용자 "머지승인" 후 PR182는 `b7191d032eaf000c523745bfb751e0a8a2b2b094`로 병합됐다.
`origin/main`과 로컬 `main`이 같은 SHA이며 PR head `d27a4c6`이 포함된다. Production
deployment6586549256은 이 SHA에 대해 `success`이고 Vercel 상태도 `Deployment has
completed`다. 운영 `/library`를 로그인된 읽기 전용 브라우저에서 확인했다: 데스크톱과
390px 모바일 모두 악보 3장 목록, 선형 아이콘, 대상·영구 삭제 안내·확인 체크박스,
기본 취소 포커스가 보였다. 취소 후 원래 삭제 버튼으로 포커스가 돌아왔고 목록 3장은
유지됐다. 실제 삭제는 수행하지 않았다. 병합 직후 E2E 후속 검사는 진행 중이었다.
후속 검사 최종 결과: `b7191d0`의 E2E Tests, Post-merge build, Post-merge tests,
Lint, Run Tests, Security Audit **6/6 success**. 운영 DB/스토리지의 실제 삭제
성공은 이 읽기 전용 검증의 범위가 아니다.

## 데이터·동작 경계

`src/app/api/sheet/[id]/route.ts`, Prisma 모델, 서비스 요청 메서드는 변경하지 않았다. 서버는 파일 정리에 실패해도 DB 삭제를 계속할 수 있으므로 UI에서 파일 완전 제거를 보장하지 않는다. 실제 운영 악보 삭제·실기기 터치·실제 스크린리더 출력·운영 배포 후 브라우저 검증은 이 PR 이전에 수행하지 않았다. 테스트의 로그인 쿠키와 목록은 모의 데이터로, 실제 로그인/DB 성공을 증명하지 않는다.
