# Button, badge, and label consistency validation

Date: 2026-08-30 KST
Branch: `codex/ui-button-badge`
Initial commit: `7ba646cfbb5da16c74ce2b191925db7baf3c04ed`
Previous fix: `6a8c5dd59bf252fbed89529722ffad3fad85ff69`
Latest fix: `31b7241bdee0781ac52c10bf81aa30d7cbbb5daa`
Pull request: [#100](https://github.com/landfill/ClairKeys/pull/100)

## Scope

- `Button`의 공통 radius를 `rounded-full`로 통일했다.
- 카테고리·공개 여부·처리 상태를 위한 공통 `Badge`를 추가했다.
- 탐색·내 악보·검색·로그인·상세 화면의 버튼과 정보 라벨을 공통 표현으로 교체했다.
- 새 pill 규칙과 Badge tone을 컴포넌트 테스트로 고정했다.
- 브라우저 피드백 1: 재생·정지·A/B·반복 버튼을 동일한 크기로 맞추고 역할별 색상으로 구분했다.
- 브라우저 피드백 2: 재생 속도 선택 상자를 pill형 표면과 사용자 정의 화살표로 정리했다.
- 브라우저 피드백 3: `전체 설정` disclosure를 둥근 설정 패널과 분리된 내부 영역으로 정리했다.
- 모바일 compact playback bar에도 동일한 버튼 크기·역할 구분·속도 선택 규칙을 적용했다.
- 재생·일시정지·중지 버튼에 아이콘과 함께 명시적 텍스트를 표시하고, A/B도 `A 시작`·`B 종료`로 풀어 썼다.
- compact playback bar는 화면 폭을 보존하면서 명확한 aria-label과 tooltip을 제공한다.

## Verification

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (Next.js deprecation notice only) |
| `npm test -- --runInBand` | PASS — 81 suites, 762 tests |
| `npm run build` | PASS — Next.js production build completed |
| `git diff --check` | PASS |

브라우저 댓글 1·2·3은 PR #100의 커밋 `6a8c5dd`에서 수정했고, 후속 브라우저 댓글은 최신 커밋
`31b7241`에서 수정했다. PR의 Vercel preview
재확인은 GitHub live state에서 확인한다.

## Merge verification

- User-approved merge completed on 2026-08-30 KST as merge commit
  `bff1cc07b92d219c0250f3685f67feb019a75890`.
- Post-merge `Lint`, `Security Audit`, `Run Tests`, `Post-merge tests`, `Post-merge build`, and
  `E2E Tests` all completed successfully.
- `origin/main` contains the feature tip; `origin/codex/ui-button-badge` and local
  `codex/ui-button-badge` were deleted after verification.
- Temporary local branch `codex/ui-playback-controls` had 0 unique commits and was deleted.

## Not tested

물리 모바일 기기에서의 수동 시각 확인은 실행하지 않았다. 카드·입력 필드·메뉴·재생 기하의
radius는 이번 범위에서 변경하지 않았다.
