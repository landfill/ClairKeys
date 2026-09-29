# #188 운영 콘솔의 디버그 로그와 내부 URL

Status: IN_PROGRESS
Date: 2026-09-29
Issue: https://github.com/landfill/ClairKeys/issues/188

## Objective

운영 콘솔과 서버 로그에서 개발용 로그와 내부 정보를 없애고, 규칙으로 재발을 막는다(D-093).

## 현재 (main `fb1e961`, 운영 비로그인 측정)

- `/`·`/explore`: `ClairKeys SW registered: …` 1회. `/sheet/95`: 여기에 이모지 로그 5개가 더 찍힌다. Storage URL
  `…supabase.co/storage/v1/object/public/animation-data/…json`, 파일 원문 앞 200자, 검증된 데이터 객체가 포함된다.
- 이슈의 "SW 등록 로그 4회"는 재현되지 않았다. 문서를 한 번 열면 1회였다. 인라인 스크립트는 문서의 `load` 때 한 번 실행되고,
  `CacheManager`의 두 번째 `register`는 어디서도 렌더되지 않는다. 4회는 로그 보존 상태에서 여러 번 이동하거나 새로고침한 누적으로 추정한다.
- 서버: `/api/categories` POST가 `JSON.stringify(authOptions)`로 OAuth client secret을 로그에 남긴다. NextAuth `session` 이벤트는
  세션 조회마다 사용자 이메일을 로그에 남긴다.
- `src`(테스트 제외) `console.log` 89곳, `public/sw.js` 4곳. `no-console` 규칙 없음.

## Work stages

1. 회귀: E2E `console-quiet`(`/`·`/explore`·악보 페이지의 `log` 0개)와 `no-console` 규칙. 수정 전 E2E 3건 실패, lint 86건.
2. 구현: 로그 제거, 로그 전용 코드 정리, SW 등록 실패는 `warn`.
3. 전체 Jest·tsc·lint, 변경 영역 E2E, PR CI·리뷰.
4. 병합(= 운영 배포, 사용자 승인) 후 운영 콘솔 재측정.

## Completion criteria

- 운영 `/`·`/explore`·`/sheet/95`의 콘솔에 `log` 메시지가 없다(E2E 고정, 운영 확인).
- 저장소 URL·데이터 원문·비밀·이메일이 콘솔·서버 로그에 찍히지 않는다.
- `no-console`(warn·error 허용)이 lint에서 실패로 막는다.

## Scope

`src` 20개 파일, `public/sw.js`, `eslint.config.mjs`, `e2e/console-quiet.spec.ts`, `useAnimationEngine` 테스트 1건 삭제, D-093.
제외: 운영 관측·구조화 로그(#121), 기존 `console.warn`/`console.error` 문구 정리, 오류 로그 속 내부 정보 점검(후속 후보).

## Progress

- 2026-09-29: 운영 재현, 계획·구현·로컬 검증.
