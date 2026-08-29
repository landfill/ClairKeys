# DS-2 — 로그인 전 핵심 가치 전달

Status: `NOT_STARTED`
Depends on: DS-1
Blocks: DS-6, DS-7
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 2단계

## Objective

로그인하지 않은 방문자가 홈에서 "내 PDF가 무엇이 되는지"를 5초 안에 이해하고, 실제 결과를 한 번
조작해 보게 한다. 이슈 #76의 최우선 목표인 업로드 전환율에 가장 직접적으로 기여하는 단계다.

## In scope

- 홈 히어로의 **실제 떨어지는 노트 + 건반** 결과 표현
- `PDF → AI 변환 → 시각적 연습` 3단계 시각화
- **자체 완결 샘플 플레이어** — 로그인 없이 조작 가능
- CTA를 `내 악보로 시작하기`로 통일
- 로그인 화면: 계정이 필요한 이유 3가지, 업로드 여정의 다음 단계로 재구성
- **로그인 후 원래 행동 복귀 계약의 설계와 구현** (`LoginButton`의 `callbackUrl`)
- 지원 파일·예상 처리 시간·개인정보 처리 정보를 CTA 근처에 표시

## Out of scope

- **`/sheet/[id]`를 건드리지 않는다.** 그 화면의 로그인 전 접근은 DS-6 소유다
- 플레이어 컴포넌트의 내부 구조 (DS-5)
- 업로드 화면 자체 (DS-3)

## 변경 대상

| 경로 | 변경 |
|---|---|
| `src/app/page.tsx` | 히어로, 3단계 시각화, 샘플 플레이어, CTA |
| `src/app/auth/signin/page.tsx` | 로그인 이유 3가지, 여정 맥락 |
| `src/components/auth/LoginButton.tsx` | `callbackUrl` 기본값 `/` 제거 — 현재 위치를 보존 |
| 신규: 샘플 애니메이션 데이터 | 저장소 안에 두는 자체 완결 샘플 |

## 샘플 데이터 결정

홈 샘플은 **`/sheet/[id]`나 운영 DB를 쓰지 않는다.** 이유는 두 가지다.

- 그 경로는 DS-6 소유이고, 인증 경계를 두 단계가 동시에 건드리면 충돌한다.
- 운영 공개 악보는 제목이 파일명이고 저작자가 미검증 값이다(DS0-4). 첫 인상으로 쓸 수 없다.

샘플은 저장소에 커밋된 canonical 애니메이션 JSON을 쓰고, `normalizeAnimationData`의 계약을
통과해야 한다 (D-002, D-009).

## 회귀 기준

**기능 회귀**

- `AuthGuard`의 `callbackUrl` 보존(`pathname + search`)이 깨지지 않는다.
- 로그인 후 복귀 대상이 오픈 리다이렉트가 되지 않는다 — 같은 origin의 경로만 허용한다.
- 샘플 플레이어가 오디오 컨텍스트를 **사용자 제스처 없이 시작하지 않는다**.

**시각 회귀**

- `e2e/application-smoke.spec.ts`의 홈 렌더·확대 허용·`/explore` 진입 세 검사 유지.
- 홈이 DS-1 토큰만 쓴다. 새 색상 리터럴을 도입하지 않는다.

## 접근성·반응형 검증

- 샘플 플레이어를 키보드만으로 재생·정지할 수 있고, 상태가 스크린리더에 전달된다(`aria-live`).
- 자동 재생하지 않는다. 움직임이 `prefers-reduced-motion`을 존중한다.
- 데스크톱 1440·1024, 모바일 390 세로에서 히어로와 샘플이 읽힌다.
- 히어로 텍스트 대비 4.5:1 이상.

## Completion criteria

- 홈 히어로에 정적 건반이 아닌 **실제 낙하 노트 결과**가 있다.
- 주 CTA 문구가 `내 악보로 시작하기`이고, 홈·Footer의 다른 CTA와 어긋나지 않는다.
- 로그인하지 않은 상태에서 홈의 샘플을 재생·정지할 수 있다 (수동 확인, 근거 기록).
- 로그인 화면에 계정이 필요한 이유 3가지가 있다.
- `LoginButton`으로 로그인하면 로그인 전에 있던 경로로 돌아온다. 회귀 테스트로 고정한다.
- 지원 파일 형식·예상 처리 시간·개인정보 안내가 CTA에서 한 화면 안에 보인다.
- `/sheet/[id]`와 `src/components/animation/`에 diff가 없다.

## 검증 명령

```bash
npm run lint && npx tsc --noEmit && npm test && npm run test:e2e && npm run build
git diff --stat origin/main -- src/app/sheet src/components/animation   # 비어 있어야 한다
```

수동: 로그아웃 상태(시크릿 창)에서 홈 진입 → 샘플 재생 → CTA → 로그인 → 원래 경로 복귀.
