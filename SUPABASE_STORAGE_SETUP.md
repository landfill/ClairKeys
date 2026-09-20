# Supabase Storage 설정

2026-09-20 기준. DB 테이블 구성은 [DATABASE_SETUP](DATABASE_SETUP.md)을 먼저 따른다.

## 새 프로젝트

Supabase 프로젝트의 URL, anon key, service role key를 앱 환경에 설정한다.
`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이며 `NEXT_PUBLIC_` 변수로 노출하지 않는다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Storage 대시보드에서 `animation-data` 버킷을 만든다.
MIME 타입은 `application/json`, 파일 크기 한도는 10 MiB다.

**현재 구현의 제약:** `fileStorageService`는 public URL을 저장하고,
`/api/files/animation`은 공개 악보에 이 URL을 그대로 반환한다.
기존 초기화 스크립트도 버킷을 **Public**으로 만든다. 따라서 현재 공개 악보 재생 경로를
그대로 재현하려면 public 버킷이 필요하지만, 이 경우 비공개 악보의 JSON도 URL을 알면
Storage에서 직접 접근할 수 있다. 앱의 권한 검사만으로 이 노출을 막지 못한다.
MusicXML은 별도 DB RLS로 보호되므로 이 제약과 구분한다.

새로운 운영 구성을 비공개 JSON까지 보호하는 환경으로 공개하려면, 먼저 private 버킷에서
공개/비공개 악보 모두 권한에 맞는 signed URL 또는 서버 응답을 사용하도록 코드를 수정하고
검증해야 한다. **문서만으로 이 문제가 해결됐다고 간주하지 않는다.** private 버킷으로
설정하면 현재 공개 악보의 직접 URL 경로가 동작하지 않을 수 있다.

`npm run init-storage`는 public animation 버킷과 과거 PDF 버킷도 생성하므로
신규 구성의 무조건적인 권장 명령에서 제외했다. 기존 버킷/정책은 이 문서 작업으로 변경하지 않는다.

## 현재 저장 흐름

1. 웹이 PDF를 OMR 서비스에 전달한다.
2. OMR이 MusicXML과 canonical animation JSON을 생성한다.
3. 앱은 애니메이션 JSON을 `animation-data`에 저장하고 DB에 경로를 기록한다.
4. MusicXML과 위치 매핑은 DB `SheetScoreArtifact`에 비공개 저장한다.
5. 애니메이션은 `/api/files/animation`, MusicXML은 소유자 전용 `/api/sheet/[id]/score`로 조회한다.
6. 원본 PDF는 처리용 임시 파일이며 영구 보관하지 않는다.

신규 구성에 공개 PDF용 `sheet-music-files` 버킷은 필요하지 않다.
기존 버킷이나 데이터는 이 문서를 따라 삭제하지 않는다.
`temp-uploads` 등 과거 버킷을 현행 업로드의 선행조건으로 만들지 않는다.

## 검증

앱과 OMR 환경을 연결한 뒤 실제 로그인으로 PDF를 업로드한다.
비공개 악보의 변환 완료·재생·PC 악보 토글을 확인하고 다른 사용자와 비로그인 상태에서
비공개 데이터 접근이 거절되는지 확인한다. 앱 API와 Storage 직접 URL을 각각 확인한다.
위 public 버킷 제약이 남아 있다면 비공개 JSON 보호 검증을 통과로 기록하지 않는다.
기존 악보는 MusicXML 없이도 재생되고 토글은 제공되지 않는다.

기존 데이터 정리, 전체 `DELETE`, 재생성 seed는 신규 구성 절차가 아니다.
데이터 이전이 필요하면 별도 백업·검증·승인된 이전 계획을 수립한다.
