# Issue #125 선택형 PC 악보 패널 독립 검증 보고서

- **검증 일시**: 2026-09-20
- **검증 대상**: Issue #125, D-074, `docs/recovery/phases/ISSUE-125-score-panel.md`
- **검증자**: 독립 리뷰어 (Independent Reviewer Dispatch)
- **규약 준수**: `AGENTS.md` (구현 파일 비수정, 독자 검증 파일 및 신규 독립 테스트 소유권 한정, Docker/프로덕션 미접근)

---

## 1. 개요 및 관찰된 Diff (Observed Diff)

본 검증은 `codex/issue-125-score-panel` 브랜치에 구현된 Prisma 스키마, OMR 결과 수집, 권한 조회 라우트, 악보 표시 유틸리티 및 UI 컴포넌트 전체를 대상으로 수행되었다.

### 관찰된 변경 내역 요약

1. **데이터베이스 & 마이그레이션**:
   - `prisma/schema.prisma`: `SheetScoreArtifact` 모델 추가 (`sheetMusicId Int @id`, `data Json`, `sheetMusic SheetMusic @relation(..., onDelete: Cascade)`).
   - `prisma/migrations/20260920030000_add_private_score_artifact/migration.sql`: `ALTER TABLE "SheetScoreArtifact" ENABLE ROW LEVEL SECURITY;` 선언.
2. **백엔드 수집 및 권한 제어**:
   - `src/lib/omr/finalizeJob.ts`: OMR 응답의 `score_artifact` 유효성 및 10MB 상한 검사, `prisma.sheetMusic.update` 내 nested upsert로 `scoreArtifact` 저장. 실패 시 502 (`SCORE_STORAGE_FAILED`) 반환. 레거시(미포함) 응답 호환 유지.
   - `src/app/api/sheet/[id]/route.ts`: `hasScore: isOwner && Boolean(sheetMusic.scoreArtifact)`로 메타데이터 제한 노출. 악보 삭제(`DELETE`) 시 DB cascade 연동.
   - `src/app/api/sheet/[id]/score/route.ts` (신규): `GET` 엔드포인트에서 `getServerSession` 인증 검사, 소유자 ID 바인딩 조회(`sheetMusic: { userId: session.user.id }`), `Cache-Control: private, no-store`.
3. **타입 정의 및 핵심 유틸리티**:
   - `src/types/scoreArtifact.ts` (신규): `ScoreArtifact` 인터페이스 및 `isScoreArtifact` 가드 함수 (XXE 차단, `score-partwise` 검증, 10MB/배열 상한 검사, `xmlId` 정규식 검증).
   - `src/utils/scoreDisplay.ts` (신규):
     - `annotateScoreFingering`: MusicXML 파싱, 외부 리소스 태그(`image, link, opus`) 및 원본 `fingering` 태그 제거, 플레이어 계산 운지(`notes[mapping.noteIndex]?.finger`) 주입.
     - `activeScoreMeasure`: `currentTime * timingReferenceBpm / artifact.timingReferenceBpm` 템포 스케일링, `partIndex === 0` 기준 이진 탐색으로 마디 계산.
4. **프론트엔드 UI 컴포넌트**:
   - `src/components/playback/ScoreToggle.tsx` (신규): PC 환경(`(min-width: 1024px) and (pointer: fine)`) 한정 노출, `localStorage` 기반 선택 유지(`clairkeys.score.visible`), `aria-label="악보 보기"` / `aria-pressed`.
   - `src/components/playback/ScorePanel.tsx` (신규): OpenSheetMusicDisplay(OSMD) SVG 동적 로드, 양손 보표 결합 마디 하이라이트 박스 계산, 즉시 스크롤 정렬(`scrollTop`), `clamp(240px, 34vh, 360px)` 높이.
   - `src/components/animation/FallingNotesPlayer.tsx`: 낙하 속도 140px/s 유지, 악보 ON 시 3단(악보/낙하노트/건반), OFF 시 기존 2단 화면 유지.

---

## 2. 8개 핵심 요구 영역 정밀 검토

