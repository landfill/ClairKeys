# Current Handoff

Last updated: 2026-10-09 KST

현재 상태·다음 행동·제약·근거 링크만 둔다(AGENTS). 2026-09-28 정리 전 본문: `git show 700f540:docs/recovery/HANDOFF.md`.

## Current phase

**[#236](https://github.com/landfill/ClairKeys/issues/236) 배우기 영역 화면 구성 개편 진행 중(2026-10-08 착수).** 계측·개편안·단계·완료 조건·비목표의 원본은 이슈 본문이다.
4단계, 단계마다 독립 PR이다: 1 홈 카드·세 구역(A) → 2 레슨 레이아웃(D) → 3 악보 읽기 분리·전환형 패널(B) → 4 용어 사전 찾기·필터(C).
"구현 전 결정" 4개는 사용자가 모두 제안 기본값으로 확정했다(2026-10-08): 악보 읽기를 `/learn/reading`·`/learn/reading/rhythm`으로 분리(단계 지도 5단계),
용어 사전에 화면 안 찾기 입력, 옮겨 가는 앵커 4개는 저장소 안 링크만 수정, 레슨 본문 16px.
1·2는 기존 문서와 달라지므로 해당 단계 PR(3·4)에서 `DECISIONS.md` 신규 결정과 phase 문서를 함께 고친다.
직전 완료 작업(#225~#228 후속): [완료 대조](validation/2026-10-04-learn-followups-completion-audit.md) · [후속 phase](phases/LEARN-followups.md).

## Next action

- #236 1·2·3단계는 병합됐다([PR237](reviews/PR-237.md) `cdfdb7d`, [PR240](reviews/PR-240.md) `abb7cd0`, [PR241](reviews/PR-241.md) `3925182`, [phase 진행](phases/LEARN-236-layout.md), D-099).
  **4단계는 시작하지 않았다. 사용자의 최신 지시는 "241 병합 후 대기"(2026-10-09)다. 사용자가 4단계를 지시하면 시작한다.**
  4단계(이슈 C: 용어 사전 찾기·필터·조밀한 배치, 레슨 본문의 용어 링크)는 최신 main의 `codex/learn-236-glossary`에서 한다. 구현 지시문 `stage4-brief.md`는 작성돼 있다(3단계 브랜치 코드를 보고 썼다. 착수 전에 main과 어긋난 곳이 없는지 훑어본다).
  4단계 PR에는 `DECISIONS.md` 신규 결정(용어 사전에 화면 안 찾기 입력, #225 범위의 "별도 검색 없음"과 달라짐)과 `phases/LEARN-followups.md` 수정을 함께 넣는다. 4단계 PR의 병합은 새로 승인받는다.
  4단계가 병합되면 이슈 #236의 완료 조건을 항목별로 대조한 기록을 `validation/`에 남기고 이슈 종료 여부를 사용자에게 묻는다.
  기록 시점에 PR243·PR241 병합 커밋의 Post-merge checks가 실행·대기 중이었다. 결과는 각 리뷰 로그와 GitHub live state로 확인한다.
  단계별 PR은 사용자 승인 뒤에만 병합하고, 병합되지 않은 브랜치 위에 다음 단계를 쌓지 않는다.
  완료 조건 변경(사용자 결정 2026-10-09, 이슈 본문 반영): "링크·버튼 44×44px"에서 학습용 피아노의 **검은 건반 폭**(26×113px)은 예외다. 건반의 크기·배치는 바꾸지 않는다. 높이 기준은 유지한다.
  지시문·진행 메모는 git 제외 `local-test-data/results/learn-236/`(`orchestrator-prompt.md`, `next-session-prompt.md`, `stage<N>-brief.md`, `stage<N>-fix<M>.md`, `stage<N>-review-brief.md`, `progress.md`, 계측 `measure.mjs`).
- E2E job 제한은 45분이다([#242](https://github.com/landfill/ClairKeys/issues/242) 종료, [PR243](reviews/PR-243.md) `2f7d9ac`). 스위트는 1269개(프로젝트당 253개 × 6, 한 worker)이고 최근 실행은 28~33분이다. 4단계가 더 늘린다.
  45분에 가까워지면 제한을 다시 올리지 말고 프로젝트별 matrix로 나눈다(후속 후보, 이슈 미등록). 취소된 실행은 실패한 테스트 이름을 남기지 않는다. 점 리포터의 순번을 `npx playwright test --list --project=chromium`과 대조해 찾는다.
  라우트나 앵커를 옮긴 뒤에는 변경 영역 spec만이 아니라 **전체 E2E를 로컬에서 Chromium·Firefox로** 돌린다(약 2분, 5 workers). PR241에서 범위 밖 spec 하나를 놓쳐 CI에서 실패했다.
- #238(`Security Audit` 실패)은 [PR239](reviews/PR-239.md) `0374a2e`로 해소됐다. `next` 15.5.25의 moderate 권고 2건은 올리지 않고 남겼다(15.5.27이 고정 버전 밖).
- PR231 Post-merge의 Mobile Safari 내 악보 빈 카드 측정 flaky는 별도 후속 후보([리뷰 로그](reviews/PR-231.md)).
- [#121](https://github.com/landfill/ClairKeys/issues/121) OMR 운영 관측은 사용자가 보류했다(2026-10-04, 다른 이슈 먼저). 재개 지시 전에는 시작하지 않는다.
  재개 시 이슈 본문의 "구현 전 결정"(수집 도구, `/metrics` 노출, 로그 보존, 경보 수신 경로)을 먼저 정한다.
- LEARN이 남긴 제약: 터치 재생 전 요소 수 합계가 기준과 같다(27). 재생 화면에 요소를 더하려면 다른 것을 빼야 한다(D-094 6항, `e2e/playback-element-count.spec.ts`).
  실기기 터치·회전, 실제 MIDI, 청취, 스크린리더는 미검증이다. 운영 비공개 원본 보호의 후속 읽기 확인은 아래 근거를 따른다.
- 워커 운영 메모(#236, 사용자 지시 2026-10-08): 구현은 Antigravity CLI `agy --model claude-opus-5-5-high --mode accept-edits`
  (한도에 가까우면 `agy --model gemini-3.8-flash-high --mode accept-edits`, 이 두 모델 밖의 전환 제안은 받지 않는다),
  리뷰는 `codex --model gpt-6.1-sol -c model_reasoning_effort="high" -s read-only -a never`. 둘 다 Orca 새 터미널에 대화형으로 띄우고 쓰지 않으면 닫는다.
  워크트리를 만들지 않고 이 디렉터리에서 브랜치만 바꾼다. 작업 트리를 함께 쓰므로 구현 워커는 한 번에 하나만 띄운다.
  지시문은 파일로 두고 경로만 보낸다. 워커는 커밋하지 않는다. 전체 Jest·`tsc`·lint·Playwright(Chromium + Firefox)·계측·커밋·기록·PR은 오케스트레이터가 한다.
  커밋별 구현 모델은 `reviews/PR-<n>.md`에 남기고, Gemini Flash가 구현한 커밋은 리뷰 지시문에 밝힌다.
  리뷰 지시문 끝에 "지적만 35줄 이내로 다시 출력"을 넣는다(터미널은 마지막 화면만 읽힌다). 브랜치를 바꾼 뒤 `.next/types`를 지운다.
  macOS WebKit은 Tab 포커스 단언이 설정 탓에 실패한다(CI Linux는 통과).
  **Opus 주간 한도 소진(2026-10-09 08:40경, 초기화까지 158시간 표시).** 그때까지 구현은 `gemini-3.8-flash-high`만 가능하다. Gemini Flash는 셸 명령 승인을 묻지 않고 실행했고, 2단계에서 검증으로 여러 번 되돌려 보내야 했다(추측한 값, 틀린 선택자). 지시문에 "추측하지 말고 코드에서 값을 읽어라"와 정확한 파일·줄을 적는다.
  Gemini Flash는 지시문에 없는 `git fetch`(AGENTS의 세션 시작 절차)를 스스로 시도한 적이 있다. 승인 요청을 읽고 거절한 뒤 지시문만 따르게 한다.
  Gemini Flash의 완료 보고서는 실제 코드와 다를 수 있다(3단계: 없는 테스트를 추가했다고 적음, 모델 이름 오기). diff·계측·E2E로 판정한다. 워커는 E2E를 못 돌리므로 새 spec은 전제 오류(스크롤 뒤 뷰포트 좌표, 숨긴 요소에 걸리는 글자 선택자, 앞 단계가 남긴 상태)로 자주 실패한다.
  Playwright `locator.click()`은 Firefox에서 해시 진입 뒤 sticky 요소를 누를 때 스크롤을 움직인다. sticky 목차는 좌표 클릭(`clickAtCenter`)으로 누른다.
  `agy` 첫 실행 관찰(1.3.1, 2026-10-08): `--mode accept-edits`에서 파일 쓰기는 묻지 않고 되지만 **셸 명령은 읽기 명령(`ls`·`cat`·`grep`)까지 매번 승인을 묻는다**
  (1 실행 / 2·3 접두사 단위 항상 허용 / 4 취소). 오케스트레이터가 터미널을 읽어 명령을 확인하고 Enter로 승인해야 진행된다. 승인을 기다리는 동안 워커는 멈춰 있다.
  `npx jest`·`npx tsc`·`npx eslint`는 승인 뒤 정상 실행됐다. `.git` 쓰기와 포트 사용은 지시문에서 금지해 시도하지 않았다(미확인).
  로컬 E2E는 `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`으로 `npm start`를 먼저 띄워야 한다(없으면 Playwright webServer가 120초 뒤 시간 초과).
- #185는 PR200 본문의 `Closes #185`로 병합 시 자동 종료됐다. 검증 근거 코멘트는 아직 달지 않았다(사용자 결정).
- 후속 후보: 데모 출처 경고(`DemoProvenanceNotice`)도 재생 중 `fixed top-2`라 회전 화면에서 같은 방식으로 레인을 가릴 수 있다(데모 악보만).
- 후속 후보(#187 밖): cold 요청의 서버 계측 밖 기동 시간 약 2.1s, 홈 로드 때 나가는 `/api/auth/signin?callbackUrl=%2Fupload`.
- 후속 후보(#229 밖, 이슈 미등록): `src/services/animationEngine.ts`·`src/hooks/useAnimationEngine.ts`는 #229 뒤 자기 테스트에서만 참조되고,
  `src/components/ui/LazyComponent.tsx`는 import하는 곳이 없다([검증](validation/2026-10-04-issue-229-unused-animation-player.md) Gaps).
- 사용자 판단 필요: OAuth client secret이 과거 Vercel 로그에 남았을 수 있다(`/api/categories` POST가 호출된 경우, 코드는 2025-08-05부터).
  secret 교체 여부는 사용자가 정한다.
- 사용자 결정 대기: 홈 샘플을 실제 재생기로 바꿀지(2026-08-30 정적 예시 결정과 충돌해 보류).
- 실기기 미검증: 실제 MIDI 피아노·Chrome MIDI 권한 팝업, 로그인 상태 운영 연습 기록 쓰기, 클릭·반주 청취 레벨.
- 후속 후보: 탐색 인기 순위(D-080), 재생 중(압축 바) 손·메트로놈·기다리기 토글, `PracticeSession` FK CASCADE migration
  (운영 DB 작업), 계정 삭제 시 기록 처리, Prisma `engineType="client"`+adapter-pg로 네이티브 엔진 제거(DB 접근 전반 회귀 검증 필요).

## Known blockers / constraints

- 새 PR 병합과 운영 배포는 각각 명시적 승인이 필요하다. 과거 승인을 새 범위로 확대하지 않는다.
- 앞으로 할 작업은 GitHub 이슈로 등록하고, 이슈 등록만으로 PR을 만들지 않는다(사용자 지시 2026-10-03). Claude는 오케스트레이션만 한다.
- #236 비목표: 재생 화면 수정 금지(D-094), 새 디자인 토큰 금지, 이론 정의·예시 데이터·소리 불변, 레슨 완료·진도 표시 금지(D-098),
  용어 팝오버·새 그림 금지, `/learn`을 `PROTECTED_PATHS`에 넣지 않는다.
- 운영 DB: index migration `20260901060000` 미적용([PR173 리뷰](reviews/PR-173.md)). `PracticeSession` FK 변경도 운영 DB 작업이다.
- 운영 비공개 원본 score의 비로그인 404와 metadata의 기존 403 계약을 읽기 전용으로 확인했다([운영 확인](validation/2026-10-04-issue-226-practice-history.md)).
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
| OMR 운영 관측 | [#121](https://github.com/landfill/ClairKeys/issues/121) OPEN, 미착수, 사용자 보류(2026-10-04). D-093이 구조화 로그를 여기로 넘겼다 |
| 운지 #130 | [phase](phases/ISSUE-130-fingering-corpus-and-reach.md): 사용자 현재 상태 수용으로 종료; 추가 모델 작업 NOT_PLANNED |
| 영속 OMR 큐 | [P1-B](phases/P1-B-durable-omr.md), [로드맵](ROADMAP.md): NOT_STARTED |
| UI #146 완료 한계 | [PR158](reviews/PR-158.md): 실기기 터치·가로 화면·브라우저 zoom·스크린리더·대비 계측·실제 로그인 미검증 |
| 전체 계획·결정 | [ROADMAP](ROADMAP.md), [DECISIONS](DECISIONS.md) |
| 검증·리뷰 상세 | [validation](validation/), [reviews](reviews/) — 해당 작업 파일만 선택해서 읽기 |
| 이전 인계 이력 | [2026-09-13 보존본](validation/2026-09-13-handoff-history.md), 2026-09-28 정리 전 본문은 `git show 700f540:docs/recovery/HANDOFF.md` |
