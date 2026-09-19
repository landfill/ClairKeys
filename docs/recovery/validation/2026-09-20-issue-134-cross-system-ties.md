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
