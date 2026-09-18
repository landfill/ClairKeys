# 2026-09-19 — #134 D-068 공유 기둥 화음 분리

## 범위 / 현재 상태

- 작업 브랜치: `codex/issue-134-shared-stem-chord-split`. 구현 후보 `1ee36a3`, patch context 공백 정리 `a9f2d35` 커밋. 검증 완료·결정 정리 `63487c0`. PR 생성/CI·리뷰 전, 병합·배포 없음.
- 목표: D-067 뒤 남은 m5 duration 2건·m7 duration 1건. 원본 XML/JSON의 사후 수정 없음.
- 사용자 승인: 로컬 Docker 실행·빌드·검증, 커밋·push·non-draft PR와 리뷰 대응. 병합·운영 변경 미승인.
- 사용자 변경 `validation/2026-09-13-handoff-history.md`는 보존한다.
- Git 제외 산출물: `local-test-data/results/issue134-chord-split-2026-09-19/`.

## 기준선 재검증

- 이미지: `clairkeys-omr:d067b-patched`; Docker 실행 확인(29.4.0), OMR은 순차 실행·메모리 5GB 상한.
- 명령: `docker run --rm --platform linux/amd64 --memory=5g`에 scores 읽기 전용, 산출물 `/work`를 마운트하고
  `PYTHONPATH=/app python3 /work/run_case.py /scores/Clair_de_Lune_easy_300dpi.pdf /work/baseline-clair` 실행.
- 실제 wrapper+converter의 선택 결과 `meter-retry-yfn92vkw/retry.mxl`: **182/191**, duration 3·missing-dot 3·onset-and-duration 3,
  타이 **30/43**(누락 13), 템포 69, canonical 160, 65.217392초. 처리 27.696초. `baseline-clair/evaluation.json`에 기준표 비교 저장.
- 기존 HANDOFF의 타이 29/43·누락14는 D-067 이전 수치다. D-067 상세 검증의 30과 이번 재검증이 일치한다.
- 기존 합성 fixture에 독립 점2분음표 단언 추가: normal/recovery 모두 `eighth != half`로 실패(24.823초).
- 검은 2도 합성 fixture 첫 시도는 긴 음 머리 자체가 누락되어 대상 기전 판별용으로 불충분했다. 기둥 폭과 끝 좌표를 조정 중이다.

## 실험 / 실패 근거

1. 긴 음에 같은 잉크의 새 논리 기둥을 주고 기존 머리 관계를 옮기는 후보:
   - 전체 Dockerfile 빌드에서 명시적 `HeadStemRelation` cast 누락으로 실패. cast 수정 후 `d068-exp` 빌드 성공.
   - Clair에서 3개 머리를 분리했지만 LINKS 정리에서 모두 삭제됐다(191 → 188 events, canonical 160 → 157). **폐기**.
   - VIP: 빈 머리 #1583는 원래 기둥과 새 OVERLAP 배제가 생겼다. #1587·#1765는 복제 기둥에 2도 이웃이 없어
     pruneStemHeads가 관계를 끊고 checkHeadHasStem이 머리를 삭제했다. `exp-vip.log`에 기록.
2. 수정 후보: 실제 head-stem 관계를 보존하고 화음만 나눈다. 긴 화음의 저장 속성으로 빔·꼬리 상속을 막고 빔 쪽 화음 조회에서도 제외한다.
   - `d068-exp2`: Clair **185/191**, duration 3건 모두 해소, raw 191·템포69 유지. 다만 m4 B4@1.5 타이가 사라져 30→29/43.
  - 분리된 F4가 SlurInter.isSpaceClear의 끝점 사이 장애물로 인식된다. 같은 기둥·SameTimeRelation 및 명시적인 분리 속성을
    가진 쌍만 타이 장애물에서 제외하는 후보를 추가했다. 타이 보존 확인 전에는 채택하지 않는다.
  - 합성 fixture의 줄 위 점이 잡히지 않던 마디는 모두 점이 공간에 놓이도록 3개 조옮김 사례로 고쳤다. 검은 머리 fixture의
    기둥 끝을 아래 머리 중심까지 연장하자 기준선에서 머리는 유지되고 `eighth != quarter`로 실패했다(27.782초).

