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

  다만 **사후 식별은 가능하다.** 세 데모 경로 중 어느 것도 `omrJobId`를 설정하지 않고, 실제 경로만 `omrJobId: omrResult.job_id`를 채운다. OMR 요청이 실패한 행은 `animationDataUrl`이 빈 문자열로 남으므로, `omrJobId IS NULL AND animationDataUrl <> ''`가 데모로 생성된 행을 지목한다. 보조 근거로 D-009가 기록한 Shape A(`note:"C4"`/`startTime`/`left|right`)는 `pdfParser`가 유지하는 outlier이므로, 저장된 JSON의 shape가 같은 판정을 교차 확인해 준다. 이 비대칭은 `uploadPathInventory.test.ts`가 고정한다 — 데모 경로에 `omrJobId`를 추가하는 변경은 식별 가능성을 파괴하므로 테스트가 먼저 실패한다.
- Decision:
  1. canonical 업로드 경로는 **`/api/omr/upload`** 다. 실제로 악보를 변환하는 유일한 경로이고, 이미 업로드 페이지의 기본 모드다.
  2. `/api/upload`는 **제거**한다. 프로덕션 코드 호출자가 0이면서 데모 결과를 저장할 수 있는 열린 경로이므로, 격리가 아니라 삭제가 맞다. 유일한 호출자인 `useFileUpload` 훅도 함께 제거한다.
  3. `/api/upload-async`와 `/api/processing`은 **저장 능력을 제거**한다. 두 경로가 제공하는 진행률 UI(SSE, 폴링)는 P1-B의 영속 큐가 물려받을 자산이므로 경로 자체를 지우지 않되, `pdfParser` 결과를 `SheetMusic`으로 저장하는 부분은 명시적 실패로 바꾼다.
  4. `pdfParser`의 데모 생성은 **삭제하지 않고 개발 전용으로 격리**한다. 삭제하면 OMR 서비스 없이 재생 경로를 손볼 방법이 사라진다. 대신 저장 경로에서 분리해, 데모 데이터가 사용자 악보로 남을 수 없게 한다.
  5. **기존 데이터 migration** — 쓰기 경로를 막는 것만으로는 이미 저장된 데모 행이 계속 진짜 변환으로 노출된다. P1-A 완료 조건("기존 사용자 데이터와 지원 클라이언트 migration이 검증된다")을 다음으로 구체화한다:
     - **식별**: 위 Context의 `omrJobId IS NULL AND animationDataUrl <> ''` 판정을 쓰는 읽기 전용 스크립트를 먼저 만들어 대상 행 수와 소유자를 집계한다. 실데이터 접근이 필요하므로 사용자 승인 아래 한 번 실행하고, 결과는 `docs/recovery/validation/`에 기록한다.
     - **표시**: 삭제하지 않는다 — 사용자가 올린 악보의 제목·분류·연습 기록(`PracticeSession`)이 그 행에 매달려 있고, 파괴적 조치는 되돌릴 수 없다. 대신 `SheetMusic`에 `provenance` 필드(`'omr' | 'demo' | 'unknown'`)를 추가하는 migration을 수행하고, 판정된 행을 `'demo'`로 표시한다. 판정 이전에 생성돼 확신할 수 없는 행은 `'unknown'`으로 남긴다.
     - **노출**: `'demo'`로 표시된 악보는 재생 화면에서 "실제 악보 변환 결과가 아님"을 명시하고, 공개 목록(`/api/sheet/public`)에서 제외한다. 이것이 D-001의 "demo 상태를 반환해야 한다"를 데이터 레이어까지 확장한 형태다.
     - **클라이언트**: 제거 대상은 `/api/upload` 하나이고 프로덕션 호출자가 0이므로 전환 경로가 필요한 클라이언트는 없다. `/api/upload-async`·`/api/processing`은 경로와 진행률 계약을 유지한 채 저장만 실패로 바꾸므로 호출자는 계속 동작한다 — 다만 성공 대신 명시적 오류를 받는다. 이 계약 변화는 stage 3에서 각 호출자(`MultiStageUploadUI`, `BackgroundFileUpload`)의 오류 표시를 함께 손봐야 완료된다.
     - 이 migration은 stage 3~5와 **같은 PR에 넣지 않는다.** 스키마 변경과 실데이터 조작은 코드 제거와 위험도가 다르므로 별도 PR로 분리하고, 쓰기 경로를 먼저 막은 뒤 수행한다(새 데모 행이 유입되는 동안 집계해봐야 무의미하다).
- Consequence (명시적으로 감수하는 것): 이 변경 후 **업로드는 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22)가 해소될 때까지 실제로 실패한다.** 현재 canonical 경로는 Docker 없는 호스트에서 Audiveris를 실행하지 못하기 때문이다. 이는 회귀가 아니라 은폐의 종료다 — 지금은 데모 경로가 이 고장을 성공처럼 보이게 가려주고 있고, D-001은 바로 그 가림을 금지한다. 실패는 사용자에게 실패로 보여야 한다.
- Directive:
  - 데모 출력이 `SheetMusic` 행이 되는 코드 경로를 남기지 않는다. 새 저장 경로를 추가할 때 `uploadPathInventory` 계열 테스트로 호출자 수를 함께 고정한다.
  - `/api/upload-async`·`/api/processing`이 P1-B에 넘길 queue/auth 경계는 P1-A 완료 시점에 `docs/recovery/phases/P1-B-durable-omr.md`가 참조할 수 있도록 문서화한다.
  - 이슈 #22의 컨테이너 수정 없이 D-010을 되돌려 데모 저장을 부활시키지 않는다. 업로드를 다시 성공시키는 유일한 정당한 방법은 실제 변환을 고치는 것이다.
  - 기존 데모 행을 일괄 삭제하지 않는다. 사용자 소유 메타데이터와 `PracticeSession`이 함께 사라지고, 잘못 판정한 행은 복구할 수 없다. 표시(`provenance`)가 기본 조치이고 삭제는 사용자가 개별적으로 선택할 일이다.
- Related: D-001, D-002, D-008, 이슈 [#20](https://github.com/landfill/ClairKeys/issues/20), 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22), `docs/recovery/phases/P1-A-upload-pipeline.md`
