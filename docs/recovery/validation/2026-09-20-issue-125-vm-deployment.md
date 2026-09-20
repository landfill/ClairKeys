# PR173 OMR VM 배포 및 브랜치 정리 — 2026-09-20

Status: IN_PROGRESS; VM 배포·정리는 사용자 명시적 요청으로 승인됨. 이슈 종료는 미수행.

## 브랜치 정리

- fetch 후 local/remote codex/issue-125-score-panel 모두ed0a645, 최신main대비고유0 확인.
- 사용자 명시적 정리 지시로 원격삭제→main확인→로컬삭제. 사용자변경은stash/reset하지 않았다.
- landfill/issue125-status-records tip680fa00도고유0/원격없음 확인후로컬삭제.
- detached50042ca 임시worktree clean/고유0 확인후orca worktree rm으로정리했다.
- 사용자history메모/.bkit/.gemini/.pdca상태파일manifest5개가정리전후모두동일. 현재branch main하나와원래worktree만남음.
- 삭제된branch를참조하던PR본문근거링크는immutable merge70eb25e로수정했다.

## VM 사전 확인 및 빌드

- StrictHostKeyChecking=yes/BatchMode SSH,기존등록key/host사용. hostname vm-naver-20260820145930 확인.
- 기존service active,image d915599b7ca80fa35a9a0888680f21401bb959f0193b63b37a3702914864764a,checkoutab844ba clean,JVM0,여유79GB.
- 기존env(mode600)/unit파일은값을출력하지않고유효성/해시확인. 기존processing1파일manifest4f04c969… 보존대상.
- 정확한merge70eb25e6a50a9b89acaf673b590d57f572200123로배포checkout이동. Docker형식/5GB상한/revisionlabel로이미지빌드성공.
- 새image afa179723bc21f2a2b06d8f53251eb8bfc22a8372bb4dec4a875711fe4549d6f;HEALTHCHECK포함. current/service는아직이전이미지.
- 운영env없이networknone/memory5GB,fixture/source readonly mounts와/omr-service→/app경로로전체tests실행중.
- 이전local issue125-final Docker태그는현재daemon에없음. 새VM실행파일을Git커밋과직접대조하고,엔진/compiledclasses는직전운영이미지와비교한다. 검증을생략하거나같은이미지라고주장하지않는다.
- 로그인된운영브라우저확인. 전환후실제검증용신규업로드→callback→private XML저장→패널표시를확인할예정이며기존사용자악보는변경하지않는다.

## 근거와 남은 단계

실행파일/로그는Git제외 local-test-data/results/issue125-vm-deploy-2026-09-20 및VM /tmp/pr173-*.
남은 단계: 전체tests/무결성, idle재확인·rollback태그·전환,외부health/auth,운영업로드와UI,설정/데이터보존확인.
