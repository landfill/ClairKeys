# #134 시스템 경계 타이 5개 — 진행 기록 (2026-09-20)

## 범위와 현재 상태

- 사용자 승인: m3 A4/C5, m6 E4, m9 C5/E5의 로컬 원인 추적·fixture·구현·Docker 검증·자체 리뷰·PR 생성·CI/리뷰 대응.
- main 병합, 운영 VM 접근·배포, m12 교차 및 D-065 후속 제외. 목표 수치 이벤트191/191·타이42/43·오검출0은 달성했다. 전체 goal은 외부 Security Audit 통과 전까지 미완료다. 실제 리뷰와 나머지 CI는 완료됐다.
- main `98e1eae`에서 `codex/issue-134-cross-system-ties` 생성. fetch 후 main 뒤처짐0.
- 기존 사용자 history 메모 SHA256 `36207439c88183b72476b4c98aa6962ec9a5b4439f4837711699e5d177f8a947` 보존.
- Docker29.4.0 실행 중, 실행 컨테이너0 확인. 기존 이미지 보존.
- 로컬 산출물: Git 제외 `local-test-data/results/issue134-cross-system-2026-09-20/`.

## 현재 결과 (최종 로컬 게이트 완료)

- PR head `b8de0a8`(main 상태 기록 동기화 전 `a8d6b28`). 최종 Java 변경은 `13431f0`에 있으며 이후 결정 문서만 갱신했다.
- 기준선 `d072b-patched`: `sha256:b429399a1cf9ea9cd702276fc742b4b90a95acea2aea278fcdcf12862fa47ce4`.
- 전체 테스트/반복/corpus 실행 이미지 `d073c-patched`: `sha256:5071772acd9345b9e45c6c20a909021d34a8de3cc886fb5bf4b5c3a9c58f9f01`.
- context공백 정리 후 정식 재빌드 `d073d-patched`: `sha256:197205ebb37d74c5bb63d65d82a922e5b8c2e6e95c17027b964da71fabb57c15`.
  아래 기록대로 c/d 실행 코드·의존성·테스트가 모두 동일하다. d를 별도로 전체 suite 실행했다고 주장하지 않는다.

| 필수 로컬 검증 | 최종 결과 |
|---|---|
| 정식 Dockerfile 전체 빌드 | c/d 성공, pinned source/checksum/patch 적용 성공 |
| 양쪽 엔진 무결성 | 각2433 JAR항목 중 네 수정 클래스 계열만 변경, normal/recovery의 새 코드 동일 |
| 이미지 전체 suite | 196개 중190통과·6보관진단skip, native19개 모두 실행·통과 |
| native 회귀 판별 | Part우선순위·line-head 경계 fixture 기준선양쪽실패→후보양쪽통과. 정상/작은호/미짝끝 대조군 유지 |
| Clair 최종3회 | 전부191/191·42/43·오검출0, raw SHA8224a58a… 동일. 28.912/28.760/31.006초, 자식 maxRSS 최대1,041,220KiB |
| 최종12곡 비교 | 10동일, 모노노케 인쇄타이1개 개선, truongca 동일3쪽SCALE실패126줄. 경계 제한 전후 결과도 동일 |
| 타입/lint/Jest | 통과, Jest105suites1038tests. 최초 Docker cleanup 문자열 검사 실패는 수정 후 전체 재검증 |
| 자체 리뷰 | 내부 경계/orphan분류·최종 음높이 재판정 거부·동일 쪽 중복·애매한 매칭·양쪽 설치·예상 밖 raw차이 점검 |

- 남은 작업: PR172의 Security Audit 실제 통과. Codex 실제 리뷰 지적0 및 나머지 CI 통과. npm 감사 endpoint 오류는 아래 별도 기록을 따른다.
- 남은 한계: m12 교차1개, m3 C5 성부2→1의 canonical 병합, 페이지 간 새 반쪽 복원은 이번 범위 밖이다.

## 기준선 재현

- 이미지 `clairkeys-omr:d072b-patched` (`b429399a1cf9`), 운영 동등 엔진 기준선.
- 명령: `docker run --rm --platform linux/amd64 --memory=5g`로 결과 폴더를 `/work`, 원본 폴더를 `/scores:ro`에 마운트한 뒤
  `PYTHONPATH=/app python3 /work/run_case.py /scores/Clair_de_Lune_easy_300dpi.pdf /work/baseline`.
