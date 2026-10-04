# Current Handoff

Last updated: 2026-10-03 KST

현재 상태·다음 행동·제약·근거 링크만 둔다(AGENTS). 2026-09-28 정리 전 본문: `git show 700f540:docs/recovery/HANDOFF.md`.

## Current phase

**#208 초보자 학습 영역(`배우기`) — L-1(#210) 완료([PR216](reviews/PR-216.md) 병합 2026-10-04), L-2(#211) 완료([PR218](reviews/PR-218.md) 병합 2026-10-04), L-3(#212) 완료([PR219](reviews/PR-219.md) 병합 2026-10-04), L-4a(#213 첫 PR) 완료([PR220](reviews/PR-220.md) 병합 2026-10-04), L-5(#214) 완료([PR221](reviews/PR-221.md) 병합 2026-10-04), L-4b(#213 둘째 PR) 구현 중.**
계획과 단계 상태는 [phase](phases/LEARN-beginner-learning.md), 결정은 D-094. 남은 단계 #211(L-2)·#212(L-3)·#213(L-4)·#214(L-5)·#215(L-6).

최근 완료(상세는 각 리뷰 로그): LEARN L-5 PR221, L-4a PR220, L-3 PR219, L-2 PR218, L-1 PR216(D-094), 감사 게이트 PR217(D-095), CI 신뢰성 PR206·207(Post-merge PASS), #188 콘솔 로그 PR205(D-093), #187 탐색 API 지연 PR203·204(D-092, 이슈 종료), #197 탐색 한 화면 PR202(D-091), #186 빠르기 표시 위치 PR201(D-090), #185 첫 재생 샘플 로딩 PR200(D-089), 작업 규약 중복 정리 PR199(D-088), CI 중복 실행 제거 PR198(D-087), 운영 사이트 점검 후속 PR189·196·190·193·191·192·194·195(2026-09-27~28, D-080~D-086,
[validation](validation/) `2026-09-27-*`), #177 PR183·PR184(2026-09-22), UI 일관성 PR182, #178 PR179~181(D-076·D-077),
#125 PR173·175(D-075), DB 문서 PR174·176.

## Next action

- #213(L-4): L-4a 음높이는 [PR220](reviews/PR-220.md) 병합(`5d54bec`, 사용자의 사전 병합 허용 — 그 허용은 PR220 하나였고 소진됐다).
  L-4b 길이·박자는 L-5 PR 뒤에 `codex/learn-4b-reading-rhythm`에서 시작하고 그때 `reading`의 `available`을 켠다. 새 학습 페이지 E2E는 PR 전에 Firefox로도 돌린다.
