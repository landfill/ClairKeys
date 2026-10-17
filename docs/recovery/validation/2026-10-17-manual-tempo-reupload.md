# 세 곡 수동 빠르기 재업로드

Date: 2026-10-17 KST
Scope: 사용자 요청에 따라 기존 100·101·102를 수동 BPM 새 업로드로 교체한다. 제품 코드·배포 변경 없음.

## 빠르기 선택 근거

- 사용자는 원곡 BPM을 조사해 지정하도록 지시했다. 로컬 보관 Toy Story·Totoro PDF 2쪽 전체에 숫자 BPM이 없어 외부 원곡 자료를 조회했다.
- You've Got a Friend in Me: Randy Newman의 Toy Story soundtrack 버전 **4분음표 116 BPM**.
  [Walt Disney Records 음원 판매 메타데이터](https://www.beatport.com/track/youve-got-a-friend-in-me/23301698),
  [동일 soundtrack의 Tunebat](https://tunebat.com/Info/You-ve-Got-a-Friend-in-Me-Randy-Newman/2stkLJ0JNcXkIRDNF3ld6c),
  [Hooktheory](https://www.hooktheory.com/theorytab/view/randy-newman/youve-got-a-friend-in-me)가 116으로 일치한다.
- My Neighbor Totoro: 원곡인 이노우에 아즈미의 엔딩 주제곡 **약 4분음표 129 BPM**.
  [SongBPM 가수별 엔딩 트랙](https://songbpm.com/%40azumi-inoue),
  [KeyTube의 엔딩 주제곡 분석](https://keytube.net/song/detail/9974),
  [원곡 준거 ChordWiki](https://ja.chordwiki.org/wiki/%E3%81%A8%E3%81%AA%E3%82%8A%E3%81%AE%E3%83%88%E3%83%88%E3%83%AD%2B%2B%E7%B0%A1%E5%8D%98ver)에서 129로 교차 확인했다.
  118 BPM인 Sound Book 연주나 140 BPM Main Theme 트랙은 다른 녹음이다.
  [Music Eight의 출판 편곡](https://www.music8.com/products/detail3178.php)은 126이므로 편곡마다 동일한 고정 BPM이라고 주장하지 않는다.
- Always With Me: [앞선 원본 대조](2026-10-17-recent-upload-rhythm-investigation.md)의 점4분음표=43을 지정한다.
  앱 전송 계약은 4분음표 기준 **64.5 BPM**이다. 이 곡은 원곡 녹음 대신 사용자가 수용한 보관 편곡 악보의 명시 표기를 따른다.

## 업로드 실행

- 로그인된 Chrome의 ClairKeys `/upload` 양식으로 보관 원본 PDF 3개를 선택하고 제목·저작자·애니메이션 카테고리를 유지했다.
- Aside가 실행 중이 아니어서 Chrome CUA로 진행했다. 확장 file chooser는 file URL 권한 부족으로 실패해 기본 macOS 파일 선택 창을 사용했다.
  확장 권한을 변경하지 않았다.
- 기존 세 곡은 공개였지만 공개 체크를 유지한 재업로드 제출은 자동 승인 검사에서 거부됐다(재업로드 요청은 공개 게시까지 승인하지 않았다는 사유).
  공개 체크를 해제한 비공개 업로드로 대체했다. 새 세 곡은 비공개다.

| 기존 ID | 새 ID | 곡 | 수동 입력 | 상태 |
|---:|---:|---|---|---|
| 102 | 103 | Always With Me | 점4분음표 43 → 64.5 | completed 확인 |
| 101 | 104 | My Neighbor Totoro | 4분음표 129 | completed 확인 |
| 100 | 105 | You've Got a Friend in Me | 4분음표 116 | completed 확인 |

103·104·105의 운영 artifact `tempoSource=user`, `timingReferenceBpm=64.5/129/116` 및 completed를 확인했다.
104 재생 화면에서도 `♩=129 (직접 입력)`을 확인했고 내 악보에서 새 3곡 모두 연습 가능 링크를 확인했다.
브라우저 도구의 복구 불가능 삭제 규칙에 따라 실행 시점 확인을 요청했고, 사용자가 "기존 세 곡과 연습 기록 2건 삭제"를 명시적으로 승인했다.
2026-10-15 업로드 날짜를 모달마다 대조해 기존 100·101·102를 앱의 영구 삭제 확인 절차로 순차 삭제했다.
기존 100·102의 연습 기록 각 1개(합계 2개)도 삭제됐다. 새 103·104·105는 보존됐다.

## 검증과 한계

- 세션 시작 fetch 성공, main clean, `main..origin/main=0`.
- Supabase 읽기 전용 조회로 기존 대상 3행·연습 기록 수 및 새 103·104·105 상태를 확인했다.
- 수동 빠르기 지정은 OMR의 누락 음표·길이 오류 및 Swing 미지원 자체를 수정하지 않는다.
- 제품 코드 변경이 없어 전체 Jest·tsc·lint·E2E·build는 실행하지 않는다.
- 삭제 확인 화면은 Git 제외 `local-test-data/results/rhythm-2026-10-17/delete-confirmation.png`에 보관했다.
- 저장 animation JSON 3개를 다시 읽고 `tempoSource=user`, `timingReferenceBpm=64.5/129/116` assert PASS.
  새 103·104·105의 음표 수는 647/318/328, 길이는 118.604651/83.837210/78.103449초다.
  기존과 같은 overflow 경고가 남아 있어 리듬 인식 자체가 교정됐다고 표현하지 않는다.
- 편집 Markdown 로컬 링크 29개 존재 확인 PASS, `git diff --check` PASS.

## 삭제 후 최종 확인

- Supabase 읽기 전용 집계: ID 100·101·102의 SheetMusic 0, PracticeSession 0, SheetScoreArtifact 0.
- 새 103·104·105 세 행은 모두 completed·비공개·tempoSource=user, BPM 64.5/129/116을 유지한다.
- 내 악보 목록은 10개에서 7개로 줄었고 새 세 곡의 연습 링크가 남아 있다. 기존 네 곡도 목록에 유지된다.
- 완료 화면은 Git 제외 `local-test-data/results/rhythm-2026-10-17/reupload-completed.png`에 보관했다.
- 기존 Storage JSON 객체의 삭제 여부는 별도 확인하지 않았다. 앱은 DB 삭제 후 파일 삭제를 시도하지만 실패는 비차단 처리한다.
- 제품 코드 변경 없이 교체 요청 완료. 문서 변경의 로컬 링크 29개·diff 검사 PASS.