- 실제 wrapper·converter 사용, API/callback 쓰기 없음. 처리25.194초, 자식 maxRSS1,027,764KiB.
- 원본 기준표 평가: **191/191·타이37/43·누락6·오검출0**, canonical154·tempo69·9/8.
- 누락 목록: m3 A4/C5, m6 E4, m9 C5/E5, m12 F3. baseline/evaluation.json·summary.json·events.json·중간 OMR 보존.

## 착수 시점의 다음 검증 / 한계

- 기존 로그 전용 진단 코드를 d072b SlursBuilder에 적용해 시스템 경계 영역의 seed/weed/prune 과정을 추적 중이다.
- 아직 구현·새 fixture·corpus·전체 테스트·PR 없음. 기준선 단일 실행을 최종 반복 검증으로 세지 않는다.

## 단계 추적과 첫 실험

- 로그 전용 Curves/SlursBuilder와 SlurInter.remove 호출 스택을 추가한 로컬 컨테이너를 순차 실행했다.
  `diagnostic` raw events는 새 기준선과 바이트 동일하다. 배포 이미지·운영에는 적용하지 않았다.
- 기존 "미검출6반쪽" 분류 정정:
  - m4 C5 `(302,1188,19,9)`·A4 `(297,1227,25,11)`와 m9 C5 `(2168,1735,131,22)`는 곡선·머리 연결까지 생성된다.
    `SlursBuilder.buildSlurs → Page.connectOrphanSlurs → SlurInter.discardOrphans → remove`에서 미짝 반쪽으로 삭제된다.
  - m3 A4: 씨앗 `(1952,703)–(2245,701)`와 연장 `(1945,700)–(2300,697)`이 D-072 purge에서 보존되고,
    clump4개까지 생성되나 양쪽 머리를 요구하는 D-063 경로가 반쪽을 거부한다.
  - m7 E4: 옅은 곡선도 `(302,1767)–(373,1767)` SLUR 씨앗으로 검출된다. `(301,1769)–(373,1767)` 후보가
    생성되나 같은 타이 전용 경로에서 선택되지 않는다. 이진화로 전부 사라졌다는 가설은 틀렸다.
  - m10 E5: 작은 호의 SHORT 씨앗 `(307,2296)–(319,2297)`은 확장 중 최소 반지름에 걸리고,
    남은 폭12px는 최소 폭14px보다 작아 `createInter`가 거부한다.
- native `CrossSystemTieFixture.java`는 실제 Part.getCrossSlurLinks에 두 후보(높은 phrase/slur와 같은 음 타이)를 공급한다.
  기존 normal/recovery 양쪽에서 "a higher phrase slur consumed the same-pitch boundary tie" 실패를 확인했다.
- 합성 2시스템 악보 fixture: 초기 정상 곡선2회는 양쪽 통과. 오선에 붙는 평평한 긴 호와 작은 시작 호 변형은 양쪽 실패.
  곡선 모양 변경이 대조군까지 바꾼 것을 확인하고 대조군을 처음 모양으로 복원했으며 재실행은 진행 중이다.
- 짝짓기 우선순위만 바꾼 로컬 후보: **191/191·타이39/43·오검출0**, m3 C5·m9 C5 복구.
  남은 m3 A4·m6 E4·m9 E5·범위 밖 m12 F3. 후보는 fixture 양쪽 통과, 원본24.932초·canonical152.
  아직 corpus·최종 검증 미실행이며 채택/완료 결과가 아니다. 반쪽 복원 후보를 추가 실험 중이다.
- 작업 브랜치에 D-073 계획과 fixture를 커밋했다. 런타임 변경은 아직 Git에 없고 Git 제외 후보 소스에만 있다.
- 시작 상태 커밋 f628b5b: 타입/테스트를 포함한5개 체크 성공, E2E 진행 중(마지막 조회 시점).

## 정식 후보와 반복 검증 (진행 중)

- 작업 브랜치 구현 커밋 `b3acfd0`. 정식 `d073b-patched` 빌드 성공; 런타임 코드가 같은 후보를 평가했다.
  이후 fixture 소스는 보강 중이며 최종 이미지 전체 suite는 아직 실행하지 않았다.
- 세 변경: 서로 유일한 같은 음/보표/휨 쌍을 일반 slur보다 먼저 매칭; 오선에 붙은 반쪽은 matched-tie 전용 표시로 제한;
  header4 IL 이내의 작은 시작 호에 최소 폭0.5 IL(일반0.7 IL)과 해당 폭 점수 적용. 상대 없는 새 후보는 버린다.
