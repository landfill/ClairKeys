# PR173 OMR VM 배포 및 브랜치 정리 — 2026-09-20

Status: DONE — 사용자 승인된 브랜치 정리·VM 배포·운영 검증 완료. 이슈 종료는 미수행.

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

## 게이트 통과 및 전환

- 전체211개 중205pass6보관진단skip(500.799s),native19개 전부실행통과.
- 새VM이미지82개추적파일과현재Git소스모두같음. 이전운영과normal/recovery JAR2433개씩·compiledtestclasses전부같음.
  앱차이는app.py/converter.py/score_artifact.py와관련테스트3개뿐이다.
- exactmerge CI6/6 및무결성marker확인. 진행JVM/최근진행job/미완료callback없음과기존data/env/unit보존을다시확인후전환.
- 실행이미지afa17972…,revision70eb25e,systemdactive/containerhealthy. rollback-pr173-20260920→직전d915599b…보존.
- 외부health200/무인증process401. 운영env/unit해시불변,기존processing1파일보존.
- [전환·게이트증거](2026-09-20-issue-125-vm-evidence.json).
- 로그인된운영앱에서검증용비공개악보1개업로드를시작했다. 기존악보는변경/삭제하지않는다. 신규악보는완료후사용자확인용으로남긴다.

## 운영 end-to-end 최종 결과

- 사용자 로그인 세션의 실제운영업로드폼으로공개원본동일SHA34d06c77… PDF를비공개검증악보로등록했다. 신규sheet86,jobc93807dd-8dd5-4ab4-801e-f1cf3e30caa4.
  원래버튼ref클릭후요청이시작되지않음을확인하고native form.requestSubmit으로정상폼처리기를실행했다. 중복업로드는하지않았다.
- callback delivery_status=delivered,processingcompleted100%. /status에artifact/animation본문이없고 /result에newartifact가있음을실제HTTP로확인.
- 운영저장artifact102763bytes,17마디/191mapping/150canonical. 모든mappingindex유효·canonical150전부cover.
  XML SHA2172d61013421fbfd1a6b8f51840f4bf87f65c3f7d16e43acdac54942aef9cbe가VM결과와DB조회에서같음.
- notes전필드/tempo69/timeSignature9/8/duration이기존검증baselineguarded-clair-2와동일. 인식·재생을고친것으로표현하지않는다.
- owner scoreGET200/private,no-store, isPublicfalse/hasScoretrue. anonymous sheet403/score401.
- 실제PC첫토글OFF→ON/SVG1/양손운지·마디강조표시,새로고침ON유지,End탐색measure16/scrollTop971,Home복귀.
  음량0에서재생시계진행→47초/measure11일시정지;토글OFF/ON에도47초유지. 실제3단화면을시각확인했다. 청취검증은하지않았다.
- 브라우저토글원래null/음량0.5/세션종료상태로복원했다. [검증악보](https://clairkeys.vercel.app/sheet/86)는사용자확인용으로남겼으며기존악보삭제·수정없음.
- 원본job디렉터리는완전히삭제됨. 기존processing1파일/env/unit해시불변,checkoutclean,JVM0,active/healthy,journalerror0. 외부health200/무인증process401 재확인.
- local/remote작업branch모두없음,main만남음. 사용자파일manifest5개정리후에도동일. 이슈125OPEN유지.
- [VM전체테스트로그](2026-09-20-issue-125-evidence/vm-image-tests.log), [전환/운영/브라우저증거](2026-09-20-issue-125-vm-evidence.json).
  실제스크린샷과fullresult는사용자정보보호를위해Git제외local-test-data에만보존하며repo에는metrics/hash만기록했다.

## 롤백

`podman tag localhost/clairkeys-omr:rollback-pr173-20260920 localhost/clairkeys-omr:current` 후 `systemctl restart clairkeys-omr` 및 image/health/auth확인.
직전d915599b…이미지와기존env/unit을보존했다. 실제롤백전환은수행하지않았다.
