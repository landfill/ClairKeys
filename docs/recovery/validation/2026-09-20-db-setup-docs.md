# 신규 DB 구성 문서 검증 — 2026-09-20

PR: https://github.com/landfill/ClairKeys/pull/174
Head: `5f3f3faf73bb3fae48476d68ae3b5642956403eb`

## 실행과 결과

- 현재 main에서 문서 전용 브랜치 생성. 사용자 history 수정 및 .bkit/.gemini/.pdca-status.json 제외.
- Docker `postgres:16-alpine`, 컨테이너 `clairkeys-db-docs-20260920`, 메모리512MiB, localhost55439.
  기존 컨테이너·볼륨·운영DB에 접근/변경하지 않았다.
- DATABASE_SETUP.md의 `set -euo pipefail` Bash 블록을 그대로 추출해 로컬 테스트 URL로 실행했다.
  원본 SQL7개 `psql -X -v ON_ERROR_STOP=1 -f` 적용 후 각 `prisma migrate resolve --applied` 성공.
- `prisma migrate status`: 7 migrations, Database schema is up to date.
- `prisma generate`: Prisma Client6.19.3 생성 성공.
- `prisma migrate diff --from-url <local> --to-schema-datamodel prisma/schema.prisma --exit-code`: exit0, No difference detected.
- SQL 확인: SheetScoreArtifact RLS=true, policies=0, PK(sheetMusicId), FK UPDATE/DELETE CASCADE.
- SheetMusic 인덱스6개 전부 indisvalid=true: pkey, provenance, omrJobId unique, userId/updatedAt,
  isPublic/createdAt, categoryId/isPublic/provenance.
- `git diff --cached --check` 성공. 기존 migration SQL 변경 없음.

## 자체 검토와 한계

- 최초 설치를 기존 DB에 재실행하지 않도록 구분하고, concurrent SQL에 transaction wrapper를 금지했다.
- Storage 코드 확인 중 기존 public URL 의존성 발견. 문서 초안의 private 버킷 무조건 권장을 수정했다.
  현행 공개 악보 경로는 public URL을 반환하며, public 버킷의 비공개 JSON 직접 접근은
  앱 권한 검사로 차단되지 않는다. 운영 구성 전 별도 코드 수정·검증할 후속 후보다.
- MusicXML은 별도 DB RLS/owner API로 보호되며 위 애니메이션 JSON 문제와 구분한다.
- 실제 신규 hosted Supabase·OAuth·Storage E2E는 미실행. 문서 전용 변경이므로 전체 앱 테스트는 로컬에서 재실행하지 않았다.
- 운영 DB/VM/버킷 변경 및 이슈 종료는 수행하지 않았다. 상태 main push의 기존 Vercel 자동배포는 별개다.

## 리뷰 수정 재검증

`886448f`: 기존 DB에 provenance가 없는 조건에서 index부터 실행하면 세 번째 문장에서
`column "provenance" does not exist` 실패함을 격리 DB로 재현했다.
새 corrected DB에서 선행 SQL→index→artifact 순서로 7개 적용/이력 기록을 재실행해 성공했다.
문서 로컬 링크10개 존재 확인. 테스트용 컨테이너와 그 볼륨만 종료 시 제거한다.
