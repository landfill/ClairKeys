# 토토로 단독 재업로드

Date: 2026-10-25 KST
Scope: 사용자 요청 "토토로만 삭제후 다시 올려줘". 코드·배포 변경 없음.

## 실행 결과

- 기존 토토로 104를 새 토토로 [106](https://clairkeys.vercel.app/sheet/106)으로 교체했다.
- 보관 원본 `local-test-data/scores/My_Neighbor_Totoro_2pages_300dpi.pdf`를 앱 업로드 양식으로 새로 제출했다.
  이전 [빠르기 지정 근거](2026-10-17-manual-tempo-reupload.md)에 따라 4분음표 129 BPM을 수동 입력했다.
  제목 My Neighbor Totoro, 저작자 Joe Hisaishi, 애니메이션 카테고리·비공개를 유지했다.
- 새 변환 완료·연습 링크 생성 및 106 재생 화면의 `♩=129 (직접 입력)`, 길이 1:23을 확인한 뒤 기존 104를 삭제했다.
  삭제 모달의 2026-10-17 08:44:42 업로드를 대조하고 앱의 영구 삭제 절차를 사용했다.
- 목록에서 104 링크가 사라지고 106이 남는 것을 확인했다. 총 8개에서 7개가 됐고
  다른 여섯 곡 105·103·99·95·94·93 링크는 그대로 남아 있다.
- 새 결과에도 `1마디` 리듬 확인 경고가 남는다. 재업로드를 OMR 리듬 교정으로 표현하지 않는다.

## 방법·검증·한계

- 세션 시작 `git fetch origin` 성공, main·clean, `main..origin/main=0` 확인.
- ego-browser skill v2.1.0을 읽고 TaskSpace 2 하나로 업로드·완료 확인·삭제를 진행했다. 종료 시 `finish({keep:[]})` 완료.
- `setInputFiles`, 수동 BPM·단위·카테고리 입력, 변환 시작, 완료 링크 및 재생 화면 확인, 기존 악보 삭제 후 링크 detached 확인 PASS.
- 변환 중 완료 링크 대기 45초 1회 timeout 후 다음 확인에서 완료됐다. 업로드 중복 제출 없음.
  BPM text selector는 본문에 두 곳이 있어 ambiguous였으며 현재 snapshot의 재생 화면 값으로 확인했다.
- 증거 화면(Git 제외): `local-test-data/results/totoro-2026-10-25/new-106.png`, `library-complete.png`.
- 운영 DB 직접 조회·수정, 기존 Storage 객체 정리 확인, 연습 기록 수 확인, 청취·전체 악보 채점은 하지 않았다.
  UI의 삭제 결과와 새 변환 완료를 확인한 범위이며, 코드 변경이 없어 Jest·tsc·lint·E2E·build를 반복하지 않았다.
- 편집 문서 로컬 링크 32개 대상 존재 확인 PASS, `git diff --check` PASS(문서 전용 검증).