### 1) Privacy & PostgREST
- **PostgREST 직접 접근 차단**: Supabase 환경에서는 public 스키마 테이블이 PostgREST REST API로 노출될 수 있으나, 마이그레이션에서 `ALTER TABLE "SheetScoreArtifact" ENABLE ROW LEVEL SECURITY;`를 실행하고 policy를 생성하지 않음으로써 `anon` 및 `authenticated` 역할의 모든 조회가 Default Deny(기본 차단)된다.
- **Next.js 내부 조회 보안**: Next.js 서버의 Prisma는 Direct DB Connection(postgres role)으로 접근하되, 전용 API 라우트(`GET /api/sheet/[id]/score`)에서 세션 사용자 ID와 악보 소유자 ID가 일치할 때만 `artifact.data`를 반환한다.
- **공개 악보(Public Sheet) 동작**: 악보가 `isPublic: true`이더라도 소유자가 아닌 사용자에게는 `hasScore: false`로 반환되고 엔드포인트도 404를 반환한다. 이는 원본 MusicXML 표기 데이터를 비공개 보관하고 소유자에게만 제공하도록 한 D-074 결정사항과 일치한다.

### 2) Deletion Races & Failed Writes
- **외래키 및 Cascade 삭제**: `SheetScoreArtifact.sheetMusicId`가 `SheetMusic.id`를 참조하며 `onDelete: Cascade`가 설정되어 있어, `DELETE /api/sheet/[id]` 실행 시 단일 트랜잭션 내에서 악보 데이터베이스 행과 함께 원자적으로 제거된다. 외부 객체 스토리지 고아 객체 발생 위험이 없다.
- **삭제 경쟁 조건(Deletion Race)**: OMR 작업 처리 중 사용자가 악보를 삭제한 경우, `finalizeJob.ts`의 `prisma.sheetMusic.update`가 대상을 찾지 못해 예외를 발생시키며 502 에러(`SCORE_STORAGE_FAILED`)로 완료 처리가 중단된다. 부모 없는 고아 `SheetScoreArtifact`가 생성되지 않는다.
- **쓰기 실패 및 멱등성**: `finalizeJob.ts`에서 nested upsert(`create` 및 `update`)를 사용하므로 네트워크 재시도나 중복 콜백 시에도 안전하게 멱등 처리된다. `score_artifact` 검증 실패 시 502(`INVALID_SCORE_ARTIFACT`)를 발생시켜 결함 데이터 저장을 원천 차단한다.

### 3) Existing Playback Compatibility & 140px/s Speed
- `FallingNotesPlayer.tsx`에서 `pxPerSec = PX_PER_SEC` (140px/s) 상수가 그대로 유지된다.
- 악보 패널이 켜져도 `FallingNotesPlayer` 내부의 캔버스 렌더링 뷰포트와 룩어헤드 시간, 건반 기하구조 계산 로직은 변경되지 않는다.
- 기존 단위 테스트 28개(`FallingNotesPlayer.test.tsx`)가 모두 통과하여 재생 호환성 및 오디오-비주얼 동기화에 회귀가 없음을 확인했다.

### 4) MusicXML Safety
- **XXE 및 Entity 인젝션 차단**: `isScoreArtifact` 및 `annotateScoreFingering`에서 `/<!DOCTYPE|<!ENTITY/i` 정규식으로 DTD 선언을 거부한다.
- **파서 안전성**: 브라우저 `DOMParser.parseFromString(..., 'application/xml')` 사용 및 `parsererror` 존재 시 즉시 예외를 발생시킨다. `score-partwise` 루트 엘리먼트만 허용한다.
- **외부 리소스 및 인젝션 제거**: `<image>`, `<link>`, `<opus>` 엘리먼트를 명시적으로 제거한다. 운지 주입 시 `element.textContent`를 사용하여 스크립트 실행 위험을 차단한다.
- **상한 검사**: MusicXML 10MB, 마디 20,000개, 음표 매핑 100,000개 상한을 두어 ReDoS 및 메모리 고갈을 방지한다.

### 5) Computed Finger Alignment
- `annotateScoreFingering`는 MusicXML에 포함된 기존 `<fingering>` 태그를 `doc.querySelectorAll('fingering').forEach(element => element.remove())`로 전량 제거한다.
- 이후 플레이어의 `canonicalToFallingNotes`가 계산한 `notes[mapping.noteIndex]?.finger` 값을 각 매핑된 음표의 `<notations><technical><fingering>`으로 주입한다.
- 피아노 건반(`SimplePianoKeyboard`)에서 보여주는 운지와 악보 음표 위에 표시되는 운지가 동일한 `notes` 배열을 참조하므로 1:1로 정확하게 일치한다.

