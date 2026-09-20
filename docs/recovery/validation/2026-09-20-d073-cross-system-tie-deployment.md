# PR172 시스템 경계 타이 (D-073) VM 배포 — 2026-09-20

## 현재 상태

- 사용자 "브랜치 정리, vm 배포" 승인에 따라 PR172 병합본 `ab844baa304786d84c2b8227052011469b638ee5` 배포 진행 중.
- 로컬·원격 작업 tip b8de0a8 모두 최신main 포함/고유0 확인 후 원격삭제→main확인→로컬삭제 완료.
  기존 사용자 history 메모 SHA25636207439c88183b72476b4c98aa6962ec9a5b4439f4837711699e5d177f8a947 보존.
- VM사전점검: hostname일치, active/healthy, checkout867513c clean, JVM0, 디스크여유81GB.
  직전운영 image5af0b7967e8e7d6e3f2fe3d02fc92ce5cebef4dc6513bc5bacb9b2b3a07b87c4.
- env/unit 내용은 출력하지 않고 hash만 확인(7c903556…/bbc2f714…). 기존processing1파일74577bytes,
  manifest4f04c969…를 보존 기준으로 저장했다. 운영 unit/env는 수정하지 않는다.
- 배포checkout을 exact merge에 detached 이동하고 Podman Docker형식 revision label 빌드 완료(image d915599b…).
  검증 전에는 current tag/서비스를 바꾸지 않는다.
- 근거(Git제외): `local-test-data/results/d073-deploy-2026-09-20/`; 원격 `/tmp/pr172-*`.

## GitHub 이슈 동기화 누락 보완

- 사용자 지적에 따라 #134 본문을9/20 기준으로 갱신했다. 이전9/6 수치에서 운영191/191·37/43 및 PR172 로컬42/43,
  남은m12/m3 C5 성부병합, 배포진행중을 구분하고 최초제보/첨부는 보존했다. 완료 전 닫지 않는다.
- [진행 댓글](https://github.com/landfill/ClairKeys/issues/134#issuecomment-5746403043).
- 열린 #121/#125/#126/#127/#130/#149의 본문도 실제 코드/phase와 대조해 현재 완료범위·미착수·보류 조건을 갱신했다.
  #146은이미CLOSED이며 악보패널을 제외한 UI개편이다. #125를 완료로 닫지 않았다.
- 배포 완료 후 #134의 운영 수치/체크박스와 배포 결과 댓글을 갱신한다. 수동 배포 검증을 #121 지속관측 또는 #149 전체개발환경 완료로 세지 않는다.

## VM 빌드·무결성 및 이미지 정리

- 새 VM image `d915599b7ca80fa35a9a0888680f21401bb959f0193b63b37a3702914864764a`, revision ab844ba, HEALTHCHECK 포함.
- 로컬d073d와 VM: normal/recovery 각각 JAR2433항목 모두 동일, 앱79파일 동일(로컬.DS_Store 제외), 테스트 클래스17파일 동일.
  실제 병합CI6/6 및 무결성 비교가 통과한 후에만 `/tmp/pr172-*-pass` marker를 저장했다.
- 운영secret env 없이 `podman run --rm --network none --memory=5g` 전체 unittest 실행 중. current/서비스는 아직PR171이다.
- 공개첨부를 인증 없이 다운로드해 SHA25634d06c77398470ea6f9bf15d9cd5724a0db94c904eb81107c5ca29d2f1be5478,
  630267bytes로 로컬 원본과 같음을 확인했다. 승인된 운영 스모크에만 임시 사용하고 원본/이미지 포함OMR은 정리한다.
- 사용자 "필요없는 도커이미지는 정리하라"에 따라 컨테이너 참조0 확인 후 로컬 중간 이미지7개를 삭제했다:
  d068-patched, d069-patched, d070-patched, d072-patched, d073-patched, d073b-patched, d073c-patched.
- 최종d073d·직전d072b 및 기존보존기준선(d064,d065b,d066b,d067b,d068b,d069b,d070b,d071)은 남겼다.
  bluekiwi/Postgres 이미지와 기존volume도 보존했다. VM 운영·rollback 이미지는 삭제하지 않았다.
- `docker builder prune --force`의 dangling cache 회수량12.97GB. `docker system df`상 images40.75→26.32GB,
  cache27.75→14.78GB(남은reclaimable0). 공유레이어가 있어 두 감소량을 더해 회수량으로 주장하지 않는다.
- 열린7이슈의 본문날짜/OPEN/원문보존을 API로 재검증했다. #126/#130/#134 제목도 현재 남은 문맥전달/기준운지/타이 문제로 갱신했다.

## 전환 및 사용자 마감 판단

- VM전체196개 중190통과·6보관진단skip,504.407초. native19개 전부실행·통과.
- idle/기존데이터·env/unit·CI/무결성 gate 확인 후 current를d915599b…로 전환했고 systemd active/healthy,
  외부health200·무인증process401을 확인했다. rollback-pr172-20260920은직전5af0b796…를 보존한다.
- 사용자 "126,127,130,134,149는 현재상태에서종료판단" 지시를 적용했다.
  #134는191/191·병합본42/43 등의 성과와 알려진m12/C5한계를 수용해COMPLETED로닫았다.
  #126/#127/#130/#149는 남은문맥확장/자동보존/기준운지·모델/개발환경추가구축을더추진하지않는NOT_PLANNED로닫았다.
  기존미구현체크리스트는완료체크로바꾸지않고이력으로보존했으며자동후속이슈를만들지않았다.
- API로5개CLOSED·종료사유를재확인했다. 열린이슈는#121/#125두개다.
- 승인된배포의운영원본모듈스모크는진행중이며, 이슈마감은미검증항목을성공으로바꾼것이아니다.
