# After the Last Word — 새 포스터 공개 배포

Date: 2026-11-06

## Authorization and result

사용자 요청: “공개용 챗지피티 사이트로 배포”.
[검증된 새 포스터 HTML](2026-11-06-after-the-last-word-poster.md)을 기존 Site에 공개 버전2로 배포했다.

공개 URL: <https://after-the-last-word-quintet.surroundyou.chatgpt.site>

| 항목 | 확인 값 |
|---|---|
| Site | `appgprj_6aeda65d311481919332192f350e1585` |
| audience / role | `get_site`: public / owner |
| version | 2 |
| saved version | `appgprj_6aeda65d311481919332192f350e1585~appgver_bed3d11e59e0819181f4bdd191051c08` |
| deployment | `appgdep_6aedce89107881918262f49a1a1cb53c` |
| status | succeeded; failure_message=null |
| Site source commit | `48d6244bfd87c3c8d340a94c94c11f95c25827d2` |
| archive content hash | `sha256:9a82ce4d08d284a5cd905f014790df7d4056ca17a70a87d32537a616b510f579` |

Site의 기존 identity·public audience를 유지했다. 새 Site를 만들지 않았다.
소스 checkout은 Git 제외 `local-test-data/results/after-the-last-word/sites/after-the-last-word-public/`이며,
manifest `.openai/hosting.json`의 static.directory는 `dist`다.
Sites helper로 열기 → 검증된 HTML을 `dist/index.html`로 복사 → source push/package → save version → deploy를 수행했다.
토큰은 메모리와 숨겨진 stdin으로만 전달했다. 일반 sandbox의 소스 연결은 DNS 제한으로 실패했고,
승인된 네트워크 실행으로 같은 helper·Site를 재사용했다.

## Verification

- 읽기 전담 에이전트가 공개 전 최종 HTML15,553,709bytes와 SHA256
  `e8c91fb508b471f283c1d7edaaebe976723c189ae6d33c6f6b7a569d387e89a0`을 확인했다.
- 원곡 MP3는11,617,581bytes이며 SHA256
  `2fef77409397ea62a81d5b8d6de4839d303e2f1500b6cb5e04c62ad811cab413`로 원본과 일치했다.
  실제4,993개 이벤트·3개 inline script·종료 수정이 보존됐고 외부 asset 태그·개인 경로는 없었다.
- 저장소의 `dist/index.html`은 검증된 원곡 내장 HTML과 바이트 단위로 동일하다.
- 쿠키/인증 헤더 없이 공개 URL을 요청해 HTTP200, text/html을 확인했다.
  User-Agent는 `ClairKeys-publication-check/1.0`이다.
- 공개 응답15,554,823bytes는 호스팅 추가 코드 때문에 원본 전체 SHA와 다르다.
  실제 앱의3개 script와 CSS는 원본과 동일하며 내장 MP3도 그 script에 포함된다.
- 실제 Ego Chromium 공개 페이지에서 원곡 연결·재생을 확인했다.
  duration363초,1배속, audioTime=animationTime=1.027738초, mediaError=null, events4993.
- 조작기로252초 드럼 솔로에 이동했다.252.014826초/169마디/독립드럼솔로1단계였으며
  테너·피아노·베이스·콩가는 모두 playing=false였다. 공개 화면을 캡처하여 새 포스터 스타일을 확인했다.
- 검수용 브라우저를 종료했다. Codex 패널의 공개 URL 열기 요청은 queued로 반환됐다.

기계 기록은 산출물 `local-test-data/results/after-the-last-word-poster/qa/`의
`public-poster-deployment.json`, `public-poster-http.json`, `public-poster-browser.json`, `public-poster.png`에 있다.
[이전 Site 버전1](2026-11-06-after-the-last-word-public-site.md)은 역사 기록으로 보존한다.

## Limits

이번 공개 URL에서는 익명 접근·재생 시작·탐색 smoke를 확인했다.
원본 HTML과 음악 코드가 동일하므로 전체 연속 재생·종료 회귀·관절·반응형 검사는
[로컬 검증](2026-11-06-after-the-last-word-poster.md)을 근거로 한다.
공개 URL에서363초 전체 재생을 반복했다거나 사람의 청취 평가를 했다고 주장하지 않는다.
ClairKeys 앱·DB 변경은 없으며 main에는 사실 상태 문서만 반영한다.
