# #187 한 페이지의 `/api/auth/session` 호출

Status: IN_PROGRESS
Date: 2026-09-29
Issue: https://github.com/landfill/ClairKeys/issues/187
Previous stage: [함수 지역](ISSUE-187-api-latency.md) (DONE, PR203)

## Objective

#187의 남은 완료 기준 "한 페이지의 `/api/auth/session` 호출을 1회로 줄이는 것을 회귀 테스트로 고정한다"를 끝낸다.

## 현재 (main `2fb3281`, 운영 비로그인 측정)

- 이슈의 "한 페이지 4회"(2026-09-27)는 지금 재현되지 않는다. `/`·`/explore`·`/sheet/87`은 1회다.
  모든 페이지가 루트 `SessionProvider` 하나를 공유하고 `useSession()`은 그 값을 읽기만 한다.
- `/auth/signin`은 2회다. 페이지가 Provider와 별도로 `getSession()`을 불러 요청을 한 번 더 보낸다.
  보호 경로(`/upload`·`/profile`·`/library`)는 이 페이지로 이동하므로 같은 2회다.
- 로그인 상태에서 탭으로 돌아올 때(`visibilitychange`) 다시 가져오는 것은 next-auth 기본값(`refetchOnWindowFocus`)이다.
  비로그인(`session === null`)에서는 다시 가져오지 않음을 운영에서 확인했다.

## 설계

로그인 페이지의 `getSession()`을 `useSession()`의 `status`로 바꾼다. `authenticated`이면 전과 같이 `callbackUrl`로 보낸다.

## Work stages

1. 회귀 E2E(수정 전 실패 확인): 비로그인 `/`·`/explore`·`/auth/signin`·`/upload` 각 1회, 로그인 상태의 로그인 페이지는
   1회로 `callbackUrl` 복귀.
2. 구현: `src/app/auth/signin/page.tsx`.
3. 전체 Jest·tsc·lint, 변경 영역 E2E, PR CI·리뷰.
4. 병합(= 운영 배포, 사용자 승인) 후 운영에서 같은 페이지의 호출 횟수를 측정해 기록한다.

## Completion criteria

- 위 페이지들이 한 번 로드에 `/api/auth/session` 1회를 E2E로 고정한다.
- 운영에서 `/auth/signin`·`/upload`가 1회임을 확인해 validation에 기록한다.

## Scope

`src/app/auth/signin/page.tsx`, `e2e/auth-session-once.spec.ts`.
제외: 로그인 상태의 탭 복귀 재조회(세션 만료 반영에 쓰이는 기본 동작), 홈 로드 때 나가는
`/api/auth/signin?callbackUrl=%2Fupload`(세션 요청이 아니다. `/upload` 링크 prefetch가 미들웨어 리다이렉트를 따라간 것으로
추정하며 확인하지 않았다, 후속 후보).

## Progress

- 2026-09-29: 운영 측정으로 원인 확인, 계획·구현·로컬 검증.
