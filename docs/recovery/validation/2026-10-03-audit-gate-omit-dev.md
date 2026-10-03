# Validation — 보안 감사 게이트를 배포 의존성으로 좁힘 (PR217)

Date: 2026-10-03 KST · Branch `codex/chore-audit-omit-dev` · commits `de877a8`, `331337e`

원인: PR216 hosted Security Audit(run 37128002897)이 `npm audit --audit-level high`에서 `braces` high 권고
(GHSA-vfj7-8cjw-p6xm, `<=3.0.3`)로 실패. PR216은 의존성을 바꾸지 않았다. npm의 최신 `braces`가 3.0.3이라 패치 버전이 없다.
사용자 결정(2026-10-03): 감사 대상을 운영 의존성으로 좁힌다(D-095, PR217 안).

| 검사 | 명령 | 결과 |
|---|---|---|
| 감사(수정 전 명령) | `npm audit --audit-level high` | exit 1, high 32건(모두 `braces` 경유 개발 도구) |
| 감사(수정 후 명령) | `npm audit --omit=dev --audit-level high` | exit 0, 0 vulnerabilities (`critters` 이동 후에도 0) |
| 유입 경로 | `npm ls braces --all`, lock의 `dev: true` | Jest(`@jest/core → micromatch`)와 ESLint(`eslint-config-next → fast-glob → micromatch`) 경로뿐 |
| 워크플로 테스트(수정 전) | `npx jest src/ci/__tests__/postMergeWorkflow.test.ts src/ci/__tests__/prChecksWorkflow.test.ts` | 3 failed (의도) |
| devDependencies 런타임 사용 대조 | `devDependencies` 전체를 `src`(테스트 제외)·`next.config.mjs`·`public/sw.js` import와 grep 대조 | `critters`만 런타임(`optimizeCss` → `next/dist/server/post-process.js`). `tailwindcss`는 CSS 빌드 전용 |
| `critters` 위치 테스트(이동 전 `package.json`) | `git show de877a8:package.json`에 단언 적용 | dependencies 없음·devDependencies 있음 → 실패 조건 확인 |
| 주석 우회 재현 | 감사 step을 `run: \|` + 주석 처리한 명령으로 바꾼 사본에 새 단언 적용 | 실패(막힘). 원본은 통과 |
| 전체 Jest (`331337e`) | `PATH=<ci-venv>/bin:$PATH npx jest` | 128 suites, 1283/1283 PASS |
| tsc / lint | `npx tsc --noEmit --incremental false`, `npm run lint` | PASS |

미검증·한계:
- hosted Security Audit·production build·E2E는 PR CI가 맡는다. `de877a8`에서는 Security Audit PASS였다.
- 개발 도구의 high 권고는 이 게이트가 더는 잡지 않는다(D-095 Directive).
- `tsc`는 다른 브랜치에서 빌드한 `.next/types` 생성물이 남으면 없는 페이지를 가리켜 실패한다. 브랜치를 바꾼 뒤에는 `.next/types`를 지우고 돌린다.
