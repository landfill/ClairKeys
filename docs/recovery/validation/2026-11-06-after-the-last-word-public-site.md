# After the Last Word — 공개 Site 배포

Date: 2026-11-06

## Authorization and result

사용자의 명시적 요청: “사이트로 배포해 공개”.
[검증된 단일 HTML](2026-11-06-after-the-last-word-animation.md)을 그대로 Sites에 배포했다.
ClairKeys 앱·운영 배포·DB는 변경하지 않았다.

공개 URL: <https://after-the-last-word-quintet.surroundyou.chatgpt.site>

| 항목 | 확인 값 |
|---|---|
| Site | `appgprj_6aeda65d311481919332192f350e1585` |
| slug | `after-the-last-word-quintet` |
| audience | `public`, access revision2 |
| saved version | `appgprj_6aeda65d311481919332192f350e1585~appgver_da5baad92c688191a011a2b6459f52a7`, version1 |
| deployment | `appgdep_6aeda6d99a888191bc41602d45b3c6ec` |
| deployment result | `succeeded`, failure_message=null |
| Site source commit | `bb00f688121774234528298de65a842c9d09e88d` |
| source manifest | Git 제외 `local-test-data/results/after-the-last-word/sites/after-the-last-word-public/.openai/hosting.json` |

Site identity는 위 manifest에서 재사용한다. 같은 Site를 다시 생성하지 않는다.
Site 소스 저장소는 ClairKeys Git 저장소와 별도이며, Sites helper로 정확한 소스 commit을 push한 뒤 해당 archive/version을 배포했다.
임시 credential은 메모리와 숨겨진 stdin으로만 전달했고 소스·문서·archive에는 저장하지 않았다.

## Publication

1. 원본 `animation/after-the-last-word.html`을 별도 Site의 `dist/index.html`로 복사했다.
2. `create_site`로 private/unpublished Site를 한 번 생성하고 ID를 즉시 manifest에 기록했다.
3. `site-workflow.mjs`가 소스를 저장·push·package했다. HTML은 기존 SHA와 일치하는지 검사했다.
4. 사용자의 공개 요청에 따라 `update_site_access(public)`를 실행했고 반환값 public/revision2를 확인했다.
5. `save_site_version`으로 version1을 저장한 뒤 `deploy_site_version`의 terminal succeeded와 URL을 확인했다.

## Validation

- 읽기전용 하위 에이전트가 배포 전 HTML·원본오디오 digest,4,993개 이벤트 보존,
  개인경로/비밀키/외부이미지·폰트·스크립트 참조가 없음을 확인했다.
- 원본 HTML15,644,285bytes, SHA256 `191c8f79b0cbe50b8a116b0b5ae0dee924a39c2c6f913d305244e98be3687c6d`.
- 쿠키·인증헤더 없이 공개 URL을 요청하여 HTTP200/text-html을 확인했다.
  요청 User-Agent는 `ClairKeys-publication-check/1.0`이다. Python 기본User-Agent의 별도 요청은403이었다.
  브라우저 접속과 첫 익명 요청은 정상이며, 모든 자동화User-Agent가허용된다고주장하지않는다.
- 공개응답은15,645,399bytes로 호스팅계층의1114문자추가분이 있다. 원문삭제/교체는0문자다.
  따라서 전체응답SHA동일이라고주장하지않는다.
- 실제공연JavaScript·CSS·내장MP3는원본과동일하다.
  MP3 SHA256 `2fef77409397ea62a81d5b8d6de4839d303e2f1500b6cb5e04c62ad811cab413`.
- 공개페이지를Ego브라우저에서열고원곡재생을시작했다.
  duration363초, 재생1.091792초에서audioTime=animationTime,mediaError=null을확인했다.
- 드럼솔로로탐색하여252.007848초/169마디/DRUMS ALONE을확인했다.
  원곡과동일한4,993개이벤트가로드됐고, 다른네연주자는쉬었다. 화면도캡처해확인했다.
- 공개결과탭을사용자에게남기고브라우저검수를종료했다.

상세기계기록/화면은 Git 제외 `local-test-data/results/after-the-last-word/animation/qa/`의
`public-http.json`, `public-content-audit.json`, `public-browser.json`, `public-site.png`에 있다.

## Limits

공개사이트에서는재생시작·탐색smoke확인을했다.363초전체재생은변경없는원본HTML에서통과한
[이전검증](2026-11-06-after-the-last-word-animation.md)을근거로하며,공개URL에서전곡을다시재생했다고기록하지않는다.
사람의주관적청취·실연리허설·물리적모바일·Safari/Firefox검수는미수행이다.
ClairKeys에는상태문서만변경했으므로문서링크/whitespace검사만실행했다.
