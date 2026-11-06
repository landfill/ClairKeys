# After the Last Word — 창 높이에 맞춘 포스터와 컨트롤

Date: 2026-11-06

## Request and change

사용자가 포스터가 너무 커서 컨트롤을 보려면 스크롤해야 한다고 보고했다.
최신 main `05ff232`에서 `codex/music-controls-viewport`를 만들고 독립 HTML을 수정했다.
[기존 포스터](2026-11-06-after-the-last-word-poster.md)와 같은 공개 Site를 버전3으로 업데이트했다.

- `main`을100dvh grid로 구성하여 컨트롤 높이를 먼저 확보한다.
- 포스터는 남은 공간에 비율을 유지하여 맞춘다. 모바일도1120×1600 전체 구도를 contain 처리한다.
- 모바일 판정은 줄어든 canvas 너비가 아니라 viewport media query를 사용한다.
- 버튼·슬라이더44px는 유지하고 컨트롤 여백만 줄였다.
- 설명을 펼쳤을 때 내부 높이를 제한한다. ResizeObserver가 컨트롤 줄바꿈/높이 변경 후 canvas를 갱신한다.

수정 파일은 Git 제외 `local-test-data/results/after-the-last-word-poster/source/`의
`shell.html`, `scene.js`, `controls.js`다. 단일 HTML2개와 ZIP도 다시 생성했다.
ClairKeys 애플리케이션은 변경하지 않았다.

## Reproduction and verification

수정 전 공개1440×800 화면에서 canvas 높이는810px, 페이지 높이는1146px였고,
재생 버튼 bottom877px·하단 버튼 bottom1029.8px로 모두 viewport 밖이었다.
`qa/viewport-fit-check.js`를 먼저 작성해 `allControlsVisible=false`를 확인했다.

| viewport | 수정 후 canvas 높이 | 페이지 높이 | 모든 컨트롤 |
|---|---:|---:|---|
|1440×800|546.20px|800px|보임|
|1366×768|514.20px|768px|보임|
|1024×600|346.20px|600px|보임|
|390×844|439.20px|844px|보임|
|390×667|262.20px|667px|보임|
|844×390|170.20px|390px|보임|

- 실제 Ego Chromium에서6개 viewport의 좌표·가로 넘침·화면을 확인했다. 다섯 인물과 악기 라벨이 잘리지 않는다.
- 설명 펼치기, 오디오 파일 연결, 재생 중1024×600으로 크기 변경도 통과했다.
  재생 중 audioTime=sceneTime=0.570825초이며 canvas backing과CSS 높이가 일치했다.
- 변경한JS2개 `node --check` 통과.
- 원곡 내장 데이터, `music.js`, `Clock` 코드는 이전 공개 버전과 정확히 동일하다.
  음악 전체 검사·관절 검사·363초 연속 재생은 변경 없는 부분의 [기존 근거](2026-11-06-after-the-last-word-poster.md)를 사용한다.
- 공개 버전에서도1440×800을 다시 확인했다. 페이지 높이800px, 마지막 버튼 bottom737px로 스크롤 없이 보였다.
  [공개 화면](2026-11-06-jazz-viewport-fit.png).
- 읽기 전담 에이전트가 너비 기반 canvas 높이의 원인, 모바일 contain 필요성, wrapper 관찰의 feedback 방지를 독립 확인했다.

원본 결과는 산출물 `qa/viewport-before.json`, `viewport-after.json`, `viewport-interactions.json`,
`viewport-content-check.json`, `viewport-public.json` 및 `fit-*.png`에 있다.

## Public deployment

URL: <https://after-the-last-word-quintet.surroundyou.chatgpt.site>

- project: `appgprj_6aeda65d311481919332192f350e1585`, public 유지.
- saved version3: `appgprj_6aeda65d311481919332192f350e1585~appgver_295e1fa3331081918ace8d4d484df3e4`.
- source commit: `5a077fc2b73b8801f20c3273d8f16249c570524e`.
- deployment: `appgdep_6aedd3fd5c4881919c18d18e05d8cff1`, succeeded, failure_message=null.
- HTML SHA256: `f15abea594e85f4467df1b2af65e2a1ba95035b4db3f7bf29345d0e7dbfd9080`.
- source helper로 기존 Site를 열고 정확한HTML을 push/package한 다음 저장 버전만 배포했다.
- 검수 브라우저는 종료했고, 캐시 갱신용 `?v=3` URL 열기를 Codex 패널에 요청했다.

## Limits

실기기·Safari/Firefox·임의의 극단적으로 작은 창이나 확대율은 미검증이다.
작은 창에서는 포스터가 더 작아지며 컨트롤의 읽기/터치 크기를 우선한다.
ClairKeys에는 검증 문서/이미지만 반영하므로 전체 Jest·tsc·앱 E2E는 실행하지 않았다.