- 자체 점검: 작은 호 폭 점수를0으로 고정한 첫 후보는 기하평균 grade도0이 되어 여전히 거부됐다. 새 최소 폭에 맞춰 점수를 계산해 해결했다.
  후보의 최종 clef/accidental 해석이 달라져도 일반 slur로 남지 않도록 표시를 OMR에 저장하고 실패한 두 반쪽을 제거한다.
- `docker build --platform linux/amd64 -f omr-service/Dockerfile.audiveris -t clairkeys-omr:d073b-patched omr-service` 성공.
  각 엔진 JAR2433항목 중 기준선 대비19개(Part/SlurInter/ClumpPruner/SlursBuilder 계열)만 변경. 새19개는 양쪽 동일하다.
  엔진 간 기존 ledger recovery3개 차이는 유지된다. `jar-baseline.json`/`jar-d073b.json` 보존.
- `run_recognition_gates.py`: 악보 처리 JVM 하나씩, 컨테이너5GB/JVM3GB, 원본 timeout900초로 Clair3회 후 corpus쌍을 순차 실행.
  **final-clair-1/2/3 전부191/191·타이42/43·누락m12 F3 하나·오검출0**.
  raw SHA256 `8224a58a9824f9a9692d6004f456d4cd64a88adc0209b4198f23559da36a17ae` 동일.
- 기준선과 raw 차이는 목표5타이의 start/stop10필드뿐이다. 다만 canonical154→150이다.
  **m3 C5는 성부2→1이라 converter의 같은 성부 병합 계약에서 이어지지 않는다.** MusicXML 양쪽 타이는 맞지만 이 한 음의
  재생 병합까지 해결했다고 주장하지 않는다. converter 수정은 이번 인식 목표 밖의 후속 후보다.
- 타입(`npx tsc --noEmit`)·lint(`npm run lint`) 통과. 첫 Jest는 Docker cleanup의 문자열 계약
  `rm -rf /tmp/jdk25` 순서를 바꿔1실패/1037통과였다. 삭제 순서만 복원한 뒤 전체 **105suites/1038tests 통과**(27.048초).
  PATH에는 기존 CI venv를 사용했다. 이 실패를 기존 실패로 분류하지 않았다.
- native pairing13시나리오: 두 엔진 최종 통과. 초기 mock은 SlurInter(boolean,grade)가 above 필드를 채우지 않는 점을 놓쳐
  "opposite bow reserved"가 실패했다. mock의 isAbove를 실제 시험 방향으로 정의한 뒤 음자리표/옥타브·보표·기하·모호성·
  새 후보 일반slur 금지·최종 음높이 불일치 제거와 기존slur 보존을 검증했다.
- 합성 raster fixture는 계속 보강 중이다. 최초 긴 space-head 호는 오선 접점 사이에서 쪼개져 머리에서3.5 IL 넘게 떨어졌다.
  이 별도 기전을 해결했다고 하지 않고 기존 D-072와 같은 line-head 배치로 바꿨다. 추가로 위 타이와 긴 phrase의
  교차를 제거해 B4/D5 둘 모두를 기대하는 fixture로 유지했다. 작은 시작 호는 위치·크기를 진단 중이며 아직 최종 통과 주장 없음.
- corpus는 진행 중: 첫 Always With Me의 raw/canonical이 동일. 전체12쌍·모든 차이 조사·native최종·전체이미지·PR/CI/리뷰가 남았다.

## Corpus 원본 대조: 모노노케 m41→m42

- 12곡 중9쌍 완료 시점:8곡 raw/canonical 동일, 모노노케만 m41/m42 D♭5의 tie start/stop2필드 변화.
  나머지3쌍은 진행 중이다. baseline/candidate 환경은 Python74패키지·dpkg252패키지·엔진 의존JAR56개 전부 동일하다.
- `pdftoppm -f 2 -l 2 -r 300 -singlefile -png .../inputs/score-07.pdf .../crops/mononoke-page2`로 원본2쪽2480×3508을 렌더했다.
  전체 페이지와 m41 `(1820,2090)-(2320,2430)`, m42 `(200,2640)-(720,3000)` crop을 직접 확인했다.
- m41 오른손 온음표 화음에서 시스템 끝으로 나가는 D♭5 위쪽 호와 m42 첫 화음 앞의 대응 작은 위 호가 실제 인쇄되어 있다.
  baseline은 앞 호를 다른 반쪽에 연결하고 올바른 뒤 반쪽을 버렸다. 후보는 같은 음 짝을 우선하여 보존한다.
