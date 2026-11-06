# After the Last Word — 단일 HTML 5중주 애니메이션

Date: 2026-11-06

## Scope and artifacts

사용자가 붙여넣은 전체 애니메이션 프롬프트를 실행했다.
[원곡 제작·검증](2026-11-06-after-the-last-word-quintet.md)의 240마디·360초 녹음과 실제 노트 이벤트를 재사용했다.
앱·운영 페이지·배포는 변경하지 않았다. `main` `13966f2`에서 `codex/music-quintet-animation`으로 분기했다.
산출물은 Git 제외 `local-test-data/results/after-the-last-word/animation/`에 있다.

- `after-the-last-word.html`: 원곡 MP3와 이벤트·CSS·JavaScript를 내장한 단일파일.
- `after-the-last-word-silent.html`: 동일한 전체 동작의 무음 기본버전, 로컬 오디오 연결 지원.
- `player.template.html`, `event-data.js`, `build_events.py`, `build_html.py`: 완전한 원본과 재현 스크립트.
- `Run-notes.txt`: 실행·음악/모션 매핑·검증·한계.
- `qa/final-desktop.png`, `qa/final-mobile.png`: 최종 시각 확인.
- `qa/independent-review.md`, `qa/*.json`: 독립 리뷰와 기계 검증 원본.

## Implementation

Canvas의 평면 색면·실루엣·고정 질감과 시스템 글꼴만 사용했다.
다섯 연주자·각 악기·무대·조명은 전부 코드로 그린다. 외부 이미지·영상·폰트·CDN은 없다.
피아노 두 보표를 한 인물의 양손으로 묶고, 콩가 슬랩 대체 MIDI도 화면에서는 두 콩가로 표현한다.

- 원곡의4,993개 이벤트를 시작/끝/음높이/velocity 변경 없이 내장.
- 드럼은 두 손/오른발 킥/왼발 페달HH로 분리, 지정 파라디들과 RRLL을 반영.
- 무음은 절대 `performance.now()`, 오디오는 `audio.currentTime`을 기준으로 사용.
- 임의 탐색 시 절대시각으로 자세를 복원하며, 지난 타격을 한꺼번에 실행하지 않음.
- 긴 피아노 음은 MIDI 릴리스까지 키를 누르고, 베이스 왼손도 음이 끝난 뒤 다음 위치로 이동.
- 색소폰은 짧은 MIDI gate 사이에서 악기 전체를 즉시 내리지 않도록 자세 envelope를 사용.
- 구간 조명과 카메라는 완만하게 전환. 드럼 solo 종료 전 전체 구도로 복귀.
- 쉬는 인물은 호흡/듣기 자세만 유지. 타격·발음은 실제 이벤트로 제한.
- 800px 이하에서는 인물을 두 단에 재배치. 조작기는 무대와 분리.
- 인물을 별도 Canvas에 그린 뒤 전체를 합성하여, 약한 조명에서 팔/몸통이 서로 비쳐 보이던 문제를 수정.

## Validation executed

| 검사 | 결과 |
|---|---|
| `python3 animation/build_events.py` | 원본 이벤트 보존·팔다리 중복·쉼·복귀·종지26개 검사 통과 |
| `python3 animation/build_html.py` | 내장 오디오형/무음형 단일 HTML 생성 |
| inline script의 Node 구문 검사 | PASS |
| Ego브라우저 `file://` 실행 | 두 파일 모두 외부 서버 없이 실행 |
| `qa/state-checks.js` 실제 브라우저 실행 |17개 검사 모두 통과 |
| 재생·일시정지·구간선택·키보드 탐색·카메라 고정 | 실제 조작 통과 |
| 로컬 원곡 파일 선택·300초로 탐색 | media/animation clock 차이0초, LOCAL AUDIO 구분 |
| 48초 발췌 파일 선택 | 길이 불일치 경고가 재생 성공 후에도 유지됨 |
|1440×900,768×1024,390×844 화면 | 가로 넘침 없음,5인 식별·조작기44px 확인 |
| 최종 PNG 시각 검수 | 인물·악기 접촉, 그룹투명도, 총보 구간 정보와 모바일 재배치 확인 |

