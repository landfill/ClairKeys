# Validation — DS-0/code-inventory

Date: 2026-08-29
Commit: `f184f28ac3123e7be4d24674e92a80659f7e9a47`
Environment: macOS (Darwin 25.5.0), 저장소 정적 분석. 앱·DB·OMR 서비스를 실행하지 않았다.

## Claim being verified

`docs/recovery/phases/DS-0-current-state-baseline.md`의 화면 인벤토리·여정 대조·기능 지원표가
현재 `main` 코드와 일치한다. 특히 이슈 #76의 완료 조건을 막는 지점이 추정이 아니라 코드에 있다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `find src/app -name page.tsx \| sort` | PASS | 18개 라우트. 이 중 7개(`demo-*` 4, `test-*` 3)는 UI 유입 링크가 0 |
| `grep -rn "/<route>" src --include='*.tsx' --include='*.ts'` (라우트별) | PASS | `demo-*`·`test-*`·`offline` 모두 자기 디렉터리 밖 참조 0. `profile` 2, `auth/error` 1, `test-finger` 1 |
| `cat src/middleware.ts` | PASS | `protectedPaths = ['/library', '/upload', '/profile']`. `/sheet/[id]`·`/processing`은 미포함 |
| `grep -n "<AuthGuard>" "src/app/sheet/[id]/page.tsx"` | PASS | 139, 153, 174 — 로딩·오류·정상 세 분기 전부 |
| `grep -n "status: 401" src/app/api/files/animation/route.ts` | PASS | 15(POST), **94(GET)**. GET의 소유·공개 판별은 110–118로 401 뒤에 온다 |
| `grep -n "getServerSession\|isPublic\|403" "src/app/api/sheet/[id]/route.ts"` | PASS | 53–58에서 `isOwner \|\| isPublic`이면 통과 — 메타데이터는 이미 공개 |
| `grep -c "processingJob" src/app/api/omr/upload/route.ts src/app/api/omr/finalize/route.ts` | PASS | 양쪽 **0**. canonical 경로는 `ProcessingJob` 행을 만들지 않는다 |
| `grep -n "fetch(" src/hooks/useBackgroundProcessing.ts` | PASS | `/api/processing`, `/api/notifications` — `/processing` 화면의 유일한 데이터원 |
| `grep -rc "processingStatus" src/components/library/` | PASS | **0**. 내 악보 목록은 처리 상태를 렌더하지 않는다 |
| `grep -n 'callbackUrl = ' src/components/auth/LoginButton.tsx` | PASS | 15행 `callbackUrl = "/"` 기본값. Header는 이 기본값으로 렌더 |
| `grep -n "currentUrl" src/components/auth/AuthGuard.tsx` | PASS | 25–26행에서 `pathname + search`를 `callbackUrl`로 보존 |
| `grep -c 'href="#"' src/components/layout/Footer.tsx` | PASS | **3** (도움말·문의하기·개인정보처리방침) |
| `grep -n "© 2024" src/components/layout/Footer.tsx` | PASS | 저작권 표기 2024 |
| `grep -n "progress\|message" omr-service/app.py` | PASS | 진행값은 0/10/30/60/100 다섯 지점, 메시지는 영문 5종. 이슈 #76의 4단계 문구와 1:1 대응이 아니다 |
| `sed -n '/model SheetMusic/,/^}/p' prisma/schema.prisma` | PASS | `processingStatus String @default("pending")` — enum이 아닌 자유 문자열 |
| `grep -n "export const" src/utils/playbackGeometry.ts` | PASS | `PX_PER_SEC=140`, `MAX_LOOK_AHEAD_SEC=2.5`, `MIN_LOOK_AHEAD_SEC=1`, `MIN_KEYBOARD_HEIGHT=120`, `PIANO_KEY_ASPECT=6.3`, `FALLING_TO_KEYBOARD_RATIO=1.15`, `BOX_BORDER=2` |
| `grep -n "BASE_PLAYBACK_KEY_WIDTH" src/utils/pianoLayout.ts` | PASS | 18행, 값 24 |
| `sed -n '1,30p' src/app/globals.css` | PASS | 토큰은 `--background`/`--foreground` 2개뿐. Tailwind v4 `@theme inline` |
| `npm test` / `npx tsc` / `npm run lint` | NOT_RUN | 이 변경은 `docs/recovery/` 3개 파일뿐이며 소스·설정을 건드리지 않는다 |

## Baseline comparison

- Fixed failures: 없음 (동작 변경 없음)
- Remaining pre-existing failures: 해당 없음 — 이 기록은 테스트 실행이 아니라 코드 인벤토리다
- New failures: 없음

## Manual checks

- 이슈 #76 완료 조건 7개를 코드 근거로 판정했다.

  | 완료 조건 | 판정 | 막는 지점 |
  |---|---|---|
  | 5초 안에 PDF가 무엇으로 변환되는지 설명 | 미충족 | 홈 미리보기가 정적 건반 (`src/app/page.tsx:36-56`) |
  | 주요 CTA가 `내 악보로 시작하기`로 일관 | 미충족 | `시작하기` (`src/app/page.tsx:24`) |
  | 로그인 전 학습 결과 1회 체험 | 미충족 | `AuthGuard` + `/api/files/animation` GET 401 |
  | 업로드 후 처리 단계·예상 대기 확인 | 부분 | 업로드 화면 체류 중에만. `/processing`은 단절 |
  | 이탈해도 처리 계속됨을 이해 | 미충족 | 동작은 하지만(D-018) 문구가 없다 |
  | 첫 진입 후 설명 없이 재생·속도 조절 | 미확인 | 실기기·실화면 확인 필요 (Work stage 4) |
  | 키보드 탐색·명도 대비·색상 외 상태 구분 WCAG AA | 미확인 | 자동 검사 미실시. E2E는 내비게이션 접근성과 확대 허용만 확인 |

## Gaps and risks

- **운영 화면을 캡처하지 않았다.** 0단계의 Work stage 4는 로그인 후 화면
  (`/upload`, `/library`, `/processing`, `/sheet/[id]`)을 요구하는데 사용자 계정 세션이 필요하다.
  따라서 위 판정은 **코드 기준**이며, 배포본이 이 코드와 다를 가능성은 배제하지 못했다.
- `구간 반복`과 `곡 제목 편집`은 컴포넌트 존재만으로 판정할 수 없어 `미확인`으로 남겼다.
  DS-4·DS-5 진입 시 실제 화면에서 확인한다.
- WCAG AA는 자동 검사(axe 등)를 돌리지 않았다. 색상 하드코딩(`bg-white`, `text-gray-600`)이
  광범위해 DS-1 토큰 작업 없이 개별 화면에서 대비를 고치면 다시 흩어진다.
- 데모·테스트 7개 라우트가 프로덕션에서 열려 있다는 사실은 확인했으나, 실제로 그 URL이
  200을 반환하는지는 배포본에서 확인하지 않았다.
