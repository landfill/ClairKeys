# DOC-DB — 신규 DB 구성 문서 현행화

Status: `IN_REVIEW` — PR174 병합 후 남은 명령 지적은 PR176에서 수정·검증 완료, 후속 PR 병합 승인 대기

## Objective

빈 DB에서 현재 migration SQL·이력·MusicXML RLS를 재현할 수 있는 실행 절차를 제공한다.

## Work stages

1. 현재 Prisma schema/migrations와 기존 설치 문서 비교.
2. 원본 SQL을 psql autocommit으로 적용하고 각 성공 후 Prisma 이력 기록하는 신규 설치 안내.
3. 격리 PostgreSQL에서 문서 명령 실행, schema diff·인덱스·RLS·cascade 확인.
4. DB/Storage/배포 진입 문서 연결, 실제 코드의 Storage 공개 URL 제약 명시.
5. 문서 PR·CI·리뷰 확인. 운영 변경과 애플리케이션 보안 수정은 별도 작업.

## Completion criteria

- 현재 7개 migration을 새 DB에 적용하고 Prisma 모델과 차이가 없다.
- MusicXML RLS·정책 없음·cascade 및 concurrent indexes 유효성을 확인한다.
- 기존 DB에 최초 설치를 재실행하지 않도록 경계·업데이트 절차를 명시한다.
- 실제 검증과 미검증 범위, 남은 Storage 제약을 저장소에 남긴다.

## Progress

- 2026-09-21: PR174를56f15fb로 병합, post-merge6checks 성공. D-075 권한 문서 수정/score API13tests 통과.
- 2026-09-21: 병합 시 놓친 신규 리뷰의 psql URL/npx 누락은 PR176 c1e20a9로 수정. 최신 CI/E2E·실제 리뷰 검토 완료. [PR174 기록](../reviews/PR-174.md), [PR176 기록](../reviews/PR-176.md).
