# 홈 영상 preload 회귀 보완 — 2026-11-06 KST

## 범위와 재현

- PR262 후속 head `68c88f6108202efd310c1e2010b1b903d96609d8`.
- [원본 미디어·구현·검증](2026-11-06-home-intro-video.md), [최신 phase](https://github.com/landfill/ClairKeys/blob/68c88f6108202efd310c1e2010b1b903d96609d8/docs/recovery/phases/HOME-intro-video.md).
- 최초 CI의 WebKit·Mobile Safari는 `preload="none"`에도 각각 MP4 요청을 보냈다. 예상 `[]`와 실제 `["http://localhost:3000/videos/clairkeys-intro.mp4"]`가 달라 새 테스트가 세 번 모두 실패했다.
- [HTML 표준의 preload 계약](https://html.spec.whatwg.org/multipage/media.html#attr-media-preload)은 브라우저가 무시할 수 있는 힌트다.
  D-106·phase에서 이 경계를 명시하고 E2E의 요청 0건 가정만 제거했다. 정지·음소거 해제·조작기·자산·크기·반응형 검증은 유지한다.
- `git diff e8a5c7f..68c88f6 -- src public` 출력 없음. 애플리케이션·영상·포스터는 이미 검증한 것과 동일하다.

## 로컬 검증

| 명령 | 결과 |
|---|---|
| `npx playwright test e2e/home-intro-video.spec.ts --project=chromium --project=firefox --project=webkit --project='Mobile Chrome' --project='Mobile Safari' --workers=2 --reporter=line` | **5 pass / 1.0m**. 실패한 두 프로젝트를 포함. skip·조건부 우회 없음 |
| `npx tsc --noEmit --incremental false` | exit 0 |
| `npm run lint` | exit 0, 경고·오류 0 |
| `PYTHON_BIN=<venv-monitor310>/Scripts/python.exe npx jest --runInBand --json --outputFile=...` | **180 suites: 172 pass / 8 fail; 1784 tests: 1773 pass / 11 fail**, 454.914s |
| 위 JSON과 최초 전체 Jest JSON의 실패 이름을 정렬해 `Compare-Object` | 차이 **0개**. [main 대조 원본](2026-11-06-home-intro-video.md#전체-jest)의 같은 Windows 실패 11개 |
| `git diff --check`, staged 파일 확인 | exit 0, E2E·D-106·phase 계획 보완만 포함 |

로컬 테스트 서버·브라우저·Prisma 한계와 실제 청취·기기 미검증 범위는 원본과 같다. 로컬 전체 통과로 표시하지 않는다.
새 head의 CI·리뷰는 [PR262 리뷰 원본](../reviews/PR-262.md)에서 확인한다.