- 그래프2쪽: 앞 곡선 `(1962,2170)–(2276,2168)`은 기하 불변·tie=true, 뒤 곡선 `(395.1,2774.9)–(423.4,2777)`은
  기존 orphan 삭제에서 살아나 tie=true다. boundary-tie-only 새 검출 경로가 아니라 짝짓기 수정의 결과다.
- raw1103개 중 바뀐 것은 m41/m42 D♭5의 tie2필드뿐이다. canonical1053→1052, MIDI73의
  `110.113636초/2.727273초`와 `112.840909초/2.045455초`가 `110.113636초/4.772728초` 하나로 합쳐졌다.
  나머지1051음·전체길이·metadata는 동일(생성시각 제외). 인쇄 근거가 있는 개선이며 유해한 회귀로 분류하지 않는다.
- 새 fixture 정리 커밋 이후 최종 baseline/candidate native 실행은 corpus 완료 뒤 순차 실행하도록 대기 중이다.

## 자체 리뷰 보강과 최종 게이트

- 커밋 `9836d28`은 양성 fixture에 섞였던 곡선 교차를 제거했다. 위 D5 타이를 없애는 방식이 아니라 phrase의 끝을 경계 화음
  앞에 두어 **B4/D5 두 타이 모두**를 기대한다. 정상·작은 시작 호·음표수·박자·비경계 오검출도 확인한다.
- 최종 b-image fixture 비교: 실제 Part 짝짓기 및 staff-hugging 양성은 기준선 normal/recovery 모두 실패, 후보 모두 통과.
  일반 곡선과 작은 시작 호 합성은 양쪽 기준선/후보 모두 통과하므로 대조군이다. 작은 호의 새 폭 경로는 Clair m10 실제 입력으로 입증했다.
  이 구분을 하지 않고 모든 새 fixture가 기준선에서 실패했다고 주장하지 않는다.
- source review: `canBeOrphan`의 거리/마디 조건만으로는 `Page.connectOrphanSlurs`가 사용하는 마디 절반 조건 및
  내부 시스템 범위에 들어간다고 보장되지 않는다. 첫/마지막 시스템 바깥에서 새 rescue가 일반 slur로 남을 가능성을 검토했다.
  새 미짝 끝 fixture의 두 변형은 보강 전에도 양쪽 통과했으므로 **관찰된 유출/회귀는 아니다**.
- 그래도 새 반쪽의 matched-tie-only 계약을 코드 구조로 보장하도록 `13431f0`에서 내부 페이지 경계와 기존 orphan predicate를
  모두 요구했다. 위치가 안 맞으면 arcs assign 전에 제거한다. 새 반쪽의 페이지 간 복원은 범위 밖이며 기존 반쪽 매칭은 유지한다.
- 정식 `d073c-patched` 빌드 성공, 전체 suite 실행 중 새 native5개 모두 두 엔진에서 통과했다.
  이후 Clair3회와 같은 기준선에 대한12곡 후보 재실행이 순차 진행 중이다. 기존 결과로 최종 게이트를 대체하지 않는다.
- 패치의 공백뿐인 context 줄 정리 후 정식 `d073d-patched` 재빌드 성공.
  c/d의 런타임·전체앱·테스트 **40,955파일/JAR항목**과 Python패키지 비교에서 차이는 `/app/audiveris-patches/0013-cross-system-ties.patch`
  하나뿐이다. 엔진/의존성/앱 실행코드/테스트 클래스 및 소스는 모두 동일하다. 이 파일의 차이는 적용 결과가 같은 context 공백뿐이다.
- 1차 corpus12쌍 완료:10곡 raw/canonical 동일, 모노노케 인쇄타이1개 추가, truongca는 양쪽 같은3쪽 SCALE 실패.
  후자는 `No regularly spaced lines found`를 포함한 exception/SCALE126줄이 경로 정규화 후 동일하다(`failure-comparison.txt`).
- 소스 변경 후 최종 whole-image·반복·corpus·PR/CI/실제 리뷰가 아직 남아 있다. 사용자 미커밋 메모 SHA는 최초와 동일하다.

## 최종 image/Clair 통과 및 상태 커밋 CI 실패

- d073c 전체 unittest **196개 중190통과·6skip**,456.874초. 기존 보관 진단 데이터가 이미지에 없는6개만 skip이고,
  native19개는 모두 실제 실행·통과했다. 새 경계 관련5개와 기존14개를 포함한다(`image-tests-final.log`).
