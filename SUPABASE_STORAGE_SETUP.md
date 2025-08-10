# Supabase Storage 설정 가이드

ClairKeys 프로젝트의 Supabase Storage를 설정하고 기존 데이터를 마이그레이션하는 방법

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 대시보드 접속
1. https://supabase.com/ 접속
2. 기존 프로젝트 선택 또는 새 프로젝트 생성

### 1.2 API 설정 정보 수집
**Settings > API** 메뉴에서 다음 정보 수집:
- Project URL
- anon (public) key  
- service_role (secret) key

## 2. 환경변수 설정

`.env` 파일의 Supabase 관련 설정을 실제 값으로 업데이트:

```bash
# 현재 (placeholder 값들)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# 변경 → 실제 프로젝트 값으로 교체
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

## 3. Storage Bucket 생성

### 3.1 자동 생성 (권장)
```bash
# 개발 환경에서 자동으로 bucket 생성
npm run init-storage
```

### 3.2 수동 생성 (Supabase 대시보드)
**Storage** 메뉴에서 다음 버킷들 생성:

1. **animation-data** (Private)
   - 용도: JSON 애니메이션 데이터 파일 저장
   - 허용 파일타입: application/json
   - 최대 파일크기: 10MB

2. **sheet-music-files** (Public) 
   - 용도: 악보 PDF 파일 저장
   - 허용 파일타입: application/pdf, image/png, image/jpeg
   - 최대 파일크기: 10MB

3. **temp-uploads** (Private)
   - 용도: 임시 업로드 파일 저장  
   - 허용 파일타입: 모든 타입
   - 최대 파일크기: 50MB

## 4. 기존 데이터 마이그레이션

### 4.1 현재 상태 확인
```bash
# 현재 잘못된 데이터 조회
npm run check-data-status
```

### 4.2 데이터 정리 및 재생성
```bash
# 기존 잘못된 데이터 정리하고 새로 생성
npm run migrate-storage-data
```

### 4.3 수동 데이터 정리 (필요시)
```sql
-- 잘못된 파일 경로를 가진 레코드 확인
SELECT id, title, animationDataUrl 
FROM "SheetMusic" 
WHERE animationDataUrl LIKE '/sample-data/%';

-- 모든 sheet music 데이터 삭제 (재생성을 위해)
DELETE FROM "SheetMusic";

-- 그 다음 seed 스크립트 실행
npm run seed
```

## 5. 검증 및 테스트

### 5.1 Storage 연결 테스트
```bash
npm run test-storage
```

### 5.2 애플리케이션 테스트
1. `npm run dev`로 개발 서버 시작
2. http://localhost:3001 접속
3. 라이브러리 페이지에서 악보 선택
4. 악보 상세 페이지에서 애니메이션 재생 테스트

## 6. 문제 해결

### 6.1 Storage 연결 오류
- 환경변수가 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- API 키가 올바른 권한을 가지고 있는지 확인

### 6.2 Bucket 생성 오류
- service_role 키가 올바른지 확인
- Supabase 대시보드에서 수동으로 버킷 생성
- RLS (Row Level Security) 정책 확인

### 6.3 파일 업로드 오류
- 파일 크기 제한 확인
- MIME 타입 허용 설정 확인
- 네트워크 연결 상태 확인

## 7. 아키텍처 설명

### 올바른 데이터 흐름:
```
1. 사용자가 악보 업로드
2. PDF → JSON 변환 (pdfParser)
3. JSON 파일을 Supabase Storage에 업로드 (fileStorageService)
4. DB에 Supabase Storage URL 저장
5. 클라이언트에서 /api/files/animation으로 요청
6. Private 파일은 signed URL 생성하여 반환
7. 클라이언트가 signed URL로 JSON 파일 다운로드
```

### 현재 문제가 있는 흐름:
```
❌ DB에 로컬 파일 경로('/sample-data/canon-in-d.json') 저장
❌ 클라이언트가 존재하지 않는 파일에 접근 시도
❌ "undefined" is not valid JSON 오류 발생
```

## 8. 주요 파일들

- `src/services/fileStorageService.ts` - Supabase Storage 연동 서비스
- `src/app/api/files/animation/route.ts` - 애니메이션 파일 API 엔드포인트  
- `prisma/seed.ts` - 데이터베이스 시드 스크립트
- `src/services/musicDataConverter.ts` - JSON 형식 변환기

## 9. 보안 고려사항

- **Private Buckets**: 애니메이션 데이터는 private bucket에 저장
- **Signed URLs**: Private 파일 접근 시 임시 URL 생성 (1시간 유효)
- **Public Buckets**: 공개 악보만 public bucket 사용
- **RLS Policies**: 사용자별 데이터 접근 제어