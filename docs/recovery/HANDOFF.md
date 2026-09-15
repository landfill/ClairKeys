# Current Handoff

Last updated: 2026-09-15 KST

## Current phase

문서 규약 최적화는 PR160 `d7bfbc8`로 병합됐다. [검토·병합 기록](reviews/PR-160.md).

**[#134 인식 품질 개선](phases/ISSUE-134-recognition-quality.md) — IN_PROGRESS.**
시작 템포 수정은 운영 반영됐다. 줄 위 3도 점 누락 수정 [PR161](reviews/PR-161.md)(D-062, `34f9e7e`)도
2026-09-14 OMR VM에 배포됐고, 운영 스모크에서 Clair 153/191을 확인했다. 타이·리듬 오류는 남아 있다.
최근 완료: UI 개편 #146 ([phase](phases/ISSUE-146-ui-renewal.md), [PR158](reviews/PR-158.md)).
PR·브랜치의 현재 상태는 GitHub와 해당 리뷰 로그에서 확인한다.

## Next action

1. **플레이어 청취 확인(사용자)**: 앱에서 재변환한 Clair(job `21171e30…`)를 들어 보고 결과를 기록한다.
2. **타이 "곡선 없음" 10건 — 후보 1 진행 중(2026-09-15 사용자 선택)**: [조사](validation/2026-09-14-issue-134-tie-curves.md)의 기전 B(끝이 오선에 흡수돼 머리 연결 실패 7건)를 겨냥한다.
   - 머리 연결 단계에서 오선 위 곡선 끝을 머리 쪽으로 연장하거나 탐색 범위를 넓힌다. A(purge 3건)·후보 2·3은 이번 범위 밖이다.
   - phase·DECISIONS를 먼저 갱신하고 같은 워크트리의 `codex/issue-134-tie-head-link` 브랜치에서 구현한다.
   - 검증은 사용자 지시에 따라 Codex 워커(`gpt-5.6-sol`, reasoning effort high)가 수행한다.
3. **나머지 누락 타이 10건 조사**: 시스템 경계 오연결 5, slur 오분류 1, 선행 리듬 연쇄 4.
   남은 점 오류(m1 RH 타이가 점을 자름, m3 둘잇단, m7 C4 오배정)는 각각 원인이 다르다.

## Latest verified result

- **OMR 운영(2026-09-14)**: PR161 `34f9e7e` 배포 완료. image `71594a4a…`, 롤백 태그 `rollback-pr161-20260914`(`bd2d5e6e…`).
  - 이미지 테스트 174 OK / 6 skipped. native 줄 위 3도 테스트는 skip 없이 ok다.
  - 외부 health 200, 무인증 process 401.
  - 운영 모듈 스모크: Clair 9/8·163음·tempo 69, 원본 이벤트 **153/191**(PR159 143), missing-dot 12 → 4.
    MusicXML은 메타데이터를 빼면 로컬 패치 결과와 같다.
  - [배포·스모크·롤백 근거](validation/2026-09-14-d062-line-third-dot-deployment.md).
- **직전 운영 기준(PR159 `e5ee7bb`)**: Clair tempo/scoreTempo **69**, 9/8·163음, 원본 이벤트 **143/191**.
  [근거](validation/2026-09-13-d060-opening-tempo-deployment.md).
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

- 2026-09-15: 보존하던 `codex/doc-agent-contract`(PR160)·`codex/issue-134-dot-head-link`(PR161)는
  로컬·원격 tip 모두 main 대비 고유 커밋 0을 확인하고 사용자 지시로 원격 → 로컬 순서로 삭제했다.
  사용자의 미커밋 이력 메모(`validation/2026-09-13-handoff-history.md`)는 손대지 않고 그대로 둔다.

- 로컬 Docker 이미지 `clairkeys-omr:stock-main`·`dot-link`는 검증용이다. 운영 이미지와 같다고 주장하지 않는다.
  운영 수치는 운영 스모크 기록(`pr161-live-Dvps30`)을 근거로 한다.
- #134 완료에는 실제 재변환·플레이어 청취·사용자 확인이 남아 있다.
  PR159 배포 검증은 운영 모듈 스모크이며 웹 업로드→콜백→플레이어 E2E가 아니다.
- D-049 / D-052: exported XML/JSON에 점·타이·음표를 임의로 보충하지 않는다.
  구현 정책 변경은 [DECISIONS](DECISIONS.md)와 phase를 먼저 갱신한다.
- 새 PR 병합 및 운영 배포는 각각 명시적 승인이 필요하다. 과거 실험 승인을 새 범위로 확대하지 않는다.
- 원본 PDF·이미지 포함 OMR은 Git에 넣지 않는다. 로컬 실험 산출물은 Git 제외
  `local-test-data/results/issue134-dots-2026-09-13/`, 점 패치 corpus 비교는
  `local-test-data/results/issue134-dot-link-2026-09-13/`에 있다.
- VM `/data/analysis/pr159-live-R6a7yJ`·`pr161-live-Dvps30`에는 XML/JSON/로그가 남고 PDF·OMR은 삭제됐다.
  VM `/tmp` 빌드·테스트 로그(PR159·PR161)도 남아 있다. 외부 health 포트는 **3000**이다.
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