3. `d068-exp3`: Clair **185/191, 타이30/43, canonical160, 템포69**, 처리30.078초. 대상3건 해소 및 타이 회귀 복구.
   - 합성3종(normal/recovery)의 음악 단언은 모두 통과했으나 재로딩 검사의 출력 폴더가 잘못돼 오류4건. 엔진은 OMR에 저장된 export
     경로를 사용하므로 테스트가 기존 export를 먼저 삭제한 뒤 같은 폴더로 재생성 여부를 확인하도록 수정했다. 최종 재검증 필요.

## 실행한 기타 검증

- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0, 경고·오류 없음(Next lint 명령 deprecation 안내 있음).
- 새 patch의 context 공백-only 줄을 `a9f2d35`에서 정리했다. `git diff --check` 통과, 재빌드 후 클래스 해시 동일.
- 첫 `npm test -- --runInBand`: 104 suites 통과/1 실패(1037/1038). host Python3.14에 FastAPI 미설치로 callback 모듈 import 실패.
  이 실패를 기존 테스트 실패로 처리하지 않고, 격리 Python3.12 venv에 `requirements-ci.txt`를 설치했다.
- `PYTHON_BIN=<격리 venv>/bin/python npm test -- --runInBand`: **105 suites, 1038 tests 모두 통과**(33.688초).

## 최종 이미지 및 Clair 3회

- 실제 `Dockerfile.audiveris`로 `clairkeys-omr:d068-patched` 빌드 성공. image `sha256:d147d32939388aae1d1de43035fa5e29bc3dfd9c1f40101347442c4895deeb8d`.
- 명령: `docker build --platform linux/amd64 -f omr-service/Dockerfile.audiveris -t clairkeys-omr:d068-patched omr-service`.
  새 소스4개 모두 고정 SHA 검증·patch 적용·컴파일 성공. normal/recovery와 직전 `d068-exp3`의 네 클래스 해시가 모두 같다.

| 클래스 | SHA256 |
|---|---|
| SymbolsLinker | f10f8f95257dafa0e108022cba57e513da7abf072f11c0a67f90894cfda7afd2 |
| HeadChordInter | f7ea68a9d9ab3767e849244eff2823abfe75ec96ba094401be97901f878b34a1 |
| AbstractBeamInter | 59b486a51ae5c8b56df09c4e3ba305dd967779368396274122b9bd194448790d |
| SlurInter | a6349c7e2237df6bcb201c78bb14934102c1295ecf129c7276c04a80d6077584 |

- 동일 wrapper+converter를 3회 실행한 선택 MusicXML을 `omr.recognition_evaluation.evaluate_reference`로 전체191-event 기준표와 비교했다.
  세 번 모두 **185/191, 타이30/43, raw191, canonical160, tempo69, 65.217392초**. `events.json` SHA256은
  `5b23e6fa16a197fe3218a236f63aab1512d6bc343a6c08f782aeef8756ca2b62`로 동일하다.
- 처리 시간: 23.756 / 23.924 / 24.290초. `resource.getrusage(RUSAGE_CHILDREN).ru_maxrss`: 1,023,648 / 1,008,472 / 1,037,788 KiB.
  이는 자식 프로세스 RSS 측정이며 컨테이너 전체 peak와 동일하다고 주장하지 않는다. 컨테이너 메모리5GB·JVM heap3GB·OMR 동시성1 유지.
- 바뀐 raw 마디는 **5·7만**. m5 F4@0: 0.5→3박, F4@3: 0.5→1.5박; m7 C4@3: 0.5→1.5박. 모든 마디의 누락/오검출 타이 목록은 기준선과 같다.
- 새 fixture 기준선 판별 최종 재실행: 3조옮김×2양성종류×2엔진 **12개 모두 음가 단언 실패**, 테스트 오류0; 점 없는 2도 제어 및 재로딩은 통과.
- 최종 이미지 내부 첫 전체 테스트: native 9개는 모두 실행·통과했으나 **47 errors / 3 skipped**.
  모두 외부 저장소 참조 파일 `/fixtures/recognition/...` 또는 `/src/app/api/omr/finalize/route.ts` 미마운트였다.
  `-v "$PWD/fixtures:/fixtures:ro" -v "$PWD/src:/src:ro"`로 참조를 연결한 전체 suite 재실행은 **186개 중180통과·6skip, 오류/실패0**(227.812초).
  첫 실패는 테스트 실행 환경 설정 실패로 보존한다. native9개는 normal/recovery를 실제 실행했으며 새3개에는 저장/재로딩과 일반2도 제어가 포함된다.
  skip6개는 보관된 local-test-data 진단 자료가 이미지에 없는 경우이며 핵심 native skip은 없다.
  명령은 `docker run --rm --platform linux/amd64 --memory=5g -v "$PWD/fixtures:/fixtures:ro" -v "$PWD/src:/src:ro" --entrypoint sh clairkeys-omr:d068-patched -c 'ln -s /app /omr-service && cd /app && python3 -m unittest discover -s tests -v'`다.
