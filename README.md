# ClairKeys 🎹

PDF 악보를 시각적 피아노 애니메이션으로 변환하여 피아노 학습을 돕는 현대적인 웹 애플리케이션입니다.

## ✨ 주요 기능

### 🎵 핵심 기능
- **PDF 악보 처리**: 드래그 앤 드롭으로 PDF 악보 업로드 및 자동 분석
- **시각적 피아노 애니메이션**: 88키 풀 피아노 건반과 실시간 애니메이션
- **오디오 재생**: Tone.js 기반 고품질 피아노 사운드 합성
- **인텔리전트 재생 컨트롤**: 재생/일시정지, 속도 조절(0.5x~2.0x), 구간 반복
- **연습 모드**: 단계별 가이드, 템포 연습, 실시간 피드백

### 📱 모바일 최적화
- **전체화면 모드**: Fullscreen API를 활용한 몰입형 연주 환경
- **가로모드 최적화**: 88키 전체를 활용하는 가로 스크롤 인터페이스
- **터치 제스처**: 핀치 줌, 스와이프 네비게이션, 더블탭 리셋
- **모바일 컨트롤**: 전용 컨트롤 패널과 키보드 단축키 지원
- **PWA 지원**: 앱 설치, 오프라인 사용, 푸시 알림

### 👤 사용자 경험
- **소셜 로그인**: Google, GitHub 간편 로그인
- **개인화**: 사용자별 악보 관리 및 카테고리 시스템
- **공유 기능**: 공개 악보 브라우징 및 검색
- **실시간 검색**: 곡명, 작곡가 기반 즉시 검색
- **반응형 디자인**: 모든 디바이스에서 최적화된 UI

### 🔧 고급 기능
- **성능 최적화**: 이미지 최적화, 코드 스플리팅, 캐싱 전략
- **실시간 모니터링**: Web Vitals 측정, 성능 대시보드
- **접근성**: WCAG 2.1 AA 준수, 키보드 네비게이션
- **테스트**: 단위 테스트, E2E 테스트, 자동화된 CI/CD
- **보안**: CSP 헤더, XSS 보호, 안전한 파일 처리

## 🛠️ 기술 스택

### Frontend
- **Next.js 14** - App Router, Server Components
- **React 18** - Hooks, Suspense, Concurrent Features
- **TypeScript** - 타입 안전성 보장
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크

### Backend & Database
- **PostgreSQL** - 관계형 데이터베이스
- **Prisma ORM** - 타입 안전한 데이터베이스 액세스
- **Supabase** - 데이터베이스 호스팅 및 스토리지
- **NextAuth.js** - 인증 및 세션 관리

### Audio & Processing
- **Tone.js** - 웹 오디오 합성 및 처리
- **Web Audio API** - 저수준 오디오 제어
- **Audiveris 5.11** - PDF 악보 인식 (OMR), NAVER Cloud VM에서 실행
- **Tesseract 5.5.2** - 악보 위 인쇄된 글자 인식 (OCR). 별도 서비스가 아니라 같은 VM의 Audiveris가 `TEXTS` 단계에서 호출한다
- **Canvas API** - 피아노 건반 렌더링

### DevOps & Deployment
- **Vercel** - 서버리스 배포 플랫폼
- **GitHub Actions** - CI/CD 파이프라인
- **Jest & Playwright** - 테스트 프레임워크
- **ESLint & Prettier** - 코드 품질 관리

## 🏗️ 서비스 구조

세 곳에서 나뉘어 돌아간다. **어느 자격증명이 어디에 있는지**가 이 구조를 정한 이유이므로 함께 적는다.

