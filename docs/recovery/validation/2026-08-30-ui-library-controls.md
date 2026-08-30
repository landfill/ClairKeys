# Library and upload control-radius validation

Date: 2026-08-30 KST
Branch: `codex/ui-library-controls`
Commit: `5c39c2c635ccff531e691ba832b99636768bf01f`
Pull request: [#101](https://github.com/landfill/ClairKeys/pull/101)

## Scope

- 내 악보 검색 input을 `rounded-2xl` field surface로 통일했다.
- 내 악보 정렬 select를 재생기와 같은 `rounded-full` control로 정리했다.
- 카테고리 선택 버튼을 `rounded-2xl`로 정리했다.
- 업로드 드롭존과 곡명·저작자·BPM·카테고리·새 카테고리 입력을 `rounded-2xl`로 통일했다.
- 화면별 스타일 계약을 라이브러리 페이지·목록·업로드 폼 테스트로 고정했다.

## Verification

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (Next.js deprecation notice only) |
| `npm test -- --runInBand` | PASS — 82 suites, 766 tests |
| `npm run build` | PASS — Next.js production build completed |
| `git diff --check` | PASS |

## Not tested

물리 기기에서의 수동 시각 확인은 실행하지 않았다. 입력 동작, 검색·정렬 로직, 업로드 API 계약은
변경하지 않았다.
