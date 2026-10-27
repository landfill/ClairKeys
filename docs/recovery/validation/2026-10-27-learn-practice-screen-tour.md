# 2026-10-27 연습 방법 레슨 재생 화면 둘러보기 검증

PR: [#259](https://github.com/landfill/ClairKeys/pull/259) · 브랜치 `claude/sleepy-mccarthy-d3uoyb` · 커밋 `8b1c8e5`
리뷰 기록: [PR-259](../reviews/PR-259.md) · 결정: D-103

## 검증한 주장

`/learn/practice` 맨 앞 `재생 화면 둘러보기` 섹션이 실제 재생 화면 캡처 위의 번호로 각 조작을 가리키고,
번호를 고르면 그 조작을 강조하며 그림 바로 아래에 설명을 보여 준다. 재생 화면 자체는 바뀌지 않는다(D-094).
번호 위치는 캡처 스크립트가 실제 재생기에서 찾은 상자에서 나온다.

## 환경

Linux 클라우드 세션(Claude Code), Node 22.22, `npm ci`, `npx prisma generate`, production build(`next build` → `next start`, `NEXTAUTH_SECRET=test-secret`).
Playwright는 프로젝트 고정 버전과 설치된 브라우저 빌드가 달라 임시 설정(커밋 안 함)으로 `/opt/pw-browsers/chromium-1243`을 지정했다. Firefox·WebKit은 이 환경에 없다.

## 명령과 결과

| 명령 | 결과 |
|---|---|
| `node scripts/capture-practice-screens.mjs` (`CHROMIUM_PATH` 지정, production 서버) | 그림 4장(`public/learn/practice/*.<hash>.webp`, 16~40KB)과 `src/lib/learn/practiceScreenshots.json` 생성 |
| `npx jest src/lib/learn src/components/learn src/app/learn` | 36 suites, 330 passed (키보드 테스트 2개 추가 전) / `PlaybackScreenGuide.test.tsx` 6 passed |
| `PATH=<py3.10 venv>/bin:$PATH npx jest` 전체 | 173 suites, 1747 passed |
| `npx tsc --noEmit --incremental false` | exit 0 |
| `npm run lint` | 경고·오류 0 |
| `npx playwright test` 전체, chromium 프로젝트, workers 4 | 256 passed (2.8m) |
| `npx playwright test e2e/learn-practice.spec.ts e2e/learn-lesson-layout.spec.ts e2e/learn-home.spec.ts`, Mobile Chrome 프로젝트 | 83 passed |

## 작업 중 테스트가 잡은 결함

- 데이터 테스트의 번호표 겹침 검사가 320px 화면의 기다리기 모드·음량 번호표 겹침(23px)을 잡아 위치를 옮겼다.
- E2E의 `elementFromPoint` 검사가 누름 영역이 44px이 아니라 40px임을 잡았다(`::before`가 테두리 안쪽 기준). `before:-inset-2.5`로 고쳤다.
- 공통 레이아웃 spec이 캡션 설명 14px(본문은 16px 규칙), 새 섹션 누락, 번호표 28px 상자를 잡았다. 앞의 둘은 고쳤고, 번호표는 명시적 예외로 두고 누름 영역은 위 E2E가 확인한다.
- 화면 확인에서 Tailwind 임의값 `calc(100%+4px)`(공백 없음)이 무효라 위쪽 번호표가 올라가지 않는 것, 이미지 최적화 캐시가 같은 이름의 예전 캡처를 내주는 것을 보고 각각 `calc(100%_+_4px)`, 파일 이름 해시로 고쳤다.

## 화면 확인

390·1024·1280px에서 섹션을 캡처해 번호 위치·강조·설명을 눈으로 확인했다. 1024px(본문 약 656px)에서는 휴대폰 캡처를 원래 크기로 쓴다.

## 미검증·한계

- Firefox, WebKit, Mobile Safari 프로젝트: PR CI가 확인한다.
- 실기기 터치, 스크린리더 낭독(`aria-live` 설명, 번호표 이름).
- 데스크톱 캡처가 가장 작게 그려지는 본문 768px에서 그림 속 글자는 약 10px이다. 강조 상자와 아래 설명으로 보완한다.
- 재생 중 캡처는 재생 2초 뒤 일시정지한 장면이라 다시 찍으면 노트 위치와 파일 해시가 달라진다.
