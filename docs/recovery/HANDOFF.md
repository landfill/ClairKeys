# Current Handoff

Last updated: 2026-09-16 KST

## Current phase

문서 규약 최적화는 PR160 `d7bfbc8`로 병합됐다. [검토·병합 기록](reviews/PR-160.md).

**[#134 인식 품질 개선](phases/ISSUE-134-recognition-quality.md) — IN_PROGRESS.**
시작 템포 수정은 운영 반영됐다. 줄 위 3도 점 누락 수정 [PR161](reviews/PR-161.md)(D-062, `34f9e7e`)은
2026-09-14 배포돼 운영 스모크에서 Clair 153/191을 확인했다. 타이 기전 B 수정 [PR162](reviews/PR-162.md)(D-063, `0a22d2f`)는
2026-09-15 배포돼 운영 스모크에서 타이 29/43을 확인했다. 다른 화음 사이 점 수정 [PR163](reviews/PR-163.md)(D-064, `0e3dc61`)은
2026-09-15 배포됐고 사용자의 앱 재변환 결과가 로컬 검증 결과와 같음을 확인했다. 나머지 타이·리듬 오류는 남아 있다.
최근 완료: UI 개편 #146 ([phase](phases/ISSUE-146-ui-renewal.md), [PR158](reviews/PR-158.md)).
PR·브랜치의 현재 상태는 GitHub와 해당 리뷰 로그에서 확인한다.

## Next action

1. **D-065 검증 5~8단계 이어서 실행**: 브랜치 `codex/issue-134-m9-beam-extension` `362a00f`(push 전).
   2026-09-16에 1~4단계는 통과했다(빌드·이미지 테스트 179 OK/skip 0). fixture 판별 6회, Clair 3회, corpus 12곡, 시간 측정이 남았다.
   [기록](validation/2026-09-16-issue-134-m9-beam-stage-trace.md), 지시서는 Git 제외
   `local-test-data/results/issue134-beams-2026-09-16/codex-verification/PROMPT.md`.
   코드 리뷰 우려 1건(끝 seed 미검출 정상 빔을 잘못 자를 수 있음)은 corpus 결과로 판단한다. 그 뒤 PR을 만든다.
2. **남은 기전**: C m5 빈 머리 → 셋잇단, B 2도 반대편 머리 누락은 같은 방식으로 단계 추적이 필요하다.
   E m3 둘잇단 미지원은 범위가 커서 보류 후보. D-064(PR163 `0e3dc61`)는 병합·배포·운영 확인까지 끝났다.
3. **남은 타이**: 기전 A(오선 접선 purge) 3건, m12 X자 교차 1건, 시스템 경계 오연결 5, slur 오분류 1, 선행 리듬 연쇄 4.

## Latest verified result

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

- 2026-09-15: PR160–PR163 작업 브랜치는 로컬·원격 tip 모두 main 대비 고유 커밋 0을 확인하고
  사용자 지시("굳이 필요없다면 버릴것")로 원격 → 로컬 순서로 삭제했다.
  사용자의 미커밋 이력 메모(`validation/2026-09-13-handoff-history.md`)는 손대지 않고 그대로 둔다.

- 로컬 Docker 이미지 `clairkeys-omr:stock-main`·`dot-link`·`d063-patched`는 검증용이다. 운영 이미지와 같다고 주장하지 않는다.
  `d063-patched`(`7cb6700d…`)는 현재 운영(PR162)과 Clair MusicXML이 메타데이터를 빼면 같아 다음 엔진 실험의 기준선으로 쓸 수 있다.
  `d064-patched`는 D-064 브랜치 `deb3708`의 Dockerfile 빌드로, 점 클래스 해시가 현재 운영(PR163)과 같다. `d064-exp`는 클래스 교체 실험 이미지다.
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
