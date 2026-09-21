# #125 후속 — 공개 악보 악보 패널 접근 (PR175)

- Date: 2026-09-21
- Branch/head: `codex/issue125-public-score-access` / `8e412fd`
- 결정: [D-075](../DECISIONS.md) (Amends D-074)

## 재현과 원인

- 사용자 보고: 운영에서 비로그인 상태로 공개 악보를 재생하면 PC 상단 악보 패널과 토글이 보이지 않음.
- 원인: `/api/sheet/[id]`의 `hasScore: isOwner && ...`, `/api/sheet/[id]/score`의 세션 401과 소유자 한정 조회.
  로그인한 비소유자도 동일. PR173 운영 스모크의 `score401`은 이 잘못된 요구를 정상으로 기록한 것이다.

## 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| 회귀 선행 | `npx jest "src/app/api/sheet/\[id\]"` (구현 전) | 6 failed / 36 |
| focused | 같은 명령(구현 후) | 36/36 |
| 전체 Jest | `PYTHON_BIN=<venv> npx jest` | 112 suites / 1089 tests 통과 |
| typecheck / lint / build | `npx tsc --noEmit`, `npm run lint`, `npm run build` | 모두 exit 0 |
| E2E | `npx playwright test e2e/score-panel.spec.ts` (CI auth env) | 16 passed, 8 device skip |
| 실제 서버·DB | `next start -p 3100` + Postgres 15(`prisma db push`), JWT 쿠키 발급 | 아래 매트릭스 |
| 실제 브라우저 | Chromium 1440×1000 비로그인, API route mock 없음(애니메이션 JSON만 fixture) | 공개: 토글→보표 SVG·1마디 강조 / 비공개·legacy: 토글 없음 |

```
anonymous /api/sheet/1         200  hasScore=true                        
anonymous /api/sheet/1/score   200  <score-partwise id="public"/>        private, no-store
anonymous /api/sheet/2         403  Access denied                        
anonymous /api/sheet/2/score   404  Score not found                      private, no-store
anonymous /api/sheet/3         200  hasScore=false                       
anonymous /api/sheet/3/score   404  Score not found                      private, no-store
anonymous /api/sheet/999/score 404  Score not found                      private, no-store
visitor   /api/sheet/1         200  hasScore=true                        
visitor   /api/sheet/1/score   200  <score-partwise id="public"/>        private, no-store
visitor   /api/sheet/2         403  Access denied                        
visitor   /api/sheet/2/score   404  Score not found                      private, no-store
visitor   /api/sheet/3         200  hasScore=false                       
visitor   /api/sheet/3/score   404  Score not found                      private, no-store
visitor   /api/sheet/999/score 404  Score not found                      private, no-store
owner     /api/sheet/1         200  hasScore=true                        
owner     /api/sheet/1/score   200  <score-partwise id="public"/>        private, no-store
owner     /api/sheet/2         200  hasScore=true                        
owner     /api/sheet/2/score   200  <score-partwise id="private"/>       private, no-store
owner     /api/sheet/3         200  hasScore=false                       
owner     /api/sheet/3/score   404  Score not found                      private, no-store
owner     /api/sheet/999/score 404  Score not found                      private, no-store
```

## 환경 메모와 한계

- 첫 전체 Jest 실행에서 2 suites가 실패했다. 원인은 로컬 python3(3.14)에 `fastapi`가 없던 것이고, 코드 문제가 아니다.
  CI와 같은 `omr-service/requirements-ci.txt`를 Python 3.12 venv에 설치해 재실행했고 전체 통과했다(3.14에서는 Pillow 빌드 실패).
- 검증 DB는 `migrate deploy`가 빈 DB에서 `CREATE INDEX CONCURRENTLY`로 실패해 `db push`로 구성했다(PR174 범위, 이번 변경과 무관).
- 운영 배포와 운영 비로그인 스모크는 병합 승인 후 수행한다. 스키마·RLS·OMR 변경이 없으므로 migration과 VM 배포는 필요 없다.