### 6) Tied / Multiple Voices Timing
- **타이(Tied notes)**: 타이에 의해 마디를 넘어 지속되는 음표는 MusicXML 상에서 별도의 `xmlId`를 갖더라도, 동일한 canonical `noteIndex`에 매핑되어 동일한 계산 운지가 주입된다 (`scoreIndependent.test.ts` 검증 완료).
- **다성부(Multiple voices) 및 양손 보표**: `activeScoreMeasure`는 `partIndex === 0` 마디들을 기준으로 재생 시간을 매핑한다. `ScorePanel`은 OSMD의 `MeasureList[measure]` 내 모든 Staff(보표)의 `PositionAndShape` 경계를 병합하여 피아노 양손 보표 전체를 하나의 반투명 하이라이트 박스로 표시한다.

### 7) Saved Tempo & Playback Speed
- `activeScoreMeasure`의 시간 보정 공식:
  $$\text{time} = \frac{\text{currentTime} \times \text{timingReferenceBpm}}{\text{artifact.timingReferenceBpm}}$$
- 사용자가 저장한 템포(`timingReferenceBpm`)가 원본 MusicXML의 BPM(`artifact.timingReferenceBpm`)과 다를 경우, 정규화된 canonical 시간 축으로 정확하게 비례 변환된다.
- 재생 속도(0.5x, 1.5x 등)는 `FallingNotesPlayer`의 `currentTime` 진행 속도 자체에 이미 반영되어 있으므로 추가적인 배속 보정 없이 정확하게 동기화된다.
- 일시정지, 탐색(Seek), 루프, 곡 종료 시에도 `currentTime`에 따라 즉각 마디 위치가 갱신된다.

### 8) Panel Mobile / Desktop / Layout
- **모바일/데스크톱 격리**: `ScoreToggle.tsx`에서 `(min-width: 1024px) and (pointer: fine)` 미디어 쿼리를 검사하여 모바일 및 터치 환경에서는 토글 버튼을 렌더링하지 않는다(`return null`). 모바일에서는 기존 2단 화면이 온전히 유지된다.
- **레이아웃 배분**: `ScorePanel.tsx`는 `style={{ height: 'clamp(240px, 34vh, 360px)', flexShrink: 0, marginBottom: 8 }}`을 사용하여 뷰포트 높이에 비례하여 유연하게 높이를 점유하며, 아래의 낙하노트 및 건반 영역을 침범하지 않는다.
- **선택 유지**: `localStorage`(`clairkeys.score.visible`)를 통해 새로고침 후에도 사용자의 ON/OFF 설정이 유지된다.

---

## 3. Actionable Findings (발견 사항 및 권장 조치)

### Finding 1: 빈 마디 또는 렌더링되지 않은 마디의 Bounding Box 좌표 예외 방어 (Defensive Guard)
- **위치**: `src/components/playback/ScorePanel.tsx:45-50`
- **내용**:
  ```ts
  const bounds = measures.filter(Boolean).map(measure => measure.PositionAndShape)
  const left = Math.min(...bounds.map(b => b.AbsolutePosition.x + b.BorderLeft)) * unit
  const top = Math.min(...bounds.map(b => b.AbsolutePosition.y + b.BorderTop)) * unit
  const right = Math.max(...bounds.map(b => b.AbsolutePosition.x + b.BorderRight)) * unit
  const bottom = Math.max(...bounds.map(b => b.AbsolutePosition.y + b.BorderBottom)) * unit
  return { left, top: Math.max(0, top - 8), width: right - left, height: bottom - top + 16 }
  ```
- **영향**: 특정 마디에 유효한 그래픽 보표가 없어 `bounds`가 빈 배열이 될 경우, `Math.min(...[])`은 `Infinity`, `Math.max(...[])`는 `-Infinity`가 되어 `width`와 `height`가 `-Infinity`가 되며 스타일 오류가 발생할 수 있다.
- **권장 조치**: `if (bounds.length === 0) return { left: 0, top: 0, width: 0, height: 0 }` 형태의 가드 코드 추가 권장.

