# #187 탐색 API 지연

Status: DONE (2026-09-29, 함수 지역 단계). `/api/auth/session` 중복 호출은 후속 단계로 #187에 남는다.
Date: 2026-09-29
Issue: https://github.com/landfill/ClairKeys/issues/187

## Objective

공개 목록 `/api/sheet/public`이 cache MISS 때 1.6~3.9초 걸린다. 원인을 구간별로 나누고, 확인된 원인인 함수·DB 지역 불일치를 없앤다.

## 현재 (main `6554699`)

- `vercel.json` `regions: ["iad1"]`. 운영 응답 `x-vercel-id: icn1::iad1::…`(엣지 서울, 함수 미국 동부).
- DB·Storage: Supabase `ap-northeast-2`(사용자 확인 2026-09-29). OMR VM: NAVER Cloud([PROJECT_REFERENCE](../PROJECT_REFERENCE.md)).
- `Server-Timing`은 `db`(쿼리 3건 전체)와 `total`만 있다. 연결 수립·콜드 스타트가 `db`에 섞인다.
- 공개 목록 캐시는 이미 `public, s-maxage=60, stale-while-revalidate=300`이고 조건은 `PUBLIC_ONLY` 하나다(D-091).
- 이슈의 검색 탭 중복 요청은 PR202에서 탭과 함께 사라졌다(열 때 요청 1회, 운영 확인).

## 설계 (D-092)

1. `regions`를 `["icn1"]`로 옮긴다.
2. `Server-Timing`: `instance;desc="cold|warm"`, `connect;dur`, `db;dur;desc="n queries"`, `total;dur`.

## Work stages

1. 회귀 테스트(수정 전 실패 확인): 지역 고정, 연결이 쿼리보다 먼저·따로, 인스턴스 첫 요청만 `cold`.
2. 구현: `vercel.json`, 공개 API, `docs/deployment.md`.
3. 전체 Jest·tsc·lint, PR CI·리뷰.
4. 병합(= 운영 배포, 사용자 승인) 후 운영에서 MISS·HIT, cold·warm 응답 시간과 `x-vercel-id` 함수 지역을 측정해 전후를 기록한다.

## Completion criteria

- 함수가 `icn1`에서 실행된다(`x-vercel-id`의 두 번째 지역).
- 운영에서 cold·warm MISS의 `connect`·`db`·`total`을 측정해 변경 전 값과 함께 validation에 기록한다.
- 이슈 #187의 나머지 기준은 이 단계 밖이다: 한 페이지의 `/api/auth/session` 4회 호출(클라이언트, 별도 PR)은 후속 단계로 둔다.

## Scope

`vercel.json`, `src/app/api/sheet/public/`, `src/ci/__tests__/vercelRegion.test.ts`, `docs/deployment.md`, D-092.
제외: `/api/auth/session` 중복 호출, 캐시 정책 변경, DB·Storage 이전.

## Progress

- 2026-09-29: Supabase 지역 확인(사용자), 계획·구현·로컬 검증([검증](../validation/2026-09-29-issue-187-region.md)).
- 2026-09-29: PR203 병합 `1c18608`(사용자 승인), 운영 배포 후 함수 `icn1` 확인, warm MISS 서버 `total` 25~45ms(변경 전 `db` 1630~3920ms). [리뷰](../reviews/PR-203.md).