- 상태 기록 커밋 `b7795d5` push 직후 check-runs를 조회했다. 후속 조회에서 Post-merge build/tests, Security Audit, Lint, Run Tests 성공;
  E2E Tests는 진행 중이었다. 이후 상태도 확인한다.

## Corpus 12곡 — 기준선/패치 각각 새 실행

- 모든 PDF를 ASCII 이름으로 복사하고 같은 입력을 `d067b-patched` → `d068-patched` 순서로 처리했다. JVM은 한 번에 하나만 실행했다.
- 각 이미지는 `docker run --rm --platform linux/amd64 --memory=5g -v <산출물>:/work --entrypoint sh <image>`에서
  `cd /app && PYTHONPATH=/app python3 /work/run_case.py /work/inputs/score-NN.pdf /work/corpus/score-NN/<baseline|patched>`를 실행했다.
  `run_case.py`는 실제 `AudiverisProcessor.process_pdf` 선택 결과를 `MusicXMLToClairKeysConverter.convert`로 변환하고,
  각 raw note의 part/measure/pitch/rest/chord/grace/duration/type/dots/voice/staff/tie/timeMod를 `events.json`으로 기록한다.
- 성공11곡의 **events.json 바이트가 모두 동일**하다. 애니메이션 JSON은 `generated_at`만 달랐고 그 필드를 뺀 나머지 전체 객체가 모두 같다.
- 실패1곡은 두 이미지 모두 exit1. truongca PDF 3쪽의 SCALE 단계에서 `StepException: No regularly spaced lines found`,
  `ScaleBuilder$HistoKeeper.retrieveInterlinePeaks(ScaleBuilder.java:746)`가 발생하고 export가 중단됐다.
  예외 chain을 코드로 비교해 동일함을 확인했고 이전 D-067 로그에도 같은 실패가 있다. 이 곡을 통과로 세지 않는다.
  패치 분리 로그는 이 곡을 포함한 corpus 전체에서0건이다. 목표 Clair에서만 세 머리를 분리했다.
- 패치 성공곡 처리 23.858–104.037초, 자식 최대RSS 상한1,433,868 KiB(약1.37GiB); 전부 timeout900초와 컨테이너5GB 제한 내다.
  단일 실행 시간 비교는 성능 개선을 입증하는 benchmark가 아니다.

| 입력 | 기준선 초 | 패치 초 | raw/animation 결과 |
|---|---:|---:|---|
| Always_With_Me_2pages_300dpi.pdf | 34.036 | 36.647 | raw 바이트 동일 / 생성시각 외 동일 |
| Deborahs_Theme_Luciano_Lombardi_2pages_300dpi.pdf | 55.711 | 53.154 | raw 바이트 동일 / 생성시각 외 동일 |
| Love_Affair_Piano_Solo.pdf | 104.502 | 104.037 | raw 바이트 동일 / 생성시각 외 동일 |
| Merry_Go_Round_of_Life_2pages_300dpi.pdf | 26.195 | 28.859 | raw 바이트 동일 / 생성시각 외 동일 |
| My_Neighbor_Totoro_2pages_300dpi.pdf | 36.701 | 40.230 | raw 바이트 동일 / 생성시각 외 동일 |
| Premiere_Gymnopedie_300dpi.pdf | 25.447 | 23.858 | raw 바이트 동일 / 생성시각 외 동일 |
| Princess_Mononoke_Ashitaka_and_San_print_300dpi.pdf | 62.851 | 58.307 | raw 바이트 동일 / 생성시각 외 동일 |
| Toy Story- You’ve Got a friend in me - easy ver.pdf | 30.835 | 35.144 | raw 바이트 동일 / 생성시각 외 동일 |
| bach-wtk1-prelude1.pdf | 35.688 | 35.718 | raw 바이트 동일 / 생성시각 외 동일 |
| piano_piano-solo-love-affair-ennio-morricone-truongca.com.pdf | exit1 | exit1 | 같은 3쪽 SCALE 실패 |
| satie-gymnopedie-1.pdf | 28.492 | 28.397 | raw 바이트 동일 / 생성시각 외 동일 |
| 드비시달빛.pdf | 40.990 | 38.439 | raw 바이트 동일 / 생성시각 외 동일 |

