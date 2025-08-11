# ClairKeys JSON Data Format

ClairKeys 피아노 학습 시스템의 데이터 처리 워크플로우와 JSON 형식에 대한 설명입니다.

## ClairKeys 데이터 처리 워크플로우

ClairKeys는 다음과 같은 단계로 악보를 처리합니다:

```
1. PDF 업로드
   ↓
2. MusicXML 변환 (AI 기반 악보 인식)
   ↓  
3. JSON 변환 (PianoAnimationData 형식)
   ↓
4. Supabase Storage에 JSON 파일 저장
   ↓
5. 데이터베이스에 JSON 파일 경로 저장
   ↓
6. 재생시 DB에서 경로 확인 → Storage에서 JSON 로딩 → 애니메이션 재생
```

## 개요

이 폴더의 JSON 파일들은 **개발/테스트용 샘플 데이터**입니다. 실제 서비스에서는 사용자가 업로드한 PDF가 MusicXML을 거쳐 JSON으로 변환되어 Supabase Storage에 저장됩니다.

## JSON 구조

### 최상위 구조
```json
{
  "metadata": { ... },
  "notes": [ ... ]
}
```

### Metadata 객체
곡에 대한 메타데이터를 포함합니다:

```json
{
  "title": "곡 제목 (선택사항)",
  "composer": "작곡가 (선택사항)", 
  "partCount": 2,           // 파트 수 (일반적으로 2 - 왼손/오른손)
  "measureCount": 8,        // 마디 수
  "duration": 7.8,          // 총 재생 시간 (초)
  "totalNotes": 18,         // 전체 음표 수
  "leftHandNotes": 8,       // 왼손 음표 수
  "rightHandNotes": 10      // 오른손 음표 수
}
```

### Notes 배열
각 음표의 정보를 포함하는 배열입니다:

```json
{
  "note": "C4",          // 음표 이름 (예: 'C4', 'F#5')
  "startTime": 0,        // 시작 시간 (초)
  "duration": 1,         // 지속 시간 (초)
  "velocity": 0.8,       // 음표 세기 (0-1)
  "finger": 1,           // 손가락 번호 (선택사항, 교육용)
  "hand": "left"         // 손 할당 ("left" 또는 "right", 선택사항)
}
```

## 음표 이름 참조

ClairKeys는 표준 음표 이름을 사용합니다:

| 음표 | 설명 | 예시 |
|------|------|------|
| C4   | 중앙 도 (Middle C) | "C4" |
| F#5  | 5옥타브 파샵 | "F#5" |
| Bb3  | 3옥타브 시플랫 | "Bb3" |
| A0   | 가장 낮은 라 | "A0" |
| C8   | 가장 높은 도 | "C8" |

## 샘플 파일들

### 1. `sample-demo-generated.json`
기본 데모 곡의 JSON 변환:
- 18개 음표 (오른손 10개, 왼손 8개)
- 7.8초 길이
- 멜로디와 베이스 라인 포함
- 현재 폴더의 샘플 파일 형식을 사용

## 사용 방법

### TypeScript에서 사용
```typescript
import type { PianoAnimationData, PianoNote } from '../src/types/animation';

// 샘플 데이터 인터페이스 (이 폴더의 JSON 파일들)
interface SampleMusicData {
  metadata: {
    title?: string;
    composer?: string;
    partCount: number;
    measureCount: number;
    duration: number;
    totalNotes: number;
    leftHandNotes: number;
    rightHandNotes: number;
  };
  notes: Array<{
    midi: number;       // MIDI 번호 (이전 형식 호환용)
    start: number;      // startTime으로 변환됨
    duration: number;
    hand: "L" | "R";    // "left" | "right"로 변환됨
    velocity?: number;
  }>;
}

// JSON 파일 로드
const musicData: SampleMusicData = await import('./sample-demo-generated.json');
```

### JSON 파일 생성
```typescript
import { musicXmlToJson } from '../generateSampleJson';

// MusicXML을 JSON으로 변환
const xmlContent = await fetch('music.musicxml').then(r => r.text());
const jsonData = musicXmlToJson(xmlContent);
```

## ClairKeys 시스템과의 통합

### 실제 서비스 데이터 플로우

1. **사용자 업로드**: PDF 악보 파일 업로드
2. **AI 변환**: PDF → MusicXML (AI 기반 악보 인식)
3. **JSON 변환**: MusicXML → PianoAnimationData JSON
4. **Storage 저장**: Supabase Storage에 JSON 파일 저장 (`/uploads/user-id/song-id.json`)
5. **DB 저장**: 데이터베이스에 악보 메타데이터와 JSON 파일 경로 저장
6. **재생**: 사용자가 재생 요청 시 DB에서 JSON 경로 조회 → Storage에서 다운로드 → 애니메이션 재생