### Finding 2: `measureIndex`의 0-based 순차 정수 계약 명시 (Contract Precondition)
- **위치**: `src/utils/scoreDisplay.ts:40`, `src/components/playback/ScorePanel.tsx:84`
- **내용**: `ScorePanel`은 `const box = boxes[measure]`로 OSMD의 `GraphicSheet.MeasureList` 0-based 인덱스에 직접 접근한다. 따라서 OMR 서비스가 생성하는 `ScoreArtifact.measures`의 `measureIndex`는 MusicXML의 `number="1"` 속성값이 아니라 반드시 **0부터 시작하는 순차 정수(0, 1, 2, ...)**여야 한다.
- **권장 조치**: OMR 에이전트와의 데이터 생성 규약에 `measureIndex`가 0-based sequential index임을 확정하고, 불일치 시 오프셋이 어긋나지 않도록 검증할 것.

### Finding 3: 공개 악보(Public Sheet) 열람 시 비소유자 악보 패널 비노출 동작 문서화
- **위치**: `src/app/api/sheet/[id]/route.ts:81`, `src/app/api/sheet/[id]/score/route.ts:16`
- **내용**: `isPublic: true` 악보라도 비소유자에게는 `hasScore: false`가 반환되어 악보 토글이 뜨지 않으며, 악보 API에서도 404가 반환된다.
- **분석**: 이는 MusicXML 표기 데이터를 소유자 전용 비공개로 보관하는 D-074 방침에 따른 의도된 동작이지만, 공개 악보를 탐색하는 일반 사용자에게는 악보가 보이지 않는다는 점을 명확히 문서화할 필요가 있다.

---

## 4. Pending / Unimplemented Paths (미구현 / 대기 경로)

1. **OMR 서비스 실제 MusicXML & 매핑 생성**:
   - 현재 Next.js 앱 및 UI는 `ScoreArtifact` 타입 계약 및 저장/표시 준비가 완료되었으나, 실제 Python OMR 서비스(Audiveris 파이프라인)에서 MusicXML과 `measures`, `notes` 매핑을 생성하는 작업은 별도의 OMR 에이전트가 구현 중이다.
   - 따라서 실제 변환 파이프라인과의 엔드투엔드(E2E) 연동은 **PENDING** 상태이다.
2. **Docker 기반 OMR 컨테이너 환경 검증**:
   - 독립 리뷰어 지침에 따라 Docker 및 운영 환경 접근을 수행하지 않았으며, 컨테이너 런타임 메모리(5GB JVM 등) 및 서비스 통합 검증은 Primary agent 소유로 **PENDING** 상태이다.

---

## 5. 검증 실행 결과 (Verification Evidence)

### 1) TypeScript 타입 체크
- **명령**: `npx tsc --noEmit`
- **결과**: 오류 0건, 정상 통과 (Exit Code 0).

### 2) 기존 및 연관 단위 테스트
- **명령**: `npm test -- src/utils/__tests__/scoreDisplay.test.ts src/components/playback/__tests__/ScoreToggle.test.tsx src/lib/omr/__tests__/scorePersistence.test.ts`
- **결과**: 3개 스위트, 10개 테스트 모두 PASS.
- **명령**: `npm test -- src/components/animation/__tests__/FallingNotesPlayer.test.tsx`
- **결과**: 1개 스위트, 28개 테스트 모두 PASS (기존 140px/s 낙하 속도 및 2단 뷰 회귀 없음 확인).

### 3) 신규 독립 검증 테스트 (`src/utils/__tests__/scoreIndependent.test.ts`)
- **명령**: `npm test -- src/utils/__tests__/scoreIndependent.test.ts`
- **결과**: 1개 스위트, 14개 테스트 모두 PASS.
  - **MusicXML Security & Sanitization**: DOCTYPE/Entity XXE 인젝션 거부, 외부 리소스 태그(`image, link, opus`) 제거, 비 partwise 루트 거부 검증.
  - **Computed Fingering Alignment & Tied Notes**: 원본 운지 제거 및 계산 운지 주입, 미정의 운지 안전성, 타이 지속음 운지 동기화 검증.
  - **Measure Navigation & Playback Timing Synchronization**: 1x 재생 속도 마디 탐색, 음수 시간 클램핑, 저장 템포 스케일링, `partIndex === 0` 누락 시 방어 검증.
  - **isScoreArtifact Schema Validation Boundaries**: 정상 페이로드 허용, 음수/0/NaN BPM 거부, 역전된 마디 시간(`end < start`) 거부, 비정상 `xmlId` 거부 검증.

---

## 6. 1차 검토 결론