성공곡 raw SHA256(양쪽 동일):

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
드비시달빛.pdf: ac2f87f479b411dff240acb7d7fe5adb2e64029a7fa1fda7e6fdd681ec8794ff
```

## 자체 리뷰 — D-068 최종 diff

- 범위: 최신 main과 작업 head의 6개 파일. 점/타이 보충을 출력 XML·JSON에 넣지 않고 엔진의 검출된 머리·점·관계를 사용한다.
- 그래프 무결성: 최종안은 head-stem·beam-stem 관계를 이동/삭제하지 않는다. 원래 화음에서 머리 membership만 옮기고 동일 기둥을 사용한다.
- 빔 소유: 긴 화음의 getBeams/getFlagsNumber뿐 아니라 빔의 getChords/getHeadChords에서도 제외하므로 리듬 그룹과 음가 계산이 일치한다.
- 보존/재실행: XML attribute로 소유를 저장한다. normal/recovery의 생성→OMR저장→재로딩→재export에서 실제 음높이·시작 박·길이·점·성부가 같다.
  재실행 시 긴 화음은 빔이 없고 짧은 화음에는 긴 머리가 없어 같은 분리가 반복되지 않는다.
- 점과 성부: countDots 전에 분리하여 긴 음의 점 삭제를 막는다. SameTimeRelation으로 onset을 보존한다. 일반적인 점 없는 2도는 분리하지 않는다.
- 타이: 분리 직후 관찰한 m4→m5 회귀를 복구했다. 같은 기둥·명시적 SameTimeRelation·분리 속성이 있는 끝점의 동시 화음만
  장애물에서 제외한다. 다른 시점·기둥의 화음은 기존 검사를 받는다. Clair 모든 마디의 누락/오검출 타이 목록이 기준선과 같다.
- 보수적 제외: small, mirror, 다른 staff, 여러 긴 머리, 빔 없는 화음은 대상이 아니다. 점4분 검은 머리는 점1개·반대편 점 없는 정확한2도 이웃이 필요하다.
- 빌드: 소스4개를 기존 pinned commit과 각각의 SHA로 검증하고 함께 컴파일한다. recovery는 주입 후 복사한다. 두 jar의 클래스 해시 및
  이미지 안의 Dockerfile/patch/test 소스 해시를 최종 작업 파일과 대조했다.
- 사용자 변경/규약: history 메모는 stage하지 않았다. 코드·계획·결정은 작업 브랜치, 상태·검증은 main에 별도 기록했다.
- 수정한 finding: patch context의 공백-only 줄 → 정리·재빌드·클래스 동일 확인. 재로딩 테스트의 export 경로 → 기존 export를 먼저 지워
  stale XML을 읽을 가능성 제거. 이미지 suite의 외부 fixture 마운트 누락 → 읽기 전용 참조 연결 후 전체 suite 재실행 성공.
- 알려진 한계: 일반 점음표 화음에서 다른 머리의 점이 인식되지 않으면, 점을 가진 밀린2도가 독립 성부처럼 보일 가능성이 있다.
  형태 근거와 단일 후보로 범위를 제한했지만 모든 판형에서 이 모호성이 사라졌다고 주장하지 않는다. corpus 확인 결과는 최종 기록을 따른다.
- 결론: 자체 리뷰에서 미해결 구현 finding은 없다. corpus 비교까지 통과했으며 최신 PR CI/자동 리뷰가 남았다.

## 최종 범위와 한계

- 목표 duration3건 해소. Clair 완전 일치 마디는 2·4·5·7·8·11·15·16·17로 7→9개다. m1 점 누락2, m3 둘잇단4 및 타이13누락은 남았다.
- 모든 마디의 쉼표 mismatch 목록·박자표·마디 길이 계약은 기준선과 같다. 신규 실패나 미해결 자체 리뷰 finding은 없다.
- 이미지 안의 Dockerfile/patch/fixture/test 소스 SHA도 작업 파일과 동일함을 별도 검증했다.
- `76e4e0b` 상태 기록 커밋의 체크6개는 E2E를 포함해 전부 성공했다. 이는 구현 PR의 CI를 대신하지 않는다.
- 아직 수행하지 않은 범위: 구현 PR CI·자동 리뷰, main 병합, 운영 배포·재업로드. 사용자 병합/배포 승인은 없다.
