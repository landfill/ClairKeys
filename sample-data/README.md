# ClairKeys JSON Data Format

ClairKeys에서 사용하는 JSON 데이터 형식에 대한 설명입니다.

## 개요

MusicXML 파일을 파싱하여 ClairKeys에서 사용할 수 있는 JSON 형식으로 변환합니다. 이 JSON 형식은 피아노 시각화와 오디오 재생에 필요한 모든 정보를 포함합니다.

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
  "midi": 60,        // MIDI 음표 번호 (21-108, A0-C8)
  "start": 0,        // 시작 시간 (초)
  "duration": 1,     // 지속 시간 (초)
  "hand": "R",       // 손 할당 ("L" 또는 "R")
  "velocity": 0.8    // 음표 세기 (0-1, 선택사항)
}
```

## MIDI 음표 번호 참조

| MIDI | 음표 | 옥타브 |
|------|------|--------|
| 21   | A0   | 0      |
| 60   | C4   | 4      |
| 69   | A4   | 4      |
| 108  | C8   | 8      |

## 샘플 파일들

### 1. `sample-minimal.json`
가장 기본적인 5개 음표로 구성된 최소 샘플:
- 오른손: C4, E4, G4 멜로디
- 왼손: C2, G2 베이스

### 2. `sample-demo-generated.json`
기본 데모 곡의 JSON 변환:
- 18개 음표 (오른손 10개, 왼손 8개)
- 7.8초 길이
- 멜로디와 베이스 라인 포함

### 3. `sample-musicxml-converted.json`
실제 MusicXML 파일에서 변환된 샘플:
- 14개 음표 (오른손 11개, 왼손 3개)
- 7초 길이
- 다양한 음표 길이와 타이밍

## 사용 방법

### TypeScript에서 사용
```typescript
import type { Note } from '../types';

interface MusicData {
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
  notes: Note[];
}

// JSON 파일 로드
const musicData: MusicData = await import('./sample-demo-generated.json');
```

### JSON 파일 생성
```typescript
import { musicXmlToJson } from '../generateSampleJson';

// MusicXML을 JSON으로 변환
const xmlContent = await fetch('music.musicxml').then(r => r.text());
const jsonData = musicXmlToJson(xmlContent);
```

## ClairKeys 시스템과의 통합

### 내부 형식 변환
ClairKeys는 내부적으로 `PianoAnimationData` 형식을 사용합니다:

```typescript
interface PianoAnimationData {
  version: string
  title: string
  composer: string
  duration: number // seconds
  tempo: number // BPM
  timeSignature: string // e.g., '4/4'
  notes: PianoNote[]
  metadata: {
    originalFileName: string
    fileSize: number
    processedAt: string
    extractedText?: string
    pagesProcessed: number
    staffLinesDetected: number
    notesDetected: number
  }
}
```

### 변환 과정
1. 이 폴더의 JSON 파일들을 시드 스크립트가 자동으로 읽음
2. 새로운 JSON 형식을 `PianoAnimationData`로 변환
3. Supabase Storage에 업로드
4. 데이터베이스에 샘플 악보 데이터 생성

### 예상 파일명
- `canon-in-d.json` - Canon in D by Johann Pachelbel
- `fur-elise.json` - Für Elise by Ludwig van Beethoven
- 기타 클래식 악보 JSON 파일들

## 검증

JSON 스키마 파일 (`music-data-schema.json`)을 사용하여 데이터 유효성을 검증할 수 있습니다.

## 특징

1. **시간 정확도**: 시작 시간과 지속 시간은 밀리초 단위 (소수점 3자리)까지 정확
2. **손 할당**: 자동으로 왼손/오른손 할당 (음자리표, 파트 이름, MIDI 범위 기반)
3. **메타데이터**: 곡 분석에 필요한 통계 정보 포함
4. **확장성**: 필요에 따라 velocity 등 추가 속성 지원

## 호환성

- ClairKeys 피아노 시각화 시스템
- Web Audio API 오디오 재생
- 88건반 피아노 (A0-C8)
- MusicXML 1.0-3.1 표준