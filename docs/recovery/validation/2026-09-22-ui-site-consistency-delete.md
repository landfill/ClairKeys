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

## 데이터·동작 경계

`src/app/api/sheet/[id]/route.ts`, Prisma 모델, 서비스 요청 메서드는 변경하지 않았다. 서버는 파일 정리에 실패해도 DB 삭제를 계속할 수 있으므로 UI에서 파일 완전 제거를 보장하지 않는다. 실제 운영 악보 삭제·실기기 터치·실제 스크린리더 출력·운영 배포 후 브라우저 검증은 이 PR 이전에 수행하지 않았다. 테스트의 로그인 쿠키와 목록은 모의 데이터로, 실제 로그인/DB 성공을 증명하지 않는다.
