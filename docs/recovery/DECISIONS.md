# Decision Log

## D-001: 실제 OMR과 데모 변환을 구분한다

- Date: 2026-07-19
- Status: Accepted
- Decision: 내부 데모 멜로디 생성은 OMR 성공 결과로 취급하지 않는다.
- Reason: 파일 크기 기반 샘플 멜로디는 악보 내용을 나타내지 않는다.
- Directive: fallback은 명시적 실패 또는 demo 상태를 반환해야 한다.

## D-002: 애니메이션 데이터는 버전이 있는 하나의 계약을 사용한다

- Date: 2026-07-19
- Status: Accepted
- Decision: Python converter, storage JSON, TypeScript validator, player가 동일한 canonical schema를 사용한다.
- Reason: 현재 필드명과 손 표기가 달라 런타임 cast로 오류가 숨겨진다.
- Directive: 계약 변경은 fixture와 migration/compatibility policy 없이 수행하지 않는다.

## D-003: 변환 정확도와 재생 동기화를 별도로 검증한다

- Date: 2026-07-19
- Status: Accepted
- Decision: MusicXML→timeline 테스트와 timeline→audio/visual 테스트를 분리한다.
- Reason: OMR, 시간 계산, 스케줄러 오류가 섞이면 원인을 격리할 수 없다.

## D-004: 단계별 브랜치와 PR을 사용한다

- Date: 2026-07-19
- Status: Superseded by D-006
- Decision: 로드맵의 각 단계는 `master`에서 분기한 별도 `codex/` 브랜치와 PR을 사용한다.
- Reason: 변경 범위와 리뷰 증거를 작게 유지하고 새 세션에서 안전하게 이어가기 위함이다.
- Directive: 여러 단계를 한 PR에 합치지 않는다.

## D-005: 에이전트는 PR을 자동 병합하지 않는다

- Date: 2026-07-19
- Status: Accepted
- Decision: 구현·자가 검증·PR 생성·리뷰 대응은 자동 진행하지만 병합은 사용자 지시를 기다린다.
- Reason: 병합은 기본 브랜치와 배포에 영향을 주는 최종 승인 행위다.

## D-006: 기본 브랜치를 `main`으로 통일한다

- Date: 2026-07-19
- Status: Accepted; effective 2026-07-19
- Decision: GitHub 기본 브랜치, 로컬 추적 브랜치, 신규 PR base와 운영 문서는 `main`을 사용한다.
- Reason: GitHub Actions가 이미 `main/develop`을 대상으로 하므로 실제 기본 브랜치 `master`와의 불일치를 제거한다.
- Constraint: PR #1의 기준선·리뷰 로그에 기록된 `master`는 역사적 사실이므로 소급 수정하지 않는다.
- Directive: DOC-1 완료 후 `master`에서 새 작업 브랜치를 만들거나 PR base로 사용하지 않는다.

## D-007: P0-C 오디오 스케줄러 버그를 P0-A·P0-B보다 먼저 착수한다