| 구성 요소 | 실행 위치 | 하는 일 | 필요한 환경변수 | 다른 시스템에 접근할 수 있는 키 |
|---|---|---|---|---|
| Next.js 앱 | Vercel (서버리스) | 업로드 접수, 폴링, **결과 저장**, 재생 화면 | `SUPABASE_SERVICE_ROLE_KEY`, `OMR_SERVICE_URL`, `OMR_SHARED_SECRET` | Supabase 전체 읽기·쓰기 |
| OMR 서비스 | NAVER Cloud VM (podman) | PDF → MusicXML → 애니메이션 JSON 변환. 음표 인식(OMR)과 글자 인식(OCR)이 **한 프로세스 안에서** 함께 돈다 | `OMR_SHARED_SECRET` (**검증용**), `ENVIRONMENT` | **없음** |
| Supabase | 관리형 | PostgreSQL(메타데이터) + Storage(JSON 파일) | — | — |

두 열을 나눈 이유가 이 구조의 핵심이다. OMR 서비스도 `OMR_SHARED_SECRET`을 **설정해야** 한다 — 없으면 모든 요청을 503으로 거절한다. 다만 그 값은 들어온 요청을 **검증**하는 데만 쓰이고, 그것으로 나가서 무언가에 접근할 수는 없다. 반면 `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회해 프로젝트 전체를 읽고 쓴다.

그래서 공인 IP VM이 유출되어도 잃는 것은 "이 서비스를 호출할 권한"까지이고, Supabase 데이터가 아니다(**D-011**). 저장은 그 키를 이미 가진 Vercel이 한다.

```mermaid
flowchart TB
  U["브라우저<br/>업로드 · 재생"]

  subgraph V["Vercel · Next.js 서버리스"]
    direction LR
    R1["POST /api/omr/upload"]
    R2["GET /api/omr/status/:jobId"]
    R3["/sheet/:id"]
  end

  subgraph M["NAVER Cloud VM · podman"]
    direction LR
    F["FastAPI :8000"] --> A["Audiveris<br/>PDF → MusicXML"] --> C["converter.py<br/>MusicXML → JSON"]
    A -.->|"TEXTS 단계"| T["Tesseract OCR<br/>지면의 글자"]
    T -.-> A
  end

  subgraph S["Supabase"]
    direction LR
    DB[("PostgreSQL<br/>SheetMusic 메타데이터")]
    ST[("Storage<br/>animation-data 버킷")]
  end

  U --> V
  V -->|"X-ClairKeys-Token"| M
  V -->|"SUPABASE_SERVICE_ROLE_KEY"| S
  U -.->|"애니메이션 JSON 직접 fetch<br/>공개 버킷"| ST
```

### 업로드 → 변환 → 저장

```mermaid
sequenceDiagram
  autonumber
  participant U as 사용자
  participant V as Vercel<br/>Next.js
  participant D as PostgreSQL
  participant M as OMR 서비스<br/>(VM)
  participant S as Supabase<br/>Storage

  U->>V: PDF 업로드
  Note over V: 세션 확인<br/>OMR_SERVICE_URL 검증<br/>(형식이 틀리면 여기서 거절)
  V->>D: SheetMusic 행 생성<br/>processingStatus='processing'
  Note over V,D: 행을 먼저 만드는 건 서비스에<br/>sheet_music_id를 넘겨야 하기 때문
  V->>M: POST /process + X-ClairKeys-Token
  M-->>V: job_id
  V->>D: omrJobId 기록
  V-->>U: jobId 반환

  Note over M: 백그라운드 변환
  M->>M: Audiveris -batch -export<br/>PDF → MusicXML
  Note over M: 같은 실행 안에서 OMR(음표)과<br/>OCR(글자)이 함께 돈다
  M->>M: converter.py<br/>MusicXML → 애니메이션 JSON
  Note over M: JSON을 메모리에 보관<br/>(어디에도 쓰지 않는다)

  loop 3초 간격 폴링
    U->>V: GET /api/omr/status/:jobId
    V->>M: GET /status/:jobId + 토큰
    M-->>V: status / progress
    alt completed (최초 1회만)
      V->>M: GET /result/:jobId
      M-->>V: animation_data (JSON 본문)
      V->>S: animation-data 버킷에 업로드<br/>service role key · job id 키로 upsert
      S-->>V: 공개 URL
      V->>D: animationDataUrl 기록<br/>processingStatus='completed'
    end
    V-->>U: 상태 + 진행률
  end
