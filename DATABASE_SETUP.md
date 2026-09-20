# 데이터베이스 신규 구성과 업데이트

2026-09-20 기준. 저장소 루트에서 실행한다. 최종 스키마의 기준은
[Prisma 모델](prisma/schema.prisma)과 [버전별 SQL](prisma/migrations/)이다.
SQL을 별도로 복사해 관리하지 않고, 아래 절차로 모든 원본 SQL을 순서대로 적용한다.

## 연결 준비

1. 새 PostgreSQL/Supabase 프로젝트와 비어 있는 `public` 스키마를 준비한다.
2. `npm ci`로 lockfile의 Prisma CLI를 설치한다. PostgreSQL 클라이언트 `psql`도 필요하다.
3. DB 소유자 권한의 **direct 또는 session 연결**을 `DATABASE_URL`에 설정한다.
   Supabase 대시보드의 연결 문자열을 사용하고 비밀번호는 URL 인코딩한다.
   transaction pooler 연결은 마이그레이션에 사용하지 않는다.
   이 저장소는 `directUrl` 설정이 없으므로 CLI 실행 때 `DATABASE_URL` 자체를 전환해야 한다.
4. 비밀 값은 로컬 환경/비밀 저장소에만 두고 Git·로그에 기록하지 않는다.
   아래 `psql` 명령에는 libpq가 지원하는 연결 옵션만 사용한다
   (Prisma 전용 `schema`, `pgbouncer`, `connection_limit` 쿼리 옵션 제외).

## 빈 DB 최초 구성

**기존 데이터가 있거나 일부 마이그레이션을 적용한 DB에서는 이 블록을 실행하지 않는다.**
다음 조회에 앱 테이블과 `_prisma_migrations`가 없어야 한다. Supabase의 다른 시스템 스키마는 대상이 아니다.

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c '\dt public.*'
```

아래는 Bash에서 실행한다. 각 SQL 파일이 성공한 뒤에만 Prisma 이력에 완료를 기록한다.
실패하면 즉시 중단한다. 자동 재실행하거나 완료 표시만 강제하지 않는다.

```bash
set -euo pipefail
for migration in \
  001_init \
  002_background_processing \
  20250816111150_add_omr_fields \
  20260829012000_add_sheet_provenance \
  20260829020000_make_omr_job_id_unique \
  20260901060000_add_sheet_lookup_indexes \
  20260920030000_add_private_score_artifact
do
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
    -f "prisma/migrations/$migration/migration.sql"
  npx prisma migrate resolve --applied "$migration"
