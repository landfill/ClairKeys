# Baseline Evidence

Captured: 2026-07-19

이 문서는 복구 작업 시작 전 상태다. 이후 단계는 이 기준보다 나빠지지 않았음을 증명하고, 자신이 담당한 실패를 제거해야 한다.

## Repository

- 기본 브랜치: `master`
- 분석 시작 커밋: `dbb26ac`
- 애플리케이션: Next.js 15.4.8, React 19.2.1, Prisma/PostgreSQL, Supabase, FastAPI OMR
- `src` 파일: 216개
- TypeScript/TSX 파일: 214개
- 테스트 파일: 23개

## Verification results

| 검증 | 결과 | 비고 |
|---|---|---|
| `npm run build` | PASS | `next.config.mjs`가 타입과 lint 검사를 생략함 |
| `npx tsc --noEmit` | FAIL | 라우트 타입, Prisma, 컴포넌트 계약, 누락 모듈 등 다수 |
| `npm run lint` | FAIL | `no-explicit-any`, hooks, export/import 등 |
| `npm test -- --runInBand` | FAIL | 134 passed, 13 failed; 6 suites passed, 15 failed |
| Playwright E2E | NOT_RUN | 품질 게이트와 외부 환경 선행 필요 |

## Product-critical findings

1. 외부 OMR converter는 `midi/start/hand: L|R`을 출력하지만 프론트 계약은 `note/startTime/hand: left|right`이다.
2. MusicXML duration을 `duration / 4`초로 계산해 `divisions`와 BPM을 무시한다.
3. part 순서만으로 오른손/왼손을 배정해 한 part 안의 piano staff를 처리하지 못한다.
4. 코드, 쉼표, 다성부, `backup`, `forward` 타임라인 처리가 없다.
5. 내부 PDF parser는 실제 변환 실패 시 파일 특성에 따른 데모 멜로디를 생성한다.
6. 오디오 스케줄러는 현재 위치에서 10초보다 먼 음을 건너뛰고 후속 rolling schedule이 없다.
7. `User.id`는 필수지만 신규 OAuth 사용자 생성 시 ID를 제공하지 않는다.
8. Next.js와 FastAPI 처리 상태가 프로세스 메모리에 저장되어 재시작과 수평 확장에 취약하다.

## Baseline preservation

- 각 단계는 자신이 수정하는 영역의 기존 실패를 정확히 재현하는 테스트를 먼저 추가한다.
- 관련 없는 기존 실패는 검증 기록에 분리해 적고 숨기지 않는다.
- `ignoreBuildErrors`나 테스트 제외 범위를 늘려 통과시키는 것은 허용하지 않는다.
