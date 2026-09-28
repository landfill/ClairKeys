# #197 공개 악보 탐색을 한 화면·한 API로

Status: IN_REVIEW
Date: 2026-09-28
Issue: https://github.com/landfill/ClairKeys/issues/197

## Objective

`/explore`의 탐색·검색 탭이 같은 공개 악보를 두 번 제공한다. 공개 악보를 찾는 화면을 하나로 합치고(검색어·카테고리·정렬·더 보기),
목록 요청 경로도 `/api/sheet/public` 하나로 모은다. 방향은 사용자가 2026-09-28 이슈의 1안(추천)으로 정했다(D-091).

## 현재 (main `ebae78b`)

- 탐색 탭 `PublicSheetMusicBrowser`: `/api/sheet/public?limit=12&sortBy=newest`, 3열 카드, 페이지 넘김 없음.
- 검색 탭 `SheetMusicSearch` + `useSheetMusicSearch`: `/api/sheet/search?isPublic=true&limit=10…`, 1열 카드, 필터·정렬·더 보기.
  로그인 사용자에게 공개 설정(전체/공개만/내 비공개만) 필터와 공개·비공개 개수를 보인다.
- `/api/sheet/search`는 이 탭만 쓴다. 공개 판정(`isPublic: true, provenance ≠ demo`)이 두 API에 따로 있다.
- 카테고리는 사용자별(`Category.userId`)이고 `/api/categories`는 로그인 전용이라, 공개 화면의 카테고리 목록은 검색 API의
  `filters.categories`(공개 악보가 있는 카테고리)에서만 나온다.
- 내 비공개 악보 검색은 `/library`가 `/api/sheet`로 이미 검색어·카테고리와 함께 제공한다.

## 설계

1. API `/api/sheet/public` 하나:
   - `search`(trim), `categoryId`, `sortBy` = `newest`(기본)·`oldest`·`title`·`composer`, `limit` 1~50(기본 12), `offset` ≥ 0.
     정렬은 `id`로 동률을 끊어 페이지 경계가 흔들리지 않게 한다. `pagination.limit`은 실제 적용한 값이다.
   - 첫 페이지(`offset=0`)에만 `categories`: 공개·비데모 악보가 있는 카테고리와 개수(검색어·카테고리 조건과 무관, 이름순).
     화면을 열 때 요청 한 번으로 목록과 필터가 모두 온다.
   - 공개 판정은 이 경로 하나에만 둔다. `/api/sheet/search`와 테스트는 삭제하고, 그 테스트가 지키던 세션 미조회·조회 한 번에
     병렬·캐시 헤더는 공개 API 테스트로 옮긴다. `Server-Timing`도 옮긴다(#187 근거).
2. 화면: 탭을 없앤다. `PublicSheetMusicBrowser` 하나에 검색창·카테고리·정렬, "공개 악보 n개", 3열 격자 카드, 더 보기.
   검색어 입력은 500ms debounce, 제출은 즉시. 조건은 같은 화면에 그대로 남는다.
   - 빈 상태 두 가지: 공개 악보가 아예 없음(업로드 안내), 조건에 맞는 결과 없음(조건 초기화).
   - 목록 제목은 정렬과 무관한 이름으로 한다("최근 공개된 악보"는 정렬을 바꾸면 틀린 말이 된다).
3. 훅: `useSheetMusicSearch`(debounce·경합·StrictMode 처리 검증됨)를 `usePublicSheetMusic`으로 옮기고 공개 API를 부른다.
   더 보기 응답에는 `categories`가 없으므로 첫 페이지 목록을 유지한다.
4. 삭제: `SheetMusicSearch`와 테스트, `LazySheetMusicSearch`, 로그인 사용자의 공개 설정 필터(내 비공개 악보는 `/library`의 역할).

## Work stages

1. 재현·회귀 테스트(수정 전 실패 확인): 공개 API 정렬·limit 보정·첫 페이지 카테고리, 훅 요청 경로, 한 화면 컴포넌트
   (검색·카테고리·정렬·더 보기·빈 상태 두 가지), 탐색 페이지에 탭 없음.
2. 구현: API → 훅 → 컴포넌트 → 페이지 → 삭제.
3. E2E 갱신: `explore-cards-responsive`(제목·탭 테스트 → 한 화면 조건 유지·요청 1회), `application-smoke`의 검색 요청 수 검사.
   320px·모바일·데스크톱·200%에서 가로 넘침·키보드 접근.
4. 전체 Jest·tsc·lint, 관련 E2E, PR CI·리뷰, 운영 확인.

## Completion criteria

이슈 #197 완료 기준과 같다: 한 화면, 같은 목록 한 번, 조건 유지, 요청 경로 하나·열 때 요청 1회, 비공개·demo 비노출 회귀 테스트,
제목·헤더·섹션 이름 비중복, E2E 갱신과 반응형·키보드 확인, 검증 기록.

## Scope

`src/app/explore/page.tsx`, `src/components/browse/`, `src/components/search/`(삭제), `src/hooks/useSheetMusicSearch.ts`(이동),
`src/app/api/sheet/public/`, `src/app/api/sheet/search/`(삭제), `src/types/sheet-music.ts`, `src/components/ui/LazyComponent.tsx`,
관련 Jest·E2E, D-091. 제외: 응답 지연 원인 분석과 캐시(#187), 공개 판정 규칙 자체(D-075).

## Progress

- 2026-09-28: 방향 결정(1안), 현재 구조 조사, 계획 작성.
- 2026-09-28: 구현·로컬 검증. WebKit CSS 200% 확대에서 flex 안 검색 입력창이 고유 폭을 유지해 문서가 넘친 것을 E2E로 발견, 감싸는 칸이 폭을 정하도록 수정.
