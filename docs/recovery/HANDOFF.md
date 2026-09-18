# Current Handoff

Last updated: 2026-09-18 KST (저녁)

## Current phase

문서 규약 최적화는 PR160 `d7bfbc8`로 병합됐다. [검토·병합 기록](reviews/PR-160.md).

**[#134 인식 품질 개선](phases/ISSUE-134-recognition-quality.md) — IN_PROGRESS.**
시작 템포 수정은 운영 반영됐다. 줄 위 3도 점 누락 수정 [PR161](reviews/PR-161.md)(D-062, `34f9e7e`)은
2026-09-14 배포돼 운영 스모크에서 Clair 153/191을 확인했다. 타이 기전 B 수정 [PR162](reviews/PR-162.md)(D-063, `0a22d2f`)는
2026-09-15 배포돼 운영 스모크에서 타이 29/43을 확인했다. 다른 화음 사이 점 수정 [PR163](reviews/PR-163.md)(D-064, `0e3dc61`)은
2026-09-15 배포됐고 사용자의 앱 재변환 결과가 로컬 검증 결과와 같음을 확인했다.
m9 빔 복원 [PR164](reviews/PR-164.md)(D-065, `bbcc09b`)는 2026-09-18 배포됐고 사용자의 앱 재변환 결과가
로컬 검증 결과와 전 필드 같음을 확인했다. 2도 밀린 머리 보존 [PR165](reviews/PR-165.md)(D-066, `f5be5f9`)는
같은 날 병합·배포됐고 사용자의 앱 재변환 결과가 로컬 검증 결과와 전 필드 같음을 확인했다.
나머지 타이·리듬 오류는 남아 있다.
최근 완료: UI 개편 #146 ([phase](phases/ISSUE-146-ui-renewal.md), [PR158](reviews/PR-158.md)).
PR·브랜치의 현재 상태는 GitHub와 해당 리뷰 로그에서 확인한다.

## Next action

1. **다음 작업을 고른다. D-066은 배포·운영 확인까지 끝났다.** 잔여 18건(173/191)은 m5 기전 C가 가장 크다.
   후보: 기전 C(음가가 다른 머리끼리의 INCOMPATIBLE 배제, REDUCTION 전역 규칙이라 범위가 넓다),
   m7 C4 음가(onset은 맞고 8분으로 나옴, 점·성부 배정), 기전 E(m3 둘잇단), 남은 타이 14건.
2. **기전 C는 그대로 남아 있다.** 단계 추적은 끝났고 원인은 소스 줄 단위로 확정됐다
   ([기록](validation/2026-09-18-issue-134-m5-empty-head-stage-trace.md)). 잔여 20건은 **m5 13 · m3 4 · m1 2 · m7 1**이다.
   - **기전 C**(m5 첫 화음, 파급 큼): 빈 머리 F4 점2분은 HEADS에서 검출되고 STEMS에서 공유 기둥에 가장 높은 점수(0.998)로
     연결됐다가, `SigReducer.analyzeChords` **317행**의 "한 기둥에서 음가가 다른 머리끼리 INCOMPATIBLE 배제"에 걸려
     ctx-grade가 낮다는 이유로 지워진다(0.899 < 0.943). 그 뒤 SYMBOLS가 남은 잉크를 `TUPLET_THREE`로 읽는다.
     두 성부가 기둥을 공유하는 표기에 대한 예외가 엔진에 **없다**. REDUCTION 전역 규칙이라 범위가 넓다.
   - **기전 B**(m5 둘째 화음·m7, 파급 작음·안전): 2도로 붙어 기둥 반대편에 밀린 F4/C4 머리가
     `SigReducer.pruneStemHeads`에서 `STEM_BOTTOM`인데 headSide가 RIGHT가 아니라는 이유로 간선이 끊기고,
     이어지는 `checkHeads`가 기둥 없는 머리로 지운다. **`checkHeadSide`에는 이미 1~2도 이웃 예외가 있으나
     `checkStemEndingHeads`가 먼저 실행돼 적용될 기회가 없다.** 엔진 자신의 예외를 앞 단계에도 주는 좁은 수정이다.
   - 두 원인은 독립이므로 규약대로 각각 별도 PR이 된다. 어느 것을 먼저 할지 정해야 한다.
3. **후속 후보(우선순위 낮음)**: 기전 E(m3 둘잇단)는 엔진 `Shape`에 `TUPLET_TWO`가 없어 범위가 가장 크다.
   m1의 missing-dot 2건은 타이가 점을 자르는 별개 원인이다.
   D-065 후속(두께로 거부한 후보를 `rawSystemBeams`에 남기지 않기)은 진짜 빔까지 살릴 가능성이 있으나
   BEAMS 단계 범위가 커지고 corpus 12곡 재검증이 필요하다([근거](reviews/PR-164.md)).
4. **남은 타이 14건**: 마디별로 m3 4 · m9 4 · m5·m6·m10·m12·m13·m14 각 1이다.
   원인별로는 기전 A(오선 접선 purge) 3건, m12 X자 교차 1건, 시스템 경계 오연결 5, slur 오분류 1, 선행 리듬 연쇄 4.

## Latest verified result

- **OMR 운영(2026-09-18, 최신)**: PR165 `f5be5f9` 배포 완료. image `4c14123d…`, 롤백 태그 `rollback-pr165-20260918`(`9eef7512…`).
  이미지 테스트 **182 OK / 6 skipped**, 네이티브 6개가 skip 없이 ok.
  `SigReducer.class` 해시가 normal·recovery 양쪽 모두 로컬 검증 빌드(`da3b0721…`)와 같고, 직전 운영은 `e4be8314…`로 기준선과 같다.
  health 200, 무인증 process 401. 사용자의 앱 재변환(22:24 KST) **159음이 로컬 검증 결과와 전 필드 같다**(차이 0건).
  직전 운영 대비 실제 변화는 m5 F4 복원·m7 C4 복원 둘이고, m5 이후 110음이 8분음표 반 개씩 바른 위치로 옮겨졌다
  (전체 65.000 → 65.217초). [배포·확인 근거](validation/2026-09-18-d066-second-interval-deployment.md).
- **D-066 로컬 검증(2026-09-18)**: 전체 빌드 `d066b-patched` 이미지 테스트 182 OK/skip 6.
  새 fixture는 운영 동등 `d065b-patched`에서 FAILED, 패치에서 OK. Clair 171 → **173/191** 3회 동일(raw 해시 동일, m5·m7만 변화),
  타이 29/43·tempo 69 불변, canonical 157 → 159. corpus 비교 가능한 11곡 모두 기준선과 바이트 동일.
  [기록](validation/2026-09-18-issue-134-second-interval-head.md).
- **직전 운영(2026-09-18)**: PR164 `bbcc09b` 배포 완료. image `9eef7512…`, 롤백 태그 `rollback-pr164-20260918`(`2a71ede5…`).
  이미지 테스트 **180 OK / 6 skipped**, 새 빔 네이티브 테스트 2개와 기존 네이티브 3개가 skip 없이 ok.
  `BeamsBuilder.class` 해시가 normal·recovery 양쪽 모두 로컬 검증 빌드(`8d15e1b2…`)와 같다. health 200, 무인증 process 401.
  사용자의 앱 재변환(11:45 KST) 애니메이션 **157음이 로컬 검증 결과와 전 필드 완전히 같다**(차이 0건).
  직전 운영과의 차이는 **m9 하나**다: E3가 8분 4개 → 2개, G3가 2개 → 1개, 뒤 73음이 8분음표 1개씩 균일하게 당겨지고
  전체 길이가 65.435 → 65.000초가 됐다. 음높이·손·staff 변화 0건.
  [배포·확인 근거](validation/2026-09-18-d065-beam-stem-anchor-deployment.md).
- **D-065 2차 독립 검증(2026-09-17) — PASS WITH CONCERNS**: [PR164](reviews/PR-164.md)로 2026-09-18 병합됐다(`bbcc09b`).
  Clair **171/191** 3회 동일(바뀐 마디는 m9뿐, 타이 29/43·tempo 69 불변), corpus 비교 가능한 11곡 모두 D-064와 동일,
  Deborah `events.json` 바이트 동일(`d8b378e3…`), 이미지 테스트 **180 OK/skip 0**, `--no-cache` 빌드 171.24초.
  1차(2026-09-16 재개분)는 Deborah m24에서 슬러가 빔으로 남아 canonical 330개 중 127개가 앞당겨지는 회귀로 **FAIL**이었고,
  자를 수 있는 후보에 두께 조건(D-065 결정 3b, 기준 빔 두께의 0.95)을 두어 해소했다.
  남은 우려는 Medium 3·Low 2건이며 실행된 회귀는 없다. [기록](validation/2026-09-17-issue-134-m9-beam-trim-thickness.md).
- **D-065 로컬 검증(2026-09-16, 진행 중·미배포)**: 실험 이미지에서 Clair 160 → **171/191** 3회 동일(m9 오류 11건 해소, 타이·tempo 불변).
  전체 빌드 `d065-patched` 이미지 테스트 179 OK/skip 0. fixture 판별·corpus 회귀는 남았다.
  [기록](validation/2026-09-16-issue-134-m9-beam-stage-trace.md).
- **OMR 운영(2026-09-15)**: PR163 `0e3dc61` 배포 완료. image `2a71ede5…`, 롤백 태그 `rollback-pr163-20260915`(`f5959ea9…`).
  이미지 테스트 177 OK / 6 skipped, native 점·타이 테스트 3개 skip 없이 ok. 점 클래스 해시가 로컬 검증 빌드와 같다. health 200, 무인증 process 401.
  사용자의 앱 재변환(20:54 KST) 애니메이션 157음이 로컬 검증 결과와 완전히 같고, 직전 운영과는 m7 14음만 다르다
  (C4 점2분 회복, E4 점8분 → 8분, 뒤 12음 0.25박씩 당겨짐). [배포·확인 근거](validation/2026-09-15-d064-cross-chord-dot-deployment.md).
- **D-064 로컬 검증(2026-09-15)**: 전체 Dockerfile 이미지 `d064-patched` 177 OK/skip 0. 새 fixture d063 3/3 실패 → d064 3/3 통과.
  Clair 3회 160/191(m7 onset 5·점 오류 2 해소, 기전 B missing 1 남음), 타이 29/43·tempo 69 불변. corpus 10/12 동일,
  Love는 비결정성, truongca는 양쪽 같은 기존 실패. [기록](validation/2026-09-15-issue-134-cross-chord-dot-head-link.md).
- **OMR 운영(2026-09-15)**: PR162 `0a22d2f` 배포 완료. image `f5959ea9…`, 롤백 태그 `rollback-pr162-20260915`(`71594a4a…`).
  - 이미지 테스트 176 OK / 6 skipped. 네이티브 타이·점 테스트는 skip 없이 ok. health 200, 무인증 process 401.
  - 운영 모듈 스모크: Clair 9/8·**157음**·tempo 69, 원본 이벤트 153/191(불변), 타이 시작 **29/43**(PR161 23), 누락 14, 오검출 2.
    정확한 마디 2·4·8·11·15·16·17(PR161 8·15·16·17). MusicXML은 메타데이터를 빼면 로컬 검증 결과와 같다.
  - [배포·스모크·롤백 근거](validation/2026-09-15-d063-staff-line-tie-deployment.md).
- **D-063 로컬 검증(2026-09-15)**: 전체 Dockerfile 이미지 176 OK/skip 0, fixture stock 0/8 → patched 8/8, Clair 타이 23 → 29/43
  (누락 20 → 14, 오검출·이벤트 153/191 불변). corpus 12개 중 10개 동일. [기록](validation/2026-09-15-issue-134-staff-line-tie-head-link.md).
- **직전 운영(2026-09-14)**: PR161 `34f9e7e` 배포. image `71594a4a…`, 롤백 태그 `rollback-pr161-20260914`(`bd2d5e6e…`).
  - 이미지 테스트 174 OK / 6 skipped. native 줄 위 3도 테스트는 skip 없이 ok다.
  - 외부 health 200, 무인증 process 401.
  - 운영 모듈 스모크: Clair 9/8·163음·tempo 69, 원본 이벤트 **153/191**(PR159 143), missing-dot 12 → 4.
    MusicXML은 메타데이터를 빼면 로컬 패치 결과와 같다.
  - [배포·스모크·롤백 근거](validation/2026-09-14-d062-line-third-dot-deployment.md).
- **점 패치 로컬 비교(PR161)**: 로컬 amd64 이미지로 main과 패치를 PDF 13개에 비교했다.
  - 성공 12개 중 9개는 결과가 같다. 3개(Clair·Première Gymnopédie·달빛 쉬운편곡)는 원본에 있는
    줄 위 3도 점만 늘었다.
  - Clair 원본 이벤트 143 → **153/191**. 패치 엔진은 3회 결과가 같고, 기본 엔진은 143/141로 흔들렸다.
  - 남은 점 오류: m1 RH(타이가 점을 자름), m3 둘잇단, m7 C4 오배정.
  - [검증](validation/2026-09-13-issue-134-dot-head-link.md), [VIP 원인](validation/2026-09-13-issue-134-dot-tie-stages.md).
- **누락 타이 20개**(PR161 운영 스모크에서도 동일): 미검출 10, cross-system 오연결 5, slur 오분류 1, 선행 리듬 오류 파생 4.
  - 미검출 10건은 모두 왼손 렌즈 모양 타이다. A(오선 접선 purge) 3건, B(머리 연결 실패) 7건.
  - B의 곡선 끝은 머리에서 2.2 IL 이상 떨어져 있고, 인식된 타이는 1.1 IL 이내다.
  - [조사](validation/2026-09-14-issue-134-tie-curves.md). 로컬 진단 이미지 `clairkeys-omr:tie-diag`는 로그만 추가한 빌드다.
  [단계별 실험·VIP 로그](validation/2026-09-13-issue-134-dot-tie-stages.md),
  [17마디 기준 비교](validation/2026-09-13-issue-134-residual-timing.md).

## Known blockers / constraints

- 2026-09-18: PR165 병합·배포 후 사용자 지시("브랜치 정리해")로 `codex/issue-134-second-interval-head`를 삭제했다.
  로컬·원격 tip 모두 `9645772`이고 main에 포함됨을 확인한 뒤 원격 → 로컬 순서로 지웠다.
  사용자 미커밋 변경(`validation/2026-09-13-handoff-history.md`)은 손대지 않았다. 현재 작업 브랜치는 없다.
  검증 이미지 `clairkeys-omr:d066b-patched`(`SigReducer.class` `da3b0721…`, 운영과 동등)와
  좁히기 전 `d066-patched`가 이 머신에 추가됐다.
- 2026-09-18: PR164 병합·배포 후 사용자 지시("브랜치 정리")로 `codex/issue-134-m9-beam-extension`을 삭제했다.
  로컬·원격 tip 모두 `c36f26b`이고 main 대비 고유 커밋 0임을 확인한 뒤 원격 → 로컬 순서로 지웠다.
  사용자 미커밋 변경(`validation/2026-09-13-handoff-history.md`)은 손대지 않고 그대로 뒀다. 현재 작업 브랜치는 없다.
  검증 이미지 `clairkeys-omr:{d064-patched, d065-patched, d065b-patched, d065b-codex-verification}`는 이 머신에만 있고,
  2026-09-18 현재 **Docker 데몬이 꺼져 있어** 재검증하려면 먼저 Docker Desktop을 실행해야 한다.

- 2026-09-17: D-065 코드가 2026-09-16에 작업 브랜치가 아니라 **main에 직접 커밋·push**됐다(`362a00f`). 검증 1~4단계만 끝난
  엔진 변경이 기본 브랜치에 남아 있었다. 사용자 결정으로 main에서 revert(`1391c4d`, push 완료)하고 같은 변경을
  `codex/issue-134-m9-beam-extension`에 cherry-pick(`b59ea08`)했다. `git diff 362a00f b59ea08 -- omr-service src`는 비어 있어
  1~4단계 근거는 그대로 유효하다. 운영은 PR163 `0e3dc61`로 변함없고 배포 이미지는 영향받지 않는다.
  D-065는 검증 5~8단계를 마친 뒤 PR로만 main에 돌아온다.

- 2026-09-15: PR160–PR163 작업 브랜치는 로컬·원격 tip 모두 main 대비 고유 커밋 0을 확인하고
  사용자 지시("굳이 필요없다면 버릴것")로 원격 → 로컬 순서로 삭제했다.
  사용자의 미커밋 이력 메모(`validation/2026-09-13-handoff-history.md`)는 손대지 않고 그대로 둔다.

- 로컬 Docker 이미지는 검증용이며 운영 이미지와 같다고 주장하지 않는다. 다만 `d065b-patched`의 `BeamsBuilder.class`(`8d15e1b2…`)는
  2026-09-18 배포된 운영 이미지의 같은 클래스와 해시가 같다. 2026-09-17 디스크 정리로 남은 것은 넷뿐이다:
  `d064-patched`(D-064 브랜치 `deb3708`의 Dockerfile 빌드, 점 클래스 해시가 운영 PR163과 같은 **기준선**,
  `BeamsBuilder.class` `324132f0…`), `d065-patched`(두께 가드 전 D-065, 새 fixture가 FAILED로 판별됨을 보이는 유일한 수단),
  `d065b-patched`(코디네이터 빌드, `8d15e1b2…`), `d065b-codex-verification`(워커 빌드).
  `stock-main`·`dot-link`·`d063-patched`·`d064-exp`·`d065-exp`·`d065-diag`·`tie-link-exp`·`tie-diag`는 삭제했다.
  PR161·PR162 시절 기준선이 다시 필요하면 해당 커밋에서 Dockerfile로 재빌드한다(약 3분).
  그래프 덤프 도구는 Git 제외 `local-test-data/results/issue134-onsets-2026-09-15/dump_region.py`다.
  운영 수치는 PR162까지는 운영 스모크 기록(`pr162-live-pkmvlC`), PR163은 사용자의 앱 재변환 애니메이션 회수본을 근거로 한다.
- #134 판단은 원본 기준표 평가(phase 완료 조건)로 한다. 2026-09-15 사용자는 악보를 읽지 않으며 청취로 이상한 곳을
  구분하기 어렵다고 알렸다. 청취를 완료 조건이나 대기 항목으로 두지 않는다. 앱 재변환은 선택 확인이다.
  PR159 배포 검증은 운영 모듈 스모크이며 웹 업로드→콜백→플레이어 E2E가 아니다.
- D-049 / D-052: exported XML/JSON에 점·타이·음표를 임의로 보충하지 않는다.
  구현 정책 변경은 [DECISIONS](DECISIONS.md)와 phase를 먼저 갱신한다.
- 새 PR 병합 및 운영 배포는 각각 명시적 승인이 필요하다. 과거 실험 승인을 새 범위로 확대하지 않는다.
- 원본 PDF·이미지 포함 OMR은 Git에 넣지 않는다. 로컬 실험 산출물은 Git 제외
  `local-test-data/results/issue134-dots-2026-09-13/`, 점 패치 corpus 비교는
  `local-test-data/results/issue134-dot-link-2026-09-13/`에 있다.
- VM `/data/analysis/pr159-live-R6a7yJ`·`pr161-live-Dvps30`·`pr162-live-pkmvlC`에는 XML/JSON/로그가 남고 PDF·OMR은 삭제됐다.
  VM `/tmp` 빌드·테스트 로그(PR159·PR161·PR162)도 남아 있다. 외부 health 포트는 **3000**이다.
  회수와 원격 root 전체 삭제를 묶은 명령은 자동 승인 검사에서 거부된 이력이 있다.

## Other tracks / evidence index

| 작업 | 재개 조건·근거 |
|---|---|
| OMR page/scale | [OMR-Q2](phases/OMR-Q2-page-scale.md): 400dpi 한 입력 개선만 입증. 정상 악보·fallback 검증 전 전역 정책 도입 금지 |
| 운지 #130 | [phase](phases/ISSUE-130-fingering-corpus-and-reach.md): 사람의 기준 운지 근거를 기다림 |
| 영속 OMR 큐 | [P1-B](phases/P1-B-durable-omr.md), [로드맵](ROADMAP.md): NOT_STARTED |
| UI #146 완료 한계 | [PR158](reviews/PR-158.md): 실기기 터치·가로 화면·브라우저 zoom·스크린리더·대비 계측·실제 로그인 미검증 |
| 전체 계획·결정 | [ROADMAP](ROADMAP.md), [DECISIONS](DECISIONS.md) |
| 검증·리뷰 상세 | [validation](validation/), [reviews](reviews/) — 해당 작업 파일만 선택해서 읽기 |
| 이전 인계 이력 | [본문 보존본](validation/2026-09-13-handoff-history.md) — 과거 상태이며 기본 읽기 대상 아님 |

이 파일은 현재 상태와 재개 지점의 요약이다. 상세 경과는 위 근거 문서에 있다.
