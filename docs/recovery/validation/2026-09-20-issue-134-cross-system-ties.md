# #134 시스템 경계 타이 5개 — 진행 기록 (2026-09-20)

## 범위와 현재 상태

- 사용자 승인: m3 A4/C5, m6 E4, m9 C5/E5의 로컬 원인 추적·fixture·구현·Docker 검증·자체 리뷰·PR 생성·CI/리뷰 대응.
- main 병합, 운영 VM 접근·배포, m12 교차 및 D-065 후속 제외. 목표는 이벤트191/191·타이42/43·오검출0이며 아직 미달성이다.
- main `98e1eae`에서 `codex/issue-134-cross-system-ties` 생성. fetch 후 main 뒤처짐0.
- 기존 사용자 history 메모 SHA256 `36207439c88183b72476b4c98aa6962ec9a5b4439f4837711699e5d177f8a947` 보존.
- Docker29.4.0 실행 중, 실행 컨테이너0 확인. 기존 이미지 보존.
- 로컬 산출물: Git 제외 `local-test-data/results/issue134-cross-system-2026-09-20/`.

## 기준선 재현

- 이미지 `clairkeys-omr:d072b-patched` (`b429399a1cf9`), 운영 동등 엔진 기준선.
- 명령: `docker run --rm --platform linux/amd64 --memory=5g`로 결과 폴더를 `/work`, 원본 폴더를 `/scores:ro`에 마운트한 뒤
  `PYTHONPATH=/app python3 /work/run_case.py /scores/Clair_de_Lune_easy_300dpi.pdf /work/baseline`.
- 실제 wrapper·converter 사용, API/callback 쓰기 없음. 처리25.194초, 자식 maxRSS1,027,764KiB.
- 원본 기준표 평가: **191/191·타이37/43·누락6·오검출0**, canonical154·tempo69·9/8.
- 누락 목록: m3 A4/C5, m6 E4, m9 C5/E5, m12 F3. baseline/evaluation.json·summary.json·events.json·중간 OMR 보존.

## 다음 검증 / 한계

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
