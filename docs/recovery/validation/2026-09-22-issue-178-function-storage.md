# #178 Vercel Functions Storage — 계측과 원인

Date: 2026-09-22
Issue: https://github.com/landfill/ClairKeys/issues/178
Base: main `8f1b4e8`
PRs: [#179](https://github.com/landfill/ClairKeys/pull/179) config 단일화, [#180](https://github.com/landfill/ClairKeys/pull/180) 미사용 의존성, [#181](https://github.com/landfill/ClairKeys/pull/181) 문서 전용 커밋 배포 생략

## 결론

1. **배포 1회에 저장되는 함수는 route 수가 아니라 고유 Lambda 6개다.** Production 배포 build output에서 route 83개가 Lambda 6개를 공유한다.
   고유 합계는 24.73MB(Vercel zip 기준)다. 이슈 초기의 "41함수 × 10.1MB = 배포당 약 400MB"는 route별 표시를 합산한 값이다.
2. **누적의 주원인은 배포 횟수다.** 2026-08-23~09-22 main first-parent push는 634건이다. 상태 기록을 main에 직접 커밋하는 규약 때문에 대부분 `docs/`만 바뀌었는데도 매번 Production 배포가 만들어졌다.
   D-077 규칙으로 재생하면 빌드는 88건, 생략은 546건(86%)이다. PR마다 생기는 Preview 배포도 같은 규칙을 따른다.
3. **번들 자체의 최대 요인은 Prisma 네이티브 쿼리 엔진이다.** 최대 Lambda raw 31.74MB 중 19.36MB(61%)를 차지한다.
   NextAuth, jimp, `@napi-rs/canvas`, `pdfjs-dist`, `pdf-parse`는 번들에 없거나 무시할 만한 크기다.
4. `.ts` config 설정 적용(#179)과 미사용 의존성 제거(#180)는 **함수 크기에 영향이 0**이다.

## 방법

- `vercel pull --yes --environment=production` → `vercel build --prod --yes` → `node scripts/measure-function-size.mjs`(#179에서 추가).
  route별 `.func`는 대부분 실제 Lambda 디렉터리를 가리키는 symlink다. 실제 Lambda는 `.vc-config.json`의 `filePathMap`으로 trace된 파일을 참조한다.
  그래서 실제 디렉터리마다 참조 파일 크기를 합산한다(raw, 파일별 deflate 추정).
- Vercel 실측: REST `GET /v11/deployments/{id}/builds`의 lambda output `size`(zip)와 `lambda.functionName`으로 고유 Lambda를 식별했다.
- 배포 횟수: `git rev-list --first-parent --since=2026-08-23 main`을 D-077 규칙(`git diff --quiet <마지막 빌드> <커밋> -- . ':(exclude)docs/' ':(exclude).github/' ':(exclude)AGENTS.md' ':(exclude)CLAUDE.md' ':(exclude)README.md'`)으로 재생했다.
  merge 커밋은 first-parent diff로 판단한다(`git diff-tree` 기본값은 merge 커밋 diff를 비워서 문서 전용으로 과대 집계하므로 쓰지 않았다).
- 한계: 로컬 빌드는 macOS arm64라서 Prisma 엔진이 `libquery_engine-darwin-arm64.dylib.node`다(Vercel은 linux용). deflate 합은 zip 크기의 근사치다.
  `vercel build`는 installCommand(`npm install --legacy-peer-deps`)로 `package-lock.json`을 다시 쓰므로 매번 lockfile을 복구하고 `npm ci`를 다시 실행했다.

## 기준선 — main `8f1b4e8`

### Vercel Production `dpl_9G3rKKq28Chyw1ydFJyvfjWkbfZU` (zip)

| functionName 접미 | route 수 | 크기 |
|---|---|---|
| `…186713e2d8` (API, maxDuration 30) | 56 | 10.11MB |
| `…ce1b288c3c` (maxDuration 60 그룹) | 4 | 9.92MB |
| `…655c3e1907` | 2 | 1.73MB |
| `…85f799cfd8` (정적/ISR 페이지) | 18 | 1.45MB |
| `…ae654fbbb6` | 2 | 1.43MB |
| `…f8bdad68b8` | 1 | 0.09MB |
| **합계** | **83** | **24.73MB** |

### 로컬 `vercel build --prod`

| Lambda | runtime | maxDuration | routes | files | raw MB | ~deflated MB |
|---|---|---|---|---|---|---|
| api (예: `api/admin/update-finger-data`) | nodejs24.x | 30 | 56 | 804 | 31.74 | 12.96 |
| `api/omr/status/[jobId]` 그룹 | nodejs24.x | 60 | 4 | 752 | 31.07 | 12.78 |
| `sheet/[id]` | nodejs24.x | - | 2 | 738 | 12.10 | 3.15 |
| `_not-found.rsc` 그룹 | nodejs24.x | - | 18 | 751 | 11.02 | 2.88 |
| `favicon.ico.rsc` | nodejs24.x | - | 2 | 738 | 10.94 | 2.86 |
| `src/middleware` | edge | - | 1 | 2 | 0.32 | 0.10 |
| **합계** | | | **83** | | **97.19** | **34.72** |

그룹 이름은 빌드마다 대표 route가 바뀐다(예: `api/admin/cleanup`, `api/auth/[...nextauth]`). 크기와 route 수로 대응시킨다.

### 최대 Lambda 구성 (raw / ~deflated)

| 패키지 | files | raw MB | ~deflated MB |
|---|---|---|---|
| `.prisma` (그중 `libquery_engine-darwin-arm64.dylib.node` 19.36MB) | 5 | 19.41 | 9.70 |
| `next` | 536 | 6.61 | 1.90 |
| `react-dom` | 18 | 2.58 | 0.47 |
| Next server output (`.next/`) | 91 | 2.08 | 0.57 |
| `@prisma/client` | 3 | 0.21 | 0.07 |
| `postcss`, `critters` 등 (`optimizeCss`) | — | 각 0.12 이하 | — |

`next-auth`는 상위 20개 안에 없다. jimp·canvas·pdf 패키지는 어떤 Lambda에도 없다.
Prisma 엔진이 없는 페이지 Lambda(`sheet/[id]` 등)도 raw 11~12MB인 것은 Next/React 런타임 때문이다.

## PR별 전후

| 상태 | route / Lambda | 최대 Lambda raw / ~deflated | 합계 raw / ~deflated | Vercel Preview 고유 합계(zip) |
|---|---|---|---|---|
| main `8f1b4e8` | 83 / 6 | 31.74 / 12.96 | 97.19 / 34.72 | 24.73MB (Production) |
| `.ts` 서버 설정(`serverExternalPackages`, canvas externals)을 `.mjs`에 적용한 실험 | 83 / 6 | 31.74 / 12.96 | 97.19 / 34.72 | — |
| #179 `c1a969d` | 83 / 6 | 31.74 / 12.96 | 97.19 / 34.72 | 24.73MB (`dpl_TjrC3areLxEB58M3bm1C9XQG9WRf`) |
| #180 `2393dee` | 83 / 6 | 31.74 / 12.96 | 97.19 / 34.72 | 24.73MB (`dpl_9JZNHiu9Chv1Y2hS8J4sZG1YJg1B`) |
| #181 `0b4b654` | 83 / 6 | (변경 없음) | (변경 없음) | 24.73MB (`dpl_C87kqnDtZiz7HQR9ynZMZJk3bdMh`) |

`@prisma/client`는 Next 15 기본 server-external 목록(`next/dist/lib/server-external-packages.json`)에 이미 있다.
`@napi-rs/canvas`는 운영 코드가 import하지 않는다. 그래서 #179 실험이 0 변화인 것이 설명된다.

## 배포 횟수 (#181, D-077)

| 기간 | main push | 규칙 적용 시 빌드 | 생략 |
|---|---|---|---|
| 2026-08-23 ~ 2026-09-22 | 634 | 88 | 546 (86%) |

누적 저장량의 대략적인 규모: 배포당 약 24.7MB × 634회 ≈ 15.7GB에 PR Preview 배포가 더해진다.
사용자가 관측한 약 20GB와 규모가 맞는다. 다만 Vercel은 GB-month로 집계하므로 정확한 대조 값이 아니다.
2026-09-22 조회 시 프로젝트에 남은 배포는 3개였다(Production).

## 검증 명령과 결과

| PR | 명령 | 결과 |
|---|---|---|
| #179 | `npx jest src/ci/__tests__/nextConfig.test.ts` | 변경 전 1 failed(`next.config.ts` 감지) → 변경 후 2 passed |
| #179 | main과 PR `next.config.mjs`를 Node로 평가(headers() 포함), NODE_ENV production/development | 둘 다 동일 |
| #179 | `.vercel/output/config.json` `/samples/piano` 헤더 | `public, max-age=31536000, immutable` 유지 |
| #179 | `npx tsc --noEmit` / `npm run lint` / `npm run build` / 전체 Jest | 통과 / 통과 / 통과 / 113 suites, 1091 tests |
| #180 | `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, 전체 Jest | 통과, 112 suites, 1089 tests |
| #181 | `npx jest src/ci/__tests__/vercelIgnoreBuild.test.ts` | 스크립트 없을 때 skip 사례 2개 실패 → 7 passed |
| #181 | `vercel build --prod` (수정한 `vercel.json`) | 성공 |
| #181 | `npx tsc --noEmit`, `npm run lint`, `npm run build`, 전체 Jest | 통과, 113 suites, 1096 tests |

전체 Jest는 CI와 같은 Python 3.10 + `omr-service/requirements-ci.txt` 가상환경에서 실행했다.
로컬 시스템 Python 3.14에서는 `fastapi`가 없어 `omrCallbackDelivery`, `omrRuntimeContract`가 실패한다. 3.14에서는 요구 Pillow 버전의 wheel 빌드도 실패한다.
두 테스트는 3.10 환경에서 20/20 통과했으므로, 이 실패는 변경과 무관한 로컬 환경 차이다.

## 검증하지 못한 범위

- 로컬 브라우저 E2E. PR 필수 CI E2E job으로 확인한다.
- `ignoreCommand`가 Vercel에서 실제로 실행되는지. 병합 후 첫 문서 전용 push가 "Ignored Build Step"으로 취소되는지 확인해야 한다.
- 병합 후 Production 배포 1회 저장량. 세 PR 모두 번들 크기를 바꾸지 않으므로 24.73MB 유지가 기대값이다.

## 남은 병목 (후속 후보)

- **Prisma Rust 엔진 제거**: Prisma 6.19에서 `engineType = "client"`와 `@prisma/adapter-pg`로 바꾸면 최대 Lambda raw의 61%인 네이티브 엔진이 빠진다.
  대신 PrismaClient 생성부 3곳(`src/lib/prisma.ts`, `src/lib/db.ts`, `src/lib/db/index.ts`)과 scripts·seed 9곳이 adapter를 써야 한다.
  DB 연결도 Supabase pooler(6543, `pgbouncer=true`)에서 `pg` 드라이버로 바뀐다. DB 접근 전반의 회귀 검증이 필요해서 이번 범위에서는 구현하지 않았다.
- 원래 계획의 PR ③(auth → Prisma 전파 축소)은 조건을 충족하지 못했다. API route 56개가 이미 Lambda 하나를 공유하므로 auth 경로를 줄여도 저장량은 변하지 않는다.

## 추가 — #179·#180 병합 후 (2026-09-22)

| 배포 | 대상 | 고유 Lambda | 합계(zip) | 최대 |
|---|---|---|---|---|
| `dpl_87ndcf6gqjYoZMLFwsWUHL5iFTrN` | Production `8115f35` (#179 병합) | 6 | 24.73MB | 10.11MB |
| `dpl_Cnefb123idX8xYfu4pPFqM62uPLp` | Production `f133d26` (#180 병합) | 6 | 24.73MB | 10.11MB |
| `dpl_5RDpTxKs4vviaaW9Skxcr1LSJvy5` | Preview #181 rebase `2abfffa` | 6 | 24.72MB | 10.11MB |

#181 Preview 로그에서 ignore 스크립트가 Vercel에서 실행되는 것을 확인했다(판단 불가 경로 → 빌드).
Vercel clone 안에서의 `git fetch` 가능 여부는 미확인이다. fetch가 항상 실패한다고 가정하고 depth 10으로 재생하면(main first-parent 2026-08-23~`3453981`) push 635건 중 빌드 109건이다(생략 526건, 83%).
fetch가 되면 88건(86%)이다. 어느 쪽이든 코드 변경이 생략되는 경우는 없다.
