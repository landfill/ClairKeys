# 2026-09-19 — #134 m1 타이 주변 점 누락

## 현재 상태

초기 구현 `df3f1af`, 전체 검증 중·PR 없음. 작업 브랜치 `codex/issue-134-m1-tie-cut-dots`.
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

## 삭제 순서와 초기 후보

- SYMBOLS 체크포인트를 복사해 `-step LINKS -constant org.audiveris.omr.sig.InterIndex.vipInters=4505,4506,3794,1301,1349`로 재개했다.
  countDots1 → SIGraph deleted weak C5 dot4506(0.204/0.463) → E5 dot4505 제거 → countDots0 순서다.
- D-069와 phase 계획을 작업 브랜치에서 먼저 기록했다. SymbolsCleaner의 slur 삭제 clip만 제한하는 초기 구현 `df3f1af`.
  성분은 원래 staff-free 이미지에서8방향 연결·고립/크기/점유율/종횡비/머리 상대위치를 검사한다.
  slur 객체·glyph·관계는 바꾸지 않고 출력에 점을 보충하지 않는다.
- `SlurDotErasureFixture`는 실제 private SymbolsCleaner를 호출한다. baseline normal/recovery 모두
  `AssertionError: dot IL16 pixel39,30 expected0 got255`로 실패했다. 초기 fixture 구성에서 setGlyph가
  부정확한 직선 fixture의 curve 계산을 시도해 NPE가 났고, 테스트 곡선의 getGlyph를 재정의해 실제 eraser 입력으로 수정했다.
  수정 후보는 dot/normal/no-dot/connected/staff/noise/elongated/unlinked/far9종×IL16/20/24 모두 통과했다.
- 실험 클래스만 두 jar에 넣은 새 컨테이너의 Clair 결과는 **187/191, 타이30/43**.
  전체 evaluation에서 바뀐 마디는1뿐; missing/unexpected tie 목록은 모두 동일. raw191, canonical160, dots114→116,
  tempo69, 총 길이65.217392 유지. 처리23.321초·자식RSS1,030,852KiB.
- 타입 검사와 lint 통과. 첫 Jest는1037통과/1실패: 호스트 Python에 fastapi가 없어 callback test import 실패.
  이전 검증의 CI requirements venv를 PATH에 연결해 전체 Jest 재실행 중이다. 이를 기존 테스트 실패로 분류하지 않는다.
- 실제 Dockerfile.audiveris 전체 빌드 진행 중. 정식 이미지 suite·Clair3회·corpus12곡·자체 리뷰/PR은 남았다.
- 초기 상태 기록 `ea3d005` push 직후 check-runs 조회: 초기 등록0, 후속 build/security/lint/tests 성공, E2E 진행 중.

## 정식 이미지·전체 테스트

- 실제 `docker build --platform linux/amd64 -f omr-service/Dockerfile.audiveris -t clairkeys-omr:d069-patched omr-service` 성공.
  이미지 index digest `97d2af00708c8132bd8aac0de43d926e486dcf8d90d5b7c6c8b8beaf54cda0a4`,
  amd64 manifest `ed95aa59d83805aa86918be15ccbf32360ae2057eac9280350aa9573622e6805`.
  기준선 index는 기록과 같은23843796…이며 amd64 manifest는6e779f9b…다. inspect에는 플랫폼을 명시해야 한다.
- pinned SymbolsFilter 원본 SHA `700b1b72b78beb4b616c56428978b666c056c664488ae2cd097c641a415ba712` 확인 후 patch 적용 성공.
  로컬 조사 소스와 pinned 다운로드도 동일. 이미지의 Dockerfile/patch/Java·Python fixture 소스 해시는 작업 파일과 일치한다.
- normal/recovery의 SymbolsFilter 및 내부 클래스4개 모두 해시 동일. SymbolsCleaner는
  `1f1c023ed0ebf445c12d84d641ddfe6b02e2945701229526af29f4c9fee54ef9`.
  기존 SymbolsLinker/HeadChordInter/AbstractBeamInter/SlurInter/AugmentationDotInter/SigReducer는 기준선과 바이트 동일.
- 이미지 안 전체 unittest **188개 중182통과·6skip**,244.863초. 새 native는 양쪽 엔진의27사례를 실제 실행해 통과했고,
  기존 native10개도 모두 실행·통과했다. skip6개는 보관된 local 진단 selected-result/SYMBOLS/후보/제어쌍이 이미지에 없기 때문이며
  native 실행 skip은 없다. `--memory=5g`와 fixtures/src read-only mount, `ln -s /app /omr-service`,
  `cd /app && python3 -m unittest discover -s tests -v` 사용.
- CI 의존성 venv의 python3를 PATH에 둔 전체 Jest 재실행은 **105 suites/1038 tests 통과**,26.115초.
  타입 검사와 lint도 통과. 첫 의존성 누락 실패를 숨기지 않는다.
- RGB 원본2480×3508(`issue134-onsets-2026-09-15/page.png`)에서도 점/곡선의 흰 간격을 직접 확인했다.
  binary에서만 분리된 것으로 착각한 것이 아니다.
- 정식 이미지 Clair3회 및 새 baseline/patch corpus12곡 비교를 순차 실행 중이다. 첫 성공으로 종료하지 않는다.
- `ea3d005` 상태 기록의 check-runs6개 모두 성공. `821da4b`는5개 성공/E2E 진행 중을 확인했다.
