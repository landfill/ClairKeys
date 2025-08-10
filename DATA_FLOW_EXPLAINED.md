# ClairKeys 애니메이션 데이터 흐름 상세 분석

## 🎯 라이브러리 → 애니메이션 재생 전체 프로세스

### 1. 사용자 행동 및 URL 라우팅

```
사용자: 라이브러리(/library)에서 악보 카드의 "연주" 버튼 클릭
      ↓
브라우저: /sheet/{id} 페이지로 이동 (id는 DB의 SheetMusic.id)
```

### 2. 페이지 로드 및 데이터 조회

```typescript
// src/app/sheet/[id]/page.tsx
function SheetMusicPage() {
  const params = useParams()
  const id = params.id // "11"
  
  useEffect(() => {
    fetchSheetMusic() // id="11"으로 데이터 조회 시작
  }, [id])
}
```

### 3. API 호출 체인

#### 3-1. 악보 기본 정보 조회
```typescript
// 호출: GET /api/sheet/{id}
const response = await fetch(`/api/sheet/${id}`)

// API가 수행하는 작업:
const sheetMusic = await prisma.sheetMusic.findUnique({
  where: { id: sheetId },
  include: { user: true, category: true }
})

// 반환 데이터:
{
  success: true,
  sheetMusic: {
    id: sheetId,
    title: "악보 제목",
    composer: "작곡가 이름", 
    animationDataUrl: "https://PROJECT_ID.supabase.co/storage/v1/object/public/animation-data/USER_ID/animation_TIMESTAMP_RANDOM.json",
    // ... 기타 필드
  }
}
```

#### 3-2. 애니메이션 파일 URL 요청
```typescript
// 호출: GET /api/files/animation?sheetMusicId={id}
const animationResponse = await fetch(`/api/files/animation?sheetMusicId=${id}`)

// API가 수행하는 작업:
const sheetMusic = await prisma.sheetMusic.findFirst({
  where: { 
    id: sheetId,
    OR: [
      { userId: session.user.id }, // 소유자
      { isPublic: true }          // 또는 공개
    ]
  }
})

// 권한 확인 후 URL 반환:
return NextResponse.json({
  url: sheetMusic.animationDataUrl // Supabase Storage URL
})
```

#### 3-3. 실제 JSON 파일 다운로드
```typescript
// 호출: GET https://PROJECT_ID.supabase.co/storage/.../animation_TIMESTAMP_RANDOM.json
const jsonResponse = await fetch(animationUrlData.url)
const parsedAnimationData = await jsonResponse.json()

// JSON 파일 내용 예시:
{
  "version": "1.0",
  "title": "악보 제목",
  "composer": "작곡가 이름",
  "duration": 120.5,
  "notes": [
    { "note": "C4", "startTime": 0, "duration": 1, "velocity": 0.8 },
    { "note": "E4", "startTime": 1, "duration": 1, "velocity": 0.8 },
    // ... 수백개의 음표 데이터
  ]
}
```

## 🗄️ 데이터 저장 구조 상세

### Database (PostgreSQL/Supabase)
```sql
-- SheetMusic 테이블
Table: SheetMusic
+----+-------------+-------------------+------------------+----------+---------+
| id | title       | composer          | animationDataUrl | userId   | isPublic|
+----+-------------+-------------------+------------------+----------+---------+
| 11 | Canon in D  | Johann Pachelbel  | https://...json  | cmd...xe | true    |
| 12 | Für Elise   | Ludwig van Beethoven | https://...json | cmd...xe | true    |
+----+-------------+-------------------+------------------+----------+---------+
```

### Supabase Storage (파일 시스템)
```
Bucket: animation-data (Private)
├── cmdv5bogv0000o98wf8dpoaxe/ (사용자 폴더)
│   ├── animation_1754789197588_3mpa61.json  ← Canon in D 애니메이션 데이터
│   ├── animation_1754789206205_51f4mh.json  ← Für Elise 애니메이션 데이터
│   └── animation_TIMESTAMP_RANDOM.json     ← 추후 업로드 파일들
└── 다른사용자ID/
    └── 해당사용자의애니메이션파일들.json
```

## 🔗 ID 연결 매핑 구조