Issue #125의 PC 선택형 악보 패널 구현은 D-074 결정사항 및 사용자 확정 요구사항(PC 전용, 초기 OFF, localStorage 선택 유지, 앱 계산 운지 일치, 140px/s 속도 유지, 비공개 보관 및 Cascade 삭제)을 충실히 반영하고 있다. PostgREST RLS 및 XXE 방어 등 보안 요구사항도 적절히 충족되었다.

위에서 도출된 Finding 1(빈 마디 Bounding Box 가드)과 Finding 2(0-based `measureIndex` 계약 전제)는 Primary agent 및 OMR agent의 구현 마무리 시 반영할 것을 권장하며, 전체적인 아키텍처와 검증 테스트 결과는 양호하다.

---

## 7. OMR 구현 후속 최종 독립 감사 (Final Independent Audit - Post-OMR Implementation)

- **감사 일시**: 2026-09-20
- **감사 대상**: `omr-service/omr/score_artifact.py`, `omr-service/omr/converter.py`, `omr-service/tests/test_score_mapping_independent.py`
- **검증 환경**: `/tmp/clairkeys-issue125-venv/bin/python` (`PYTHONPATH=omr-service`)

OMR 에이전트에 의해 `score_artifact.py` 및 `converter.py`의 `convert_with_artifact` 구현이 완료됨에 따라, 백엔드 변환 매핑 및 프론트엔드 연동에 대한 최종 심층 독립 감사를 수행했다.

### 1) OMR 매핑 로직 상세 검토 결과

1. **최종 정렬(Final Sort) 및 인덱스 참조 보존**:
   - `converter.py`에서 각 음표는 `notes.append(note)` 및 `note_mappings.append((xml_id, note))`로 파이썬 딕셔너리 인스턴스 참조(`id(note)`)를 보관한다.
   - 이후 `notes.sort(key=lambda n: (n['start'], n['midi']))`로 정렬 순서가 재배치되더라도 객체의 `id(note)`는 보존된다.
   - `score_artifact.py`에서 `note_to_index = {id(n): idx for idx, n in enumerate(notes)}`를 통해 정렬 후의 최종 인덱스(`idx`)로 매핑하므로, XML 노드 ID와 최종 canonical noteIndex 간의 1:1 관계가 왜곡 없이 정확히 매핑된다.
2. **동일 시점·동일 피치·서로 다른 성부/보표 (Unison Collision)**:
   - Staff 1(오른손)과 Staff 2(왼손)에서 같은 시점에 동일한 MIDI 피치(예: C4, midi 60)를 연주할 때, 2개의 독립된 딕셔너리 인스턴스가 생성되어 Timsort의 안정 정렬(Stable Sort)을 거친다.
   - `note_mappings`의 `(xml_id, note)`가 각각의 고유한 인스턴스를 가리키므로, Staff 1의 XML note는 Staff 1 canonical note(Hand 'R')에, Staff 2의 XML note는 Staff 2 canonical note(Hand 'L')에 정확하게 분리 매핑된다 (`test_simultaneous_same_pitch_different_voices_and_staves` 검증).
3. **다중 마디·다성부 타이 지속음 (Tied Continuations)**:
   - 3마디에 걸쳐 이어지는 타이 음표(start -> continue -> stop)의 경우, `open_ties[(midi, voice)]`에 의해 첫 음표의 딕셔너리에 지속시간(`duration`)이 합산된다.
   - 3개의 개별 XML 노드(`p1-m1-n1`, `p1-m2-n1`, `p1-m3-n1`)가 모두 동일한 첫 번째 canonical note(`noteIndex: 0`)를 참조하도록 매핑되며, 동시 진행하는 다른 voice의 독립 음표는 영향을 받지 않고 자신의 고유 인덱스를 유지한다 (`test_multi_measure_multi_voice_tied_continuations` 검증).
4. **쉼표(Rests) 및 잇단음표(Tuplets) 정확성**:
   - 쉼표는 `notes`와 `artifact['notes']`에서 완전히 배제되며 XML id 속성이 부여되지 않는다.
   - 잇단음표는 `divisions` 분수 계산(`Fraction`)으로 1/3박자(`0.166667s`) 단위까지 오차 없이 계산된다.
   - 기존 `test_score_artifact.py`의 `test_voices_chords_rests_tuplets`가 `assertIsNotNone`만 확인하던 취약점을 보완하여, 신규 독립 테스트에서 모든 음표의 exact index, pitch, onset, duration, voice, staff, hand를 정밀 검증했다.
