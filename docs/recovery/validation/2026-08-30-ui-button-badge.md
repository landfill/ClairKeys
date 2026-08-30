# Button, badge, and label consistency validation

Date: 2026-08-30 KST
Branch: `codex/ui-button-badge`
Initial commit: `7ba646cfbb5da16c74ce2b191925db7baf3c04ed`
Latest fix: `6a8c5dd59bf252fbed89529722ffad3fad85ff69`
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

## Verification

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (Next.js deprecation notice only) |
| `npm test -- --runInBand` | PASS — 81 suites, 762 tests |
| `npm run build` | PASS — Next.js production build completed |
| `git diff --check` | PASS |

브라우저 댓글 1·2·3은 PR #100의 최신 커밋 `6a8c5dd`에서 모두 수정했다. PR의 Vercel preview
재확인은 GitHub live state에서 확인한다.

## Not tested

물리 모바일 기기에서의 수동 시각 확인은 실행하지 않았다. 카드·입력 필드·메뉴·재생 기하의
radius는 이번 범위에서 변경하지 않았다.
