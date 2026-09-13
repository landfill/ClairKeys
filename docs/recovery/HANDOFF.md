# Current Handoff

Last updated: 2026-09-14 KST

## Current phase

문서 규약 최적화는 PR160 `d7bfbc8`로 병합됐다. [검토·병합 기록](reviews/PR-160.md).

**[#134 인식 품질 개선](phases/ISSUE-134-recognition-quality.md) — IN_PROGRESS.**
시작 템포 수정은 운영 반영됐다. 줄 위 3도 점 누락 수정은 [PR161](reviews/PR-161.md)(D-062)로 제출됐다.
타이·리듬 오류는 남아 있다.
최근 완료: UI 개편 #146 ([phase](phases/ISSUE-146-ui-renewal.md), [PR158](reviews/PR-158.md)).
PR·브랜치의 현재 상태는 GitHub와 해당 리뷰 로그에서 확인한다.

## Next action

1. **PR161 리뷰 루프**: 현재 head의 CI·리뷰를 확인하고 [리뷰 로그](reviews/PR-161.md)를 갱신한다.
   병합은 사용자의 명시적 승인 후에만 한다. 운영 VM 배포는 별도 승인이 필요하다.
2. **배포 후 앱 확인**: 같은 PDF를 재업로드하고 플레이어에서 청취한다. 기존 저장 악보는 자동 재변환되지 않는다.
3. **타이 인식 개선**: CURVES 단계의 누락·오분류를 별도 조사한다(점 패치와 분리).

## Latest verified result

- **OMR 운영**: PR159 `e5ee7bb` 배포 완료. Clair 시작 tempo / scoreTempo = **69**,
  9/8·163음. 원본 이벤트 **143/191**, 정확한 마디 8·15·16·17은 이전과 동일하다.
  이미지 테스트 172 OK / 6 skipped, 외부 health 200·무인증 process 401.
  [배포·롤백 근거](validation/2026-09-13-d060-opening-tempo-deployment.md), [PR159](reviews/PR-159.md).
- **점 패치(PR161, 운영 미반영)**: 로컬 amd64 이미지로 main과 패치를 PDF 13개에 비교했다.
  - 성공 12개 중 9개는 결과가 같다. 3개(Clair·Première Gymnopédie·달빛 쉬운편곡)는 원본에 있는
    줄 위 3도 점만 늘었다.
  - Clair 원본 이벤트 143 → **153/191**. 패치 엔진은 3회 결과가 같고, 기본 엔진은 143/141로 흔들렸다.
  - 남은 점 오류: m1 RH(타이가 점을 자름), m3 둘잇단, m7 C4 오배정.
  - [검증](validation/2026-09-13-issue-134-dot-head-link.md), [VIP 원인](validation/2026-09-13-issue-134-dot-tie-stages.md).
- **누락 타이 20개**: 미검출 10, cross-system 오연결 5, slur 오분류 1, 선행 리듬 오류 파생 4.
  [단계별 실험·VIP 로그](validation/2026-09-13-issue-134-dot-tie-stages.md),
  [17마디 기준 비교](validation/2026-09-13-issue-134-residual-timing.md).

## Known blockers / constraints

- PR160 로컬·원격 tip은 main에 포함됐다. 기존 사용자 미커밋 이력 메모가 남아 있어 규약에 따라
  `codex/doc-agent-contract` 로컬·원격 브랜치를 보존했다. 사용자 변경이 해소된 뒤 정리한다.

- 로컬 Docker 이미지 `clairkeys-omr:stock-main`·`dot-link`는 검증용이다. 운영 이미지와 같다고 주장하지 않는다.
  배포 시 VM에서 병합 커밋으로 새로 빌드하고 이미지 테스트를 다시 실행해야 한다.
- #134 완료에는 실제 재변환·플레이어 청취·사용자 확인이 남아 있다.
  PR159 배포 검증은 운영 모듈 스모크이며 웹 업로드→콜백→플레이어 E2E가 아니다.
- D-049 / D-052: exported XML/JSON에 점·타이·음표를 임의로 보충하지 않는다.
  구현 정책 변경은 [DECISIONS](DECISIONS.md)와 phase를 먼저 갱신한다.
- 새 PR 병합 및 운영 배포는 각각 명시적 승인이 필요하다. 과거 실험 승인을 새 범위로 확대하지 않는다.
- 원본 PDF·이미지 포함 OMR은 Git에 넣지 않는다. 로컬 실험 산출물은 Git 제외
  `local-test-data/results/issue134-dots-2026-09-13/`, 점 패치 corpus 비교는
  `local-test-data/results/issue134-dot-link-2026-09-13/`에 있다.
- VM `/data/analysis/pr159-live-R6a7yJ`에는 XML/JSON/로그가 남고 PDF·OMR은 삭제됐다.
  VM `/tmp` 빌드·테스트 로그도 남아 있다. 외부 health 포트는 **3000**이다.
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
