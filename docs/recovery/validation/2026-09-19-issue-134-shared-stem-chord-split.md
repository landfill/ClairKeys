# 2026-09-19 — #134 D-068 공유 기둥 화음 분리

## 범위 / 현재 상태

- 작업 브랜치: `codex/issue-134-shared-stem-chord-split`. 구현 후보 `1ee36a3`, patch context 공백 정리 `a9f2d35` 커밋. 최종 검증 중. PR·병합·배포 없음.
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

## 아직 필요한 검증

- corpus12곡 기준선·패치 순차 재실행 및 diff, 실패·비결정성 조사, 시간·메모리 확인.
- 최종 자체 리뷰, PR·CI·자동 리뷰 대응.
