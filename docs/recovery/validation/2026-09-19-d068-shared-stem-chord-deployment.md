# 2026-09-19 — #134 D-068 공유 기둥 화음 분리 OMR VM 배포 (PR167)

## 최종 결과

- 사용자 지시 "그럼 병합. 브랜치 정리, vm 배포"에 따라 PR167 병합·브랜치 정리·운영 VM 배포를 수행했다.
- 병합/배포 커밋: `983caf9ecd25c35b9c7f986fbe1f7deb99d45d41` (검증 head `cacce3a`).
- 운영 이미지: `b28cc02d434facaeff0982910c680f871d11849591d8a35799d6197cac110bc1`.
- 전환: **2026-09-19 10:05:33 KST**. systemd active, container healthy, 외부 health200·무인증 process401.
- 이전 이미지 `721ccc1095f33d9493963a85b5ee2626bf160771c77cb85c70bb13317709fc0f`(PR166)를
  `localhost/clairkeys-omr:rollback-pr167-20260919`로 보존했다.
- 이미지 **187개 중181통과·6skip**(266.263초), native10개 모두 실행. 네 패치 클래스가 양쪽 엔진에서 로컬 d068b 검증본과 같다.
- 원본 PDF 업로드·운영 앱 재변환은 하지 않았다. 로컬185/191을 운영에서 직접 재평가한 것으로 표현하지 않는다.

## 병합·브랜치 정리

- 사용자 승인 후 head cacce3a·필수 CI·리뷰·CLEAN/MERGEABLE를 다시 확인했다.
- `gh pr merge 167 --merge --match-head-commit cacce3a…`에 Lore 형식 subject/body-file을 지정해983caf9로 병합했다.
- 병합 커밋 check-runs **6/6 성공**(E2E Tests, Post-merge build/tests, Security Audit, Run Tests, Lint)을 전환 전에 재확인했다.
- fetch 후 local main을 fast-forward했다. 로컬/원격 작업 tip 모두 cacce3a이며 main 대비 고유 커밋0·ancestor임을 확인했다.
- 사용자의 직접 브랜치 정리 지시에 따라 원격 삭제 → local main 이동 → local branch 삭제 순서로 정리했다.
  미커밋 `validation/2026-09-13-handoff-history.md`는 원문 SHA256이 전후 동일하고 커밋에 포함하지 않았다.

## 범위와 사전 점검

- 이전 운영 b15d0fd..983caf9의 서비스 변경은 Dockerfile·0008 engine patch·Java/Python fixture/test 총5파일이다.
  src, requirements, deploy unit, env는 바뀌지 않았다.
- 기존 SSH 호스트키를 엄격 확인했고 대상은 `vm-naver-20260820145930`이다.
- 서비스 active·이전 이미지 running/healthy, 디스크85GB 여유, `/opt/clairkeys-deploy` b15d0fd 변경0.
- image tests 전 JVM(java/javac/Audiveris)0·processing 기존1개. env mode600, production/secret/callback HTTPS/concurrency1 구성을
  값 노출 없이 확인했다. env·unit 해시 및 processing 목록을 전환 직전 재확인용으로 저장했다.

## 정확한 병합 커밋 빌드

```sh
git -C /opt/clairkeys-deploy fetch origin main
git -C /opt/clairkeys-deploy checkout --detach 983caf9ecd25c35b9c7f986fbe1f7deb99d45d41
cd /opt/clairkeys-deploy/omr-service
podman build --format docker \
  --label org.opencontainers.image.revision=983caf9ecd25c35b9c7f986fbe1f7deb99d45d41 \
  -f Dockerfile.audiveris \
  -t localhost/clairkeys-omr:983caf9ecd25c35b9c7f986fbe1f7deb99d45d41 .
```

- checkout 및 빌드 뒤 변경0. current 태그는 이 단계에서 건드리지 않았다.
- SHA256 검증 **14건 OK**, patch 적용12줄, FAILED/reject/fuzz0. Docker HEALTHCHECK와 정확한 revision label을 확인했다.
- 초기 metadata 검사 스크립트가 Podman JSON의 `Healthcheck`를 `HealthCheck`로 읽어 assertion 실패했다.
  실제 이미지의 HEALTHCHECK는 존재했고 JSON key를 바로잡아 사전 검사와 이후 전체 검증을 성공시켰다. 엔진/빌드 실패가 아니다.