- 경계 제한 후 `guarded-clair-1/2/3`도 전부191/191·42/43·누락m12 F3 하나·오검출0이다.
  raw SHA8224a58a…는 제한 전3회 및 실험과 동일하다. 최종12곡 후보 재실행 진행 중.
- 상태 기록 커밋 `600ae80`의 [Security Audit](https://github.com/landfill/ClairKeys/actions/runs/35457038996/job/105934061870)이 실패했다.
  로그 원인: `npm audit --audit-level high --json`의 registry.npmjs.org `/security/audits/quick` 요청이 HTTP400 Bad Request로 종료됐다.
  취약점 판정 통과/실패 결과가 아니라 감사 endpoint 오류다. 검사 기준/의존성을 변경하지 않고 해당 job 재실행을 요청했다.
  재실행 결과 확인 전 이 커밋의 CI를 전체 성공으로 표시하지 않는다. 원본 로그는 `main-security-failure.log`에 보존했다.

## 최종 corpus 및 외부 감사 오류의 상세

- `run_guarded_gates.py` 완료: 기존 동일 이미지의 fresh baseline12개에 대해 최종 c 후보12개를 다시 실행했다.
  11곡 raw/canonical 및1곡 실패는 경계 제한 전과도 동일(`guard-effect-comparison.json`).
- `621b576` 상태 커밋의 Security Audit도 quick endpoint400으로 실패했다. 첫 `gh run rerun35457038996 --job105934061870`은
  원래 workflow의 E2E가 진행 중인 상태에서 `job cannot be rerun`으로 거절됐다. 재실행이 실제 시작됐다고 세지 않는다.
- 로컬 동일 `npm audit --audit-level high --json`도 실패했다. npm10.9.3 debug 로그는 먼저
  `POST /-/npm/v1/security/advisories/bulk →503`, 이후 구형 quick fallback→400을 보여준다.
  CI npm10.9.8 report는 quick400과 endpoint retirement notice를 담는다. package.json/lock 변경 없음.
- 공식 [bulk API 문서](https://api-docs.npmjs.com/#tag/Audit)를 확인했다.
  [npm 점검 공지](https://status.npmjs.org/incidents/6kdnyl79gkxs)는17:00–19:00UTC 같은 시간대의 website/publishing 점검이며,
  감사 서비스는 영향 대상으로 명시되지 않아 이번 감사503의 원인으로 단정하지 않는다.
- 검사 기준을 낮추거나 결과를 강제로 성공 처리하지 않는다. 실패 job을 workflow 종료 후 재실행하고 실제 결과로 판단한다.

## PR 생성과 감사 API 분리 재현

- 최신 main 상태 기록을 작업 브랜치에 merge한 `b8de0a8`을 push하고 [PR172](../reviews/PR-172.md)를 non-draft로 생성했다.
  `git diff --exit-code a8d6b28 HEAD -- omr-service src fixtures`는0/빈 diff였다. main으로 feature를 병합한 것이 아니다.
- 최소요청 `POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`, JSON `{"lodash":["4.17.21"]}`도
  HTTP503·`{"error":"We are currently performing maintenance. For more info go to https://status.npmjs.org"}`를 반환했다.
  이 응답은 코드/lockfile 변경과 무관한 감사 서비스 유지보수를 직접 확인한다. 상태 페이지의 공지 종료는19:00UTC(9/20 04:00KST) 예정이다.
- PR172 Security Audit job105936203747도 같은 quick400이다. 상태 커밋 da53a24도 같은 시점 보안감사 실패를 확인했다.
  모든 실패는 복구 후 검사 결과를 확인하기 전 성공으로 세지 않는다. 최신 리뷰/CI 상태는 PR172 기록과 GitHub를 따른다.

## 외부 blocker 확인 — 현재 요청의 1차 goal turn

- PR172 head b8de0a8의 실제 Codex 리뷰 완료·+1·threads0, hosted Jest1038·E2E2개 포함 비감사 CI 통과.
- Security Audit만 유지보수 때문에 남았다. 실제 재실행 attempt2/job105937786498도 동일 quick400으로 실패했다.
- 로컬 필수검증·자체리뷰·PR생성·actual review 대응은 모두 수행했다. 소스 수정으로 해결할 남은 finding은 없다.
- 사용자 메모 SHA36207439… 동일, 작업 컨테이너0, 브랜치/검증 이미지 보존. 병합·운영 VM 접근·배포 없음.
- 이후 goal turn은 동일 blocker의 지속 여부와 API복구/CI재실행만 확인한다. 이 기록은 완료 선언이 아니다.
