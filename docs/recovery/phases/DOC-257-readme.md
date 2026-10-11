# 루트 README 현행화 (#257)

Status: DONE
Date: 2026-10-11

## Objective

루트 README의 기능·변환/저장 흐름·개발 절차·한계를 현재 코드에 맞춰 신규 사용자와 개발자가 잘못된 안내를 따르지 않게 한다.

## Work stages

1. README의 설명을 라우트·재생기·OMR upload/finalize·설정·package scripts·CI와 대조한다.
2. 루트 README만 수정한다. 상세 환경·DB·Storage 절차는 원본 가이드에 연결하고, 해당 문서의 낡은 설명은 후속 후보로 기록한다.
3. 수정 문서의 링크·앵커·명령·경로와 주요 수치를 검증하고 validation에 근거/한계를 남긴다. 문서 전용 변경이므로 전체 Jest·E2E·빌드는 반복하지 않는다(AGENTS).
4. non-draft PR의 문서 전용 CI·리뷰를 확인하고, 대상 PR의 사용자 승인 후 병합한다.

## Completion criteria

- 구현된 기능과 미검증/미구현/기술 제약을 구분하며 코드와 일치한다.
- OMR callback/폴링 fallback, 공개 JSON과 권한 검사하는 MusicXML, 인메모리 작업의 한계가 정확하다.
- 신규 DB에 개발용 db:push·seed·기존 Storage 초기화를 무조건 권하지 않는다.
- 링크·명령 대조 결과가 validation에 있고 PR CI·리뷰가 해결된다.
- 사용자 승인 후 병합한다.

## Progress

- 2026-10-11: 사용자 요청으로 #257 등록, 최신 main에서 전용 브랜치 생성. 루트 README를 대상으로 하며 다른 README/상세 문서와 제품 코드는 범위 밖이다.
- 2026-10-11: [검증 원본](../validation/2026-10-11-doc-257-readme.md)에 코드 대조·링크·명령 확인·로컬 리뷰를 회수했다. 사용자 추가 지시 "README 직접 푸시"를 우선해 원래 계획의 PR/PR CI 경로를 사용하지 않고 `dcf6585`로 main에 직접 반영했다. Markdown만 변경했고 #257 종료를 확인했다. 실행 코드·운영 설정 변경과 미검증 범위는 없다기보다 이번 범위 밖이며, 문서 전용 검증 기준으로 완료했다.