## 이미지 검증

```sh
podman run --rm --network none --memory=5g \
  -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro \
  --entrypoint sh localhost/clairkeys-omr:983caf9ecd25c35b9c7f986fbe1f7deb99d45d41 \
  -c 'ln -s /app /omr-service && cd /app && python3 -m unittest discover -s tests -v'
```

- **187 total / 181 passed / 6 skipped**, 실패/오류0, 266.263초.
- native10개 모두 skip 없이 ok. 교차 보표 graph 제어, 점2분·점4분 분리, 일반2도 제어, OMR 저장/재로딩 및 기존 점·빔·타이 회귀 포함.
- skip6개는 보관된 로컬 진단 산출물이 이미지에 없는 경우다. runtime 환경 파일을 테스트 컨테이너에 넘기지 않았다.
- 아래 네 클래스는 **normal/recovery 모두** 로컬 `d068b-patched`(`23843796…`)와 SHA256이 동일하다.

| 클래스 | SHA256 |
|---|---|
| SymbolsLinker | 24516acfb886067f3e4fb54369eec5cc70affc5123af53dc9db89c45cecdd5c4 |
| HeadChordInter | f7ea68a9d9ab3767e849244eff2823abfe75ec96ba094401be97901f878b34a1 |
| AbstractBeamInter | 59b486a51ae5c8b56df09c4e3ba305dd967779368396274122b9bd194448790d |
| SlurInter | a6349c7e2237df6bcb201c78bb14934102c1295ecf129c7276c04a80d6077584 |

## 전환과 사후 확인

- 한 스크립트에서 JVM0, processing 목록 동일, env/unit 해시 동일, checkout983caf9·clean,
  운영/current image721ccc10 및 검증 대상 image b28cc02d를 재확인했다.
- 이전 image를 rollback-pr167-20260919로 태그하고 검증 image를 current로 태그한 뒤 `systemctl restart clairkeys-omr` → exit0.
  재시작/health 실패 시 이전 image로 복원하는 실패 경로를 준비했으나 실행할 필요가 없었다.
- 전환 후: active·healthy, running image=current=b28cc02d, revision983caf9, rollback image721ccc10 확인.
- 외부 `http://101.79.16.73:3000/health`200, 무인증 `POST /process`401(전환 전/후 모두).
- JVM0·processing1개 유지. env·unit 해시 동일, deploy checkout983caf9 변경0, 전환 이후 journal error/traceback/exception **0줄**.
- env·secret·unit·ingress·사용자 데이터는 변경하지 않았다.

## 롤백

```sh
podman tag localhost/clairkeys-omr:rollback-pr167-20260919 localhost/clairkeys-omr:current
systemctl restart clairkeys-omr
```

롤백 뒤 image ID·health·무인증401을 다시 확인한다. 네 패치 클래스는 이미지 단위로 함께 되돌린다.

## 근거와 한계

- VM `/tmp/pr167-build.log` / `pr167-image-tests.log`를 로컬 `local-test-data/results/d068-deploy-2026-09-19/`에 회수해 해시 일치를 확인했다.
  - build: `3e6d501c48c58363cdad94acb83a0ff1c43eb03ada41fee64daa7cbb56c742db`
  - tests: `5db9339c71a2777dbcdd29807afabc9f226203df0f8841c23fbbd77843bbb618`
- VM `/tmp` 로그는 삭제하지 않았다. 이전 운영 이미지와 로컬 기준선 이미지도 보존했다.
- 운영 원본 PDF 재변환, 웹 업로드→callback→player E2E는 미실행이다. 기존 저장 악보는 자동 갱신되지 않는다.
- 로컬 검증은185/191·타이30/43이며 m1 점2·m3 둘잇단4·타이13누락은 남아 있다. 현재 배포를 모든 인식 오류 해결로 표현하지 않는다.
