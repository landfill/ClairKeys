# 2026-09-19 — #134 m1 타이 주변 점 누락

## 현재 상태

로컬 필수 검증 완료, 코드/결정 head `56736f7` (엔진 구현 `df3f1af`). PR 생성·CI/리뷰 대기. 작업 브랜치 `codex/issue-134-m1-tie-cut-dots`.
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

## 정식 이미지 Clair3회

- 세 번 모두 **187/191·타이30/43**. 각 선택 XML을191이벤트 전체 기준표로 평가했다.
  raw event SHA `b985a110545986e47f533dd8311e61d88d846949b406bd57a795f1b333d29c66`가3회 동일하다.
- raw 이벤트 전체를 인덱스별로 비교했다. **m1 C5·E5의 duration/dots 두 필드만 바뀌며 변경음2개**,191음 보존.
  나머지 raw pitch/voice/staff/tie/type 등은 모두 같다. m2–17 evaluation 객체 전체가 기준선과 동일하다.
  canonical160음에서 같은 두 음의 duration만1.304348→1.739131초이고 나머지 필드(시작/음높이/손/성부)와 다른158음은 같다.
  onset3.0박 유지, raw length1.0→1.5박. tempo69·전체65.217392초 유지.
- 개별 타이 누락/오검출 목록도3회 모두 기준선과 같다. 아래는 `(MIDI,staff,onset quarter beats)`이다.
  누락13: m3 `(67,2,0),(69,1,1.5),(72,1,3.75),(76,1,2.25)`;
  m6 `(64,1,3)`; m9 `(52,2,1),(55,2,1),(72,1,3),(76,1,3)`;
  m10 `(74,1,1.5)`; m12 `(53,2,0)`; m13 `(55,2,0)`; m14 `(50,2,0)`.
  오검출1: m3 `(76,1,2)`. 과거2개 기록을 현재 값으로 복사하지 않았으며, 이번 기준선도1개였다.
- clair-1: 24.615초, 자식 최대RSS1,020,776KiB.
- clair-2: 24.974초, 자식 최대RSS1,031,056KiB.
- clair-3: 26.131초, 자식 최대RSS1,045,016KiB.
- 실행은 OMR concurrency1, JVM heap3GB, timeout900초, 컨테이너5GB. 실제 실행 중 inspect에서 memory5368709120,
  concurrency1/timeout900을 확인했고 process 목록에 Audiveris1개였다. 첫 docker top에서PID 칼럼 누락 오류는 칼럼을 추가해 바로잡았다.
- corpus12곡 새 기준선/후보 쌍은 실행 중이다. Clair 반복 완료가 corpus 검증을 대체하지 않는다.

## 최종 diff 자체 리뷰 (df3f1af, corpus 진행 중)

- 엔진 SymbolsCleaner만 동작 변경한다. XML/JSON·리듬 코드·음표 객체 추가 없음.
- 청소 전 원본 snapshot으로8방향 연결을 판정하므로 다른 inter의 삭제 순서가 고립 여부를 만들지 않는다.
  탐색창 경계에 닿으면 거부하고, 원본 검은 픽셀을 eraser clip에서 빼므로 다른 기호에 의해 이미 지워진 잉크는 되살리지 않는다.
- 가짜 점: head 상대위치·크기·종횡비·점유율로 제한하고 기존 분류·관계 검사를 유지한다.
  실제 점과 같은 크기/모양인 고립 잡음까지 보편적으로 구별했다고 주장하지 않는다. corpus 비교가 필수다.
- 타이: glyph/곡선 끝/관계 자체를 바꾸지 않으며 기존 클래스 해시도 같다. 새 symbol 후보가 간접적으로 그래프 정리에 영향을 줄 수 있어
  개별 타이 목록을 비교했고 Clair에서는 차이0이다. corpus는 아직 진행 중이다.
- 중복/누락·리듬: native 픽셀 fixture만으로 출력 정확도를 주장하지 않고 위191이벤트/160canonical 전체 비교를 추가했다.
- normal/recovery: 같은 컴파일 산출물을 넣은 뒤 recovery 복사. 두 jar의4개 변경 클래스 해시와 source 일치 확인.
- 한계: 왼쪽 연결 head 주변의 고립 성분만 처리하며 실제로 점과 곡선이 연결된 잉크는 대상이 아니다.
  현재 corpus 밖의 판형/해상도, 작은 보표의 독립 scale 최적화는 미검증이다.
- 이 패스에서 확인한 미해결 구현 finding은 없다. corpus 및 PR CI·자동 리뷰 완료 전 goal 완료로 보지 않는다.

## 12곡 corpus 최종 비교

- 동일12개 입력을 각각 새로 baseline d068b → patch d069 순서로 실행했다. 총24회, OMR은 항상 순차 실행했다.
  비ASCII 원본 이름은 내용이 같은 ASCII score-NN.pdf로 복사했다. `run_corpus.py`의 manifest는 앞선 D-068의12곡과 같다.
- **성공11곡 raw events.json 바이트 동일·animation generated_at 외 전체 객체 동일**. 새 차이/관찰된 비결정성 없음.
- 실패1곡 truongca는 양쪽exit1.3쪽 SCALE의 `No regularly spaced lines found`,
  `ScaleBuilder$HistoKeeper.retrieveInterlinePeaks(ScaleBuilder.java:746)`가 같고, Caused by 및 Java stack99줄을
  기계적으로 비교해 전부 동일했다. 해당 곡은 통과가 아니며 이후 단계 품질을 검증할 수 없다.