done
npx prisma migrate status
npx prisma generate
```

`20260901060000`에는 `CREATE INDEX CONCURRENTLY`가 여러 개 들어 있다.
`psql -f`의 개별 문장 autocommit이 필요하다. `--single-transaction`, `BEGIN`,
전체 파일을 한 번에 보내는 `psql -c`를 사용하지 않는다.
이 이력 때문에 빈 DB에서 단순 `prisma migrate deploy`만 실행하는 방법은 현재 사용할 수 없다.
기존 SQL은 checksum 보존을 위해 수정하지 않는다.

## 최종 MusicXML 저장 스키마

위 순서의 마지막 SQL은 다음과 같다. 전체 설치를 실행했다면 **다시 실행하지 않는다**.

```sql
CREATE TABLE "SheetScoreArtifact" (
    "sheetMusicId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "SheetScoreArtifact_pkey" PRIMARY KEY ("sheetMusicId"),
    CONSTRAINT "SheetScoreArtifact_sheetMusicId_fkey" FOREIGN KEY ("sheetMusicId") REFERENCES "SheetMusic"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "SheetScoreArtifact" ENABLE ROW LEVEL SECURITY;
```

- `data`는 신규 변환의 MusicXML과 재생 위치 매핑이다. 완성 JSON UTF-8 한도는 4 MiB다.
- 앱 서버의 DB 소유자 연결로 저장·조회하며, RLS 정책은 만들지 않는다.
  Supabase `anon`/`authenticated` 직접 조회는 허용하지 않는다.
- 소유자 전용 `/api/sheet/[id]/score`에서 조회하고 `private, no-store`로 응답한다.
  악보를 공개해도 MusicXML은 공개하지 않는다. 악보 삭제 시 FK cascade로 함께 삭제된다.
- 기존 악보에 XML을 소급 생성하지 않는다. 기존 재생은 유지되고 새 업로드부터 패널을 제공한다.
- 원본 PDF는 영구 보관하지 않는다. 애니메이션 JSON은 Storage(현재 공개 URL 제약은 Storage 가이드 참조),
  MusicXML은 이 DB 테이블에 저장한다.

## 구성 검증

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'SheetScoreArtifact';
-- rowsecurity = true
SELECT * FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'SheetScoreArtifact';
-- 0 rows
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public."SheetScoreArtifact"'::regclass;
-- PRIMARY KEY와 ON UPDATE CASCADE ON DELETE CASCADE 확인
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'SheetMusic';
-- provenance, omrJobId unique 및 lookup 복합 인덱스 3개 포함
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations" ORDER BY migration_name;
-- 위 7개 완료, 미해결 실패 없음
```

`npx prisma migrate status`는 이력 확인이며 RLS 검증을 대신하지 않는다.
`db push`는 SQL에만 있는 RLS와 migration 이력을 재현하지 않으므로 신규/운영 설치 절차로 쓰지 않는다.
Seed는 필수가 아니다. 기존 사용자 데이터에 `npm run seed`나 데이터 정리 스크립트를 실행하지 않는다.

## 기존 DB 업데이트

먼저 백업·복구 가능 여부, 실제 테이블/인덱스와 `_prisma_migrations`를 확인한다.
일반 마이그레이션은 검토한 후 `npx prisma migrate deploy`를 사용한다.
단, 위 concurrent index migration이 미적용이면 다음 순서로 별도 변경을 수행한다.

1. 이력과 실제 스키마를 대조해 **그보다 앞선 미적용 migration을 먼저** 이름 순서대로
   적용한다. 위 최초 구성 목록의 `001_init`부터 `20260829020000`까지가 선행 구간이다.
   각 미적용 SQL을 `psql -X -v ON_ERROR_STOP=1 -f <해당 migration.sql>`로 실행하고
   결과를 확인한 뒤 `npx prisma migrate resolve --applied <해당 이름>`으로 기록한다.
   이미 적용한 SQL은 건너뛴다. 특히 `20260829012000`의 `provenance` 컬럼이 없으면
   세 번째 concurrent index가 실패하므로 인덱스 단계로 넘어가지 않는다.
2. 선행 migration이 모두 완료된 후 concurrent index SQL만 `psql -f`로 실행한다.
   세 인덱스의 정의와 `pg_index.indisvalid`를 확인한 뒤
   `prisma migrate resolve --applied 20260901060000_add_sheet_lookup_indexes`로 기록한다.
3. 이력을 다시 확인하고 `npx prisma migrate deploy`로 이후 미적용 migration을 적용한다.
   `migrate deploy`에는 선행 구간까지만 지정하는 옵션이 없으므로 1단계를 대신할 수 없다.

실패/부분 생성/동명 인덱스가 있으면 재실행하지 말고 개별 복구 계획을 세운다.
`--applied`는 실행을 대신하지 않는다.

2026-09-20 운영 DB에는 MusicXML migration은 적용됐지만 이 인덱스 migration은 미적용이다.
신규 구성은 7개 모두 적용하므로 운영과 인덱스 상태가 다르다.
이 문서 변경으로 운영 DB를 변경하지 않는다.
[실제 운영 적용 근거](docs/recovery/validation/2026-09-20-issue-125-production-schema.json).

## 서비스 연결 순서

1. DB SQL·이력·RLS 검증을 완료한다.
2. [Storage 설정](SUPABASE_STORAGE_SETUP.md)과 OAuth·앱 환경변수를 구성한다.
3. 타입 검사·lint·테스트·build를 각각 통과시킨 후 웹을 배포한다.
   Vercel main 연동은 main push만으로 Production 배포를 시작할 수 있다.
4. [OMR VM 가이드](omr-service/deploy/README.md)에 따라 같은 버전의 OMR을 배포한다.
5. 실제 로그인으로 새 PDF 업로드→변환→저장→PC 악보 표시를 확인한다.
   다른 사용자/비로그인 XML 접근 거부, 기존 악보 재생, 모바일 기존 화면도 확인한다.

DB 준비만으로 OMR 큐가 영속화되거나 악보 변환 서비스가 실행되는 것은 아니다.
