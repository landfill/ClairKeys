# Validation — #225 용어 사전

Date: 2026-10-04 KST
Branch/head: `codex/issue-225-learn-glossary` / `46d14c7`
Baseline: `9f1e052`, clean main. 계획은 작업 브랜치의 `docs/recovery/phases/LEARN-followups.md`.

## Scope and results

공개 `/learn/glossary`에 4개 분류·25개 항목을 제공한다. 정의는 짧은 요약이며 모두 기존 레슨 절로 연결된다.
배우기 지도와 공통 레슨 하단에서 진입한다. 학습 단계 순서·재생 화면·인증·DB는 변경하지 않았다.

## Content checks

| 항목 | 근거·판정 |
|---|---|
| 가운데 도·오선·줄/칸·높은/낮은음자리표·덧줄·큰보표 | [L-4a 검증](2026-10-04-learn-4a-reading-pitch.md)의 기존 대조와 현행 `/learn/reading` 본문. 같은 정의를 짧게 요약 |
| 온·2분·4분·8분음표, 쉼표, 점음표, 박자표 | [L-4b 검증](2026-10-04-learn-4b-reading-rhythm.md)과 본문. 박 수는 반드시 4분음표를 한 박으로 놓는 조건을 명시. 6/8을 여섯 기본 박으로 단정하지 않음 |
| 손가락 번호·다섯 손가락 자리 | [L-5 검증](2026-10-04-learn-5-hands.md)와 본문. 도를 언제나 같은 손가락으로 치는 것은 아니라는 제한 유지 |
| 계이름·재생 속도·한 손·A-B·기다리기·메트로놈·준비 박자 | 현행 `src/app/learn/practice/page.tsx`와 D-094. 음악 일반론이 아니라 앱의 조작 설명으로 요약 |
| 새 정의: 마디·세로줄 | Alfred, *Mark Nevin Piano Course: Preparatory Book*, 인쇄 p.6, [출판사 공개 견본](https://content.alfred.com/catpages/00-11334X.pdf), PDF 3번째 페이지 원문 확인. 오선을 세로줄로 마디로 나누는 정의와 일치. 악보나 이미지 복제 없음 |

musictheory.net lesson 12는 도구에서 JavaScript 제한으로 본문을 읽을 수 없어 새 정의의 확인 근거로 사용하지 않았다.
교사 검토는 수행하지 않았다. 기존 대조표의 자료 접근 한계는 원본 기록을 따른다.

## Commands and results

| 명령/확인 | 결과 |
|---|---|
| `npx jest src/app/learn/glossary/__tests__/page.test.tsx --runInBand` (구현 전) | FAIL 의도: 신규 page 모듈 없음 |
| 새 페이지·지도·LessonLayout 대상 Jest | PASS: 3 suites, 10 tests |
| `PYTHON_BIN="$PWD/local-test-data/results/issue134-chord-split-2026-09-19/ci-venv/bin/python3" npx jest --runInBand` | PASS: 155 suites, 1533 tests. 기존 Python 3.12 venv 사용 |
| `npx tsc --noEmit --incremental false` | PASS exit 0 |
| `npm run lint` | PASS, 경고/오류 없음(next lint 폐기 예정 CLI 안내만 출력) |
| `npx playwright test e2e/learn-glossary.spec.ts e2e/learn-home.spec.ts --project=chromium --project=firefox --project='Mobile Chrome' --workers=2 --reporter=line` | PASS: 21 tests, 20.5초. 개발 서버를 재사용, production build 중복 실행 없음 |
| agent-browser 실제 Chromium 화면 | 1280×720·320×800에서 제목·분류 링크·정의·레슨 링크 확인, framework 오류 오버레이 없음, 겹침/잘림 없음 |
| E2E 상세 | 비로그인 HTTP 200, 모든 정의 링크의 대상 절 존재, 지도→사전→기다리기 절→사전 이동, 키보드 분류 이동, 320px 가로 넘침 없음, pageerror 0 |
| `git diff --check`, Markdown 상대 링크 검사 | PASS |

React 검토: 서버 페이지와 정적 데이터만 추가했으며 상태·effect·클라이언트 요청 없음. 기존 토큰 사용, 정의 목록과 명명된 nav,
링크에 구체적인 용어 이름, 새 페이지 링크는 44px 이상 높이. 재생 화면 요소 수는 코드 변경이 없어 재측정하지 않았다.

## Gaps

WebKit·Mobile Safari·production build는 PR CI에 맡긴다. 실제 기기·스크린리더 낭독·운영/preview 화면은 아직 미검증.
재사용한 개발 서버는 테스트용 NEXTAUTH_SECRET/NEXTAUTH_URL을 사용했고 DB 변경은 하지 않았다.
PR231의 병합 후 flaky 1건은 [PR231 로그](../reviews/PR-231.md)에 기록했으며 이 변경과 다른 내 악보 경로다.
