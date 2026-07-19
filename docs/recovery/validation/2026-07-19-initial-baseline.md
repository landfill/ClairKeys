# Validation — Initial Baseline

Date: 2026-07-19
Commit: `dbb26ac`
Environment: Windows, Node.js workspace environment

## Claim being verified

현재 저장소가 프로덕션 bundle을 만들 수 있는지와 타입·lint·테스트 품질 게이트가 실제로 통과하는지는 별개의 주장이다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `npm run build` | PASS | 41개 app route/page 생성; 타입과 lint는 설정상 skipped |
| `npx tsc --noEmit` | FAIL | Next route, Prisma User, UI contract, missing module 오류 |
| `npm run lint` | FAIL | 다수 ESLint 오류 |
| `npm test -- --runInBand` | FAIL | 134 passed, 13 failed |
| Playwright | NOT_RUN | 선행 품질 게이트와 외부 서비스 환경 미충족 |

## Baseline comparison

- Comparison basis: 문서 변경 전 HEAD `dbb26ac`에서 표의 명령을 실행한 결과이며, 이 PR의 최초 커밋 `fc8dc10`보다 앞선 관찰이다.
- Fixed failures: 없음. 이 기록은 변경 전 기준선이다.
- Remaining pre-existing failures: TypeScript, ESLint, Jest. 위 명령과 2026-07-19 관찰 결과가 근거다.
- New failures: 최초 기준선이므로 분류 대상이 아니다. 이후 validation 기록은 이 문서와 비교한다.

## Gaps and risks

- E2E와 실제 Audiveris 변환 corpus는 실행하지 않았다.
- 빌드 성공만으로 타입 안전성이나 변환 정확도를 주장할 수 없다.
