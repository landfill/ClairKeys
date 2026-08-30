# DS-6 — 탐색과 공개 체험

Status: `NOT_STARTED`
Depends on: DS-2 (복귀 계약), **DS-5** (플레이어 형태 확정)
Blocks: DS-7
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 6단계

## Objective

공개 악보를 로그인 전 제품 체험의 통로로 만든다. `탐색 → 곡 상세·짧은 미리보기 → 로그인 → 전체 연습`
퍼널을 완성한다.

## In scope

- 곡명·작곡가·난이도 중심의 콘텐츠 정리 (DS0-4)
- 곡 상세와 **짧은 미리보기**
- **`/sheet/[id]`의 로그인 전 접근** — 이 화면의 인증 경계와 데이터 로딩 경로는 이 단계 소유다
- 로그인 후 해당 곡으로 복귀 (DS-2가 만든 계약을 적용)
- 검증된 샘플 콘텐츠만 사회적 증거로 사용

## 2026-08-30 D-031 주 — 완료 조건 3의 단독 판정자가 됐다

D-031로 홈 샘플 재생기가 DS-5에서 제거되면서, 완료 조건 3(로그인하지 않은 상태에서 실제 학습
결과를 최소 한 번 재생할 수 있다)의 판정자에서 DS-2가 빠졌다. **이 단계의 공개 악보 체험이 단독으로
판정한다.**

DS-5가 제거하는 E2E 검사 `lets a signed-out visitor play the sample without logging in`은 조건 3을
지키던 것이다. 이 단계가 공개 악보 경로로 같은 검사를 다시 세운다.

## Out of scope

- 플레이어 컴포넌트의 내부 레이아웃·컨트롤 (DS-5). 이 단계는 그것을 **배치만** 한다
- 커뮤니티·공유 기능 (이슈 #76 P2)
- 홈의 샘플 체험 (DS-2)

## 변경 대상

| 경로 | 변경 |
|---|---|
| `src/app/explore/page.tsx` | 정보 구조, 카드 표현, 이모지 제거 |
| `src/components/browse/*`, `src/components/search/*` | 카드·필터 표현 |
| `src/app/sheet/[id]/page.tsx` | **`AuthGuard` 제거·완화와 데이터 로딩 경로 전환** |

## 인증 경계 전환 — DS-0이 확인한 사실

로그인 전 체험을 막는 것은 **화면 한 겹**이다.

- `src/app/sheet/[id]/page.tsx`의 `AuthGuard`가 로딩·오류·정상 세 분기 전부를 감싼다.
- `GET /api/sheet/[id]`는 이미 공개 악보를 세션 없이 허용하고 응답에 `animationDataUrl`을 담는다.
  그 URL은 Supabase public 버킷이라 익명으로 200이다 (운영 확인).
- `GET /api/files/animation`은 세션이 없으면 401이다.

따라서 **API 인증을 바꾸지 않고** 구현할 수 있다: `AuthGuard`를 공개 악보에 대해 풀고, 클라이언트가
`/api/files/animation` 대신 `/api/sheet/[id]`의 `animationDataUrl`을 쓰게 한다.

**하지 않을 것**: `/api/files/animation`의 401을 제거하지 않는다. 그것은 비공개 악보의 URL을 숨기는
경로이고, DS0-1(버킷 자체가 public)은 이 단계가 아니라 별도 보안 작업의 대상이다.

## 회귀 기준

**기능 회귀**

- 비공개 악보는 익명에게 여전히 접근 불가다. `GET /api/sheet/<비공개 id>`가 403을 유지한다.
- provenance가 `demo`인 악보가 공개 목록에서 제외되고, 재생 시 경고가 유지된다 (P1-A).
- 로그인 후 복귀가 같은 origin의 경로로만 간다 (DS-2의 계약).
- 플레이어 기하와 가로 전환이 DS-5 상태 그대로다.

**시각 회귀**

- DS-1 토큰만 사용한다.

## 반응형 검증

- 미리보기 재생이 자동 시작하지 않는다.
- 로그인 유도가 갑작스러운 화면 전환이 아니라 맥락 있는 안내다.
- 1440·1024·390에서 카드와 상세가 깨지지 않는다.

## Completion criteria

- 로그아웃 상태에서 `/explore` → 곡 상세 → 미리보기 재생이 가능하다 (시크릿 창 수동 확인).
- 미리보기 후 로그인하면 **그 곡으로** 돌아온다. 회귀 테스트로 고정한다.
- 비공개 악보가 익명에게 403을 유지한다 (회귀 테스트).
- 카드에 파일명이 아니라 곡명·작곡가가 보인다.
- `/api/files/animation`의 인증 분기에 diff가 없다.
- `src/components/animation/`과 `src/components/playback/`에 diff가 없다 (DS-5 소유).

## 검증 명령

```bash
npm run lint && npx tsc --noEmit && npm test && npm run test:e2e && npm run build
git diff --stat origin/main -- src/components/animation src/components/playback   # 비어 있어야 한다
git diff origin/main -- src/app/api/files/animation/route.ts                       # 비어 있어야 한다
curl -s https://<배포본>/api/sheet/<비공개 id>    # {"error":"Access denied"} 유지
```

수동: 시크릿 창에서 탐색 → 상세 → 미리보기 → 로그인 → 같은 곡 복귀.
