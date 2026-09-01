# Issue #105 library and explore performance validation

Date: 2026-09-01 KST
Branch: `codex/issue-105-performance`
Commits: `453224ed840b594155a95ad3ad4eca14ef445f86`, `3aeee65ae62eb0eeeda599eee23d1ee639f9a2aa`
Pull request: [#106](https://github.com/landfill/ClairKeys/pull/106)

## Scope

- `/library` 앱 셸, 악보 API, 카테고리 API의 대기 결속과 중복 요청을 분리했다.
- `/explore` 검색 탭의 초기 debounce, 사용자 카테고리 요청, 공개 검색의 세션·DB 질의 파형을 측정했다.
- 공개 검색에만 짧은 shared cache를 허용하고, viewer에 따라 달라지는 mixed/private 응답은 캐시하지 않는다.
- API가 `Server-Timing`과 `X-Database-Queries`를 반환해 preview·production에서도 auth/DB 시간을
  다시 측정할 수 있게 했다.
- 사용자 목록·공개 최신순·카테고리 집계가 데이터 증가 시 사용할 복합 인덱스 3개를 migration으로 추가했다.

## Production before measurements

### Public search API

`curl`로 `https://clairkeys.vercel.app/api/sheet/search?isPublic=true&limit=10&sortBy=newest&sortOrder=desc`
를 5회 호출했다. 응답은 모두 200, 2,098 bytes, `x-vercel-cache: MISS`였다.

| run | TTFB | total |
|---:|---:|---:|
| 1 | 6.859 s | 6.861 s |
| 2 | 3.009 s | 3.011 s |
| 3 | 3.017 s | 3.044 s |
| 4 | 2.982 s | 2.994 s |
| 5 | 2.873 s | 2.873 s |

### Authenticated `/library`

로그인된 운영 브라우저에서 3회 reload하고 `내 악보` 셸과 `전체 악보(4개)`가 보이는 시점을 분리했다.

| run | shell visible | list visible | data wait after shell |
|---:|---:|---:|---:|
| 1 | 434 ms | 2,025 ms | 1,591 ms |
| 2 | 500 ms | 2,005 ms | 1,505 ms |
| 3 | 522 ms | 2,107 ms | 1,585 ms |

### `/explore` search tab

로그인된 운영 브라우저에서 3회 reload 후 검색 탭을 열고 입력 UI와 첫 결과가 보이는 시점을 분리했다.

| run | input visible | results visible | result wait after input |
|---:|---:|---:|---:|
| 1 | 322 ms | 3,592 ms | 3,270 ms |
| 2 | 322 ms | 3,390 ms | 3,068 ms |
| 3 | 312 ms | 3,429 ms | 3,117 ms |

운영 데이터는 사용자 악보 4건, 공개 악보 4건이다. 현재 지연을 payload 크기나 row 수 때문이라고
판정할 근거는 없다.

## Confirmed causes and changes

| Evidence | Cause | Change |
|---|---|---|
| Search component hard-coded `debounceMs: 500` for mount | First result always waits before network | First automatic search starts immediately; typing remains debounced |
| mount effect rewrote equivalent params | delayed duplicate request possible | equivalent parameter updates preserve state identity; E2E waits past 500 ms and sees one request |
| public-only route called `getServerSession` | viewer-independent query paid auth latency | `isPublic=true` skips session entirely |
| results/count/categories completed before public/private counts began | DB work ran in two waves | all 4 public-only queries dispatch in one `Promise.all` |
| search used `useCategories` while response already carried filter categories | extra authenticated `/api/categories` request | use response filter metadata; E2E sees zero category requests |
| all public-only responses were `MISS` | repeat queries received no shared caching | `s-maxage=60, stale-while-revalidate=300` only on public-only response |
| library blocked on `sheetMusicLoading || categoriesLoading` | loaded scores waited for category request | score list renders as soon as score data is ready |
| every library keystroke fetched; move remounted and fetched again; delete fetched after local removal | avoidable request amplification | 300 ms typing debounce, no key remount, one move refresh, zero delete refresh |

## Regression-first evidence

Before implementation, the focused test command failed 7 assertions across four suites:

- initial search did not start before the 500 ms timer;
- equivalent/manual searches duplicated work;
- public-only search still called `getServerSession` and did not dispatch all counts in the first DB wave;
- loaded library scores remained hidden by category loading;
- three rapid search inputs triggered three requests;
- search UI still called `useCategories`.

## Final verification

| Command | Result |
|---|---|
| focused issue #105 Jest suites | PASS — 7 suites / 25 tests |
| `npm test -- --runInBand` | PASS — 85 suites / 777 tests |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS — warnings 0; Next.js CLI deprecation notice only |
| production build with test `DATABASE_URL`/`NEXTAUTH_SECRET` | PASS — 33 routes generated |
| `npm run test:e2e` | PASS — 5 projects / 30 tests |
| Prisma validate with syntactically valid test URL | PASS |
| `git diff --check` | PASS |

The first full E2E run passed 28/30. WebKit and Mobile Safari let the service worker intercept the
new route fixture and showed the search error state. The existing public-preview test already documents the same
hazard. Applying the same service-worker isolation produced 2/2 on the failed projects and then 30/30 overall.

The local production server had no PostgreSQL process. Fixture-excluded public API calls logged connection errors;
the new issue #105 E2E explicitly mocks `/api/sheet/public`, `/api/sheet/search`, and `/api/categories` and therefore
validates request count and rendering, not a local real-DB latency. CI supplies PostgreSQL and reruns schema/tests.

## Not yet verified

- Vercel preview after-values and cache HIT behavior
- production after-values for the same curl/browser procedure
- production application of `20260901060000_add_sheet_lookup_indexes`
- production `EXPLAIN` plans and query timing with a large synthetic or real dataset
- authenticated `/library` request header timing after deployment

These are completion gates for issue #105, not evidence already obtained.

## Vercel preview after measurement

Preview: `clairkeys-git-codex-issue-105-performance-landfills-projects.vercel.app`

Direct unauthenticated `curl` received Vercel protection 302, so response headers could not be read that way.
The logged-in Vercel browser session could open the preview application. The preview application itself was signed
out, which is sufficient for public search but not authenticated `/library`.

| sample | input visible | results visible | result wait after input |
|---|---:|---:|---:|
| first/cold | 326 ms | 2,624 ms | 2,298 ms |
| warm 1 | 323 ms | 340 ms | 17 ms |
| warm 2 | 327 ms | 343 ms | 16 ms |
| warm 3 | 232 ms | 451 ms | 219 ms |

Compared with production before-values, the first result wait improved from 3.068~3.270 seconds to 2.298 seconds.
Warm-cache result wait was 16~219 ms. The shared-cache behavior is therefore observable in the user journey, while
the exact `Server-Timing` and `X-Database-Queries` preview headers remain covered by route tests rather than direct
preview header capture.

Authenticated `/library` after-values remain a production post-deploy gate because OAuth cookies do not cross from
`clairkeys.vercel.app` to the branch preview domain.
