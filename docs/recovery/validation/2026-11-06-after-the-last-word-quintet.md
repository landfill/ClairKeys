# After the Last Word — 별도 240마디 재즈 5중주 제작

Date: 2026-11-06

## Scope

사용자가 제공한 최종 메타프롬프트를 실행한 독립 음악 산출물이다. 앱·OMR·운영 데이터 변경은 없다.
최신 `main` `45ea436`에서 `codex/music-quintet-drum-climax`를 만들고 제작했다.
산출물은 Git 제외 `local-test-data/results/after-the-last-word/`에 있다. 이 문서는 사실·검증 상태 기록이다.

- 테너·한 명의 피아니스트·업라이트 베이스·드럼·두 콩가의 정확히 5명 편성.
- 4/4, 콘서트 B-flat major, quarter=160. 240마디, 음악적 시간360초.
- 경계 1/9/41/73/105/137/169/201/233. 모든 32마디 코러스는 지정 AABA 화성 지도.
- 트레이딩137–168은 테너/드럼/피아노/드럼/콩가/드럼/콩가/드럼의 정확한4마디 교대.
- 169–200은 드럼만 연주. 200큐→201첫박 합주 복귀,240첫박 종지→3박 릴리스.
- 모든 솔로/반주를 실제 음표로 작성. 셰이커·추가 베이스 반주·추가 연주자 없음.

## Sources and outputs

작곡 원본 `source/composition.py`, `source/percussion.py`에서 .ily와 재생 MIDI를 함께 생성한다.
`after-the-last-word.ly`는 모든 include를 갖춘 완전한 진입 소스이며,
`after-the-last-word-standalone.ly`는2183행의 단일 파일 버전이다.
`source/build.py`, `render_audio.py`, `audit_midi.py`, `inspect_pdfs.py` 및 requirements를 함께 제공한다.

| 산출물 | 위치/형식 |
|---|---|
| 콘서트 총보 | `output/pdf/full-score.pdf`, A3,8쪽 |
| 테너·피아노·베이스·드럼·콩가 파트보 | 같은 폴더, 각각5/9/5/7/4쪽 |
| 드럼 솔로 보조 악보 | `output/pdf/drum-solo-foldout.pdf`, A3가로1쪽 |
| 최종 MIDI | `midi/after-the-last-word.mid`, 960PPQ, 실음,360초 |
| 전곡 오디오 | `audio/after-the-last-word.wav` 및 `.mp3`,363초 |
| 드럼 솔로 발췌 | `audio/drum-solo-169-200.wav` 및 `.mp3`,48초 |
| 독립 스템 | `audio/stems/`,5개, 시작/길이/마스터 게인 동일 |
| 상세 검증·설정 | `README-ko.txt`, `qa/*.json`, `qa/independent-audit.md` |

## Executed validation

프로젝트 폴더 기준으로 실행했다. 아래 Python은 해당 산출물 전용 가상환경이다.

| 명령/검사 | 결과 |
|---|---|
| `python source/percussion.py` | 드럼/콩가 각240마디·모든마디4박·교대와쉼·동시 팔다리 조건 통과 |
| `python source/build.py` | 구조/음역/이조/공동종지/스윙/고속타격 등26개 검사 통과 |
| LilyPond2.24.4 `-dno-point-and-click -o output/pdf/ after-the-last-word.ly` | 총보+5파트PDF 및 raw실음MIDI 컴파일 성공 |
| 같은 버전 `drum-solo-foldout.ly` | 독립솔로 보조PDF1쪽 컴파일 성공 |
| `python source/audit_midi.py` | 실제 MIDI와 작성 데이터 대조 등22개 검사 통과 |
| `python source/render_audio.py --soundfont assets/GeneralUser-GS.sf2 --ffmpeg ffmpeg` | 전곡·발췌·5스템 렌더링 성공 |
| `python source/inspect_pdfs.py` 및 `pdftoppm` | 모든PDF페이지를PNG로 변환, 전체축소판과 밀집페이지를 시각 확인 |
| FFmpeg `ebur128=peak=true` | integrated-18.2LUFS, LRA8.6LU, truepeak-1.2dBFS |
| PCM 비교 | 클리핑0, 발췌원본252–300초 샘플일치,5스템합 오차<=4.77e-7 |

- 여섯 보표(피아노2개)의 각240마디, 매마디4박과 구간 경계·지정침묵을 검사했다.
- 원본 LilyPond MIDI의 시작틱/음높이와 모든 작성 음표가 일치한다.
  최종 MIDI의 시작틱/음높이/세기 또한 이벤트 자료와 일치한다. 둘 다360초, 단일160BPM.
- 테너 실음B3–E5, 베이스E1–F3. 테너 기보+장9도/코드+장2도, 베이스 기보+옥타브.
  예시모티브 D4-F4-G4-F4-D4→E5-G5-A5-G5-E5, 코드C6/9·Cmaj9/E를 확인했다.