5. **구간별 템포 변화 (Piecewise Changing Tempi)**:
   - 마디별 템포 변경(예: 1마디 120 BPM, 2마디 60 BPM) 시 `QuarterClock` 적분을 통해 마디별 초 단위 시간(m1: 0~2.0s, m2: 2.0~6.0s) 및 마디를 가로지르는 타이 음표의 합산 지속시간(6.0s)이 정확하게 산출된다.

### 2) 프론트엔드 연동 및 인덱스 불변성 (Index Invariance)

- **`canonicalToFallingNotes` 인덱스 일치**:
  - 프론트엔드 `FallingNotesPlayer`의 `canonicalToFallingNotes`는 `notes.map` -> `addKeyReleaseGuidance(addFingeringToNotes(notes))` 형태로 동작하며 배열 요소의 순서나 길이를 일체 변경하지 않는다.
  - 따라서 백엔드 `animation_data.notes`의 순서와 프론트엔드 플레이어의 `notes` 배열 순서가 100% 동일하게 보존되며, `ScorePanel`의 `notes[mapping.noteIndex]?.finger`를 통한 앱 계산 운지 주입이 완벽하게 성립한다.
- **Finding 1 및 Finding 2 해결 확인**:
  - 코디네이터가 `ScorePanel.tsx`에 `if (!bounds.length) return null` 및 `[left, top, right, bottom].every(Number.isFinite)` 가드를 추가하여 빈 마디 예외 처리를 완료했다.
  - `score_artifact.py`에서 `measureIndex`가 0-based 순차 정수(`enumerate(part)`)로 생성되어, OSMD의 0-based `MeasureList` 문서 순서와 정확하게 일치한다.

### 3) 신규 독립 감사 테스트 결과

- **신규 테스트 파일**: `omr-service/tests/test_score_mapping_independent.py`
- **테스트 실행 명령**:
  ```sh
  PYTHONPATH=omr-service /tmp/clairkeys-issue125-venv/bin/python -m unittest -v omr-service/tests/test_score_mapping_independent.py
  ```
- **실행 결과 (5개 테스트 전원 PASS, 0.037s)**:
  - `test_exact_mapping_voices_chords_rests_tuplets` ... ok
  - `test_simultaneous_same_pitch_different_voices_and_staves` ... ok
  - `test_multi_measure_multi_voice_tied_continuations` ... ok
  - `test_changing_tempo_across_measures_with_cross_measure_tie` ... ok
  - `test_edge_cases_and_negative_validation` ... ok
- **OMR 전체 점수 아티팩트 테스트**:
  ```sh
  PYTHONPATH=omr-service /tmp/clairkeys-issue125-venv/bin/python -m unittest discover -s omr-service/tests -p "test_score*.py"
  ```
  - 15개 테스트 모두 PASS (0.504s).
- **프론트엔드 점수 검증 테스트**:
  ```sh
  npm test -- src/utils/__tests__/scoreIndependent.test.ts src/utils/__tests__/scoreDisplay.test.ts
  ```
  - 2개 스위트, 18개 테스트 모두 PASS (0.785s).

### 4) 최종 판정

OMR 서비스의 `ScoreArtifact` 생성 및 변환 매핑은 정렬 안정성, 동일 시점 유니즌 분리, 다중 마디 타이 단일화, 쉼표 제외 및 잇단음표 시간 정확성, 구간별 템포 적분 전 영역에서 결함 없이 정확하게 동작함을 최종 검증하였다. 프론트엔드 수신 및 OSMD 렌더링 계약과의 정합성도 완벽히 확보되었다.


## Primary qualification / disposition

RLS/cascade/경쟁 조건은 독립 담당의 코드 검토 근거이며 직접 DB/브라우저 실행 근거는 주 검증 기록을 따른다. 테스트된 사례를 모든 입력에서 완벽함으로 확대하지 않는다. Finding1 빈 bounds는 null 처리·유한수 검사, Finding2는0-based 문서순서 타입 주석과 Python 독립 fixture로 대응했다. Primary가 신규 Python/Jest bridge33개를 직접 재실행해 통과를 확인했다. PR CI와 실제 PR 리뷰는 아직 대기다.
