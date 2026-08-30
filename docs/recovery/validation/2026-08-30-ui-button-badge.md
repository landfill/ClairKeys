# Button, badge, and label consistency validation

Date: 2026-08-30 KST
Branch: `codex/ui-button-badge`
Commit: `7ba646cfbb5da16c74ce2b191925db7baf3c04ed`
Pull request: [#100](https://github.com/landfill/ClairKeys/pull/100)

## Scope

- `Button`의 공통 radius를 `rounded-full`로 통일했다.
- 카테고리·공개 여부·처리 상태를 위한 공통 `Badge`를 추가했다.
- 탐색·내 악보·검색·로그인·상세 화면의 버튼과 정보 라벨을 공통 표현으로 교체했다.
- 새 pill 규칙과 Badge tone을 컴포넌트 테스트로 고정했다.

## Verification

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (Next.js deprecation notice only) |
| `npm test -- --runInBand` | PASS — 81 suites, 759 tests |
| `npm run build` | PASS — Next.js production build completed |
| `git diff --check` | PASS |

## Not tested

물리 모바일 기기에서의 수동 시각 확인은 실행하지 않았다. 카드·입력 필드·메뉴·재생 기하의
radius는 이번 범위에서 변경하지 않았다.
