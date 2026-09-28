# Validation — #197 공개 악보 탐색 한 화면·한 API (PR202)

Date: 2026-09-28 KST · Branch `codex/issue-197-explore-merge` · head `76183e8`

## 재현 (변경 전)

- 공개 API 테스트 8건 실패(정렬 4종·id 동률 해소, limit 보정, 검색어 trim, 첫 페이지 카테고리).
- 한 화면 컴포넌트 테스트 22건 실패(목록 region, 검색·카테고리·정렬, 더 보기, 조건 초기화), 훅 테스트는 모듈 없음.
- 기존 E2E는 탭이 있고(`explore-tabs`) 검색 탭이 `/api/sheet/search`를 부르는 구조를 전제했다.

## 로컬 검증 (`76183e8`, production 빌드, `NEXTAUTH_SECRET=test-secret`)

| 검사 | 결과 |
|---|---|
| 전체 Jest (uv py3.10 venv) | 1276/1276 |
| tsc `--noEmit --incremental false` / lint | PASS (삭제 라우트의 낡은 `.next/types`는 빌드로 재생성) |
| E2E explore-cards-responsive·application-smoke·library-states-responsive·signin-return-path, 전 프로젝트 | 165/165 |
| 최종 트리 재검증(클래스 1개 정리 후) | 관련 Jest 33/33, lint, tsc, build, explore·smoke E2E 75/75 |

- E2E가 새로 확인하는 것: 탭 없음, 열 때 `/api/sheet/public` 요청 1회(650ms 대기 후), 카테고리·검색어 조건이 함께 유지,
  320px·모바일·가로·데스크톱·CSS 200%에서 가로 넘침 없음, 키보드로 첫 카드 도달·열기, 수정키 클릭은 새 탭.
- 발견·수정: WebKit(데스크톱·Mobile Safari) CSS 200% 확대에서 flex 안 `<input type="search">`가 고유 폭을 유지해
  문서 폭 1440→2153px. 감싸는 칸이 폭을 정하고 입력창은 `w-full`로 바꾼 뒤 1440px.
- 로컬 서버를 다른 `NEXTAUTH_SECRET`으로 띄우면 `library-states-responsive`가 세션 쿠키 검증에 실패한다(환경 문제, 코드 무관).

## 미검증

- 운영 데이터(카테고리 다수, 같은 이름 카테고리 여러 개)에서의 드롭다운 모양. 운영 확인은 병합·배포 후.
- 실기기.