- Date: 2026-07-21
- Status: Accepted
- Decision: `ROADMAP.md`상 P0-C는 P0-A·P0-B에 의존하지만, 이슈 [#18](https://github.com/landfill/ClairKeys/issues/18)("긴 곡의 오디오가 앞 10초만 재생됨")의 rolling look-ahead scheduler 작업(P0-C Work stages 1~3)을 선행 착수한다.
- Reason: 이 결함은 canonical animation contract(P0-A) 정립 여부와 무관하게 현재 `FallingNote[]` 타임라인에서 사용자가 실제로 겪는 재생 버그다. `src/hooks/useFallingNotesAudio.ts:111`의 `relativeStart > 10` 상한과, `scheduleAudio`가 재생 중 재호출되지 않는 one-shot 구조가 원인이며, P0-A/P0-B의 산출물을 기다릴 이유가 없다.
- Constraint: 스케줄 대상 판단은 AudioContext와 무관한 순수 함수(`src/utils/audioScheduler.ts`의 `selectNotesInWindow`)로 분리해, 10초 이후 음표 선택을 오실레이터 모킹 없이 회귀 테스트한다. 이는 D-002(단일 애니메이션 계약)·D-003(변환/재생 검증 분리)과 충돌하지 않는다 — 스케줄러는 계약 필드명을 바꾸지 않고 기존 `FallingNote` 타임라인을 그대로 소비한다.
- Directive: 이후 P0-A/P0-B가 계약을 확정하더라도, 스케줄러는 `FallingNote`의 `start`/`duration`/`midi`/`velocity`만 읽으므로 그 필드 의미가 유지되는 한 재작업이 필요 없다. P0-C의 나머지 Work stages(4: 시각화·키 활성화 동일 시계 고정, 5: 장시간 drift 측정)는 이 착수 범위에 포함하지 않으며 별도로 남는다.
- Related: 이슈 #18, `docs/recovery/phases/P0-C-playback-sync.md`

## D-008: OMR 서비스 호스팅 — Fly.io 재사용 vs Google Cloud Run (초안)

- Date: 2026-07-21
- Status: **Proposed** (결정 보류 — 아래 Directive의 선행 조건이 충족될 때 확정한다. 아직 채택된 결정이 아니므로 이 항목만으로 호스트를 바꾸거나 기동하지 않는다.)
- Context:
  - 이 프로젝트는 약 1년 전 구성 후 중단되었다가 재개 중이다. OMR 서비스는 Fly.io(`app = "clairkeys-omr"`, `primary_region = "nrt"` 도쿄)에 있다. 사용자 보고로는 서버를 중지시켜 둔 상태이며, `fly.toml`의 `auto_stop_machines = true` / `min_machines_running = 0`은 이런 **scale-to-zero가 가능하도록 구성됐다는 뜻**이다(구성값이지 라이브 인스턴스 상태 관측은 아니다 — 실제 상태는 미확인).
  - 배포 이미지(`omr-service/Dockerfile.audiveris`)는 **Python만 설치하고 JRE/Audiveris를 설치하지 않는다.** 처리기 선택은 런타임 조건이 아니라 **import 시점**에 결정된다: `omr-service/app.py`가 `from omr.audiveris_docker import ...`를 먼저 시도하는데, `audiveris_docker`는 stdlib(subprocess/asyncio)만 import하므로 **항상 import에 성공** → `AudiverisDockerProcessor`가 선택된다. `audiveris_alt`(데모)는 docker·native import가 **둘 다 실패해야** 도달하므로 사실상 선택되지 않는다. 따라서 Docker 데몬이 없는 호스트(Fly 포함)에서는 첫 변환 시 `docker run`이 실패하고, 그 예외를 `process_pdf_background`가 잡아 **job을 FAILED로 마킹**한다 — "데모로 조용히 fallback"이 아니라 **작업이 실패**한다. (미확인: 실제 라이브 인스턴스 동작.)
  - `[[vm]] memory = "512mb"`는 Audiveris JVM에 사실상 부족하다.

  후보 비교 (기술 능력은 대체로 동급이나, 비용은 아래 주의대로 조건부다):

| 항목 | Fly.io (기존 재사용) | Google Cloud Run |
|---|---|---|
| scale-to-zero | O (`min_machines_running = 0`) | O (`min-instances=0` 기본) |
| 메모리 상향(2~4GB) | 가능 | 가능(인스턴스당 최대 32GiB/8 vCPU) |
| 장시간 처리 | 가능 | 요청 타임아웃 최대 60분 |
| 아시아 리전 | 도쿄 `nrt` (기존 설정) | 도쿄 `asia-northeast1` |
| 처리(백그라운드) 모델 | 요청 후 백그라운드 task 그대로 실행 가능 | **request-based billing은 응답 후 CPU throttle** → 현재 async job 모델(job_id 반환 후 `process_pdf_background`에서 처리, status 폴링)은 그대로 못 돎. `CPU always allocated`(추가 비용) 또는 Cloud Tasks/Cloud Run Jobs로 재구성 필요 |
| 재개 노력 | **최소** — `fly.toml`·볼륨·리전·헬스체크가 이미 있음 | 신규 구성 필요 |
| 저트래픽 비용 | 무료 티어 폐지 → 사용량 소액 과금 | 영속 무료 티어는 **US 리전(`us-central1`/`us-east1`/`us-west1`) 한정** → 도쿄(`asia-northeast1`)는 미적용, 첫 요청부터 과금. US 리전을 써도 위 "처리 모델"의 CPU-always/큐 비용이 별도(최신 단가 확인 필요) |
| 영속 볼륨 | 3GB 볼륨(`omr_data`) 존재 | 영속 디스크 없음 → `/tmp`·GCS·Supabase로 대체(OMR은 요청별 임시 스크래치만 필요하므로 블로커 아님) |
| privileged / Docker-in-Docker | **불가**(머신 내 Docker 데몬 없음) | **불가** — gen2는 Linux microVM 기반이지만 세대 무관하게 privileged 모드·Docker 데몬을 제공하지 않음 |

- Decision (proposed):
  1. 호스트 교체 자체는 우선순위가 아니다. **어느 호스트로 가든 선행 필수**는 컨테이너를 실제 작동하게 고치는 것이다: 이미지에 JRE+Audiveris를 직접 설치하고 CLI(`audiveris -batch -export`)로 호출, `audiveris_docker`(Docker-in-Docker) 경로 제거, 메모리 상향. 두 후보 모두 Docker-in-Docker/privileged를 금지하므로 이 수정은 호스트 무관하게 요구된다.
  2. 호스트 선택은 "두 축으로 깔끔하게 갈린다"고 단정하지 않는다 — Cloud Run의 "근사 무료" 전제는 **US 리전 + (동기 처리 완료 또는 Cloud Tasks/Jobs 재구성)** 조건에서만 성립한다. 이 조건을 감수하지 않으면 재개 노력이 최소인 **Fly.io 재사용**이 기본값이고, Cloud Run은 위 조건까지 반영해 실측 비용을 비교한 뒤에만 채택한다.
- Directive:
  - 정확도 미검증(P0-B 미완) 상태에서 라이브 OMR을 띄워 그 결과를 성공한 변환으로 저장하는 것은 **D-001 위반 소지**가 있다. 따라서 호스팅 확정·기동은 **P0-B(변환 정확도)가 성숙한 뒤**로 미룬다. 현재 복구 작업(P0-A/B/C)은 기존 JSON/MusicXML fixture로 진행 가능하므로 라이브 OMR 호스팅은 크리티컬 패스가 아니다.
  - 호스트를 Fly에서 바꾸면 **완료 조건**에 다음을 포함한다: `src/app/api/omr/upload/route.ts`·`src/app/api/omr/status/[jobId]/route.ts`의 기본 `OMR_SERVICE_URL`(현재 `https://clairkeys-omr.fly.dev`)을 새 호스트로 갱신하고, `/process`·`/status/:jobId` 엔드포인트와 `job_id`·결과 필드 계약이 새 호스트에서 동일하게 동작하는지 검증한다. 환경변수를 갱신하지 않으면 애플리케이션은 계속 Fly로 요청한다.
  - 이 항목을 Accepted로 승격할 때 선택한 호스트와 근거(비용·노력 실측)를 함께 기록한다.
- Related: 이슈 [#20](https://github.com/landfill/ClairKeys/issues/20)(TS 데모 스텁 `pdfParser.ts` 정리), 서버측 컨테이너 결함(Docker-in-Docker 의존·Dockerfile Audiveris/JVM 미설치·512MB 부족 → Docker 없는 호스트에서 job 실패, 별도 이슈 등록 예정), D-001, D-002, `docs/recovery/phases/P0-B-musicxml-converter.md`

## D-009: canonical 애니메이션 계약은 MIDI 계열로 통일하고 legacy Shape A는 정규화로 흡수한다

- Date: 2026-07-21
- Status: Accepted
- Context: `docs/recovery/validation/2026-07-21-p0a-animation-shape-audit.md`가 음표 데이터 shape 4종 공존과 플레이어 경계의 무검증 `as` 캐스트를 확인했다. 실제 OMR 출력(Shape C: `midi`/`start`/`R`/`L`)은 현재 `convertToFallingNotes`(Shape A: `note:"C4"`/`startTime`/`left|right` 기대)로 렌더링되지 않고 모든 음표가 middle C로 무너진다.
- Decision:
  - canonical 음표는 **MIDI 계열**: `{ midi, start, duration, hand:"L"|"R", velocity?, finger?:1..5, voice?, staff? }`. 문서는 `version` 필드를 가진 봉투(`CanonicalAnimationData`)로 감싼다. 근거: 4개 shape 중 3개(converter.py·FallingNote·MusicData)가 이미 MIDI 계열이며, Shape A(문자열 pitch)는 데모 `pdfParser.ts`와 lossy 변환이 유지하는 outlier다.
  - `voice`·`staff`는 현재 모든 shape에 없으므로 **신규 추가**한다. P0-B가 이를 채워 hand 배정이 `converter.py`의 `part_idx==0 ? R : L` 휴리스틱에서 벗어나게 한다.
  - **기존 저장 악보(Shape A)가 존재하므로 legacy 호환은 필수**다. `normalizeAnimationData`(`src/utils/animationContract.ts`)가 canonical·Shape A·converter.py shape를 모두 받아 canonical로 정규화한다. malformed 입력은 조용한 fallback(middle C) 없이 `AnimationContractError`로 명시적 실패한다 — 이는 D-001("fallback은 명시적 실패/demo 상태") 정신과 일치한다.
- Directive:
  - 플레이어 경계(`src/app/sheet/[id]/page.tsx`)의 `as PianoAnimationData` 캐스트는 이 validator 호출로 대체한다.
  - Shape A(`note:"C4"`/`startTime`/`left|right`)를 저장 계약으로 되살리지 않는다. 신규 저장은 canonical로 쓰고, Shape A는 읽기 시 정규화로만 흡수한다.
  - legacy→canonical 마이그레이션 경로는 golden fixture로 회귀 검증한다(P0-A 완료 조건).
- Related: D-002, D-001, 이슈 #20, `docs/recovery/phases/P0-A-animation-contract.md`, `docs/recovery/validation/2026-07-21-p0a-animation-shape-audit.md`

## D-010: canonical 업로드 경로는 `/api/omr/upload` 하나이고, 데모 경로는 저장 능력을 잃는다

- Date: 2026-07-25
- Status: Accepted
- Context: P1-A stage 1 인벤토리(`src/app/api/__tests__/uploadPathInventory.test.ts`)가 네 업로드 경로의 실제 동작을 고정했다.

  | 경로 | UI 진입점 | 변환 실체 |
  |---|---|---|
  | `/api/omr/upload` | `OMRUploadForm` (업로드 페이지 기본 모드) | 실제 — Fly.io OMR 서비스 `/process` 프록시 |
  | `/api/upload-async` | `MultiStageUploadUI` (`immediate` 모드) | 데모 — `asyncUploadProcessor` → `pdfParser` |
  | `/api/processing` | `BackgroundFileUpload` (`background` 모드) | 데모 — `backgroundProcessor` → `pdfParser` |
  | `/api/upload` | 없음(호출자 0) | 데모 — `pdfParser` 직접 |

  `pdfParser.createEnhancedDemo()`는 PDF 내용을 읽지 않고 `bufferLength % melodyVariations.length`로 준비된 멜로디를 고른다. 세 데모 경로는 그 결과를 `prisma.sheetMusic.create`로 저장하며 **데모임을 나타내는 필드를 남기지 않는다** — 저장된 행은 재생 경로에서 실제 변환과 동일하게 취급된다. `asyncUploadProcessor`는 25초짜리 가짜 `omr` 진행률까지 표시한 뒤 저장한다. **이는 D-001을 정면으로 위반하는 현재 상태다** — 원칙은 2026-07-19에 이미 정해져 있었고, 코드가 따르지 않았다.

  다만 **사후 식별은 가능하다.** 판별은 두 단계이며, 순서를 지켜야 한다.

  1차 필터 — `omrJobId IS NULL AND animationDataUrl <> ''`. 세 데모 경로 중 어느 것도 `omrJobId`를 설정하지 않고 실제 경로만 `omrJobId: omrResult.job_id`를 채우며, OMR 요청이 실패한 행은 `animationDataUrl`이 빈 문자열로 남는다. **그러나 이는 필요조건일 뿐 충분조건이 아니다.** `SheetMusic` 행을 만드는 곳은 업로드 경로 넷만이 아니다 — `POST /api/sheet`(`src/app/api/sheet/route.ts:140`)와 `SheetMusicRepository.create`(`src/repositories/SheetMusicRepository.ts:54`)도 클라이언트가 준 `animationDataUrl`로 `omrJobId` 없이 행을 만든다. 이 필터만으로 `'demo'`를 확정하면 정상 canonical 악보를 데모로 오판해 공개 목록에서 지우게 된다.

  확정 판별 — 저장된 애니메이션 JSON의 내용 대조. `createEnhancedDemo()`의 출력은 **`melodyVariations`에 하드코딩된 세 멜로디 중 하나**(C장조 스케일 8음 / 아르페지오 7음 / 단순 멜로디 4음)이고, 모두 `tempo: 120`, `timeSignature: '4/4'`, D-009의 Shape A(`note:"C4"`/`startTime`) 형식이다. `createDemoAnimation()` fallback 출력도 마찬가지로 고정 리터럴이다. 따라서 저장된 `notes` 배열을 이 알려진 리터럴 집합과 대조하면 `pdfParser`가 만들었음을 확정할 수 있다. 실제 악보가 이 4~8음 리터럴과 정확히 일치할 확률은 무시할 만하고, 설령 일치한다면 그 악보는 실질적으로 데모와 구별되지 않는다.

  이 비대칭 중 코드로 고정 가능한 부분은 `uploadPathInventory.test.ts`가 지킨다 — 데모 경로에 `omrJobId`를 추가하는 변경, 그리고 `SheetMusic` writer 목록이 늘어나는 변경은 테스트가 먼저 실패시킨다.
- Decision:
  1. canonical 업로드 경로는 **`/api/omr/upload`** 다. 실제로 악보를 변환하는 유일한 경로이고, 이미 업로드 페이지의 기본 모드다.
  2. `/api/upload`는 **제거**한다. 프로덕션 코드 호출자가 0이면서 데모 결과를 저장할 수 있는 열린 경로이므로, 격리가 아니라 삭제가 맞다. 유일한 호출자인 `useFileUpload` 훅도 함께 제거한다.
  3. `/api/upload-async`와 `/api/processing`은 **저장 능력을 제거하고 UI에서 분리**한다. 두 경로의 진행률 기반 구조(SSE, 폴링)는 P1-B의 영속 큐가 물려받을 자산이므로 라우트 자체는 남기되, `pdfParser` 결과를 `SheetMusic`으로 저장하는 부분은 명시적 실패로 바꾸고, 이들을 호출하던 `MultiStageUploadUI`·`BackgroundFileUpload`는 canonical 경로로 옮긴다(Decision 5의 클라이언트 항목 참조).
  4. `pdfParser`의 데모 생성은 **삭제하지 않고 개발 전용으로 격리**한다. 삭제하면 OMR 서비스 없이 재생 경로를 손볼 방법이 사라진다. 대신 저장 경로에서 분리해, 데모 데이터가 사용자 악보로 남을 수 없게 한다.
  5. **기존 데이터 migration** — 쓰기 경로를 막는 것만으로는 이미 저장된 데모 행이 계속 진짜 변환으로 노출된다. P1-A 완료 조건("기존 사용자 데이터와 지원 클라이언트 migration이 검증된다")을 다음으로 구체화한다:
     - **식별**: 읽기 전용 스크립트로 1차 필터를 적용해 후보를 좁힌 뒤, 각 후보의 `animationDataUrl`이 가리키는 JSON을 내려받아 `pdfParser`의 알려진 리터럴 집합과 대조한다. **대조에 일치한 행만 `'demo'`이고, 나머지는 전부 `'unknown'`이다** — 1차 필터만으로는 `POST /api/sheet` 경유 정상 행과 구별되지 않기 때문이다. 실데이터 접근이 필요하므로 사용자 승인 아래 한 번 실행하고, 후보 수·확정 수·`unknown` 수를 `docs/recovery/validation/`에 기록한다.
     - **표시**: 삭제하지 않는다 — 사용자가 올린 악보의 제목·분류·연습 기록(`PracticeSession`)이 그 행에 매달려 있고, 파괴적 조치는 되돌릴 수 없다. 대신 `SheetMusic`에 `provenance` 필드(`'omr' | 'demo' | 'unknown'`)를 추가하는 migration을 수행한다. 기본값은 `'unknown'`이고, 확정 판별을 통과한 행만 `'demo'`로, `omrJobId`가 있는 행만 `'omr'`로 표시한다.
     - **노출**: `'demo'`로 확정된 악보만 재생 화면에서 "실제 악보 변환 결과가 아님"을 명시하고 공개 목록(`/api/sheet/public`)에서 제외한다. **`'unknown'`은 아무것도 하지 않는다** — 확신 없는 판정으로 사용자 악보를 숨기는 것은 데모를 진짜로 보여주는 것과 다른 종류의, 그러나 역시 실재하는 해악이다. 이것이 D-001의 "demo 상태를 반환해야 한다"를 데이터 레이어까지 확장한 형태다.
     - **클라이언트**: `/api/upload`는 프로덕션 호출자가 0이므로 전환 대상이 없다. `MultiStageUploadUI`(`immediate` 모드)와 `BackgroundFileUpload`(`background` 모드)는 **canonical 경로로 옮긴다** — 오류 표시만 손보고 항상 실패하는 엔드포인트에 남겨두면, 이슈 #22가 해소된 뒤에도 그 두 모드를 고른 사용자는 여전히 업로드할 수 없고, 이는 P1-A stage 3("UI와 API 호출자를 canonical path로 이동한다")을 만족하지 못한다. 업로드 페이지의 세 모드 선택지는 실질적으로 하나의 경로만 남으므로, stage 3에서 모드 선택 UI 자체를 걷어내고 단일 업로드 폼으로 통합하는 것이 자연스럽다. `/api/upload-async`·`/api/processing` 라우트와 그 진행률 계약은 P1-B가 물려받을 자산으로 남기되, **UI가 그 위에 얹혀 있지 않은 상태**로 남긴다.
     - 이 migration은 stage 3~5와 **같은 PR에 넣지 않는다.** 스키마 변경과 실데이터 조작은 코드 제거와 위험도가 다르므로 별도 PR로 분리하고, 쓰기 경로를 먼저 막은 뒤 수행한다(새 데모 행이 유입되는 동안 집계해봐야 무의미하다).
- Consequence (명시적으로 감수하는 것): 이 변경 후 **업로드는 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22)가 해소될 때까지 실제로 실패한다.** 현재 canonical 경로는 Docker 없는 호스트에서 Audiveris를 실행하지 못하기 때문이다. 이는 회귀가 아니라 은폐의 종료다 — 지금은 데모 경로가 이 고장을 성공처럼 보이게 가려주고 있고, D-001은 바로 그 가림을 금지한다. 실패는 사용자에게 실패로 보여야 한다.
- Directive:
  - 데모 출력이 `SheetMusic` 행이 되는 코드 경로를 남기지 않는다. 새 저장 경로를 추가할 때 `uploadPathInventory` 계열 테스트로 호출자 수를 함께 고정한다.
  - `/api/upload-async`·`/api/processing`이 P1-B에 넘길 queue/auth 경계는 P1-A 완료 시점에 `docs/recovery/phases/P1-B-durable-omr.md`가 참조할 수 있도록 문서화한다.
  - 이슈 #22의 컨테이너 수정 없이 D-010을 되돌려 데모 저장을 부활시키지 않는다. 업로드를 다시 성공시키는 유일한 정당한 방법은 실제 변환을 고치는 것이다.
  - 기존 데모 행을 일괄 삭제하지 않는다. 사용자 소유 메타데이터와 `PracticeSession`이 함께 사라지고, 잘못 판정한 행은 복구할 수 없다. 표시(`provenance`)가 기본 조치이고 삭제는 사용자가 개별적으로 선택할 일이다.
- Related: D-001, D-002, D-008, 이슈 [#20](https://github.com/landfill/ClairKeys/issues/20), 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22), `docs/recovery/phases/P1-A-upload-pipeline.md`

## D-011: OMR 서비스는 스토리지 쓰기 자격증명을 갖지 않는다

- Date: 2026-08-23 (사용자와 함께 내린 결정은 2026-08-21, 구현·기록은 이 PR)
- Status: Accepted
- Context:
  - `omr/storage.py:21`은 `SUPABASE_ANON_KEY`를 읽어 결과 JSON을 직접 업로드했다. 2026-08-21 실측에서 그 키로 `POST /storage/v1/object/animation-data/…`는 **403 `new row violates row-level security policy`**를 받았다. 즉 이 서비스는 **한 번도 결과를 저장할 수 없었다**. 배포되지 않았기에 드러나지 않았을 뿐이다.
  - 자연스러운 반사적 수정은 서비스에 `SUPABASE_SERVICE_ROLE_KEY`를 주는 것이다. 그러나 그 키는 RLS를 우회하는 무제한 자격증명이고, 서비스가 놓일 곳은 SELinux `Disabled`·firewalld `inactive`인 공인 IP VM이다. 프로젝트 전체를 읽고 쓸 수 있는 키를 그 호스트에 두는 것과, Vercel에만 두는 것은 사고 시 피해 범위가 다르다.
  - 2026-08-23 확인: `animation-data` 버킷은 실재한다(public, 10 MB, `application/json`). 2026-08-21에 기록된 `GET /storage/v1/bucket → []`는 anon 키에 버킷 목록 권한이 없었던 것이지 버킷 부재가 아니었다.
- Decision:
  1. **OMR 서비스는 어떤 스토리지 자격증명도 갖지 않는다.** `omr/storage.py`를 삭제하고, 서비스는 변환 결과를 메모리에 들고 `GET /result/{job_id}`로 반환한다.
  2. **저장은 Next.js가 한다.** `/api/omr/status/[jobId]`가 job 완료를 확인하면 결과를 수거해 `SUPABASE_SERVICE_ROLE_KEY`로 `animation-data`에 쓴다. 그 키는 이미 Vercel에만 존재한다(`src/lib/supabase/server.ts`).
  3. **결과 payload는 `/status`가 아니라 `/result`에 둔다.** `/status`는 폴링 루프로 호출되므로, 수백 개 음표를 매 폴마다 실어 보내는 비용을 치를 이유가 없다.
  4. **저장 경로는 job id로 결정하고 upsert한다** (`{userId}/omr_{jobId}.json`). 폴링은 루프이므로 두 폴이 동시에 완료를 관측할 수 있고, 랜덤 파일명이면 객체가 둘 생겨 하나는 영구 고아가 된다. 같은 job이 같은 바이트를 같은 키에 쓰는 것은 무해하다.
  5. **공유 시크릿은 선택이 아니다.** `/process`·`/status`·`/result`는 `X-ClairKeys-Token`을 요구하고, `OMR_SHARED_SECRET` 미설정 시 서비스는 **모든 요청을 거절한다**(`ENVIRONMENT=development`만 예외). `/health`만 열어 둔다 — nginx와 가동 확인이 필요하다.
  6. **서비스가 반환한 `title`·`composer`로 사용자가 입력한 값을 덮어쓰지 않는다.** 기존 코드는 덮어썼고, PR #38 이전에는 그 값이 PDF 파일명이었다.
- Reason: 강력한 키를 공개 IP VM이 아니라 Vercel에 두고, 동시에 "저장할 수 없는 서비스"는 저장에 실패했다는 사실을 숨길 수 없게 만든다. TLS는 여기서 존재하지 않는 위협을 막지만, 토큰은 실재하는 위협을 막는다 — 인증 없는 `/process`는 2 vCPU 박스의 15분을 요청 한 번에 소모한다.
- Constraint: `sheet_music_id`는 계속 `/process`가 받는다. 소비처는 `/status`의 `file_info`(운영자 상관용)이며, PR #38이 이 필드 바인딩을 고친 직후 다시 제거하는 churn을 만들지 않는다.
- Rejected:
  - 서비스에 service role 키 부여 | 무제한 자격증명을 공인 IP VM에 두게 된다.
  - 서비스에 제한된 전용 키 발급 | Supabase는 버킷 단위 서명 키를 제공하지 않아 결국 같은 문제이고, 키 하나를 더 관리해야 한다.
  - `/status`가 payload를 함께 반환 | 폴링 횟수만큼 곱해지는 비용.
  - 서비스가 결과를 디스크에 쓰고 정적 서빙 | `file://` 은폐(PR #38)를 nginx 경유로 되살리는 것이고, 만료·정리 정책을 새로 만들어야 한다.
- Consequence: 결과 JSON은 job이 살아 있는 동안 서비스 메모리에 남는다. `processing_jobs`는 이미 프로세스 메모리의 dict이고 재시작하면 사라진다 — 영속 큐는 P1-B의 범위이며, D-011은 그 성질을 바꾸지 않는다. 수거 전에 서비스가 재시작되면 job은 사라지고 행은 `failed`가 된다.
- Directive:
  - OMR 서비스에 스토리지 자격증명을 다시 넣지 않는다. `test_service_contract.py`의 `NoStorageCredentialsTests`가 이를 고정한다.
  - `/status`에 payload를 얹지 않는다.
  - 애니메이션 저장 경로를 랜덤 파일명으로 되돌리지 않는다 — 이중 폴링에서 고아 객체가 생긴다.
  - 프로덕션 배포에서 `OMR_SHARED_SECRET` 없이 서비스를 띄우지 않는다. 실패는 닫히는 방향(전부 거절)이므로 안전하지만, 그 상태를 정상으로 오해하지 않는다.
- Related: D-001, D-010, 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22), PR [#38](https://github.com/landfill/ClairKeys/pull/38), PR [#41](https://github.com/landfill/ClairKeys/pull/41), `docs/recovery/HANDOFF.md` 2026-08-21 항목

## D-012: 테스트 단계에서는 OMR 서비스를 TLS 없이 평문 HTTP로 노출한다

- Date: 2026-08-23
- Status: Accepted (**기한부** — 아래 Exit condition 참조)
- Context:
  - D-011까지 끝났지만 서비스는 여전히 `127.0.0.1:8000`에만 바인딩돼 있었다. nginx도, 인증서도, 도메인도, systemd unit도 없었다. HANDOFF의 재개 절차는 "`OMR_SERVICE_URL`에 VM 주소를 넣어라"고 지시했지만 **넣을 주소가 존재하지 않았다** — 이 단계가 통째로 누락돼 있었다.
  - VM에는 도메인이 없다. 공인 IP `101.79.16.73`뿐이고, ACG는 22·80·443·3000을 연다(8000은 열려 있지 않다). firewalld는 `inactive`, SELinux는 `Disabled`이므로 ACG가 유일한 방어선이다.
  - 호출자는 브라우저가 아니라 Vercel의 서버사이드 `fetch`다. mixed content 제약이 없으므로 평문 HTTP도 기술적으로는 동작한다.
  - Vercel의 egress IP는 고정이 아니므로 ACG로 출발지를 제한할 수 없다.
- Decision:
  1. **테스트 단계 동안 TLS 없이 평문 HTTP로 노출한다.** 컨테이너를 `0.0.0.0:3000`에 바인딩하고 `OMR_SERVICE_URL=http://101.79.16.73:3000`을 쓴다.
  2. **포트는 3000이다.** 8000은 ACG에 열려 있지 않고, 80·443은 나중에 TLS를 앞에 세울 때 nginx가 쓰도록 비워 둔다.
  3. **systemd unit으로 관리한다.** 시크릿은 unit 파일이 아니라 `--env-file /etc/clairkeys-omr.env`(600)에 둔다 — `podman generate systemd --new`는 `podman run` 전체를 644 unit 파일에 박아 넣으므로, `-e`로 넘기면 로컬 사용자 전원에게 공개된다.
  4. **검증용 시크릿은 폐기하고 새로 발급한다.**
- Reason:
  - 실서비스가 아니라 **테스트 배포**다. 그리고 이 판단을 방어 가능하게 만드는 것은 **D-011이 이미 중요한 자격증명을 이 호스트에서 제거했다**는 사실이다. 2026-08-23 컨테이너 환경변수 실측에서 `SUPABASE`/`SERVICE_ROLE` 계열은 하나도 없었다. 평문으로 노출되는 것은 공유 시크릿·PDF·애니메이션 JSON이며, `SUPABASE_SERVICE_ROLE_KEY`는 Vercel에 남는다.
  - 두 피해 모두 복구 가능하다 — 시크릿 재발급과 컨테이너 재기동으로 끝난다.
  - D-011 이전 설계(서비스가 직접 업로드)였다면 이 결정은 훨씬 나빴을 것이다. 순서가 바뀌었다면 같은 선택이 정당화되지 않는다는 뜻이다.
- **Accepted risk (명시적으로 감수하는 것):**
  - 공유 시크릿이 인터넷을 평문으로 건넌다. 경로상의 관찰자는 이를 탈취해 `/process`를 호출할 수 있고, 한 번의 호출은 2 vCPU 박스의 최대 15분을 소모한다. 또한 관측한 job id로 `/result`에서 타인의 악보를 읽을 수 있다.
  - `omr/auth.py`의 주석은 "통제할 가치가 있는 노출은 도청이 아니라 인증되지 않은 호출자"라고 판단한다. 그 판단은 **시크릿이 안전하게 전달된다는 전제** 위에 서 있다. 평문 HTTP는 그 전제를 무효화하며, 도청이 곧 인증 우회가 된다. 이 항목이 그 주석을 무조건적 참으로 읽는 것을 막는다.
- **Exit condition:** 이 서비스를 실사용자에게 여는 시점 이전에 TLS로 전환한다. 경로는 이미 확인됐고 비용은 0이다 — `101.79.16.73.sslip.io`가 등록 없이 이 호스트로 해석되고(2026-08-23 `dig` 확인), 80·443은 이미 ACG에 열려 있으며, nginx가 TLS를 종료하고 loopback의 컨테이너로 프록시하면 된다. 컨테이너 공개 포트를 `127.0.0.1:3000`으로 되돌리는 unit 한 줄 수정과 Vercel의 `OMR_SERVICE_URL` 변경뿐이고, **애플리케이션 코드는 바뀌지 않는다**.
- Rejected:
  - 도메인 구매 후 nginx + Let's Encrypt | 되지만 유료이고, 테스트 단계에 필요한 비용이 아니다. sslip.io로 같은 결과를 0원에 얻을 수 있음이 확인됐으므로 Exit condition 쪽으로 넘긴다.
  - Cloudflare Tunnel | 고정 하위도메인을 쓰려면 Cloudflare에 도메인을 등록해야 한다. 무료 quick tunnel은 재기동마다 URL이 바뀌어 `OMR_SERVICE_URL`로 쓸 수 없다 — 도메인이 없는 상황에서는 이점이 없다.
  - Let's Encrypt IP 인증서 | 도메인 없이 TLS가 가능하지만 단기(6일) 갱신이라 자동화가 실패하면 조용히 만료된다. sslip.io + 90일 인증서가 더 안전하다.
  - ACG로 Vercel egress IP만 허용 | Vercel은 고정 egress IP를 보장하지 않는다.
- Consequence:
  - `/process`는 인터넷에서 도달 가능하며, 유일한 방어는 공유 시크릿이다. `OMR_SHARED_SECRET` 미설정 시 서비스가 전 요청을 거절하는(D-011 결정 5) 성질이 여기서 특히 중요하다.
  - `GET /`는 토큰 없이 200을 반환한다(2026-08-23 확인). 노출되는 것은 서비스명·버전뿐이지만, `omr-service/README.md`와 PR #42 리뷰 로그의 "`/health`만 열려 있다"는 서술은 부정확하다. TLS 전환 시 nginx에서 `/`를 프록시하지 않는 것으로 막는다.
  - systemd 재기동은 진행 중 job을 잃는다. job 상태는 프로세스 메모리에 있다(D-011). 다만 PR #41 이후 `/status`의 404가 행을 `failed`로 만들므로 고착되지는 않는다.
- Directive:
  - **이 결정을 실서비스로 이월하지 않는다.** Exit condition을 만족하기 전에 실사용자 트래픽을 이 엔드포인트로 보내지 않는다.
  - 시크릿을 systemd unit 파일에 직접 넣지 않는다 — unit은 644이고 env 파일은 600이다.
  - 컨테이너를 8000이나 80에 바인딩하지 않는다. 8000은 ACG 미개방이고, 80·443은 TLS 전환용으로 비워 둔다.
  - 시크릿을 교체할 때는 VM과 Vercel 양쪽을 함께 바꾼다. 한쪽만 바꾸면 전 요청이 401이 되고 증상은 서비스 장애처럼 보인다.
- Related: D-008(호스팅, 여전히 `초안` — 이 항목이 그 자리를 대신하지 않는다), D-011, PR [#41](https://github.com/landfill/ClairKeys/pull/41), PR [#42](https://github.com/landfill/ClairKeys/pull/42), 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22), `omr-service/deploy/README.md`

## D-013: 빠르기는 값과 함께 출처를 저장하고, 모르면 모른다고 저장한다

- Date: 2026-08-23
- Status: Accepted
- Context:
  - `AnimationPlayer.tsx:267`이 `{composer} • {timeSignature} • {tempo} BPM`을 한 줄에 같은 서식으로 출력했다. 작곡가와 박자표는 악보에서 **측정된** 값이고, 그 옆의 `120`은 `_extract_tempo`가 아무것도 찾지 못했을 때 **지어낸** 값이다. 사용자는 둘을 구별할 방법이 없었다. `src/utils/animationContract.ts:194`가 한 번 더 지어냈다.
  - 이것은 D-001(데모 멜로디를 실제 변환으로 표기 금지)과 D-010(`provenance`로 `omr`/`demo`/`unknown` 구분)이 반복해 제거해온 결함과 **같은 형태**다. 규모가 작을 뿐 종류가 같다.
  - 두 번째 결함이 그 위에 겹쳐 있었다. `_extract_tempo`는 `<per-minute>`의 **숫자만** 읽고 `<beat-unit>`을 버렸으며, `converter.py:183`의 `sec_per_tick = (60.0 / tempo) / divisions`는 그 숫자가 4분음표/분이라고 가정했다. 음악적으로 동일한 세 표기를 주입한 실측에서 ♩=60은 2:27(정답), ♪=120은 1:13(2배 빠름), 𝅗𝅥=30은 4:55(2배 느림)가 나왔다. 표기를 **읽어도** 틀릴 수 있었다는 뜻이다.
  - 이 둘은 하나의 결정이다. 출처를 기록하는 일은 기록되는 값이 믿을 만할 때만 의미가 있다.
  - 확정된 사실(이슈 #48, #49): 인쇄된 메트로놈 표기는 **현재 인식되지 않는다.** OCR을 되살려도(#49) 같은 악보에서 `<metronome>`은 여전히 0이었고, `Adagio`도 `60`도 나타나지 않았다. 원인은 미규명이다. 따라서 "악보에서 읽는다"는 경로는 코드로는 완성돼 있지만 **실제로는 거의 발동하지 않는다.**
- Decision:
  1. **animation contract를 `1.1`로 올리고, 리더는 `1.0`과 `1.1`을 모두 받는다.** `tempo`가 nullable이 되는 것은 기존 리더의 가정을 깨는 변경이므로 D-002에 따라 버전 봉투로 표시하되, 이미 저장된 1.0 파일이 계속 읽혀야 하므로 리더는 두 버전을 지원한다.
  2. **`tempo: number | null`.** 아무도 모르면 `null`이다. **120을 지어내지 않는다.** 변환기의 `return 120`과 정규화기의 `: 120` fallback을 둘 다 제거했다.
  3. **`tempoSource: 'score' | 'user' | 'unknown'`** 을 함께 저장한다. 화면이 출처를 구별할 수 있게 하는 것이 이 결정의 목적이다.
  4. **`timingReferenceBpm`** 은 `notes[].start`/`duration`을 초로 굽는 데 **실제로 사용한** BPM이며 항상 존재한다. 초는 변환 시점에 확정되므로 어떤 BPM이든 하나는 쓸 수밖에 없다 — 이 필드는 그 불가피한 선택을 숨기지 않고 이름 붙여 드러내는 자리이고, "악보의 빠르기"와 **다른 개념**이다. 빠르기를 모를 때의 값은 선언된 기준 **60.0**이다.
  5. **`scoreTempo`** 는 악보에서 읽은 값을 보존한다. 사용자 입력이 이기더라도 악보 값을 **조용히 버리지 않는다** — 화면이 둘을 함께 보여줄 수 있어야 한다.
  6. **우선순위: 사용자 입력 > 악보 표기 > 미상.** `/process`가 `tempo`를 multipart 폼 필드로 받고(`title`·`composer`·`user_id`·`sheet_music_id`와 대칭), 업로드 폼의 빠르기 입력은 **선택**이다. 범위(20~400) 밖 값은 400으로 거절하고 조용히 무시하지 않는다.
  7. **`<beat-unit>`과 `<beat-unit-dot/>`을 4분음표 기준으로 환산한다.** `<sound tempo>`는 MusicXML 정의상 이미 4분음표/분이므로 환산하지 않으며 우선 순위가 높다. 점은 기하급수적으로 더해지므로 배수는 `2 - 0.5^n`이다(점 1개 1.5, 2개 1.75 — `1.5 × 1.5`가 아니다).
  8. **화면은 네 경우를 서로 다르게 보여준다.** `score` → `♩=60 (악보에서 읽음)`, `user` → `♩=72 (직접 입력)`(+ `악보 표기: ♩=60`), `unknown`+숫자 → `♩=120 (출처 미상)`, `null` → `빠르기 미상` + `♩=60 기준으로 계산됨`. 지어낸 숫자를 측정값과 같은 서식으로 놓지 않는다.
- Consequence (명시적으로 감수하는 것):
  - **이미 저장된 악보는 이 수정으로 빨라지거나 느려지지 않는다.** 음표의 초는 변환 시점에 구워지고 `playbackClock.ts`의 `tempoScale`은 그 위의 배속일 뿐이다. 옛 업로드로 확인하는 사람은 "안 고쳐졌다"고 결론 내린다 — 재변환이 필요하다(사용자가 2026-08-23에 재변환을 허용했다).
  - **legacy 1.0 파일의 숫자는 전부 `tempoSource: 'unknown'`으로 강등된다.** 그 숫자가 악보에서 읽힌 60인지 지어낸 120인지 사후에 구별할 방법이 없기 때문이다. 읽힌 값까지 미상으로 내리는 손해를 감수하는 이유는, 모르면서 안다고 하는 것이 더 나쁘기 때문이다. 정확한 출처는 재변환으로만 얻는다.
  - **사용자가 빠르기를 입력하면 악보의 마디별 템포 변경이 무시된다** (`use_score_tempo_changes=tempo is None`). 사용자 값이 곡 전체에 평평하게 적용되므로 accelerando나 "Meno mosso" 구간은 사라진다. 이 규칙을 고른 이유는, 표기가 없어서 사용자가 값을 입력하는 상황에서는 마디별 변경값을 사용자 값과 견줄 기준 자체가 없기 때문이다. 악보가 초기 빠르기와 중간 변경을 **둘 다** 인쇄한 경우에는 손해가 실재한다 — 다만 그런 악보라면 사용자가 값을 입력할 이유가 애초에 적다.
- Directive:
  - **어떤 경로에서도 빠르기 기본값을 다시 넣지 마라.** 값이 없으면 `null`이고, 화면은 그것을 숫자가 아닌 말로 표시한다. `animationContract.ts`에 `: 120`이 다시 생기면 이 결정이 되돌아간 것이다.
  - `timingReferenceBpm`을 `tempo`의 별칭으로 취급하지 마라. 전자는 "무엇으로 계산했나", 후자는 "악보가/사용자가 무엇이라 말했나"이다. 둘을 합치면 이 결정이 사라진다.
  - `<sound tempo>`에 beat-unit 환산을 적용하지 마라 — 이미 4분음표 기준이다.
  - 인쇄된 메트로놈 표기가 조립되지 않는 원인(#48 잔여)은 여전히 미규명이다. `tempoSource: 'score'`가 실제로 나오는 것을 확인하기 전에 "악보에서 읽는다"가 동작한다고 쓰지 마라.
- Related: D-001, D-002, D-009, D-010, 이슈 [#48](https://github.com/landfill/ClairKeys/issues/48), 이슈 [#49](https://github.com/landfill/ClairKeys/issues/49), 이슈 [#46](https://github.com/landfill/ClairKeys/issues/46)

## D-014: 피아노 음색은 합성하지 않고 녹음을 재생한다

- Date: 2026-08-27
- Status: Accepted
- Context:
  - 사용자 보고: "악보 재생 소리가 너무 웹오디오 한계처럼 삑삑거리는 수준 같다."
  - PR #30이 단일 `sine`을 24배음 `PeriodicWave`로 바꿨고, PR #32와 #33이 `TREBLE_ROLLOFF`와 master gain을 귀로 튜닝했다. 세 번 모두 개선은 있었지만 전자음이라는 인상은 남았다.
  - 원인은 상수가 아니라 구조다. `createNoteAudio`는 음 하나에 oscillator 1개와 gain 1개를 준다. 따라서 **24개 배음 전부가 하나의 엔벨로프를 공유하고 같은 속도로 죽는다.** 실제 현은 상위 배음이 수백 ms 안에 사라지는 동안 기음이 몇 초를 울린다. `BASS_ROLLOFF`나 `DEFAULT_TREBLE_ROLLOFF`의 어떤 값도 이 차이를 표현할 수 없고, 해머 타격 노이즈·현의 비조화성·유니즌 3현의 디튠도 이 구조에서는 나오지 않는다.
  - 즉 "더 잘 튜닝하면 된다"는 경로가 이미 세 번 소진됐다. 남은 선택은 그 성질들을 **모델링하지 말고 담고 있는 것**을 재생하는 것이다.
  - 사용자가 제기한 제약: 상용 CDN이 없고 Vercel·Supabase만 있으므로 지연과 성능이 걱정된다.
- Decision:
  1. **녹음 샘플을 재생한다.** Salamander Grand Piano V3(CC-BY 3.0)를 A0~C8 단3도 간격 30개로 `public/samples/piano/`에 동봉한다. 단3도 간격이면 어떤 음도 샘플에서 최대 1반음 떨어져 있어 리샘플링에 의한 포먼트 이동이 들리지 않는다.
  2. **네이티브 `AudioBufferSourceNode`를 쓰고 Tone.Sampler를 쓰지 않는다.** `AudioScheduledSourceNode`가 `OscillatorNode`와 동일한 `start(when)`/`stop(when)`을 제공하므로 노드 교체는 `createNoteAudio` 안에 갇힌다. 다만 샘플 준비 상태와 재생 단위의 음색 선택은 `startAudio`가 맡고, seek 시 버퍼 offset도 샘플 경로에서 계산한다. PR #26의 단일 AudioContext 클럭 앵커, 롤링 look-ahead, `VOICE_LIMIT` 계약은 그대로다.
  3. **Supabase Storage가 아니라 Vercel `public/`에 둔다.** 샘플은 모든 사용자가 공유하는 불변 정적 자산이고, Supabase egress는 이미 악보 애니메이션 JSON이 쓰고 있다. Vercel Edge Network가 실질적인 CDN이다.
  4. **음역별로 자르고 모노로 접는다.** 원본을 그대로 디코딩하면 브라우저 메모리 **142MB**다(30개 스테레오, 합계 422초). 이건 휴대폰에서 받아들일 수 없다. `scripts/build-piano-samples.sh`가 모노 변환과 음역별 트림(C3 미만 6.0초 / A5까지 4.0초 / 그 위 2.0초, 트림 지점에 0.5초 페이드)을 수행해 120초·**20.2MB**·디스크 1.17MB로 만든다. 브라우저 실측으로 확인했다.
  5. **`SAMPLE_PEAK_GAIN = 0.73`으로 게인을 되맞춘다.** 빌드된 샘플의 최대 피크는 A0의 -7.7 dBFS(선형 0.4112, Chromium 디코더 실측)이고 합성 경로의 `PEAK_GAIN`은 0.3이다. 보정하지 않으면 첫 화음이 약 37% 크게 나오고, `DEFAULT_MASTER_GAIN`·`MAX_MASTER_GAIN`이 근거로 삼은 헤드룸 계산이 전부 조용히 무효가 된다.
  6. **샘플 간 음량 차이는 정규화하지 않는다.** A7(-18.5 dB)과 Fs1(-7.0 dB)의 11.5 dB 차이는 악기 자신의 음역 균형이다. 파일별로 평탄화하면 고음이 부자연스럽게 튀어나온다.
  7. **샘플에는 ADSR을 씌우지 않는다.** 녹음이 이미 타격과 감쇠를 담고 있다. 샘플 경로의 엔벨로프는 벨로시티 게인과 음이 끝날 때의 댐퍼 페이드(`damperReleaseSec`, 저음 0.35초 → 고음 0.12초) 둘뿐이다.
  8. **합성 경로는 폴백으로 남기되 폴백 상태를 화면에 표시한다.** 샘플을 못 받아오는 클라이언트에서는 재생을 막거나 오류 팝업을 띄우지 않고 이전 음색으로 계속 재생한다. 그러나 정상 샘플 재생과 합성 폴백을 같은 성공 상태로 보이면 D-001/D-010이 금지한 "실패가 성공처럼 보이는 것"을 반복하므로, `ready` / `degraded` / `failed`를 사용자가 구분할 수 있어야 한다.
  9. **첫 재생은 샘플 로딩을 기다리되 2.5초에서 끊고, 재생을 시작할 때 음색을 고정한다.** 기다리지 않으면 도입부가 합성음으로 나다가 한두 초 뒤 샘플로 바뀌어 악기가 도중에 달라진다(실측: 샘플 5 : 합성 3). 전체 세트가 준비됐을 때만 그 재생 전체가 녹음 샘플을 쓰고, timeout·부분 성공·전체 실패이면 그 재생 전체가 합성 폴백을 쓴다. 백그라운드 로딩이 나중에 끝나더라도 이미 시작한 재생의 음색은 바뀌지 않는다.
  10. **샘플 URL에 세트 버전을 붙인다.** `/samples/piano/*.mp3`는 1년 immutable 응답이며 서비스워커도 cache-first로 보존하므로, 고정 URL을 재사용하면 재빌드한 음원이 기존 사용자에게 도달하지 않는다. 버전은 소스 manifest에 두고 빌드 스크립트가 샘플 생성 성공 뒤 다음 버전으로 갱신한다.
- Consequence (명시적으로 감수하는 것):
  - 저장소에 바이너리 1.17MB가 영구히 들어온다. 사용자가 승인했다.
  - 디코딩된 20.2MB가 재생 중 상주한다. 모노 선택이 이 값을 절반으로 만든 대가로 피아노의 스테레오 폭을 잃는다. `CHANNELS=2`로 재빌드하면 되돌릴 수 있고 메모리는 두 배가 된다.
  - 저음에서 6.0초보다 긴 음(♩=42보다 느린 온음표)은 버퍼 끝에서 일찍 멈춘다. 트림 지점의 0.5초 페이드 때문에 클릭은 나지 않고 그냥 조용해진다. 저장소에 실제 저음 데이터가 없어 경험적으로 확인하지 못했다.
  - 이 PR은 악보 재생 경로만 샘플 뱅크에 연결한다. 악보 화면의 `SimplePianoKeyboard`는 소리를 내지 않으며, 건반 클릭 음색 통합은 별도 범위다.
- Directive:
  - **샘플 voice에 `envelopeBreakpoints`를 적용하지 마라.** 녹음이 이미 감쇠하므로 두 번 감쇠해 음이 일찍 죽는다.
  - **샘플 세트를 손으로 수정하지 마라.** `scripts/build-piano-samples.sh`로 재생성한다. CC-BY 3.0은 변경 사실의 명시를 요구하고, 그 명세가 이 스크립트와 `public/samples/piano/LICENSE.txt`에 있다.
  - **`SAMPLE_SET_PEAK`을 원본 파일에서 재지 마라.** 스테레오를 모노로 접으면 피크가 바뀐다(원본 -7.0 dB → 빌드 후 -7.7 dB). 반드시 빌드된 파일에서 잰다.
  - 샘플 로딩 실패로 재생을 reject하거나 막지 마라. 대신 합성 폴백 중임을 반드시 화면에 표시하라. 폴백을 유지하는 것과 실패를 성공처럼 보이지 않는 것은 함께 지켜야 한다.
  - 한 재생 안에서 샘플과 합성을 음마다 섞지 마라. 다음 재생을 시작할 때 전체 샘플 준비 여부를 다시 평가한다.
- Related: PR [#30](https://github.com/landfill/ClairKeys/pull/30), PR [#32](https://github.com/landfill/ClairKeys/pull/32), PR [#33](https://github.com/landfill/ClairKeys/pull/33), D-001, D-002, D-010

## D-015: 샘플 재생 레벨은 피크가 아니라 라우드니스로, 최저음이 아니라 연주 음역을 기준으로 정한다

- Date: 2026-08-27
- Status: Accepted
- Context:
  - 사용자 보고(PR #59 배포 후): 음색은 만족하나 **기본 음량이 약하다**. 이슈 #60.
  - D-014 결정 5는 `SAMPLE_PEAK_GAIN = 0.3 / SAMPLE_SET_PEAK = 0.73`을 정했다. **산술은 정확하고 목표가 틀렸다.** 두 층이 곱해진다:
    1. **피크를 맞췄는데 사람은 라우드니스를 듣는다.** 실측 크레스트(peak − RMS)가 샘플 **20.0 dB** 대 합성 **8.8 dB**다. 녹음 피아노는 짧은 해머 타격 뒤 긴 감쇠이고, 대체된 지속 파형은 그렇지 않다. 피크를 같게 맞추면 귀가 따르는 양에서 약 11 dB 낮게 도착한다.
    2. **기준이 A0였다.** 세트 최대치로 정규화하면 그 파일만 목표에 도달하고 나머지 29개는 전부 아래로 깔린다. C3~C6에서 평균 3.9 dB 부족했고 C5는 목표의 약 1/3이었다.
  - 합성 경로의 크레스트는 그동안 미측정이었다(#60 검증 기록이 명시). `pianoTimbre`가 순수 함수이므로 스케줄러가 만드는 그대로 — 사인 위상 `PeriodicWave` + `disableNormalization`, `timbreCutoffHz`의 Web Audio lowpass biquad(Q=1), attack/지수감쇠 엔벨로프 — 오프라인 렌더해 측정했다. 이제 추론이 아니라 수치다.
  - 실측이 기존 헤드룸 서술도 무너뜨렸다. "voice는 `PEAK_GAIN`(0.3)에서 피크한다"는 **두 경로 모두에서 거짓**이다: 합성은 0.129~0.269(사인 위상 합은 진폭 합에 도달하지 않는다), 샘플은 세트 전체에서 0.103~0.411. 게다가 `converter.py`는 velocity 필드를 아예 내보내지 않으므로 **모든 실제 음은 `?? 0.7`로 재생된다** — velocity 1.0 기준 계산은 도달 불가능한 가정이었다.
- Decision:
  1. **`SAMPLE_PEAK_GAIN`을 유도값으로 만든다.** 리터럴을 고르지 않고 `SYNTHESISED_VOICE_RMS / playedBandMedianRms()`로 계산한다(= 1.140, 기존 대비 +3.9 dB). 양변이 측정값이므로 샘플 세트를 다시 재면 값이 스스로 따라 움직인다. D-014가 "상수 튜닝은 세 번 실패한 접근"이라고 못박은 이상, 새 상수를 귀로 고르는 것은 같은 실패의 반복이다.
  2. **기준 음역은 C3~C6(MIDI 48~84)으로 하고 중앙값을 쓴다.** 세트 전체를 쓰면 거의 연주되지 않는 양 끝이 답을 흔들고, 세트 최대치를 쓰면 #60이 된다. 에너지평균이 아니라 중앙값인 이유는 이 세트에 양방향 이상치가 있어 에너지평균이 소수의 큰 파일에 끌리기 때문이다 — 에너지평균은 3.0 dB 부족이라 말하지만 그 음역의 전형적인 음은 3.9 dB 부족이다.
  3. **비교 창은 0.5초다.** 0.25초는 해머 트랜지언트만 재어 녹음이 그 뒤 감쇠하는데 합성은 그러지 않는다는 차이를 놓친다. 1초는 합성 엔벨로프의 sustain 평탄부 — D-014가 오르간 같다고 배척한 바로 그 성질 — 가 지배해서, 거기에 맞추면 실제 피아노에 필요 없는 게인을 요구한다. 0.5초는 중간이며 보통 빠르기의 4분음표 하나에 해당한다.
  4. **마스터 게인은 건드리지 않는다.** 이슈 #60은 A(마스터 상향) + B(라우드니스 재보정)를 권고했으나 **A는 잘못된 레버다.** `DEFAULT_MASTER_GAIN`·`MAX_MASTER_GAIN`은 합성 폴백과 공유되고, 그 경로의 레벨은 PR #32가 귀로 맞춘 뒤 음량 불만이 나온 적이 없다. 샘플 때문에 공용 버스를 올리면 원인 제공을 하지 않은 경로를 클리핑 쪽으로 민다. `SAMPLE_PEAK_GAIN`은 샘플 경로만 읽으므로 이미 올바른 위치에 레버가 있다.
  5. **측정값을 저장소 안에 둔다.** `src/utils/pianoSampleLevels.ts`가 30개 샘플의 peak·RMS와 합성 기준값을 보유하고, 게인이 그로부터 유도된다. 근거가 문서에만 있고 코드에는 리터럴만 남으면 다음 세션이 다시 재야 하고, 값과 근거가 조용히 어긋난다.
  6. **음역 간 편차는 이 결정에서 건드리지 않는다.** 스칼라 하나이므로 상대차는 정확히 보존된다. 그러나 **D-014 결정 6의 전제("편차는 전부 악기 자신의 음역 균형이다")는 측정과 다르다** — 매끄러운 추세 10.6 dB는 악기가 맞지만, 그 주변 잔차 ±5 dB는 아니다(인접 단3도 29개 중 14개에서 위 음이 더 크고 최대 +7.5 dB). 이슈 [#61](https://github.com/landfill/ClairKeys/issues/61)로 분리한다.
- Consequence (명시적으로 감수하는 것):
  - 세트 최대음(A0)의 velocity 1 피크가 0.300 → **0.469**로 오른다. 단음으로는 어떤 설정에서도 클리핑하지 않고(`MAX_MASTER_GAIN`에서 0.164), 실제 velocity 0.7 기준 기본 마스터에서 13음, 최대 마스터에서 8음까지 위상 정렬 상한을 견딘다. 서로 다른 음높이가 위상 정렬되는 일은 없으므로 이 수치는 추정이 아니라 하한이다.
  - `VOICE_LIMIT`(24) 선형합 상한은 여전히 초과한다. **이는 변경으로 새로 생긴 것이 아니다** — 기존 0.73에서도 24 × 0.300 × 0.7 × 0.22 = 1.11로 이미 넘었다. 그 모델은 처음부터 성립한 적이 없고, D-014 이래 주석이 스스로 도달 불가능하다고 적어 온 시나리오다.
  - C5의 상대적 약함은 그대로 남는다(#61). 전체가 함께 올라갈 뿐이다.
  - **적정 음량은 이 PR로 확정되지 않는다.** PR #59와 같은 제약이다 — 청감 확인은 운영 배포 후에만 가능하다. 구조적 검증(헤드룸 재계산, 클리핑 테스트, 회귀 테스트)만 병합 전에 끝난다.
- Directive:
  - **`SAMPLE_PEAK_GAIN`을 귀로 튜닝하지 마라.** 값이 틀렸다면 틀린 것은 기준(음역·창·통계)이고, 그 선택을 여기서 고쳐 다시 유도한다. 리터럴로 되돌리면 #60을 만든 구조가 그대로 돌아온다.
  - **음량이 여전히 부족하면 마스터 게인부터 올리지 마라.** 공용 버스이므로 합성 폴백을 함께 민다. 먼저 이 결정의 기준 창(0.5초)과 음역(C3~C6)이 실제 연주와 맞는지 재검토한다.
  - **샘플 세트를 재빌드하면 `pianoSampleLevels.ts`를 반드시 다시 측정하라.** 테스트가 manifest 버전을 `v1`로 고정하고 있으므로 버전만 올리면 실패한다 — 조용히 낡지 않게 하려는 장치다.
  - `SAMPLE_SET_PEAK`은 클리핑 상한으로만 쓰고 레벨 기준으로 되돌리지 마라. 그것이 #60의 두 번째 원인이었다.
- Related: 이슈 [#60](https://github.com/landfill/ClairKeys/issues/60), 이슈 [#61](https://github.com/landfill/ClairKeys/issues/61), D-014, PR [#59](https://github.com/landfill/ClairKeys/pull/59), PR [#32](https://github.com/landfill/ClairKeys/pull/32)

## D-016: 게인 헤드룸은 보이스 선형합이 아니라 실측 믹스다운 피크로 정한다

- Date: 2026-08-27
- Status: Accepted
- Context:
  - 사용자 보고(PR #62 배포 후): **슬라이더를 최대(0.35)로 올리고 기기 음량도 최대로 해도 소리가 작다.** 이슈 #63.
  - PR #62는 **상대 레벨**(샘플 대 합성)을 고쳤고 그 판단은 유효하다(D-015). 이 이슈는 **절대 레벨**이며 다른 단계의 다른 결함이다.
  - 실측: 단음이 슬라이더 최대에서 **−22.5 dBFS**, 조밀한 8음 화음이 **−10.5 dBFS**, 기본값에서는 **−14.5 dBFS**. 일반 음원 피크가 −1~−3 dBFS이므로 10~20 dB 낮다. 게인 체인에 숨은 감쇠 단계는 없음을 확인했다.
  - **원인은 상수가 아니라 모델이다.** 이 저장소의 모든 게인이 보이스를 **선형 합산**해 유도됐다 — "모든 보이스가 같은 순간 같은 위상으로 피크한다"는 가정이다. 실제 샘플 버퍼로 렌더해 재보니 3화음 107%, 5음 62%, **조밀 8음 50%**, **페달 12음 25%**로, 선형 모델은 2~4배 비관적이다.
  - 특히 **페달로 누적된 12음(0.642)이 동시타 8음(0.853)보다 피크가 낮다.** 온셋이 어긋나 피크가 겹치지 않기 때문이다. "음이 많을수록 위험하다"는 직관 자체가 성립하지 않는다.
  - 합성 폴백도 같은 버스를 쓰며 실측 피크가 샘플보다 약간 크다(조밀 8음 0.940 대 0.853). 두 경로가 3 dB 이내인 것은 D-015의 라우드니스 정합이 실제로 작동했다는 방증이다.
- Decision:
  1. **헤드룸을 실측 믹스다운 피크로 정한다.** `pianoSampleLevels.ts`가 두 경로의 시나리오별 실측 피크를 보유하고, 게인이 그것을 근거로 삼는다. 보이스 수 × 보이스당 피크라는 산술은 폐기한다.
  2. **믹스다운은 계약이 허용하는 최대 velocity(1.0)에서 잰다.** 최초 안은 0.7에서 쟀다 — `converter.py`가 velocity를 내보내지 않기 때문이다. **이건 계약이 아니라 현재 생산자 한 곳의 성질이며, 리뷰가 이 구멍을 잡았다.** `animationContract.ts:137`이 velocity를 [0,1]로 클램프하고 `dataConverter.ts`가 그대로 전달하므로, 규격을 지키는 악보가 velocity 1로 도착할 수 있다. 그 경우 동시타 12음이 1.551이 되어 최초 안의 0.9를 곱하면 **1.39로 클리핑**한다.
  3. **`DEFAULT_MASTER_GAIN` 0.22 → 0.5.** 실제 재생(velocity 0.7)의 조밀한 화음이 −7.4 dBFS에 온다. 상한과 달리 유도값으로 두지 않았다 — 상한은 안전 제약이라 계산되어야 하지만, 기본값은 청취 취향이고 슬라이더가 존재하는 이유가 바로 측정이 답하지 못하는 부분이기 때문이다.
  4. **`MAX_MASTER_GAIN`을 유도값으로 만든다**: `CLIP_SAFETY / loudestRealisticMixdown()` = 0.99 / 1.551 = **0.638**. 리터럴을 고르지 않으므로 세트를 재측정하면 상한이 스스로 따라간다.
  5. **상한은 두 경로 중 큰 쪽(합성) 기준으로 잡는다.** 버스가 공유되므로 샘플 경로만 보고 정하면, 샘플에서는 안전해 보이는 설정에서 합성 패시지가 클리핑한다.
  6. **동시타 16음은 설계 목표가 아니라 바깥 경계로 기록한다.** 다만 이 배제는 **velocity 1.0 배제와 종류가 다르다.** 동시타 16음은 열 손가락으로 불가능한 **물리적 한계**이고, velocity 1.0은 단지 이 저장소가 아직 생산하지 않는 **데이터**다. 앞의 것을 배제하는 건 신중함이고 뒤의 것을 배제한 건 가정이었다 — 최초 안이 그 둘을 같은 것으로 취급한 게 오류다.
  7. **`SAMPLE_PEAK_GAIN`은 건드리지 않는다.** 두 경로의 상대 레벨은 D-015가 정했고 유효하다. 이 결정은 절대 단계만 움직이며 두 경로를 함께 올린다.
- Consequence (명시적으로 감수하는 것):
  - 기본 음량이 **+7.1 dB**, 슬라이더 상한이 **+5.2 dB** 오른다. 이미 재생 중인 사용자에게는 갑작스러운 변화다.
  - **velocity 1.0 기준으로 재느라 0.7 기준보다 3.1 dB를 포기했다.** 오늘의 악보에는 velocity가 없으므로 그만큼은 쓰이지 않는 여유다. 그래도 이렇게 두는 이유는, 여유를 회수하려면 "변환기가 velocity를 내보내지 않는다"에 계속 의존해야 하고 그건 계약이 아니기 때문이다.
  - **동시타 16음 이상에서는 슬라이더 최대 시 클리핑할 수 있다.** 열 손가락으로 도달 불가능하지만 `VOICE_LIMIT`가 24이므로 병리적인 MIDI 데이터로는 가능하다. 그 경우 사용자가 의도적으로 상한까지 올린 상태다.
  - 합성 폴백도 함께 커진다. **이것은 의도된 것이다** — 폴백도 똑같이 20 dB 낮았고, 거의 실행되지 않아 아무도 보고하지 않았을 뿐이다.
  - **적정 음량은 이 PR로 확정되지 않는다.** 청감 확인은 운영 배포 후에만 가능하다.
  - PR #62가 추가한 선형합 기반 테스트 하나를 **교체했다.** 그 테스트는 폐기 대상 모델을 고정하고 있었으므로 완화가 아니라 대체다.
- Directive:
  - **보이스 수 × 보이스당 피크로 헤드룸을 다시 계산하지 마라.** 그 모델이 이 결함의 원인이다. 실측 믹스다운을 쓰거나, 새 시나리오가 필요하면 실제 버퍼로 렌더해 재라.
  - **믹스다운 실측값은 샘플 세트 `v1`, velocity 1.0 기준이다.** 세트를 재빌드하면 함께 다시 재고, **velocity 0.7로 재지 마라** — 그게 리뷰가 잡은 오류다.
  - **"현재 변환기가 X를 내보내지 않는다"를 안전 근거로 쓰지 마라.** 계약이 허용하면 도착할 수 있다. 물리적으로 불가능한 것(열 손가락)과 아직 생산되지 않는 것(velocity 1.0)은 다르다.
  - 상한을 올릴 일이 생기면 **합성 폴백 쪽 실측도 함께 확인하라.** 버스가 공유되며 그쪽이 더 크다.
  - D-015를 되돌리지 마라. 상대 레벨과 절대 레벨은 다른 문제이고, 이 결정은 후자만 다룬다.
- Related: 이슈 [#63](https://github.com/landfill/ClairKeys/issues/63), D-015, D-014, PR [#62](https://github.com/landfill/ClairKeys/pull/62), PR [#32](https://github.com/landfill/ClairKeys/pull/32)

## D-017: 재생 건반은 측정 폭과 곡 전체 음역으로 한 번만 정한다

- Date: 2026-08-28
- Status: Accepted
- Context:
  - `FallingNotesPlayer`가 24px 고정 `keyWidth`로 88건반을 만들었으므로, 가용 폭 356px의 모바일 세로에서는 흰건반 52개 중 14개만 보였고 데스크톱에서도 전부 보이지 않았다. 크롭 없이 폭만 맞추면 356 / 52 = 6.85px가 되어 흰건반 테두리 2px가 폭의 약 30%를 차지한다.
  - 운영 변환 결과 2건(Love Affair 411노트, Deborah's Theme 330노트)에서 C 옥타브 스냅은 둘을 C1–B5, 35 흰건반의 같은 창으로 붕괴시켰다. Deborah's Theme은 A1 두 음 때문에 비어 있는 옥타브 하나가 더해져 26 → 35개(+35%)가 됐다. 흰건반 스냅은 최대 한 건반만 추가한다.
- Decision:
  1. 재생 키 폭은 `ResizeObserver`가 읽은 시각화 content box 폭과 **곡 전체** 노트의 흰건반 스냅 범위로부터 계산한다. 곡이 바뀌거나 컨테이너가 resize될 때만 다시 계산하며, 재생 시간은 이 계산의 입력이 아니다.
  2. 크롭 하한은 최저 노트 이하의 흰건반, 상한은 최고 노트 이상의 흰건반으로 확장한다. **렌더에서 빠지는 것은 건반뿐이며 노트는 전부 렌더한다** — 따라서 하한 ≤ `min(midi)`, 상한 ≥ `max(midi)`를 회귀 테스트로 고정한다.
  3. `keyWidth`의 상한은 현행 데스크톱 값인 **24px**이다. 매우 좁은 음역에서 과대 건반을 만들지 않고 기존 밀도를 보존한다. 남는 폭은 키를 키우는 대신 대칭 여백으로 둔다.
  4. C 옥타브 기준점은 추가 건반이 아니라 해당 흰건반의 **C1–C8 라벨**로 표시한다. 이는 C 스냅의 폭 비용 없이 현재 음역을 읽게 한다.
  5. 흰건반과 검은건반의 border, radius, shadow는 keyWidth에 비례해 축소한다(보이는 hairline을 위한 0.5px 하한만 둔다). `finger`는 현 변환 데이터에 없으므로 12px 배지 임계값은 미래 운지 데이터에만 구속력이 있다.
  6. 재생 중 구간별 동적 크롭은 채택하지 않는다. 동일 음의 x가 비행 중 바뀌어 학습 모델을 깨고, 화면 밖 노트를 숨기면 위 불변식도 깬다.
- Consequence:
  - 아주 좁은 음역은 전체 폭을 채우지 않는다. 24px보다 넓은 키보다 예측 가능한 밀도와 양쪽 여백을 택한 결과다.
  - 세로 화면은 크롭 뒤에도 11.1–13.7px에 그칠 수 있다. 재생 시 가로 전환은 이슈 #65의 별도 할 일 4로 남으며, 이 결정이 그것을 대신하지 않는다.
- Rejected:
  - C 옥타브 스냅 | 비어 있는 건반을 최대 11반음씩 추가해 곡별 적응을 지운다.
  - 저음 꼬리 노트 삭제 | Love Affair의 6노트(1.5%)를 잃으면 폭은 넓어지지만 모든 노트를 렌더한다는 불변식을 깬다.
  - 구간별 동적 크롭 | 낙하 중 노트의 x를 재매핑한다.
- Directive:
  - 음역을 넓히기 위해 노트를 필터링하거나, 재생 시각을 레이아웃 계산에 넣지 않는다.
  - 새 운지 데이터를 생성하기 전까지 배지 임계값을 반응형 폭의 하한으로 오인하지 않는다.
- Related: 이슈 [#65](https://github.com/landfill/ClairKeys/issues/65), `src/utils/pianoLayout.ts`, `src/components/animation/FallingNotesPlayer.tsx`