- #213 L-4b(길이·박자): 브랜치 `codex/learn-4b-reading-rhythm` 착수. 구현이 끝나면 main(L-5 포함)을 병합하고 `reading`의 `available`을 켠다. 이 PR이 #213을 닫는다.
- Codex 주간 한도 25% 미만 경고(2026-10-04)에 대해 사용자가 "한도는 여유있다"고 확인했다. L-4b·L-6을 이어서 진행한다.
- 이슈 [#222](https://github.com/landfill/ClairKeys/issues/222): `console-quiet.spec.ts:40`이 CI에서 세 번 연속 첫 시도 실패 후 재시도 통과. 원인 가설(서비스 워커 미차단)은 미확인.
- 그 뒤 #215(L-6, 선행 L-2·L-4·L-5).
- #185는 PR200 본문의 `Closes #185`로 병합 시 자동 종료됐다. 검증 근거 코멘트는 아직 달지 않았다(사용자 결정).
- 후속 후보: 데모 출처 경고(`DemoProvenanceNotice`)도 재생 중 `fixed top-2`라 회전 화면에서 같은 방식으로 레인을 가릴 수 있다(데모 악보만).
- 후속 후보(#187 밖): cold 요청의 서버 계측 밖 기동 시간 약 2.1s, 홈 로드 때 나가는 `/api/auth/signin?callbackUrl=%2Fupload`.
- 추천 다음 작업 [#121](https://github.com/landfill/ClairKeys/issues/121) OMR 운영 관측(D-093에서 구조화 로그를 여기로 넘겼다).
- 사용자 판단 필요: OAuth client secret이 과거 Vercel 로그에 남았을 수 있다(`/api/categories` POST가 호출된 경우, 코드는 2025-08-05부터).
  secret 교체 여부는 사용자가 정한다.
- 사용자 결정 대기: 홈 샘플을 실제 재생기로 바꿀지(2026-08-30 정적 예시 결정과 충돌해 보류).
- 실기기 미검증: 실제 MIDI 피아노·Chrome MIDI 권한 팝업, 로그인 상태 운영 연습 기록 쓰기, 클릭·반주 청취 레벨.
- 후속 후보: 탐색 인기 순위(D-080), 재생 중(압축 바) 손·메트로놈·기다리기 토글, `PracticeSession` FK CASCADE migration
  (운영 DB 작업), 계정 삭제 시 기록 처리, Prisma `engineType="client"`+adapter-pg로 네이티브 엔진 제거(DB 접근 전반 회귀 검증 필요).

## Known blockers / constraints

- 새 PR 병합과 운영 배포는 각각 명시적 승인이 필요하다. 과거 승인을 새 범위로 확대하지 않는다.
- LEARN 트랙(#208) 작업 방식(사용자 지시 2026-10-03): 구현 Codex `gpt-6.1-sol`, 리뷰 Codex `gpt-6-astra` reasoning `high`,
  Claude는 오케스트레이션만 한다. 앞으로 할 작업은 GitHub 이슈로 등록하고, 이슈 등록만으로 PR을 만들지 않는다.
  워커는 백그라운드가 아니라 Orca 새 터미널에서 띄워 사용자가 볼 수 있게 한다(대화형 `codex --model <m> -s <mode> -a never`,
  지시문은 파일로 두고 경로만 보낸다). 워커 샌드박스는 포트·`.git` 쓰기를 못 하므로 E2E·fetch는 오케스트레이터가 한다.
- 운영 DB: index migration `20260901060000` 미적용([PR173 리뷰](reviews/PR-173.md)). `PracticeSession` FK 변경도 운영 DB 작업이다.
- 운영에 비공개 악보가 없어 비공개 차단은 로컬 실제 DB로만 검증했다. 비공개 악보가 생기면 운영에서 404를 확인한다.
- Storage의 public animation URL 의존성은 현행 코드 제약이다. 비공개 JSON 보호는 후속 코드 수정이 필요하다.
- Vercel에 이미 누적된 배포 저장량 정리(보존 정책·삭제)는 사용자가 직접 한다(#178).
- #134 판단은 원본 기준표 평가(phase 완료 조건)로 한다. 사용자는 악보를 읽지 않고 청취로 오류를 구분하기 어렵다.
  청취를 완료 조건이나 대기 항목으로 두지 않는다. 앱 재변환은 선택 확인이다.
- D-049 / D-052: exported XML/JSON에 점·타이·음표를 임의로 보충하지 않는다.
- 원본 PDF·이미지 포함 OMR은 Git에 넣지 않는다. 실험 산출물은 Git 제외 `local-test-data/results/`에 있다.
- OMR 운영: PR173 `70eb25e`, image `afa17972…`, 롤백 `d915599b…`, 외부 health 포트 **3000**
  ([근거](validation/2026-09-20-issue-125-vm-evidence.json)). VM `/data/analysis/pr159-*`·`pr161-*`·`pr162-*`와 `/tmp` 빌드 로그가
  남아 있다. 회수와 원격 root 전체 삭제를 묶은 명령은 자동 승인 검사에서 거부된 이력이 있다.
- 로컬 OMR 검증: Docker 이미지 `d064`~`d073d-patched` 보존 목록과 정리 내역은
  [기록](validation/2026-09-20-d073-cross-system-tie-deployment.md). 컨테이너 5GB/JVM 3GB/악보 처리 JVM 1개, 비ASCII 파일명은
  ASCII 사본으로 처리. 그래프 덤프 도구는 `local-test-data/results/issue134-onsets-2026-09-15/dump_region.py`.
- 로컬 Docker DB 볼륨 `aa17603f09e8…`(#125 검증용)은 보존한다. 컨테이너는 2026-09-24 삭제했다.

## Other tracks / evidence index

| 작업 | 재개 조건·근거 |
|---|---|
| OMR 인식 품질 #134 | [phase](phases/ISSUE-134-recognition-quality.md), 배포 이력 `validation/2026-09-1*-d06*-deployment.md`·`2026-09-20-d073-*` |
| OMR page/scale | [OMR-Q2](phases/OMR-Q2-page-scale.md): 400dpi 한 입력 개선만 입증. 정상 악보·fallback 검증 전 전역 정책 도입 금지 |
| OMR 운영 관측 | [#121](https://github.com/landfill/ClairKeys/issues/121) OPEN, 미착수 |
| 운지 #130 | [phase](phases/ISSUE-130-fingering-corpus-and-reach.md): 사용자 현재 상태 수용으로 종료; 추가 모델 작업 NOT_PLANNED |
| 영속 OMR 큐 | [P1-B](phases/P1-B-durable-omr.md), [로드맵](ROADMAP.md): NOT_STARTED |
| UI #146 완료 한계 | [PR158](reviews/PR-158.md): 실기기 터치·가로 화면·브라우저 zoom·스크린리더·대비 계측·실제 로그인 미검증 |
| 전체 계획·결정 | [ROADMAP](ROADMAP.md), [DECISIONS](DECISIONS.md) |
| 검증·리뷰 상세 | [validation](validation/), [reviews](reviews/) — 해당 작업 파일만 선택해서 읽기 |
| 이전 인계 이력 | [2026-09-13 보존본](validation/2026-09-13-handoff-history.md), 2026-09-28 정리 전 본문은 `git show 700f540:docs/recovery/HANDOFF.md` |
