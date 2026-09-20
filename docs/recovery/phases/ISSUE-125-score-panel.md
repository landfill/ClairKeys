# ISSUE-125 — PC 선택형 악보 패널

Status: `DONE` — 구현·검증 후 PR173 병합; 운영 OMR 활성화·이슈 종료는 별도 승인 범위
Depends on: 기존 canonical playback; #126/#127 재개 불필요

## Objective

PC에서 아이콘으로 켜는 양손 악보·앱 운지·현재 마디 전체 강조와 자동 스크롤을 제공한다.
최초 OFF, 같은 브라우저 선택 유지, 접근성 이름/pressed 상태. 넓은 PC는 fine/none 입력을 허용하고 coarse 모바일은 제외한다. 모바일과 MusicXML 없는 기존 악보에는 옵션이 없다.

## Work stages

1. D-074와 최신 #125 기준으로 설계; 실제 생성 XML과 합성 복합 fixture로 렌더러·매핑 검증.
2. 동작 변경 전 실패 테스트. OMR은 기존 시간 계산으로 XML 위치와 canonical 음표 인덱스의 작은 매핑을 생성한다.
3. 앱이 XML+매핑을 비공개 보관·소유권 조회·악보 삭제와 함께 제거. 원본 PDF는 기존 임시 정리 유지.
4. 실제 플레이어 계산 운지를 XML에 적용하고 PC 3단/2단 전환. 기존 playhead와 140px/s 유지.
5. 격리 Docker 빌드·실행(OMR 컨테이너5GB/JVM3GB/처리1개), 실제 브라우저 신규 업로드 및 회귀 시나리오.
6. focused/full Jest, typecheck, lint, build, 서비스 테스트, 별도 담당 독립 검증 및 주 에이전트 실행 근거 확인.
7. Lore 커밋, non-draft PR, 최신 head CI와 실제 리뷰 대응. 상태 근거는 main 직접 기록 절차.

## Completion criteria

- 신규 MusicXML 비공개 저장·권한·조회·삭제·오류 및 기존 악보 호환 테스트 통과. 완성 JSON UTF-8은4MiB 이하로 제한해 호스팅 응답한도 안에 둔다.
- 양손 보표·앱 계산 운지 일치·타이·다성부·쉼표·잇단음표·템포 및 속도 변경 매핑 검증.
- PC 초기 OFF/토글/새로고침/일시정지/재개/탐색/곡 끝/자동 스크롤 및 모바일 기존 화면 브라우저 확인.
- Docker·자동 테스트·독립 검증·최신 CI/실제 리뷰 근거 저장. 미해결 actionable feedback 없음.
- Goal은 병합 승인만 남으면 완료 가능하나 phase DONE과 이슈 종료는 병합 전 선언하지 않는다.

## Exclusions

작은 PC 창, 모바일 3단, 악보 클릭 이동·편집(향후 계획에도 없음), PDF 보관,
전체 표기 JSON 중복, 기존 악보 소급, #126/#127 재개, 운지 알고리즘 개선, 운영 접근/배포/병합/이슈 종료.

## Ownership

주 에이전트: 설계·통합·저장/권한·UI·Docker/브라우저·PR/리뷰 및 기록.
Gemini 3.8 Flash: OMR XML/위치 매핑·서비스 응답 및 Python 회귀 테스트.
독립 검증 담당: 구현 파일 수정 없이 권한/삭제/동기화/운지/화면 회귀 검증(모델 확인 후 배정).

## Progress

- 2026-09-20: ed0a645의최종CI/실제리뷰를확인하고사용자승인으로PR173을70eb25e에병합했다.
- 2026-09-20: 추가승인된private artifact DBmigration/RLS/cascade를선적용하고Vercel웹Production배포·HTTP/Chromium스모크를확인했다. 기존행수불변.
- 2026-09-20: 병합commit후6checks모두success. 운영OMR VM은승인범위밖으로미배포이며현재새MusicXML전달은비활성이다. #125는OPEN을유지한다.
