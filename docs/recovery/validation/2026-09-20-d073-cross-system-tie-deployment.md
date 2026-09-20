# PR172 시스템 경계 타이 (D-073) VM 배포 — 2026-09-20

## 현재 상태

- 사용자 "브랜치 정리, vm 배포" 승인에 따라 PR172 병합본 `ab844baa304786d84c2b8227052011469b638ee5` 배포 진행 중.
- 로컬·원격 작업 tip b8de0a8 모두 최신main 포함/고유0 확인 후 원격삭제→main확인→로컬삭제 완료.
  기존 사용자 history 메모 SHA25636207439c88183b72476b4c98aa6962ec9a5b4439f4837711699e5d177f8a947 보존.
- VM사전점검: hostname일치, active/healthy, checkout867513c clean, JVM0, 디스크여유81GB.
  직전운영 image5af0b7967e8e7d6e3f2fe3d02fc92ce5cebef4dc6513bc5bacb9b2b3a07b87c4.
- env/unit 내용은 출력하지 않고 hash만 확인(7c903556…/bbc2f714…). 기존processing1파일74577bytes,
  manifest4f04c969…를 보존 기준으로 저장했다. 운영 unit/env는 수정하지 않는다.
- 배포checkout을 exact merge에 detached 이동하고 Podman Docker형식 revision label 빌드 진행 중.
  검증 전에는 current tag/서비스를 바꾸지 않는다.
- 근거(Git제외): `local-test-data/results/d073-deploy-2026-09-20/`; 원격 `/tmp/pr172-*`.

## GitHub 이슈 동기화 누락 보완

- 사용자 지적에 따라 #134 본문을9/20 기준으로 갱신했다. 이전9/6 수치에서 운영191/191·37/43 및 PR172 로컬42/43,
  남은m12/m3 C5 성부병합, 배포진행중을 구분하고 최초제보/첨부는 보존했다. 완료 전 닫지 않는다.
- [진행 댓글](https://github.com/landfill/ClairKeys/issues/134#issuecomment-5746403043).
- 열린 #121/#125/#126/#127/#130/#149의 본문도 실제 코드/phase와 대조해 현재 완료범위·미착수·보류 조건을 갱신했다.
  #146은이미CLOSED이며 악보패널을 제외한 UI개편이다. #125를 완료로 닫지 않았다.
- 배포 완료 후 #134의 운영 수치/체크박스와 배포 결과 댓글을 갱신한다. 수동 배포 검증을 #121 지속관측 또는 #149 전체개발환경 완료로 세지 않는다.
