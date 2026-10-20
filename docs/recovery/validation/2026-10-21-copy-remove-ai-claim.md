# 2026-10-21 홈·메타데이터의 AI 문구 제거 검증

PR: [#258](https://github.com/landfill/ClairKeys/pull/258) · 브랜치 `codex/copy-remove-ai-claim` · 커밋 `ab7f8ad`
리뷰 기록: [PR-258](../reviews/PR-258.md)

## 배경

홈 3단계 "AI가 음표를 읽습니다"와 `layout.tsx` metadata, `public/manifest.json`의 "AI 피아노 학습 앱"·"AI 기반 피아노 앱"은 사실과 다르다.
악보 변환은 `/api/omr/upload` → OMR 서비스 `AudiverisProcessor`(`omr-service/app.py`)가 맡는다.
`omr-service/requirements.txt`와 웹 앱 어디에도 AI 서비스 호출이나 관련 라이브러리가 없다.
Audiveris는 내부에서 기호를 구분할 때 작은 신경망 분류기를 쓰지만, 이는 OMR 엔진의 부품이라 사용자에게 AI 기능으로 내세우지 않는다(엔진 소스는 이번에 확인하지 않았다).

문구는 사용자가 정했다(2026-10-21). 2단계는 "악보 인식 엔진이 음표를 읽습니다", 제목은 "ClairKeys - 따라 치는 건반 애니메이션"이다.
설명은 사용자가 고르지 않았고, 에이전트 제안안을 썼다. PR에서 바꿀 수 있다.

## 명령과 결과 (Windows 11, 로컬)

| 명령 | 결과 |
|---|---|
| `npx jest src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx` (변경 전, 새 테스트 3개 추가 후) | 3 failed / 10 passed |
| 같은 명령 (변경 후) | 13 passed |
| `npx tsc --noEmit --incremental false` | exit 0 (예전 `.next/types` 삭제 후. 삭제 전에는 지워진 라우트 참조로 exit 2) |
| `npm run lint` | 경고·오류 0 |
| `npx jest` 전체 (Python 3.10 venv + `requirements-ci.txt`) | 171 suites 중 12 failed, 1736 tests 중 72 failed |
| 실패한 12개 묶음만 브랜치·main에서 각각 실행 | 둘 다 12 failed / 72 failed / 103 passed로 같음 |

전체 Jest의 12개 실패 묶음은 Windows 환경 때문이며 이번 변경과 무관하다. 원인은 CRLF 체크아웃(workflow 문자열 비교), Windows `c:` 경로를 ESM URL로 못 읽음(`nextConfig`), `python3` 명령 부재(`course`, OMR 회귀) 등이다.
`uploadPathInventory`, `postMergeVerified`, `prChecksWorkflow`, `postMergeWorkflow`, `nextConfig`, `omrCallbackDelivery`, `course`, `converterCorpus`, `converterKeySignatureContract`, `converterTempoContract`, `musicxmlTiming`, `omrRuntimeContract`.
Linux CI의 전체 결과로 판정한다.

세션 시작 시 로컬 main이 원격보다 475커밋 뒤처져 fast-forward했고, `npm ci`·`npx prisma generate`로 의존성을 맞춘 뒤 위 검증을 했다.

## 미검증

- Playwright E2E를 로컬에서 돌리지 않았다. CI(Linux)에서 확인한다. `application-smoke.spec.ts`의 제목 단언은 `/ClairKeys/`라 새 제목도 맞는다.
- 실제 기기에서 PWA 설치 이름이 바뀌는지 확인하지 않았다.