- 피아노 각손 화음 폭<=옥타브, 같은시점 양손 동일음 중복/교차 없음. 분수화음 베이스D 기준 유지.
- 706개 빠른음/튜플릿 이벤트가 직선 그리드를 유지한다. 일반8분은3:2; 마디/정박은 이동하지 않는다.
- 독립솔로32마디 모두 다르다. 실제타격시점430개/동시발 포함439note-ons,
  16분188개·섹스튜플릿144개·32분56개, 세기44–124, 최단간격46.875ms.
- 피아노화음 음수를 포함한 Note On 총량으로 기교를 비교하지 않았다.
- 총보7쪽은1.4 staff-space 세로압축 경고가 있으나 실제PNG에 잘림/겹침은 없었다.
  강약표시·테너이조·콩가범례·밀집드럼·200큐·201복귀를 확인했다.
- 드럼솔로의 종이 넘김을 피하도록 별도1쪽foldout을 제공한다.
  전체파트보의 모든 종이 넘김을 무휴지로 보장하지는 않는다. 펼친악보/태블릿이 적합하다.

## Rendering and limitations

- 정확한 악보컴파일 버전은 공식portable GNU LilyPond2.24.4(Rosetta실행).
  Homebrew가 설치한2.26.0은 최종컴파일에 사용하지 않았다.
- FluidSynth2.6.1, GeneralUserGS2.0.3, FFmpeg4.4,48kHz stereo PCM24/MP3 256kbps.
- 음원 출처·고정revision·SHA256·라이선스 원문은 `assets/PROVENANCE.md` 및 LICENSE에 있다.
  제작자가 음악제작 사용을 허용한다. 표본 출처에 관한 라이선스 문구도 함께 제공한다.
- 드럼/콩가 GM채널10 공유를 확인했고, 별도5개 synth스템으로 음량·팬을 제어했다.
- 콩가62뮤트/63고음오픈/64저음오픈. 독립슬랩 표본이 없어60하이봉고를 명시적 대체로 쓴다.
  실제악보는 콩가슬랩이며 새연주자나봉고 편성으로 설명하지 않는다.
- 소프트웨어가 구현하지 않은 테너 고급레가토/브레스 표본을 구현했다고 주장하지 않는다.
- 음향상 최고조를 위해 드럼독립솔로 게인1.6배, 템포/음표는 유지.
  마지막 타악note-off 무시 가능성을 고려하여359.25초부터55ms 댐프를 오디오에 적용했다.
- 360초 뒤3초는 예약된 잔향창이며3초내내 소리가 지속된다는 뜻은 아니다.
  발췌는정확히48초이며201의합주나추가잔향을 포함하지 않는다.
- 실제연주자 리허설·인간 청취 평가는 미수행이다. 구조검증과 사람이 느끼는 음악적성취는 구분한다.
- 일반 sandbox의 afplay 첫시도는 `AudioQueueNew failed ('fmt?')`로 실패했다.
  오디오장치 접근을 허용한 재시도 결과는 아래 최종상태에 기록한다.
- 애플리케이션 변경이 없으므로 Jest/tsc/lint/E2E는 작업검증 대상이 아니다.

## Independent agents and corrections

- 환경 탐색: 공식LilyPond2.24.4와GeneralUser음원·라이선스·실제키맵을 확보하고 시험컴파일했다.
- 타악 작곡: `percussion.py` 전담. 정확한교대,32마디솔로5단계,손순서,한계와 자체검증을 회수했다.
- 독립 감사: raw/재생MIDI 이벤트 일치,고속그리드,음역/이조,피아노손배치를 확인했다.
  쉼표로시작하는 마디의 강약누락을 지적하여첫실제음에 붙이도록 수정했다.
  마지막타악댐프 한계도 지적하여렌더링릴리스로 반영했다.

## Final state

음악 산출물과 기술검증 완료. 실제인간청취·실연리허설은 미수행이며 사용자에게 명시한다.
시스템 오디오 접근 재시도로 전곡 MP3의 `afplay` 재생이 종료코드0으로 완료됐다.
이 사실은 인간 청취 평가와 구분한다. `qa/playback-status.json`에 같은 범위가 있다.
전달패키지 SHA는 아래 최종 매니페스트에 기록한다.


## Delivery hashes

- `After-the-Last-Word-complete.zip`: 43456178 bytes, SHA256 `50822b666e671f13e0f134af33ac2f55490c33034589764d6603cfcdfdcd6e15`.
- `After-the-Last-Word-five-stems.zip`: 118333042 bytes, SHA256 `0a601289bdc2213536b0b7a4655db271d58e37b822025b6f960715276511a38d`.