### 내부 형식 (PianoAnimationData)
실제 서비스와 Storage에 저장되는 JSON 형식:

```typescript
interface PianoAnimationData {
  version: string               // 데이터 형식 버전
  title: string                // 곡 제목
  composer: string             // 작곡가
  duration: number             // 총 길이 (초)
  tempo: number                // 템포 (BPM)
  timeSignature: string        // 박자 (예: '4/4')
  notes: PianoNote[]          // 음표 배열
  metadata: {
    originalFileName: string   // 원본 파일명
    fileSize: number          // 파일 크기
    processedAt: string       // 처리 시각
    extractedText?: string    // 추출된 텍스트
    keySignature?: string     // 조성
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  }
}

interface PianoNote {
  note: string          // 음표 이름 (예: 'C4', 'F#5')
  startTime: number     // 시작 시간 (초)
  duration: number      // 지속 시간 (초)
  velocity: number      // 음량 (0-1)
  finger?: number       // 손가락 번호 (선택사항)
  hand?: 'left' | 'right'  // 손 (선택사항)
}
```

### 개발 환경에서의 샘플 데이터 처리
1. **시드 스크립트**: 이 폴더의 JSON 파일들을 자동으로 읽어들임
2. **형식 변환**: 레거시 형식 (midi/start/hand) → PianoAnimationData 형식 변환
3. **Storage 업로드**: 변환된 JSON을 Supabase Storage에 업로드
4. **DB 생성**: 데이터베이스에 샘플 악보 레코드와 JSON 경로 저장

### 실제 서비스에서의 데이터 처리
1. **PDF 업로드**: 사용자가 웹에서 PDF 파일 업로드
2. **AI 처리**: 백엔드에서 PDF → MusicXML → PianoAnimationData 변환
3. **Storage 저장**: 변환된 JSON을 `/uploads/{userId}/{songId}.json` 경로로 저장
4. **DB 저장**: songs 테이블에 메타데이터와 Storage 경로 저장
5. **재생**: 클라이언트가 재생 요청시 DB에서 경로 조회 후 Storage에서 JSON 로딩

### 형식 변환 예시
```typescript
// 레거시 형식 (이 폴더의 JSON)
{
  "midi": 60,
  "start": 0,
  "duration": 1,
  "hand": "R"
}

// ↓ 변환 ↓

// 새로운 형식 (PianoAnimationData)
{
  "note": "C4",        // MIDI 60 → C4
  "startTime": 0,      // start → startTime
  "duration": 1,
  "velocity": 0.7,     // 기본값
  "hand": "right"      // "R" → "right"
}
```

### 예상 파일명
- `canon-in-d.json` - Canon in D by Johann Pachelbel
- `fur-elise.json` - Für Elise by Ludwig van Beethoven
- 기타 클래식 악보 JSON 파일들

## 검증

JSON 스키마 파일 (`music-data-schema.json`)을 사용하여 데이터 유효성을 검증할 수 있습니다.

## ClairKeys 시스템 특징

1. **완전 자동화 워크플로우**: PDF → MusicXML → JSON → Storage → DB → 재생까지 완전 자동화
2. **AI 기반 악보 인식**: PDF 악보를 자동으로 인식하여 MusicXML로 변환  
3. **클라우드 스토리지 기반**: JSON 파일을 Supabase Storage에 저장하여 확장성 확보
4. **실시간 스트리밍**: 재생시 필요한 데이터만 Storage에서 로딩하여 성능 최적화
5. **시간 정확도**: 밀리초 단위 (소수점 3자리) 정확도로 정밀한 피아노 애니메이션
6. **형식 호환성**: 레거시 MIDI 형식과 최신 음표 이름 형식 모두 지원

## 기술 스택

- **Frontend**: Next.js + TypeScript + Canvas API (피아노 애니메이션)
- **Backend**: Supabase (데이터베이스 + Storage + 인증)  
- **AI 처리**: PDF → MusicXML 변환 (AI 기반 악보 인식)
- **데이터 형식**: JSON (PianoAnimationData)
- **오디오**: Web Audio API 
- **피아노**: 88건반 표준 (A0-C8)

## 아키텍처 요약

ClairKeys는 **PDF 업로드부터 피아노 애니메이션 재생까지의 전체 워크플로우를 자동화**한 혁신적인 피아노 학습 시스템입니다:

```
사용자 PDF 업로드 → AI 악보 인식 → JSON 변환 → 클라우드 저장 → 실시간 애니메이션 재생
```

이를 통해 기존의 복잡한 악보 디지털화 과정을 완전히 자동화하여, 사용자는 단순히 PDF를 업로드하는 것만으로 인터랙티브한 피아노 학습 경험을 얻을 수 있습니다.