- 명령: `docker run --rm --platform linux/amd64 --memory=5g -v <이번 산출물>:/work --entrypoint sh <image>`에서
  `cd /app && PYTHONPATH=/app python3 /work/run_case.py /work/inputs/score-NN.pdf /work/corpus/score-NN/<baseline|patched>`.

| 입력 | 기준선 초 | 패치 초 | raw/animation |
|---|---:|---:|---|
| Always_With_Me_2pages_300dpi.pdf | 38.952 | 38.098 | 동일/생성시각 외 동일 |
| Deborahs_Theme_Luciano_Lombardi_2pages_300dpi.pdf | 68.859 | 61.655 | 동일/생성시각 외 동일 |
| Love_Affair_Piano_Solo.pdf | 115.162 | 114.779 | 동일/생성시각 외 동일 |
| Merry_Go_Round_of_Life_2pages_300dpi.pdf | 28.043 | 30.897 | 동일/생성시각 외 동일 |
| My_Neighbor_Totoro_2pages_300dpi.pdf | 39.279 | 40.483 | 동일/생성시각 외 동일 |
| Premiere_Gymnopedie_300dpi.pdf | 22.461 | 22.187 | 동일/생성시각 외 동일 |
| Princess_Mononoke_Ashitaka_and_San_print_300dpi.pdf | 61.14 | 58.349 | 동일/생성시각 외 동일 |
| Toy Story- You’ve Got a friend in me - easy ver.pdf | 31.815 | 36.166 | 동일/생성시각 외 동일 |
| bach-wtk1-prelude1.pdf | 38.779 | 37.039 | 동일/생성시각 외 동일 |
| piano_piano-solo-love-affair-ennio-morricone-truongca.com.pdf | exit1 | exit1 | 동일3쪽 SCALE 실패 |
| satie-gymnopedie-1.pdf | 28.992 | 29.782 | 동일/생성시각 외 동일 |
| 드비시달빛.pdf | 41.958 | 40.117 | 동일/생성시각 외 동일 |

성공곡 양쪽 공통 raw SHA256:

```text
Always_With_Me_2pages_300dpi.pdf: a06b622c3a9ac4a25b0a4c5fe8b8d91ed4e558452dd8366583103b6e8dc2cea3
Deborahs_Theme_Luciano_Lombardi_2pages_300dpi.pdf: d8b378e331fb5565d5a5fc69fdb780fceb65fe4f7a32c5ef01f1851b3f72cd5f
Love_Affair_Piano_Solo.pdf: 58025f4b37aa919e819914c0901c6fd1eaa4fcbfcd8684a5b23b40bf88899215
Merry_Go_Round_of_Life_2pages_300dpi.pdf: b3ecd778191ad375c05e5a14756ecf7bedbe92478a8986c2c9473ac8a962a612
My_Neighbor_Totoro_2pages_300dpi.pdf: 7755c5cdcf3b0b157e4069af77f28146eb78f82c2529960c47d64db459dae2f7
Premiere_Gymnopedie_300dpi.pdf: 1e885cc5497aa261645bf18fb4026af0e2b924be794b062fb41fe87f854ecd86
Princess_Mononoke_Ashitaka_and_San_print_300dpi.pdf: 4494ae6758201e3b4065ffd851b197d3f554419958991804a31e57657b94340d
Toy Story- You’ve Got a friend in me - easy ver.pdf: 9979440c2c9f4e1e7dcb3d08a0fa350faa9a887d4ff2c1cfe11f5323cfc92ea3
bach-wtk1-prelude1.pdf: 0bcb86c4d1ce867c75ed6a654fb1785b04df63a2c8a4d3a366610cd21d4936fa
satie-gymnopedie-1.pdf: 8801dc343cf6a9d1a11e8ea8d45eff02df09c84f004787a0698c6ecb4bd1e6eb
드비시달빛.pdf: ac2f87f479b411dff240acb7d7fe5adb2e64029a7fa1fda7e6fdd681ec8794ff
```
- 패치 성공곡 최대114.779초, 자식 최대RSS1,438,188KiB. 제한 이내이며 성능 개선 benchmark로 해석하지 않는다.
- baseline 부정/보존8종×3크기×2엔진48사례도 native fixture에서 추가 실행해 모두 통과했다.
  패치는 양성 포함54사례를 정식 이미지 전체 suite에서 통과했다. 양성 baseline은 두 엔진 모두 실패한 앞선 기록을 따른다.
- Clair3회 저장 그래프의52개 곡선도 기준선과 비교: curve 좌표/tie flag/shape 및 slur glyph bounds/run pixels 모두 동일.
  최종 m1 점은 E5(834,645,8,9) grade0.798/ctx0.930, C5(834,665,8,8) grade0.780/ctx0.922다.
- 최종 diff 추가 검토에서 새 회귀·가짜 점·타이 손상·중복/누락·normal/recovery 불일치는 관찰되지 않았다.
  `56736f7`은 결정 문서만 갱신하며 엔진/fixture/Docker source는 검증 이미지와 같다.
- `ea3d005`, `821da4b`, `23bb01e`, `4159e88` 상태 기록의 check-runs는 각각6개 전부 성공했다.
- 로컬 필수 검증 완료. 다음은 non-draft PR 및 현재 head CI/실제 자동 리뷰다. 아직 goal 완료나 phase DONE이 아니다.