```

폴링 루프가 이 설계의 여러 결정을 만들었다:

- **JSON 본문은 `/status`가 아니라 `/result`에 있다.** `/status`는 3초마다 호출되므로 수백 개 음표를 매번 실어 보낼 이유가 없다.
- **저장은 job id를 키로 upsert한다.** 두 폴링이 동시에 완료를 관측할 수 있고, 랜덤 파일명이면 객체가 둘 생겨 하나는 영구 고아가 된다.
- **이미 저장됐으면 다시 저장하지 않는다** (`animationDataUrl`이 비어 있지 않으면 건너뜀).
- **`/status`가 404를 주면 행을 `failed`로 만든다.** 변환 작업 상태는 서비스 프로세스 메모리에 있어 재시작하면 사라진다. 404는 "작업이 영구히 없다"는 뜻이므로 종료 처리해야 하고, 그렇지 않으면 행이 `processing`에 영원히 남는다. 반면 **폴링 중의** 5xx·401·503이나 연결 불가는 일시적이므로 저장된 상태를 건드리지 않는다 — 그 시점에는 서비스에서 작업이 아직 돌고 있을 수 있다. (업로드 시점의 연결 불가는 반대로 행을 `failed`로 만든다. 아래 실패 표 참조.)
- **서비스가 돌려준 제목으로 사용자가 입력한 제목을 덮어쓰지 않는다.**

### OCR — 악보 위의 글자

**OCR은 별도 서비스가 아니다.** 같은 VM, 같은 Audiveris 실행 안에서 돈다. Audiveris는 페이지를 단계별로 처리하는데(`SCALE` → … → `TEXTS` → …), 그중 `TEXTS` 단계가 Tesseract를 호출해 오선 위·아래에 인쇄된 글자를 읽는다. 그래서 로그도 컨테이너도 하나이고, "OMR 서비스"라는 이름 하나가 음표 인식과 글자 인식을 둘 다 덮고 있다.

#### 먼저: 지금 OCR이 제품에 기여하는 바는 확인된 것이 없다

**사용자에게 보이는 제목·작곡가는 업로드 폼에 사용자가 입력한 값이다.** 악보 상세 화면(`src/app/sheet/[id]/page.tsx`)은 DB `SheetMusic` 행을 그대로 렌더하고, 그 행은 서비스가 돌려준 값으로 덮어쓰지 않는다(위 폴링 절 참조). OCR이 이 자리를 대신 채우지 않는다.

DB가 아닌 값을 보여주는 곳은 재생 플레이어 헤더 하나뿐이다 — `AnimationPlayer.tsx`가 애니메이션 JSON의 `title`/`composer`를 렌더한다. 그리고 그 JSON을 만드는 `omr/converter.py`의 `_extract_metadata`는 `<work-title>`과 `<creator type="composer">`를 찾아 **있으면 그것을 쓰고, 없을 때만** 사용자 입력으로 채운다.

문제는 그 두 요소가 관측된 적이 없다는 것이다. 2026-08-23 실측에서 OCR이 읽어낸 글자는 전부 `<credit-words>`로 나왔다:

```
'Piano Solo - Love Affair'   'Love Affair OST'
'Ennio Morricone'            'trans. Jose Hernandez'
'10' '13' '16' '19' '25' '28'        (마디 번호)
```

지면의 제목·부제·작곡가·편곡자를 정확히 읽은 것은 맞다. 그러나 Audiveris가 `<work-title>`·`<creator>`도 함께 채우는지는 **검증된 적이 없고**, 채우지 않는다면 이 글자들은 어디에도 반영되지 않는다. 플레이어 헤더에도 사용자 입력이 그대로 쓰이고, **겉보기 동작은 OCR이 죽어 있던 때와 구별되지 않는다.**

마디 번호는 JSON에 나오지 않고, 가사·나타냄말은 `<words>`로 나오지만 변환기가 쓰지 않는다. 그래서 요약하면 — **OCR은 2026-08-23에 되살아났지만(#49), 그것이 사용자가 보는 무언가를 바꿨다는 증거는 아직 없다.**

#### traineddata를 체크섬으로 고정해 둔 이유

`omr-service/Dockerfile.audiveris`는 Ubuntu 패키지가 깔아둔 `eng.traineddata`를 **덮어쓴다**. 이건 재현성을 위한 장식이 아니라 OCR의 생사가 걸린 지점이다:

- `tesseract-ocr-eng` 패키지의 영어 모델은 4,113,088 B짜리 **LSTM 전용**이다.
- 그런데 Audiveris는 Tesseract를 **legacy 엔진 모드**로 초기화하고, 엔진 모드를 바꿀 설정 상수를 노출하지 않는다.
- 그 조합은 페이지마다 `Could not initialize TessBaseAPI languages: eng in legacy mode`와 `No OCR'd lines`를 남기고 **글자를 한 자도 읽지 못한다.**