### URL → Database → Storage 연결
```
URL Path: /sheet/11
    ↓
Database Query: SELECT * FROM SheetMusic WHERE id = 11
    ↓
Result: animationDataUrl = "https://ghgiqtinaxjsuotfzmcw.supabase.co/..."
    ↓
Storage Access: GET {animationDataUrl}
    ↓
JSON File: animation_1754789197588_3mpa61.json
    ↓
Animation Data: { notes: [...], duration: 120.5, ... }
```

## 🔒 권한 및 보안

### 1. API 레벨 권한 확인
```typescript
// /api/files/animation/route.ts에서 권한 확인
const isOwner = session?.user?.id === sheetMusic.userId
const isPublic = sheetMusic.isPublic

if (!isOwner && !isPublic) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

### 2. Storage 접근 방식
- **Public 파일**: 직접 Public URL 반환
- **Private 파일**: Signed URL 생성 (1시간 유효)

```typescript
// Private 파일의 경우
const signedUrl = await fileStorageService.getSignedUrl(
  'animation-data', 
  filePath, 
  3600 // 1시간
)
```

## 🚀 파일 생성 프로세스 (참고)

### 업로드 시 파일 생성 과정
```typescript
// 1. 고유 파일명 생성
const fileName = `animation_${Date.now()}_${randomString}.json`

// 2. 사용자별 경로 생성  
const filePath = `${userId}/${fileName}`

// 3. Supabase Storage에 업로드
const { data } = await supabaseServer.storage
  .from('animation-data')
  .upload(filePath, jsonBuffer)

// 4. Public URL 생성
const { data: { publicUrl } } = supabaseServer.storage
  .from('animation-data')
  .getPublicUrl(filePath)

// 5. Database에 URL 저장
await prisma.sheetMusic.create({
  data: {
    // ...기타 필드,
    animationDataUrl: publicUrl
  }
})
```

## 🧪 테스트 방법

### 1. 직접 URL 접근 테스트
```bash
# 1. 브라우저에서 http://localhost:3000/sheet/11 접속
# 2. 개발자 도구 Network 탭에서 API 호출 확인:
#    - GET /api/sheet/11
#    - GET /api/files/animation?sheetMusicId=11  
#    - GET https://ghgiqtinaxjsuotfzmcw.supabase.co/.../animation_XXX.json
```

### 2. API 직접 호출 테스트
```bash
# 1. 인증 후 API 직접 호출
curl "http://localhost:3000/api/sheet/11" \
  -H "Cookie: next-auth.session-token=..."

# 2. 애니메이션 파일 API 호출  
curl "http://localhost:3000/api/files/animation?sheetMusicId=11" \
  -H "Cookie: next-auth.session-token=..."
```

### 3. Storage 직접 접근 테스트
```bash
# Public URL로 JSON 파일 직접 다운로드
curl "https://ghgiqtinaxjsuotfzmcw.supabase.co/storage/v1/object/public/animation-data/cmdv5bogv0000o98wf8dpoaxe/animation_1754789197588_3mpa61.json"
```

## 📊 현재 실제 데이터 현황

### 확인된 레코드 (2025-08-10 기준)
```
✅ 정상 데이터 (2개):
   - ID 11: "Canon in D" → Supabase Storage URL ✓
   - ID 12: "Für Elise" → Supabase Storage URL ✓

⚠️ 문제 데이터 (1개):  
   - ID 10: "달빛" → JSON 데이터가 URL 필드에 직접 저장됨
```

### 테스트 가능한 URL
- ✅ http://localhost:3000/sheet/11 (Canon in D)
- ✅ http://localhost:3000/sheet/12 (Für Elise)
- ❌ http://localhost:3000/sheet/10 (달빛 - 데이터 구조 문제)

## 🔧 문제 해결

### 만약 애니메이션이 로드되지 않는다면:

1. **Network 탭 확인**: 어느 단계에서 실패하는지 확인
   - `/api/sheet/{id}` → 404: 해당 ID 레코드 없음
   - `/api/files/animation` → 403: 권한 없음
   - Storage URL → 404: 파일 존재하지 않음

2. **데이터 상태 확인**: `npm run check-data-status`

3. **Storage 연결 테스트**: `npm run test-storage`

이제 `/practice/1`이 아니라 `/sheet/{실제DB_ID}` 구조로 정확하게 연결되어 있습니다!