# 2026-09-19 — #134 m1 타이 주변 점 누락

## 현재 상태

조사 중, 구현·PR 없음. 작업 브랜치 `codex/issue-134-m1-tie-cut-dots`.
사용자 권한은 로컬 수정·Docker 검증·PR·리뷰 대응까지이며 병합/운영 변경은 제외한다.
사용자 미커밋 `2026-09-13-handoff-history.md`는 보존한다.

## 기준선 재현

- 원격 fetch 후 main `a5b73da`는 origin/main과 동일했다.
- `clairkeys-omr:d068b-patched`를 linux/amd64, container 5GB, JVM heap3GB, concurrency1로 실행했다.
  Docker image ls의 ID는 `2384379676ab`로 기록과 같다. 기본 platform의 image inspect는 No such image를 반환했으나
  명시적 amd64 실행은 성공했다. 이미지 누락으로 판단하지 않는다.
- 실제 wrapper/converter 실행25.258초, 자식 최대RSS1,027,948KiB. 기준표 재평가 **185/191, 타이30/43**.
  raw191음, canonical160, tempo69, 길이65.217392초. m1 C5/E5 onset3 길이1.5 대신1.0; m1 타이6개는 모두 일치.
- 명령: `docker run --rm --platform linux/amd64 --memory=5g`에 scores를 read-only로 마운트하고
  `PYTHONPATH=/app python3 /work/run_case.py /scores/Clair_de_Lune_easy_300dpi.pdf /work/baseline-clair`.
  평가기는 저장소 `omr.recognition_evaluation.evaluate_reference`와 `fixtures/recognition/clair-de-lune-full-reference.json`이다.

## 원본·단계별 조사

- 같은 이미지에서 `Audiveris -batch -save -step <CURVES|SYMBOLS|LINKS>`를 각각 새 실행했다.
- BINARY 원본 확대에서 두 점은 타이 잉크와 **분리**되어 있다. 원래 점의 위치는 x834–841, y645–653 / y665–672 부근이다.
  “원본 타이가 점을 가른다”는 말은 실제 인쇄 잉크 연결을 뜻하지 않는다. 곡선 glyph가 분리된 점 잉크를 자기 픽셀로 포함한다.
- CURVES 아래 타이 glyph(x837,y662,width144,height33)의 앞4열은 점 오른쪽 조각이며,
  이후5열은 빈 열이고 그 뒤 실제 곡선이 시작된다. 위 타이는 점 중간의1열을 포함한다.
- SYMBOLS: E5 점은 조각을 다시 묶은8×9 후보(grade0.793), C5 점은 왼쪽3×8 조각(grade0.204)이다.
  **둘 다 augmentation-dot inter로 생성되어 각각 올바른 head에 augmentation 관계가 있다.** 단순 미검출이 아니다.
  LINKS 뒤 둘 다 없어졌다. 세부 삭제 순서는 추가 로그로 확정할 예정이다.
- 과거 기록의 “E5 점3px”는 현재 그래프와 반대다. 현재3px 조각은 아래 C5 점이다.
- 코드 추적: SYMBOLS 전 `SymbolsFilter.SymbolsCleaner`는 `PageCleaner.visit(SlurInter)`를 상속하고,
  이 메서드는 전체 slur glyph를 그대로 지운다. 원본 점 잉크가 이때 잘리는 기전과 일치한다.

Git 제외 상세 산출물: `local-test-data/results/issue134-m1-dots-2026-09-19/`의 baseline-clair,
stages, stage 로그, 원본 확대. 원본 PDF/이미지/OMR은 Git에 넣지 않는다.

## 남은 검증

기준선 실패 fixture, 삭제 로그 확정, 결정·구현, 정상/부정 사례, 전체 이미지/native 테스트,
Clair3회·타이 목록·12곡 corpus 비교, 시간·메모리, 타입/lint/테스트, 자체 리뷰와 PR CI/자동 리뷰 모두 남았다.
첫 조사 결과를 구현 완료로 보지 않는다. #134 phase는 IN_PROGRESS다.
