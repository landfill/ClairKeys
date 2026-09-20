# PR172 시스템 경계 타이 (D-073) VM 배포 — 2026-09-20

## 최종 결과

- 사용자 승인에 따라 PR172 브랜치 정리·VM 배포·운영 검증을 완료했다.
- 배포 commit `ab844baa304786d84c2b8227052011469b638ee5`, image
  `d915599b7ca80fa35a9a0888680f21401bb959f0193b63b37a3702914864764a`.
  전환 시각 **2026-09-20 09:39:38 KST**.
- VM 전체196개 중190통과·6보관진단skip, native19개 모두 실행·통과. 양쪽 엔진·앱·테스트 클래스는 로컬 최종 검증본과 같다.
- **운영 원본 스모크191/191 이벤트·타이42/43·누락1·오검출0**, canonical150·9/8·tempo69.
  raw/평가 객체가 로컬 최종 검증과 같고, animation은 generated_at만 다르다.
- active/healthy, 외부health200·무인증process401, 전환 이후journal오류0. env/unit/기존processing파일 보존.
- `rollback-pr172-20260920`에 이전PR171 image5af0b796… 보존. 임시 원본PDF1/OMR2개 삭제, 잔여0.
- 사용자 요청으로 #126/#127/#130/#134/#149 마감. 미구현 범위를 구현됐다고 표시하지 않았다. 현재 열린 이슈는#121/#125다.
- 로컬 중간 Docker이미지7개 삭제·dangling cache12.97GB 회수. 최종/회귀 기준선 및 다른 프로젝트 이미지·볼륨 보존.

## 브랜치 정리·사전 점검

- fetch 후 양쪽b8de0a8의 최신main 포함/고유0 확인. 사용자 명시적 정리 지시로 원격→main확인→로컬 순서 삭제.
  history메모 SHA25636207439c88183b72476b4c98aa6962ec9a5b4439f4837711699e5d177f8a947 전후 동일.
- VM: hostname일치, active/healthy, checkout867513c clean, JVM0, 디스크여유81GB. 직전이미지5af0b796….
  env/unit은 내용을 출력하지 않고 해시7c903556…/bbc2f714…만 비교했다.
  기존processing1파일74577bytes, manifest4f04c969…를 전후 확인했다.
- exact merge checkout에서 Docker형식·revision label로 build했다. 전체 테스트 및 무결성 검증 전 서비스/current는 보존했다.
- 근거(Git제외): `local-test-data/results/d073-deploy-2026-09-20/`; VM `/tmp/pr172-*` 및
  `/data/analysis/pr172-live-O8NtU1`(XML/JSON/로그만 보존).

## GitHub 이슈 동기화 누락 보완

- 사용자 지적에 따라 #134 본문을9/20 기준으로 갱신했다. 이전9/6 수치에서 운영191/191·37/43 및 PR172 로컬42/43,
  남은m12/m3 C5 성부병합, 배포진행중을 구분하고 최초제보/첨부는 보존했다. 완료 전 닫지 않는다.
- [진행 댓글](https://github.com/landfill/ClairKeys/issues/134#issuecomment-5746403043).
- 열린 #121/#125/#126/#127/#130/#149의 본문도 실제 코드/phase와 대조해 현재 완료범위·미착수·보류 조건을 갱신했다.
  #146은이미CLOSED이며 악보패널을 제외한 UI개편이다. #125를 완료로 닫지 않았다.
- 배포 완료 후 #134 마감 본문과 배포 결과 댓글을 운영 실측값으로 갱신했다. 수동 배포 검증을 #121 지속관측 또는 #149 전체개발환경 완료로 세지 않는다.

## VM 빌드·무결성 및 이미지 정리

- 새 VM image `d915599b7ca80fa35a9a0888680f21401bb959f0193b63b37a3702914864764a`, revision ab844ba, HEALTHCHECK 포함.
- 로컬d073d와 VM: normal/recovery 각각 JAR2433항목 모두 동일, 앱79파일 동일(로컬.DS_Store 제외), 테스트 클래스17파일 동일.
  실제 병합CI6/6 및 무결성 비교가 통과한 후에만 `/tmp/pr172-*-pass` marker를 저장했다.
- 운영secret env 없이 `podman run --rm --network none --memory=5g` 전체 unittest를 통과한 뒤 전환했다.
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
- 승인된 배포의 운영 원본 모듈 스모크도 통과했다. 이슈 마감은 미구현 항목을 성공으로 바꾼 것이 아니다.

## 운영 원본 스모크 및 최종 확인

- 공개 첨부본의 로컬 동일성(SHA34d06c77…) 확인 후 임시 디렉터리만 사용했다. 실행 중인 production container에서
  실제 AudiverisProcessor와 converter를 호출했고 앱 DB·callback·사용자 악보를 쓰지 않았다.
- 선택 XML `output/meter-retry-r7nmarxt/retry.mxl`, 처리30.534초·자식 maxRSS788752KiB.
  평가191/191·타이42/43·오검출0·누락m12하나, canonical150·dots116·tempo69·65.217392초.
- 로컬 `issue134-cross-system-2026-09-20/guarded-clair-1`과 raw bytes 및 평가 객체가 동일하다.
  raw SHA2568224a58a9824f9a9692d6004f456d4cd64a88adc0209b4198f23559da36a17ae.
  애니메이션 모든 필드는 generated_at 외 동일하다.
- finally에서 임시PDF1개·이미지포함OMR2개를 지웠고 잔여0을 확인했다. 로컬 임시 다운로드본도 삭제했다.
- postflight: current=running=d915599b…, revisionab844ba, rollback5af0b796…, active/healthy, JVM0,
  기존processing1파일 및env/unit해시 불변, checkout clean, journal오류0. 외부200/401 재확인.
- 롤백: `podman tag localhost/clairkeys-omr:rollback-pr172-20260920 localhost/clairkeys-omr:current` 후
  `systemctl restart clairkeys-omr` 및 image/health/auth 확인. 실제 rollback 전환은 시험하지 않았다.
- 전체 웹 업로드→callback→플레이어 E2E와 청취는 이번 VM 스모크가 아니다. m12/C5 한계는 사용자 수용으로 마감했다.
- [GitHub 배포 결과 댓글](https://github.com/landfill/ClairKeys/issues/134#issuecomment-5746503124).
  #134 마감 본문을 운영 실측값으로 갱신했고, #121 수동 검증 근거도 PR172로 갱신했다. 닫힌 이슈는 재개하지 않았다.
