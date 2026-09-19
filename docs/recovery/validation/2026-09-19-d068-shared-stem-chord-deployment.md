# 2026-09-19 — #134 D-068 공유 기둥 화음 분리 OMR VM 배포 (PR167)

## 승인과 대상

- 사용자: "그럼 병합. 브랜치 정리, vm 배포" — PR167 병합·브랜치 정리·운영 배포 승인.
- 정확한 병합 커밋: `983caf9ecd25c35b9c7f986fbe1f7deb99d45d41`. 검증된 PR head는 `cacce3a`.
- 직전 운영 image: `721ccc1095f33d9493963a85b5ee2626bf160771c77cb85c70bb13317709fc0f`, revision `b15d0fd`(PR166).
- 로컬 기준: `d068b-patched` (`23843796…`). 운영과 같은 이미지라고 간주하지 않고 네 패치 클래스와 실제 image tests로 확인한다.
- 범위: Dockerfile·0008 engine patch·fixture/test3개. `src/`, requirements, deploy unit 및 env 변경 없음.
- 원본 PDF 업로드 스모크·웹 변환은 수행하지 않는다. 배포 검증은 이미지 내 합성 native tests와 health/auth 및 클래스 대조다.

## 사전 점검

- SSH 기존 호스트키 엄격 확인, host `vm-naver-20260820145930`. 서비스 active·컨테이너 running/healthy.
- JVM0, 디스크85GB 여유, deploy checkout b15d0fd 변경0, env mode600. env/secret 내용은 출력하지 않았다.
- 사용자 로컬 history 메모는 branch 정리 전후 SHA256 동일. 두 branch tip cacce3a가 main에 포함된 뒤 사용자 직접 지시로 정리했다.

## 진행 상태

- VM의 깨끗한 `/opt/clairkeys-deploy`를 exact merge983caf9에 detached checkout한 뒤 `podman build --format docker` 진행 중.
- 이미지의 revision label을 target SHA로 고정하고 commit 전용 tag만 빌드한다. 검증 전 current tag/운영 컨테이너는 바꾸지 않는다.
- 다음 gate: 전체 image tests(참조 fixtures/src RO mount), 네 클래스 normal/recovery hash 대조, merged-commit CI 확인,
  전환 직전 idle/기존 이미지 확인 → 이전 image rollback tag 보존 → current tag 전환·restart → health/auth/image/로그 확인.
- 로그 위치: VM `/tmp/pr167-build.log` 및 이후 `/tmp/pr167-image-tests.log`; 로컬 `local-test-data/results/d068-deploy-2026-09-19/`(Git 제외).