그래서 `tesseract-ocr/tessdata` 4.1.0의 23,466,654 B legacy+LSTM 통합 모델을 sha256 핀(`daa0c97d…`)과 함께 받아 같은 경로에 설치한다. 패키지 자체는 Tesseract 실행 파일·설정·표준 tessdata 경로를 깔아주므로 그대로 두고, 모델 파일만 교체한다. 프로비저닝된 언어는 **`eng` 하나**다.

#### 이 고장이 오래 보이지 않은 이유

OCR은 이 프로젝트에서 **한 번도 동작한 적이 없었고**, 2026-08-23에야 발견됐다([이슈 #49](https://github.com/landfill/ClairKeys/issues/49), PR #50에서 수정). 보이지 않은 이유는 업로드 폼이 제목과 작곡가를 묻기 때문이다 — 사용자가 타이핑한 값이 OCR이 채웠어야 할 자리를 그대로 메워서, 완전히 죽은 텍스트 파이프라인이 작동하는 것처럼 보였다. 이 저장소가 반복해 제거해 온 "실패가 성공처럼 보이는" 결함의 또 다른 형태다(**D-001**, **D-010**).

위 실측의 전문은 `docs/recovery/validation/2026-08-23-omr-image-rebuild-after-48-49.md`에 있다.

#### 메트로놈 표기: "읽는 코드"와 "읽어내는 인식"은 다른 층이다

빠르기 처리는 두 단계로 나뉘고, **둘 중 하나만 완성돼 있다.** 이 구분을 놓치면 "메트로놈을 읽도록 이미 고쳤는데 왜 안 되나"라는 혼란이 생긴다.

두 PR이 자주 한 덩어리로 기억되지만 서로 다른 것을 고쳤다: **PR #50이 OCR**(`Dockerfile.audiveris`의 traineddata 교체뿐, 메트로놈과 무관), **PR #51이 빠르기 계약**(`converter.py`·업로드 폼, OCR 아님)이다.

| 층 | 하는 일 | 어디에 있나 | 상태 |
|---|---|---|---|
| 1. 인식 | 지면의 `♩ = 60` → MusicXML `<metronome>` | VM의 Audiveris (OCR + 심볼 인식) | **동작하지 않는다** |
| 2. 해석 | MusicXML `<metronome>` → JSON `tempo` | `omr/converter.py` | 완성 — `<beat-unit>`·부점까지 환산 |

`converter.py`의 `_find_tempo`·`_metronome_quarter_bpm`은 `<sound tempo>`와 `<metronome>`을 읽고, `<per-minute>`의 숫자를 `<beat-unit>`과 짝지어 4분음표 BPM으로 환산하며, 중간에 바뀌는 빠르기까지 마디 단위 타임라인으로 반영한다. **이건 OCR이 아니라 이미 만들어진 MusicXML을 파싱하는 코드다** — 1층이 `<metronome>`을 만들어 주지 않으면 한 번도 실행되지 않는다.

그리고 1층은 아직 그걸 만들어 주지 않는다. OCR을 되살린 뒤(#49) 같은 악보를 다시 통과시켜도 MusicXML의 `<metronome>`은 **0개**였고 `Adagio`도 `60`도 어디에도 나타나지 않았다. Audiveris 5.11은 `MetronomeInter`·`BeatUnitInter`·`TextRole.Metronome`을 갖고 있고 이를 끄는 `ProcessingSwitch`도 없으므로 경로 자체는 배선돼 있다 — **OCR이 살아 있는 것은 필요조건이었지 충분조건이 아니었다.** 그 아래 원인은 아직 미규명이다([이슈 #48](https://github.com/landfill/ClairKeys/issues/48)).

그래서 빠르기는 악보에서 읽히기를 기다리지 않고 **업로드 폼의 선택 입력**으로 받는다(PR #51). 현재 재생되는 빠르기는 사용자가 입력했다면 `tempoSource: "user"`, 아니면 `"unknown"`이다 — **`"score"`는 실제 악보에서 한 번도 관측된 적이 없다.** 결과 JSON은 그 출처를 숨기지 않는다 (아래 `tempoSource`).

### 연주

```mermaid
sequenceDiagram
  autonumber
  participant U as 사용자
  participant V as Vercel<br/>/sheet/:id
  participant D as PostgreSQL
  participant S as Supabase Storage

  U->>V: /sheet/:id 접속
  V->>D: SheetMusic 조회
  D-->>V: animationDataUrl 등 메타데이터
  V-->>U: 페이지 렌더 (URL 포함)
  U->>S: animationDataUrl 직접 fetch
  S-->>U: 애니메이션 JSON
  Note over U: AudioContext 시계 기준으로<br/>오디오와 낙하 노트를 함께 스케줄
```

애니메이션 JSON은 브라우저가 Supabase Storage에서 **직접** 받는다 — `animation-data`는 공개 버킷이고, Vercel 함수를 한 번 더 거칠 이유가 없다.

재생 시각은 `Date.now()`가 아니라 **AudioContext 시계** 하나를 기준으로 삼는다(**P0-C**). 오디오와 시각 요소가 서로 다른 시계를 쓰면 긴 곡에서 어긋나기 때문이다.

### 애니메이션 JSON 형식

```json
{
  "version": "1.1",
  "title": "...", "composer": "...",
  "tempo": null, "tempoSource": "unknown",
  "timingReferenceBpm": 60.0, "scoreTempo": null,
  "duration": 115.2,
  "timeSignature": "4/4", "keySignature": "C",
  "notes": [
    { "midi": 60, "start": 0.0, "duration": 1.0,
      "hand": "L", "finger": null, "voice": 5, "staff": 2 }
  ]
}
```

`start`와 `duration`은 **초** 단위이고, `hand`는 MusicXML의 staff에서 유도한다. 타이로 묶인 음은 **하나의 음표로 합쳐진다** — 연주자는 건반을 한 번 누르고 유지하기 때문이다. 그래서 JSON의 음표 수는 MusicXML의 `<note>` 수보다 적은 것이 정상이다.

빠르기 네 필드가 함께 있는 이유는 **출처를 지어내지 않기 위해서다.** 예전 변환기는 악보에 표기가 없으면 조용히 `120`을 넣었고, 재생 화면은 그것을 악보에서 읽은 값과 같은 서체로 표시했다(**이슈 #48**). 지금은 이렇게 나뉜다:

| 필드 | 뜻 |
|---|---|
| `tempo` | 근거 있는 빠르기. 없으면 **`null`** — 지어내지 않는다 |
| `tempoSource` | `score`(악보에서 인식) · `user`(업로드 폼 입력) · `unknown`(둘 다 없음) |
| `scoreTempo` | 악보에서 인식된 값 그 자체 (사용자 입력이 있어도 보존) |
| `timingReferenceBpm` | 음표 시각을 계산할 때 실제로 쓴 BPM. `unknown`일 때도 값이 필요하므로 항상 채워진다 |

`tempoSource: "score"`는 **실제 악보에서 아직 한 번도 관측된 적이 없다** — 위 메트로놈 인식 문제 때문이다.

형식의 정의와 검증기는 **D-009**에, 정확도 게이트는 `src/utils/__tests__/converterCorpus.test.ts`에 있다.

### 실패가 보이는 방식

이 프로젝트가 오래 겪은 문제는 실패가 성공처럼 보이는 것이었다. 업로드 경로 넷 중 셋이 PDF를 열지도 않고 파일 크기로 고른 데모 멜로디를 실제 악보와 구분 불가능하게 저장했다. 그 경로들은 제거됐고(**D-010**), 지금은 다음처럼 실패한다:

| 상황 | 시점 | 결과 |
|---|---|---|
| `OMR_SERVICE_URL` 미설정·형식 오류 | 업로드 | 행을 만들기 **전에** 거절, "관리자에게 문의" |
| 서비스 연결 불가 | 업로드 | 행을 `failed`로 |
| 서비스 연결 불가 | 폴링 | 503 반환, **행은 그대로** |
| 시크릿 불일치 (401) · 서비스 오류 (5xx) | 폴링 | 502 반환, **행은 그대로** |
| Audiveris 인식 실패 | 변환 | job이 `failed` → 행도 `failed`. 데모 멜로디로 대체하지 않음 |
| 변환 결과 저장 실패 | 폴링 | 행을 `failed` — `completed`인데 재생할 데이터가 없는 상태를 만들지 않음 |
| 서비스 재시작으로 작업 유실 | 폴링 | `/status` 404 → 행을 `failed` |

**같은 "연결 불가"가 업로드와 폴링에서 반대로 처리되는 것은 의도된 것이다.** 업로드 시점에는 행에 아직 `omrJobId`가 없다 — 호출이 실패하면 이어받을 작업 자체가 없으므로, 행을 실패시키지 않으면 아무도 다시 움직일 수 없는 상태로 남는다. 폴링 시점에는 `omrJobId`가 있고 서비스에서 작업이 아직 돌고 있을 수 있으므로, 여기서 행을 실패시키면 복구 가능한 작업을 파괴한다.

폴링에서 유일하게 행을 실패시키는 비정상 응답은 **404**다. 그것만이 "작업이 영구히 없다"는 뜻이기 때문이다.

텍스트 쪽에도 오래 보이지 않던 실패가 있었다 — **OCR이 한 글자도 읽지 못하는데 업로드 폼의 제목·작곡가 입력이 그 자리를 메워 정상처럼 보였다**(이슈 #49, 2026-08-23 수정). 자세한 내용과 남은 한계는 위 "OCR — 악보 위의 글자"에 있다.

**아직 보이지 않는 실패가 하나 있다**: 인식이 되긴 했으나 박자가 틀린 경우. 마디 길이가 박자표와 맞지 않아도 지금은 조용히 그대로 재생된다 — [이슈 #44](https://github.com/landfill/ClairKeys/issues/44).

### 배포·운영

- OMR 서비스 배포 절차와 systemd unit: `omr-service/deploy/`
- 노출 방식(현재 테스트 단계 한정 평문 HTTP)과 그 종료 조건: **D-012**
- 결정 기록 전체: `docs/recovery/DECISIONS.md`

## 🚀 빠른 시작

### 1. 저장소 복제 및 의존성 설치

```bash
git clone https://github.com/your-username/clairkeys.git
cd clairkeys
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 필요한 값을 설정:

```bash
cp .env.example .env
```

필수 환경 변수:
```env
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

### 3. 데이터베이스 및 스토리지 설정

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 스키마 동기화
npm run db:push

# Supabase Storage 초기화 (버킷 생성)
npm run init-storage

# 샘플 데이터 생성
npm run seed

# (선택사항) 데이터 상태 확인
npm run check-data-status

# (선택사항) Prisma Studio 실행
npm run db:studio
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
clairkeys/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 인증 그룹 라우트
│   │   ├── api/               # API 라우트
│   │   ├── dashboard/         # 대시보드 페이지
│   │   └── globals.css        # 전역 스타일
│   ├── components/            # React 컴포넌트
│   │   ├── ui/               # 재사용 가능한 UI 컴포넌트
│   │   ├── piano/            # 피아노 관련 컴포넌트
│   │   ├── mobile/           # 모바일 최적화 컴포넌트
│   │   ├── auth/             # 인증 컴포넌트
│   │   ├── upload/           # 파일 업로드 컴포넌트
│   │   └── layout/           # 레이아웃 컴포넌트
│   ├── lib/                  # 라이브러리 및 유틸리티
│   │   ├── services/         # 비즈니스 로직 서비스
│   │   ├── utils/            # 헬퍼 함수
│   │   └── db/               # 데이터베이스 설정
│   ├── hooks/                # 커스텀 React 훅
│   ├── types/                # TypeScript 타입 정의
│   └── styles/               # 스타일 파일
├── public/                   # 정적 파일
├── prisma/                   # 데이터베이스 스키마
├── tests/                    # 테스트 파일
└── docs/                     # 문서
```

## 🎯 사용 방법

### 1. 악보 업로드
1. 대시보드에서 "새 악보 업로드" 버튼 클릭
2. PDF 파일을 드래그 앤 드롭하거나 파일 선택
3. 곡명, 작곡가, 카테고리 정보 입력
4. **빠르기(BPM)는 선택 입력** — 20~400 범위. 비워두면 빠르기 미상으로 표시되며, 임의의 값을 지어내지 않는다 (악보에 인쇄된 `♩ = N`은 아직 인식되지 않는다. 위 "OCR — 악보 위의 글자" 참조)
5. 업로드 및 처리 완료 대기

### 2. 피아노 연주
- **기본 재생**: 재생 버튼으로 자동 연주 감상
- **따라하기 모드**: 건반 하이라이팅을 보며 연습
- **속도 조절**: 슬라이더로 0.5배~2배속 조절
- **구간 반복**: 특정 구간을 반복하여 연습

### 3. 모바일 연주
- **전체화면 모드**: 전체화면 버튼으로 몰입형 연주
- **가로모드 권장**: 88키 전체를 활용한 최적 연주 환경
- **터치 제스처**: 핀치로 줌, 스와이프로 스크롤
- **키보드 단축키**: Space(재생), F11(전체화면), 화살표(네비게이션)

## 📱 모바일 기능 상세

### 전체화면 피아노 모드
- **Fullscreen API** 활용한 네이티브 전체화면
- **Screen Wake Lock** 지원으로 화면 꺼짐 방지
- **화면 회전 감지** 및 가로모드 유도
- **크로스 브라우저 호환** (Chrome, Safari, Firefox, Edge)

### 터치 제스처
- **스와이프**: 좌우 스와이프로 건반 스크롤
- **핀치 줌**: 두 손가락으로 확대/축소
- **더블탭**: 줌 레벨 리셋
- **롱 프레스**: 상황별 메뉴 표시

### 모바일 컨트롤
- **컴팩트 UI**: 최소한의 화면 점유
- **원터치 컨트롤**: 재생, 볼륨, 속도 조절
- **키보드 단축키**: 외장 키보드 연결 시 단축키 지원
- **햅틱 피드백**: 터치 시 진동 피드백 (지원 기기)

## 🧪 개발 & 테스트

### 개발 명령어

```bash
# 개발 서버
npm run dev              # 개발 서버 실행
npm run build            # 프로덕션 빌드
npm run start            # 빌드된 앱 실행

# 코드 품질
npm run lint             # ESLint 실행
npm run lint:fix         # ESLint 자동 수정
npm run type-check       # TypeScript 타입 체크

# 데이터베이스
npm run db:generate      # Prisma 클라이언트 생성
npm run db:push          # 스키마 푸시 (개발용)
npm run db:migrate       # 마이그레이션 실행
npm run db:studio        # Prisma Studio 실행
npm run db:seed          # 시드 데이터 생성

# 테스트
npm run test             # Jest 단위 테스트
npm run test:watch       # 감시 모드 테스트
npm run test:e2e         # Playwright E2E 테스트
npm run test:coverage    # 커버리지 리포트

# 분석 및 최적화
npm run analyze          # 번들 크기 분석
npm run lighthouse       # 성능 측정
```

### 테스트 전략

1. **단위 테스트**: Jest로 개별 함수 및 컴포넌트 테스트
2. **통합 테스트**: API 엔드포인트 및 서비스 통합 테스트
3. **E2E 테스트**: Playwright로 전체 사용자 플로우 테스트
4. **접근성 테스트**: axe-core 통합으로 자동 접근성 검사
5. **성능 테스트**: Lighthouse CI로 성능 회귀 방지

## 🚢 배포

### Vercel 배포 (권장)

1. **GitHub 연결**
   ```bash
   git push origin main
   ```

2. **Vercel 설정**
   - Vercel 대시보드에서 프로젝트 연결
   - 환경 변수 설정 (Production/Preview)
   - 자동 배포 설정 활성화

3. **환경별 설정**
   - **Production**: `main` 브랜치 자동 배포
   - **Preview**: PR 생성 시 프리뷰 배포
   - **Development**: 로컬 개발 환경

### 성능 최적화 설정

```javascript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 2592000, // 30일
  },
  experimental: {
    optimizeCss: true,
  },
  compress: true,
}
```

### CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml
- Test (Unit + E2E)
- Build
- Security Scan
- Performance Audit
- Deploy to Vercel
- Health Check
```

## 📊 모니터링 & 분석

### 성능 모니터링
- **Real User Monitoring**: Core Web Vitals 실시간 측정
- **성능 대시보드**: LCP, FID, CLS 트렌드 분석
- **알림 시스템**: 성능 저하 시 자동 알림
- **에러 추적**: 런타임 에러 모니터링

### 사용자 분석
- **업로드 통계**: 파일 형식, 크기, 성공률
- **연주 패턴**: 재생 시간, 속도 선호도
- **기기 분석**: 모바일/데스크톱 사용 비율
- **성능 메트릭**: 페이지 로드 시간, 상호작용 지연

## 🤝 기여하기

### 기여 방법

1. **Fork** 저장소
2. **Feature 브랜치** 생성
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **변경사항 커밋**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **브랜치 푸시**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Pull Request** 생성

### 개발 가이드라인

- **코드 스타일**: ESLint + Prettier 설정 준수
- **커밋 메시지**: Conventional Commits 형식 사용
- **테스트**: 새 기능에 대한 테스트 작성 필수
- **타입 안전성**: TypeScript strict 모드 준수
- **성능**: Web Vitals 기준 준수

### 이슈 리포팅

버그 리포트나 기능 요청은 [GitHub Issues](https://github.com/your-username/clairkeys/issues)를 통해 제출해주세요.

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- **Tone.js** - 웹 오디오 합성 라이브러리
- **Next.js** - React 기반 풀스택 프레임워크
- **Vercel** - 배포 및 호스팅 플랫폼
- **Supabase** - 백엔드 서비스 제공

---

**ClairKeys**로 누구나 쉽고 재미있게 피아노를 배울 수 있습니다! 🎹✨