상세는 산출물의 `event-audit.json`, `qa/browser-state-validation.json`,
`qa/browser-controls-validation.json`, `qa/responsive-performance.json`에 있다.

핵심 경계:

- 구간 시작0/12/60/108/156/204/252/300/348/360초.
- 트레이딩204–252초는 tenor/drums/piano/drums/congas/drums/congas/drums 순서,각6초.
-252–300초에서드럼외4명은발음/타격이없다.
-300.000초 리듬섹션 복귀,300.225초 테너진입.
-358.500초 공동종지,359.250초 릴리스/댐프.
-1,890개 타악손 타격의 목표접촉점 일치. 카메라·탐색 프레임은 동일시각에 재현된다.
- 실제 음표 보존과시계일치는 확인했지만, 실제운지/모든 관절 움직임의실연 정확도를 주장하지 않는다.

## Independent review and fixes

이벤트 워커는 `build_events.py`·`event-data.js`·`event-audit.json`만 작성했고,
부모가 Canvas·HTML·오디오 조작을 구현했다. 같은 워커가 읽기전용 독립 검토를 수행했다.

| 지적 | 처리/회귀 근거 |
|---|---|
|피아노가긴음끝전에손을뗌|heldHand로음끝까지유지,358.74–359.249초양손키접촉검사통과|
|색소폰이짧은gate마다8px하강|자세envelope,짧은gate의최대중간변위0.362px확인|
|페달타격때발이위로뜸|공격시페달쪽으로내려가도록방향수정|
|고립타격의높이에velocity미반영|준비/반동에도세기적용|
|임의오디오를ORIGINAL로표시|LOCAL AUDIO표시분리|
|오래된playPromise가무음전환뒤상태를변경|requesttoken/mode검사,실패fixture재현뒤수정통과|
|길이경고가재생성공메시지에덮임|mediaNotice로검사통합,48초파일브라우저확인|

독립검토에서1,921개드럼솔로시각의타악외침묵도확인했다. 마지막검토시남은actionable지적은없다.

## Limits

- 사용자에게 배포/공개하지 않았다. 로컬 단일 HTML 산출물이다.
- 실제 사람의 청취평가·실연리허설·물리적모바일·Safari/Firefox는 미검증.
- 색소폰 운지·베이스 포지션은 단순화된 시각표현이다.
- 브라우저가비활성/음소거탭의미디어진행을제한할수있음을관측했다.
  장면은복귀후에도실제audio.currentTime을따르므로다른시계로앞서가지않는다.
- 전체재생관측은 아래와 `qa/full-playback.json`에 기록한다. 미디어재생과주관적청취는구분한다.
- 앱코드/설정변경이없어서Jest·tsc·lint·앱E2E는실행하지않았다. 문서링크와상태기록범위만검사한다.

## Final playback and delivery

최종 파일에서 내장 원곡의1배속 전체재생을 확인했다.
오디오와 애니메이션이 모두363초에서종료됐고, `ended=true`, `playing=false`,
`paused=true`, `loop=false`, `error=null`이었다. 마지막상태는240마디AFTERGLOW, 모든악기active=[]였다.
전체재생 관측을 인간의주관적청취평가와 혼동하지 않는다.

## HTML fingerprints

- `after-the-last-word.html`: 15644285 bytes, SHA256 `191c8f79b0cbe50b8a116b0b5ae0dee924a39c2c6f913d305244e98be3687c6d`.
- `after-the-last-word-silent.html`: 154177 bytes, SHA256 `d3ba03dbeda98bceae1ec11cff36ab48ebb0e9e9ea0ff9f319413e42ab714f5a`.
- 내장 원곡 MP3 SHA256 `2fef77409397ea62a81d5b8d6de4839d303e2f1500b6cb5e04c62ad811cab413`. 원본 녹음과 byte 단위 일치.

- 소스/입력/검증 묶음: `After-the-Last-Word-animation-source.zip`, 23952104 bytes, SHA256 `f2b5baaeca34fa0f4dac918701309eb78e5896531513898a48062da96573cc45`.
