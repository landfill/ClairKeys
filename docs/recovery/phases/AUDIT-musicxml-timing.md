# AUDIT — MusicXML의 박 위치와 시간 변환

Status: `DONE`
Depends on: P0-B, #134 VM reproduction

Progress (2026-09-05): PR #141 최종 head `bd35836`의 hosted CI 전체 통과 후 `a7cf0ff`로 병합했다.
격리 VM Docker 형식 이미지에서 실제 MXL smoke와 서비스 테스트 46개 통과. 원래 CI 한 실행은
apt 브라우저 의존성 설치 지연으로 취소 후 재시도했다. 이후 정확한 merge commit의 Docker 형식 이미지를
운영 배포했고 image ID, 외부 200/401, 실제 converter smoke와 HEALTHCHECK healthy를 확인했다.
merge commit의 post-merge 6개 체크도 전부 통과했다. #134의 인식 결과를 음악적으로 교정했다는 뜻은 아니다.

## Objective

MusicXML cursor를 먼저 박 단위로 해석한 뒤 전역 템포 지도에 따라 초로 변환한다.
마디 중간 변경·offset·여러 part의 같은 마디 시작을 일관되게 처리하고, 인식한 박자표보다
길어진 마디와 미지원 반복 순서를 조용히 정상 결과처럼 취급하지 않는다.

## Work stages

1. 중간 템포·offset·sounding duration·multipart·사용자 override 회귀를 먼저 추가한다.
2. 유리수 quarter 위치를 수집하고 전역 piecewise tempo 적분으로 start/duration를 만든다(D-048).
3. #134 실제 MXL을 고정하고 overfull measure 진단을 metadata에 보존한다.
4. 플레이어에서 진단을 설명하되 원본 박자/음표 길이는 추측으로 고치지 않는다.
5. corpus/전체 Jest/typecheck/lint/build, PR 체크와 VM 배포 후 변환 smoke를 기록한다.

## Completion criteria

- 마디 내부 템포 변경이 그 이전 음을 재타이밍하지 않으며 변경을 걸친 음은 올바르게 적분된다.
- sound offset 우선순위와 direction offset의 sound=yes 의미를 따른다.
- 중간에 처음 등장한 템포는 곡 시작의 tempoSource=score를 조작하지 않는다.
- 사용자 tempo override는 기존처럼 고정 템포를 적용한다.
- controlling part는 같은 마디 경계를 공유하고 divisions/backup/forward/chord 위치가 일치한다. 명시적 non-controlling part는 독립 경계를 보존한다.
- 기존 golden corpus를 유지하고 #134 인식 XML의 모순을 검사·표시한다.
- 기존 저장 JSON을 소급 교정했다고 주장하지 않는다.

## Out of scope

- Audiveris가 놓친 음표·점·음높이의 복원, 자동 6/8→9/8 교정, 기존 운영 데이터 수정.
- 반복·ending·D.C./D.S.의 재생 순서 전개(미지원 진단만 추가).
- 조표·타이 식별 계약 변경과 페달 추론.
