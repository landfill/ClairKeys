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

## D-008: OMR 서비스 호스팅 후보 비교 (폐기된 초안)

- Date: 2026-07-21
- Status: **Superseded by D-012**. 이 비교는 실제 배포 전에 작성된 역사 기록이며, 배포 지침이나
  현재 호스트 설명으로 사용하지 않는다. 실제 런타임은 NAVER Cloud VM의 podman/systemd다.
- Context:
  - 당시 저장소에는 외부 호스팅 후보용 설정이 있었지만 실제 서비스가 배포된 적은 없었다.
    이 사실은 2026-08-21 NAVER Cloud VM 첫 배포 과정에서 확인됐다.
- Decision: 후보 비교를 채택하지 않는다. D-012와 `omr-service/deploy/`가 현재 배포 계약이다.
- Directive:
  - 이 항목을 근거로 호스트를 변경하거나 과거 설정 파일을 복원하지 않는다.
  - 배포 절차는 `omr-service/deploy/README.md`만 따른다.
- Historical evidence: PR [#21](https://github.com/landfill/ClairKeys/pull/21),
  `docs/recovery/reviews/PR-21.md`,
  `docs/recovery/validation/2026-08-21-issue-22-naver-vm-omr-runtime-proof.md`
- Related: D-012, D-011, 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22)

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
  | `/api/omr/upload` | `OMRUploadForm` (업로드 페이지 기본 모드) | 실제 — 외부 OMR 서비스 `/process` 프록시 |
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
- Related: D-008(배포 전 후보 비교, 이 결정으로 superseded), D-011, PR [#41](https://github.com/landfill/ClairKeys/pull/41), PR [#42](https://github.com/landfill/ClairKeys/pull/42), 이슈 [#22](https://github.com/landfill/ClairKeys/issues/22), `omr-service/deploy/README.md`

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

## D-018: OMR 완료 저장은 생산자 callback이 트리거하고 브라우저 폴링은 fallback으로 둔다

- Date: 2026-08-28
- Status: Accepted
- Context:
  - D-011은 스토리지 자격증명을 OMR 서비스에서 제거하고 Next.js만 결과를 저장하게 했다. 그러나
    저장 코드를 `/api/omr/status/[jobId]`에만 둬서, 완료 저장의 유일한 트리거가 브라우저의 5초
    폴링이 됐다. 업로드 화면을 벗어나면 interval이 해제되고 VM이 변환을 끝내도 결과는 메모리에
    남은 채 DB 행이 영구히 `processing`에 고착된다.
  - OMR 서비스는 정확한 완료 시점과 job id를 이미 알고 있으며, 양쪽에는 `OMR_SHARED_SECRET`이
    이미 배포되어 있다. 완료 사실만 알리는 데 새 자격증명이나 주기적 전수 조회가 필요하지 않다.
- Decision:
  1. Next.js 업로드 경로가 `/process` multipart에 canonical callback URL을 함께 보낸다. URL은
     `NEXTAUTH_URL`에서만 온다. 행을 만들기 전에 절대 URL로 검증하며, 미설정·공백은 잘못된 URL과
     같게 503 `OMR_CALLBACK_NOT_CONFIGURED`로 거부한다. *(2026-09-02 D-036으로 개정. 원문은
     "없으면 현재 요청 origin을 쓴다"였다 — 이유는 D-036 참조.)*
  2. OMR 서비스는 변환 완료 뒤 callback에 `{job_id}`를 POST하고 기존 공유 비밀을
     `X-ClairKeys-Token`으로 보낸다. callback 실패는 지수 backoff로 12회 재시도한다.
  3. callback은 공유 비밀을 constant-time으로 검증하고, job id로 DB 행을 찾아 `/result`를
     수거한 뒤 Next.js에만 있는 service-role key로 저장한다. 저장 경로는 D-011의 job-derived
     upsert를 그대로 사용한다. request의 job id는 서비스 계약인 UUID만 허용하고, 실제
     `/result` fetch에는 request 문자열이 아니라 DB에서 다시 읽은 `omrJobId`를 사용한다.
  4. 기존 사용자 세션 기반 status poll은 삭제하지 않는다. callback과 경합하거나 재호출돼도
     이미 `animationDataUrl`이 있으면 즉시 성공하고, 같은 job은 같은 객체 키에 upsert하므로
     브라우저·callback 모두 안전한 fallback이다.
- Reason: 완료를 가장 먼저 아는 생산자가 정확히 한 job을 알리는 것이, 브라우저 수명주기나
  모든 미완료 행을 훑는 주기 작업보다 직접적이다. 저장 권한과 저장 트리거를 분리해 D-011의
  credential boundary도 유지한다.
- Rejected:
  - OMR 서비스가 Supabase에 직접 저장 | D-011을 되돌리고 공인 IP VM에 service-role key를 둔다.
  - 브라우저 polling만 유지 | 화면 이탈이 저장 가능 여부를 결정하는 현재 결함을 보존한다.
  - Vercel cron이 미완료 행을 주기적으로 전수 조회 | 정확한 완료 시점을 아는 생산자가 있는데도
    지연과 불필요한 조회를 만들고, 배포 plan의 cron 주기 제약에 동작을 의존시킨다.
- Consequence:
  - callback 재시도와 job 결과는 여전히 OMR 프로세스 메모리에 있다. VM 재시작까지 견디는 영속
    전달은 P1-B의 queue 범위이며, 이 결정은 화면 이탈 결함만 제거한다.
  - 12회가 모두 실패하면 `delivery_status=failed`가 되지만 결과는 `/result/{job_id}`에 남아
    브라우저 polling 또는 운영자 재수거가 가능하다. 이를 영속 큐 완료로 표현하지 않는다.
- Directive:
  - callback endpoint에 사용자 세션을 요구하지 않는다. 인증 경계는 OMR 공유 비밀이다.
  - callback을 이유로 OMR 서비스에 스토리지 자격증명을 추가하지 않는다.
  - callback URL을 행 생성 뒤에 처음 검증하지 않는다. 잘못된 URL로 job 없는 `processing` 행을
    다시 만들게 된다.
  - request body의 문자열을 `/result` URL에 직접 이어 붙이지 않는다. UUID로 검증해 행을 찾은 뒤
    DB에 저장된 job id를 fetch target으로 사용한다.
- Related: D-010, D-011, 이슈 [#55](https://github.com/landfill/ClairKeys/issues/55),
  `src/app/api/omr/finalize/route.ts`, `omr-service/app.py`

## D-019: 재생 가로 전환은 하나의 조건으로 두 플랫폼을 처리하고, 컨트롤 압축을 동반한다

- Date: 2026-08-28
- Status: Accepted
- Context:
  - D-017의 곡 단위 크롭은 세로 화면의 폭 문제를 풀지 못한다. iPhone 12 세로의 가용 폭 356px
    에서 33 흰건반 악보는 건반 폭 10.79px에 그친다. 남은 지렛대는 화면 자체의 방향뿐이다.
  - 두 플랫폼이 반대 수단을 요구한다. Android는 fullscreen 선행 후 `screen.orientation.lock()`
    이 동작하고, iOS는 `lock()`도 manifest `orientation`도 없어 CSS 변환만 남는다.
  - **실측**: 재생 중 플레이어 자체 chrome이 264px(안내문 32 + PlaybackControls 168 +
    샘플 상태 32 + 음량 32)이다. iPhone 12 가로의 뷰포트 높이는 **390px 전체**이므로, 회전만
    하면 시각화에 126px이 남고 건반 120px을 빼면 낙하 영역이 **6px**이 된다.
- Decision:
  1. 회전 여부는 `engaged && (pointer: coarse) && (orientation: portrait)` 하나의 식으로
     정한다. 락 성공은 화면을 실제 가로로 만들어 portrait 질의를 스스로 종료시키므로, **이중
     회전 해제가 별도 분기 없이 같은 식에서 나온다.**
  2. iOS 판별은 `typeof screen.orientation?.lock === 'function'`으로만 한다. iOS는 인터페이스
     자체는 Safari 16.4+로 제공하므로 `'orientation' in screen`이나 null 검사는 iOS를 조용히
     Android 경로로 보낸다.
  3. 방향 요청은 재생 클릭 핸들러 안에서 **동기적으로** 발사한다. `play()`는 AudioContext 재개와
     샘플 로딩을 await하므로 `isPlaying` effect에서 요청하면 fullscreen의 transient activation
     창을 놓칠 수 있다.
  4. `lock()`이 없는 플랫폼에서는 fullscreen을 요청하지 않는다. iOS는 `Element.requestFullscreen`
     을 `<video>`에만 허용하므로 거절된 Promise만 남고, CSS 회전이 이미 화면을 덮는다.
  5. **데스크톱은 회전 대상이 아니다.** 창에는 전환할 방향이 없고, 재생 시 브라우저를 fullscreen
     으로 밀어넣는 것은 그 자체가 결함이다. `(pointer: coarse)`로 배제한다.
  6. 회전은 **컨트롤 압축을 반드시 동반한다.** 재생 중에는 `CompactPlaybackBar` 한 줄(56px)이
     기존 4개 블록을 대체해 chrome을 264px → 64px로 줄인다. 낙하 영역이 6px → 206px이 되며,
     이는 설정값 `lookAheadSec` 1.5s(210px)에 해당한다.
  7. 압축이 버리는 것과 남기는 것: 안내문과 3행 컨트롤 블록은 설정용이므로 버린다. **음량
     슬라이더는 남긴다** — 귀로 `DEFAULT_MASTER_GAIN`을 고르는 것이 목적이라 소리가 나는 동안
     조작할 수 있어야 한다. 샘플 상태 줄은 행을 내주되 `sr-only`로 live region을 유지한다.
  8. 공유 `PlaybackControls`는 수정하지 않는다. `AnimationPlayer`와 demo 페이지가 현재 형태에
     의존한다.
- Consequence:
  - 회전 잠금을 켠 iOS 사용자는 CSS 회전만 받는다. 이때 기기를 어느 방향으로 돌려야 바로 보이는지는
    `rotate(90deg)`가 정한다(기기를 반시계로 돌린다). 반대로 돌리면 뒤집혀 보이며, 브라우저가
    실제로 가로로 reflow하는 경우에만 회전이 해제된다. 이 방향은 임의 선택이며 실기기 확인 대상이다.
  - 재생 중에는 모드 선택이 사라진다. `FallingNotesPlayer`는 listen 모드만 지원하고 핸들러가
    로그만 남기므로 잃는 기능이 없다.
- Rejected:
  - 시각화 블록만 회전 | 폰을 세로로 든 채 노트가 옆으로 흘러 낙하 노트의 전제를 깬다.
  - 회전만 하고 압축은 나중에 | 가로 390px에서 낙하 영역 6px은 쓸 수 없는 화면이다.
  - manifest `"orientation"` | iOS가 무시하므로 이미 동작하는 플랫폼에서만 동작한다.
  - `'orientation' in screen` feature-detect | iOS에서 true가 되어 조용히 아무 일도 안 한다.
- Directive:
  - `screen.orientation`의 존재로 방향 잠금 지원을 판별하지 않는다. 반드시 `lock`이 함수인지 본다.
  - 행을 되찾기 위해 live region을 unmount하지 않는다.
  - 방향 요청을 `isPlaying` effect로 옮기지 않는다. 사용자 활성화 창을 잃는다.
- Related: D-017, 이슈 [#65](https://github.com/landfill/ClairKeys/issues/65) 할 일 4,
  `src/hooks/usePlaybackOrientation.ts`, `src/components/playback/CompactPlaybackBar.tsx`

## D-020: 남는 폭은 여백이 아니라 이웃 건반에 쓴다 (D-017 결정 3 대체)

- Date: 2026-08-29
- Status: Accepted
- Supersedes: **D-017 결정 3** (`keyWidth` 상한 24px, 남는 폭은 대칭 여백)
- Context:
  - D-017은 아주 좁은 음역에서 과대 건반이 생기는 것을 막으려고 `keyWidth`에 24px **상한**을
    두고 남는 폭을 대칭 여백으로 남겼다.
  - **실측**: `/sheet/2`(흰건반 33개) 기준 데스크톱 유휴 1022px에서 빈 폭 **230px(22.5%)**,
    재생 뷰 1404px에서 **612px(43.6%)**다. 건반이 검은 배경 한가운데 떠 있는 형태가 되어
    사용자가 불편을 제기했다.
  - 남는 폭을 **건반 크기**에 쓰면 1404px을 33건반으로 채워 42.5px이 되는데, `keyboardHeight`가
    120px 고정이므로 비율이 1:5 → **1:2.8**이 된다. 실제 피아노 백건은 약 1:6.3이므로 피아노로
    읽히지 않는 뭉툭한 블록이 된다.
- Decision:
  1. 24px은 **상한이 아니라 기준 밀도(floor)**다. 상수를 `MAX_PLAYBACK_KEY_WIDTH` →
     `BASE_PLAYBACK_KEY_WIDTH`로 바꾼다.
  2. 남는 폭은 **이웃 흰건반**에 먼저 쓴다. 악보 범위를 좌우로 번갈아 넓히되, 한 건반을 더
     붙였을 때 모든 건반이 기준 폭 아래로 내려가면 멈춘다(`fillRangeToWidth`).
  3. 더 붙일 건반이 없으면(88건반 전체) 남는 폭은 그때 건반 크기로 간다.
  4. **악보 자신의 범위는 절대 줄이지 않는다.** 넓히는 방향뿐이므로 D-017 불변식
     (하한 ≤ `min(midi)`, 상한 ≥ `max(midi)`)은 더 여유로워질 뿐 깨지지 않는다. 더해지는 건반은
     악보 음역 **밖**이므로 어떤 노트도 다른 건반으로 옮겨가지 않는다.
  5. 좁은 뷰포트는 그대로다. 가용 폭이 악보 범위조차 24px로 담지 못하면 붙일 건반이 없으므로
     동작이 이전과 동일하다(폰 세로 356px / 33건반 → 10.8px).
- Consequence:
  - **실측(구현 후)**: 1022px → 42건반 24.33px, 698px → 29건반 24.06px. 두 경우 모두 빈 폭 0이고
    `floor(가용폭 / 24)`와 정확히 일치한다.
  - 같은 악보가 화면마다 다른 개수의 건반으로 그려진다. 노트의 x도 화면마다 다르다. D-017의
    Directive는 **재생 시각**을 레이아웃 입력으로 넣지 말라는 것이었고 뷰포트는 이미 입력이므로
    (그것이 PR #67의 목적이다) 충돌하지 않는다.
  - 아주 넓은 뷰포트(예: 2560px)에서는 88건반을 다 붙인 뒤에도 남아 건반이 49px까지 커진다.
    이때 진짜 원인은 폭이 자유로운 것이 아니라 `keyboardHeight`가 120px 고정인 것이다. 문제가
    되면 **폭 상한을 되살릴 게 아니라 건반 높이를 폭에 비례시킨다.**
- Rejected:
  - 상한만 올린다(24 → 36 등) | 빈 폭을 줄일 뿐 없애지 못하고, 숫자의 근거가 없다.
  - 남는 폭을 건반 크기에만 쓴다 | 1:2.8 비율로 피아노가 아닌 블록이 된다.
  - C 옥타브 스냅 부활 | 여전히 기각이다. 그것은 **가용 폭과 무관하게** 최대 11반음을 붙여 서로
    다른 악보를 같은 창으로 붕괴시킨다. 이 결정은 어차피 비어 있을 픽셀만 쓰므로 화면별·악보별
    적응이 유지된다.
- Directive:
  - 채운 범위가 어떤 건반도 기준 폭 아래로 밀어내지 않게 한다.
  - 폭을 벌기 위해 악보 범위를 **줄이지** 않는다 (D-017 Directive 유지).
- Related: D-017, 이슈 [#65](https://github.com/landfill/ClairKeys/issues/65),
  `src/utils/pianoLayout.ts`

## D-021: 낙하 영역은 초로 상한을 두고, 남는 세로는 건반 비율에 쓴다

- Date: 2026-08-29
- Status: Accepted
- Fulfills: **D-020 Directive** ("넓은 뷰포트에서 건반이 뭉툭해지면 폭 상한을 되살릴 게 아니라
  건반 높이를 폭에 비례시킨다")
- Context:
  - 낙하 영역이 "남는 높이 전부"였고 `pxPerSec`는 140 고정이라, **미리 보이는 시간이 기기마다
    달랐다.** 실측: 폰 가로(주소창 표시) 약 **1.1s**, 데스크톱 1470×746 **4.0s**, 높이 1440
    모니터 약 **8.9s**. 같은 악보를 두 기기에서 연습하면 같은 연습이 아니다.
  - 사용자가 폰에서 주소창이 세로 공간을 먹어 낙하 영역이 줄어든 상태가 **오히려 더 어울린다**고
    보고했다. 그 값(약 1.1~1.5s)이 앱이 이미 선언한 `lookAheadSec = 1.5`에 가깝고, 데스크톱의
    4초 쪽이 사고였다.
  - `useFallingNotesPlayer`의 `lookAheadSec`는 유휴 박스 높이를 정하는 데만 쓰이고 **재생 중에는
    아무 데도 쓰이지 않았다.**
- Decision:
  1. **`pxPerSec` 140은 고정한다.** 노트가 떨어지는 속도는 연주자의 손이 익히는 대상이므로
     화면에 따라 달라지면 안 된다.
  2. 대신 낙하 영역에 **초 단위 상한**을 둔다: `MAX_LOOK_AHEAD_SEC = 2.5` (= 350px).
  3. 남는 세로는 **건반**에 쓴다. 건반 높이는 `keyWidth × 6.3`(실제 백건 약 23×145mm)까지
     자라되, **낙하 영역이 쓰지 않을 높이만** 가져간다. 이 순서가 좁은 화면을 보호한다 —
     폰에서는 남는 높이가 음수라 건반이 기존 120px 바닥에 머물고 낙하 영역을 뺏지 않는다.
  4. 그래도 남으면 위아래 여백으로 두고 박스를 세로 중앙에 놓는다. 늘리지 않는다.
  5. **측정 대상과 크기 결정 대상을 분리한다.** 바깥 래퍼가 가용 높이를 갖고(`ResizeObserver`
     대상), 박스는 계산된 픽셀 높이를 갖는다. 측정된 요소를 그 측정값으로 크기 지정하면 피드백
     루프가 된다. 산술은 `src/utils/playbackGeometry.ts`의 순수 함수에 둔다 — jsdom은 레이아웃이
     없어 컴포넌트를 통해서는 이 계산에 닿을 수 없다.
- Consequence:
  - **실측(구현 후)**: 가용 562px에서 낙하 350px(정확히 2.5s), 건반 154px, 건반 비율 24.46px
    폭 대비 **6.30** (이전 4.9), 박스 506 = 350+154+2, 남는 56px는 여백.
  - 폰 가로처럼 여유가 없는 화면은 **이전과 완전히 동일**하다.
  - 아주 큰 모니터에서는 박스가 약 520px에 머물고 나머지가 여백이 된다. 세로를 다 쓰는 대신
    보이는 분량과 건반 비율을 일정하게 유지한 결과다.
  - `lookAheadSec`(1.5s, 1–5 설정 가능)는 여전히 유휴 박스 높이에만 관여한다. 재생 중 상한은
    `MAX_LOOK_AHEAD_SEC`이며 둘을 합치는 것은 별도 과제다.
- Rejected:
  - `pxPerSec`를 높이에서 유도해 look-ahead를 정확히 고정 | 모든 기기가 같은 분량을 보게 되지만
    높이 1440 모니터에서 노트가 **833px/s**로 쏟아진다. 유일하게 고정돼야 할 값을 버리는 거래다.
  - 남는 높이를 건반이 전부 흡수 | 키 폭 대비 1:12는 피아노가 아니라 벽이다.
  - 낙하 영역만 상한하고 건반은 120px 고정 | 남는 높이가 전부 여백이 되고 D-020이 남긴 뭉툭한
    건반 문제(1:4.4)가 그대로다.
- Directive:
  - 노트 속도(`pxPerSec`)를 뷰포트에 의존시키지 않는다.
  - 측정하는 요소와 그 결과로 크기를 정하는 요소를 같게 만들지 않는다.
  - 건반 높이를 낙하 영역에서 빼앗아 키우지 않는다. 남는 높이만 쓴다.
- Related: D-017, D-020, 이슈 [#65](https://github.com/landfill/ClairKeys/issues/65),
  `src/utils/playbackGeometry.ts`

## D-022: 건반이 비율을 먼저 받고, 노트는 나머지가 아니라 하한을 받는다 (D-021 결정 3 대체)

- Date: 2026-08-29
- Status: Accepted
- Supersedes: **D-021 결정 3**(건반은 "낙하 영역이 쓰지 않을 높이만" 가져간다)과 그 Directive
  ("건반 높이를 낙하 영역에서 빼앗아 키우지 않는다")
- Context:
  - D-021은 낙하 영역에 2.5s 상한을 두고 **남는 높이만** 건반에 줬다. 근거는 "폰에서 건반을
    키우면 노트 활주로를 뺏는다"였다.
  - **실기기가 반박했다.** 사용자가 폰을 가로로 기울인 상태에서 낙하 영역이 너무 크다고 보고했다.
  - 산술이 이유를 설명한다. 폰 가로 뷰포트는 세로 약 390px이라 낙하 영역이 **2.5s(350px)에
    도달할 수 없다** — 즉 폰에서는 **상한이 한 번도 걸리지 않는다.** 건반은 120px 바닥에
    못박히고 낙하 영역이 남은 전부를 가져간다. D-021은 데스크톱만 고쳤고 폰에는 원래 결함
    ("낙하 영역 = 남는 높이 전부")이 그대로 남아 있었다. 그 결함이 바로 최초 보고의 내용이었다.
- Decision:
  1. **순서를 뒤집는다.** 건반이 `keyWidth × 6.3`(실제 백건 비율)을 **먼저** 받는다.
  2. 노트는 나머지가 아니라 **하한**을 받는다: `MIN_LOOK_AHEAD_SEC = 1`(140px). 건반은 이 하한을
     침범할 만큼 자라지 못한다.
  3. 둘 다 감당 못 하는 높이에서는 건반이 기존 **120px 바닥**으로 물러난다.
  4. 낙하 영역의 2.5s 상한은 그대로다. 넓은 화면에서 여전히 유효하다.
  5. **유휴 박스도 같은 규칙을 쓴다.** 재생을 누를 때 악기의 비율이 바뀌면 서로 다른 악기로 읽힌다.
- Consequence:
  - **산출(구현 후)**:

    | 환경 | 가용 | 이전 낙하/건반 | 이후 낙하/건반 | 건반 비율 |
    |---|---:|---:|---:|---:|
    | iPhone 12 가로 + 주소창 | 276 | 154 (1.10s) / 120 | 140 (1.00s) / 134 | 5.57 |
    | iPhone 12 가로 | 326 | 204 (1.46s) / 120 | 172 (1.23s) / 152 | 6.32 |
    | iPhone 15 Pro Max 가로 | 366 | 244 (1.74s) / 120 | 210 (1.50s) / 154 | 6.29 |
    | 데스크톱 1470×746 | 682 | 350 (2.50s) / 170 | **변화 없음** | 6.30 |
    | 유휴 박스 | 330 | 208 (1.49s) / 120 | 177 (1.26s) / 151 | 6.29 |

  - **데스크톱은 변하지 않는다.** 이미 두 하한·상한 모두 여유가 있었다.
  - 유휴 박스의 낙하 영역이 208 → 177px로 줄어 `lookAheadSec`(1.5s)와 더 어긋난다. 그 상수는
    이제 유휴 박스의 **전체 높이**만 정하고 보이는 시간은 정하지 않는다. 통합은 별도 과제다.
  - 아주 좁은 화면(가용 200px 이하)에서는 건반이 120px 바닥이고 낙하 영역이 하한 미만일 수 있다.
    이전과 같은 성질이다.
- Rejected:
  - 좁은 화면에서만 상한을 낮춘다 | 상한은 잘못된 지렛대다. 폰에서는 애초에 걸리지 않는다.
  - 건반 비율을 낮춘다(6.3 → 5) | 실제 피아노에서 멀어지고, 원인(낙하가 나머지를 다 가져감)을
    건드리지 않는다.
- Directive:
  - **낙하 영역에 "나머지"를 주지 않는다.** 두 부분 모두 명시된 몫을 갖는다 — 건반은 비율,
    노트는 하한, 그리고 상한.
  - 이 기하를 바꿀 때는 폰 가로(가용 약 270–370px)와 데스크톱을 **둘 다** 산출해 본다. 한쪽만
    보면 D-021처럼 다른 쪽에 결함이 남는다.
- Related: D-021, 이슈 [#65](https://github.com/landfill/ClairKeys/issues/65),
  `src/utils/playbackGeometry.ts`

## D-023: 활주로는 초가 아니라 건반 높이로 잰다 (D-021 상한의 역할 대체)

- Date: 2026-08-29
- Status: Accepted
- Supersedes: D-021 결정 2의 실효 — `MAX_LOOK_AHEAD_SEC`(2.5s)는 남지만 상한 역할은
  `FALLING_TO_KEYBOARD_RATIO`가 맡는다.
- Context:
  - D-022 이후에도 사용자가 **폰을 가로로 눕히면 낙하 영역이 계속 커진다**고 보고했다.
  - 원인은 `100dvh`의 정의다. `dvh`는 **표시 중인 브라우저 크롬을 뺀 동적 뷰포트**이므로,
    주소창이 접히면 50~60px이 돌아온다. 건반은 이미 피아노 비율(6.3) 목표에 닿아 더 자라지
    못하므로 **그 픽셀이 전부 낙하 영역으로 간다.**
  - 근본 원인은 D-021·D-022가 반복해서 놓친 같은 것이다. **낙하 영역의 유일한 상한이 2.5s
    (350px)인데 폰 가로 뷰포트는 전체가 276~390px이라 그 상한이 절대 걸리지 않는다.** 상한 값을
    바꾼 것이지 "폰에서는 어떤 상한도 걸리지 않는다"는 구조를 고친 게 아니었다.
  - 산출: 가용 276 → 1.00s, 326 → 1.23s, 390 → **1.69s**, 430 → **1.96s**. 사용자가 본 그대로
    자란다.
- Decision:
  1. 낙하 영역의 상한을 **건반 높이에 비례**로 둔다: `FALLING_TO_KEYBOARD_RATIO = 1.15`.
     건반이 비율 목표에 닿는 순간 낙하 영역도 함께 멈춘다.
  2. `MAX_LOOK_AHEAD_SEC`(2.5s)는 안전망으로 남긴다. 초고해상도 화면에서 건반이 아주 커지면
     (예: 흰건반 49px → 건반 309px → 비례 상한 355px) 그때 다시 걸린다.
  3. `MIN_LOOK_AHEAD_SEC`(1s) 하한과 건반 우선 배분(D-022)은 그대로다.
  4. 남는 높이는 여백이다. 박스는 세로 중앙에 놓인다.
  5. **화면 크기 임계값을 두지 않는다.** "가용 470px 미만이면 상한 1.2s" 같은 분기는 경계값의
     근거가 없고 태블릿이 정확히 그 위에 걸친다. 규칙은 하나여야 한다.
- Consequence:

  | 환경 | 가용 | 이전 낙하/건반 | 이후 낙하/건반 | 여백 |
  |---|---:|---:|---:|---:|
  | 폰 가로 + 주소창 | 276 | 140 (1.00s) / 134 | **변화 없음** | 0 |
  | 폰 가로 (일부 접힘) | 326 | 172 (1.23s) / 152 | **변화 없음** | 0 |
  | 폰 가로 (완전 접힘) | 390 | 236 (1.69s) / 152 | **175 (1.25s) / 152** | 61 |
  | 큰 폰 가로 | 430 | 274 (1.96s) / 154 | **177 (1.26s) / 154** | 97 |
  | 데스크톱 1470×746 | 682 | 350 (2.50s) / 170 | **195 (1.39s) / 170** | 315 |
  | 유휴 박스 | 330 | 175 (1.25s) / 153 | **변화 없음** | 0 |

  - **데스크톱이 2.50s → 1.39s로 짧아진다.** 사용자가 이 대가를 명시적으로 선택했다 — 대안은
    화면 크기 임계값이었고, 그건 경계의 근거가 없다.
  - 화면이 커도 그림이 커지지 않는다. 넓은 화면에서는 여백이 크게 남는다(데스크톱 315px).
  - 건반과 낙하의 비율이 **모든 화면에서 1.15로 같다.** 기기를 바꿔도 같은 그림이다.
- Rejected:
  - 가용 높이 임계값(예: 470px)으로 상한을 나눈다 | 경계값의 근거가 없고 태블릿이 그 위에 걸친다.
  - 건반이 6.3을 넘어 계속 자라게 둔다 | 실제 피아노가 아니게 된다.
  - 그대로 둔다 | 사용자가 두 번 보고한 결함이다.
- Directive:
  - **낙하 영역에 거는 어떤 상한도 폰 가로(가용 276~390px)에서 걸리는지 먼저 확인한다.**
    걸리지 않으면 그건 상한이 아니다 — D-021과 D-022가 이 확인을 빠뜨려 두 번 헛돌았다.
- Related: D-021, D-022, 이슈 [#65](https://github.com/landfill/ClairKeys/issues/65),
  `src/utils/playbackGeometry.ts`

## D-024: 디자인 개편은 재생 기하와 저장 계약을 회귀 기준으로 두고 단계별로 진행한다

- Date: 2026-08-29
- Status: Accepted
- Context:
  - 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)은 이름을 제외한 로고·색상·UI 전면
    개편을 요구한다. 시각 개편은 성격상 거의 모든 화면 파일을 건드리므로, 지금까지 실기기 관측과
    실측으로 확정한 계약을 조용히 밀어낼 수 있는 유일한 종류의 작업이다.
  - 재생 기하는 D-021 → D-022 → D-023으로 **세 번** 고쳤고, 매번 이유는 "폰 가로에서 상한이 걸리는지
    확인하지 않았다"였다. 이 값들은 취향이 아니라 실기기 보고에 대한 답이다.
  - DS-0 인벤토리에서 canonical 업로드 경로가 `ProcessingJob`·`ProcessingNotification`을 전혀 쓰지
    않는다는 것이 확인됐다. 즉 `/processing` 화면과 알림 API는 실제 업로드와 단절돼 있다. 이 상태를
    모른 채 3단계 처리 화면을 디자인하면 없는 데이터를 그리는 UI가 나온다.
- Decision:
  1. 이슈 #76은 DS-0~DS-7의 별도 이슈·브랜치·PR로 진행한다. 한 PR에서 홈·업로드·플레이어를 동시에
     교체하지 않는다.
  2. DS-0이 고정한 회귀 계약(`docs/recovery/phases/DS-0-current-state-baseline.md`의 "변경하지 않을
     회귀 계약")은 시각 개편의 부수효과로 바뀌지 않는다. 바꿔야 할 이유가 생기면 해당 결정 문서
     (D-013, D-017~D-023 등)를 먼저 갱신한다.
  3. `body.playback-active .playback-chrome`과 `body.playback-rotated`는 새 공통 셸에서도 유지한다.
     Header·Footer를 교체하더라도 `playback-chrome` 클래스를 잃으면 재생 중 화면이 다시 좁아진다.
  4. **DS-1(디자인 토큰과 공통 셸)이 다른 모든 단계의 선행 조건이다.** 토큰 없이 개별 화면부터
     고치면 색상·간격·대비가 화면마다 흩어지고, DS-7에서 상태 표현을 통일할 근거가 사라진다.
  5. 처리 단계 문구와 완료 알림(DS-3, DS-7)은 UI보다 **상태의 출처**를 먼저 정한다. 스키마에
     `ProcessingStage` enum이 있다는 사실을 canonical 경로가 그것을 채운다는 뜻으로 읽지 않는다.
  6. 기능 로직 변경과 시각 개편을 같은 커밋에 섞지 않는다.
- Reason: 이 저장소가 지금까지 확정한 것 중 되돌리기 가장 비싼 것은 실기기로 세 번 고친 재생 기하와
  D-010·D-011·D-018의 저장 경계다. 개편의 목적은 전환율이지 이 계약의 재검토가 아니므로, 계약을
  명시적으로 열거해 두고 건드릴 때는 결정 문서를 먼저 고치게 만든다.
- Rejected:
  - 한 번의 전면 개편 PR | 회귀가 발생해도 어느 변경이 원인인지 분리할 수 없다. 이슈 #76의 실행
    계획도 같은 이유로 이를 명시적으로 배제한다.
  - 화면부터 고치고 토큰은 나중에 추출 | 추출 시점에 이미 화면마다 다른 값이 박혀 있어, 토큰화가
    전면 재작업이 된다. 현재 `globals.css`의 토큰은 `--background`/`--foreground` 둘뿐이다.
  - 회귀 계약을 테스트에만 맡긴다 | 테스트는 값이 바뀐 것은 잡지만 **왜 그 값인지**는 알려주지
    않는다. 디자인 작업자는 실패한 단언을 근거 없는 제약으로 읽고 수정하기 쉽다.
- Consequence:
  - DS-0이 `미확인`으로 남긴 항목(구간 반복, 곡 제목 편집, WCAG AA)은 해당 단계 진입 시 실제
    화면에서 먼저 확인해야 한다. 개편 전 상태를 모르면 개편 후 회귀도 판정할 수 없다.
  - 프로덕션 화면 캡처가 아직 없으므로, DS-0의 판정은 코드 기준이며 배포본과의 차이는 배제되지
    않았다.
- Directive:
  - 시각 개편 PR에서 `src/utils/playbackGeometry.ts`, `src/utils/pianoLayout.ts`,
    `src/hooks/usePlaybackOrientation.ts`의 상수나 조건식을 바꾸지 않는다.
  - `playback-chrome` 클래스를 새 레이아웃에서 누락하지 않는다.
  - 없는 데이터를 전제로 화면을 그리지 않는다. 상태의 출처를 먼저 확인한다.
- Related: 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76), D-010, D-011, D-013, D-018,
  D-017~D-023, `docs/recovery/phases/DS-0-current-state-baseline.md`

## D-025: 다크 모드는 이번 개편에서 구현하지 않는다

- Date: 2026-08-29
- Status: Accepted
- Deviates from: 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76) 비주얼 시스템의
  "다크 모드는 전체 서비스보다 플레이어에 우선 적용"
- Context:
  - 사용자가 2026-08-29에 다크 모드는 현재 구현 계획이 없다고 지시했다. 이슈 #76 본문에는 남아
    있으므로, 구현이 스펙과 달라야 하는 이유를 코드보다 먼저 기록한다 (AGENTS.md).
  - 현재 상태는 "부분 지원"이 아니라 **죽은 코드**다. `globals.css`의 `prefers-color-scheme: dark`
    블록이 `--background`/`--foreground`를 바꾸지만, `src/app/layout.tsx:100`의
    `<main className="flex-1 bg-gray-50">`와 `bg-white` Header·Footer가 body를 완전히 덮어
    화면에는 반영되지 않는다. 즉 지우든 두든 지금 보이는 화면은 같다.
  - 이슈 #76의 최우선 목표는 PDF 업로드 전환율이다. 다크 모드는 그 지표에 직접 기여하지 않는
    반면, 토큰을 두 벌(라이트·다크)로 정의하고 모든 화면에서 대비를 두 번 검증하는 비용을 DS-1~DS-7
    전체에 부과한다.
- Decision:
  1. DS-1의 디자인 토큰은 **라이트 팔레트 한 벌만** 정의한다. `@media (prefers-color-scheme: dark)`
     나 `[data-theme]` 분기를 새로 만들지 않는다.
  2. `globals.css`의 기존 죽은 다크 블록(DS0-10)은 DS-1에서 처리한다. 남겨 둘 경우 다크 모드가
     지원되는 것으로 오해되므로, 남긴다면 죽은 코드임을 주석으로 명시한다.
  3. 플레이어의 어두운 시각화 영역(낙하 노트 배경의 검은 박스)은 다크 모드가 아니다. 그것은 노트
     대비를 위한 **컴포넌트 고유의 배경**이며 이 결정의 대상이 아니다.
  4. 이 결정은 다크 모드를 영구히 배제하지 않는다. 다시 하기로 하면 이 항목을 갱신하고 DS-1의
     토큰 정의로 돌아간다.
- Reason: 지금 상태가 부분 구현이 아니라 무효한 코드이므로, "이미 절반 됐으니 마저 하자"는 근거가
  성립하지 않는다. 구현하지 않기로 하면 잃는 것은 없고, 하기로 하면 모든 단계에 검증 비용이 붙는다.
- Rejected:
  - 플레이어에만 다크 모드 적용 (이슈 #76 원안) | 플레이어는 이미 검은 시각화 영역을 갖고 있어
    체감 이득이 작은 반면, 컨트롤·오버레이·TempoDisplay의 대비를 별도 팔레트로 재검증해야 한다.
  - 죽은 블록을 그대로 둔다 | 새 토큰과 나란히 있으면 다음 세션이 다크 모드 지원으로 읽는다.
- Consequence:
  - 다크 OS 사용자는 라이트 화면을 본다. 현재도 동일하므로 회귀가 아니다.
  - 이슈 #76 본문의 다크 모드 항목과 이 결정이 어긋난다. 이슈를 읽는 사람은 이 결정을 함께 본다.
- Directive:
  - DS-1~DS-7에서 다크 팔레트 토큰이나 `prefers-color-scheme` 분기를 새로 도입하지 않는다.
  - 플레이어 시각화 영역의 검은 배경을 다크 모드 구현으로 표현하지 않는다.
- Related: 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76), D-024,
  `docs/recovery/phases/DS-0-current-state-baseline.md` (DS0-10)

## D-026: 처리 상태는 `SheetMusic` 한 곳에서 읽고, 세부 단계는 아는 동안에만 보여준다

- Date: 2026-08-29
- Status: Accepted
- Fulfills: DS-G1 (이슈 [#76](https://github.com/landfill/ClairKeys/issues/76) 3·7단계의 선행 결정)
- Context:
  - DS-0이 확인한 대로 `/processing` 화면과 `/api/notifications`는 `ProcessingJob`·
    `ProcessingNotification`을 읽는데, canonical 업로드 경로(`/api/omr/upload`,
    `/api/omr/finalize`)는 그 테이블에 한 행도 쓰지 않는다. 악보 5건을 가진 계정에서도
    `처리 작업 (0)` / `알림 (0)`이다 (운영 확인).
  - **`ProcessingJob`의 유일한 writer는 `/api/processing` POST와 `/api/upload-async`인데, 둘 다
    P1-A가 `CONVERSION_UNAVAILABLE`로 무력화한 경로다(D-010).** 즉 이 테이블에 지금 쓸 수 있는
    유일한 내용은 "즉시 실패한 죽은 경로의 작업"이다.
  - 실제 상태는 `SheetMusic.processingStatus`에만 있다. 쓰는 값은 `'processing'`(행 생성 시),
    `'completed'`, `'failed'` 셋이고, 스키마 default `'pending'`은 `/api/sheet` POST 경로로 만든
    행에만 남는다. **그 행들은 이후 어떤 코드도 건드리지 않으므로 재생 가능한데도 영원히
    `'pending'`이다.**
  - `omrJobId`를 클라이언트에 돌려주는 API가 없다. 브라우저는 업로드 응답으로 받은 `jobId`를
    그 화면에서만 갖는다. 화면을 떠나면 `/api/omr/status/[jobId]`를 다시 부를 방법이 없다.
  - `/api/sheet`(목록)도 `/api/sheet/[id]`(상세)도 `processingStatus`를 반환하지 않는다.
  - 행 생성 시 `animationDataUrl`은 `''`이고 완료 시에만 실제 URL로 채워진다.
- Decision:
  1. **G1-1 — 상태 출처는 `SheetMusic`이다.** `ProcessingJob`·`ProcessingNotification`은 이
     트랙에서 읽지도 쓰지도 않는다. 죽은 경로의 산출물을 되살리는 것은 D-010을 되돌리는 일이다.
  2. **화면이 읽는 것은 `processingStatus` 원값이 아니라 아래 파생 상태다.** `'pending'` 행이
     재생 가능한 legacy를 포함하므로 원값을 그대로 그리면 영원한 "처리 중"이 생긴다.

     | 파생 상태 | 판정 | 근거 |
     |---|---|---|
     | 연습 가능 | `animationDataUrl !== ''` | 완료 시에만 채워진다. legacy 행도 여기 들어온다 |
     | 처리 중 | `animationDataUrl === ''` && `processingStatus === 'processing'` | |
     | 오류 | `animationDataUrl === ''` && `processingStatus === 'failed'` | |
     | 알 수 없음 | 그 외 (`''` + `'pending'`) | 값을 지어내지 않는다. 사용자에게는 오류와 같은 복구 행동을 준다 |

  3. `/api/sheet`(목록)와 `/api/sheet/[id]`(상세)가 파생 상태를 반환한다. `processingStatus`
     원값과 `omrJobId`는 노출하지 않는다 — 원값을 내보내면 화면마다 다시 해석하게 되고,
     `omrJobId`는 목록 렌더마다 OMR 서비스를 찌르는 경로를 연다.
  4. **G1-2 — 4개 처리 단계는 업로드 화면에서만 표시한다.** 그 화면만 `jobId`를 갖고,
     서버는 단계를 저장하지 않는다. 매핑은 OMR 서비스가 실제로 보내는 `progress` 지점을 쓴다.

     | OMR `progress` | 화면 문구 |
     |---:|---|
     | 0 (queued) | 대기 중 |
     | 10 | PDF 분석 |
     | 30 | 음표 인식 |
     | 60 | 연주 데이터 생성 |
     | 100 | 학습 화면 준비 |

     **업로드 화면을 떠난 뒤에는 단계를 표시하지 않는다.** 내 악보에서는 파생 상태 3종만 쓴다.
     단계를 어디서나 보이게 하려면 서버가 단계를 저장해야 하고, 그것은 컬럼 추가이므로 별도 결정
     사안이다. 지금은 **모르는 것을 아는 것처럼 그리지 않는다**를 택한다.
  5. **G1-3 — 별도 알림 시스템을 만들지 않는다.** 완료는 (1) 업로드 화면에 머무는 동안의 인라인
     완료와 (2) 내 악보의 파생 상태 배지로 전달한다. `ProcessingNotification`은 `ProcessingJob`에
     FK로 묶여 있어 결정 1과 충돌하고, 브라우저 알림은 권한 요청 비용이 이득보다 크다.
  6. **G1-4 — `/processing` 화면과 Header의 `처리 상태` 메뉴를 제거한다.** 이슈 #76의 정보 구조
     원안(`내 악보`·`새 악보`·`탐색`)과 일치하고, 유지하려면 결정 1이 쓰지 않기로 한 테이블을
     되살려야 한다. 대체 도달 경로는 **내 악보의 파생 상태 배지**다. `/api/processing`,
     `/api/notifications`, `useBackgroundProcessing`, `ProcessingDashboard`의 제거 여부는 P2-A가
     정한다 — 이 결정은 사용자 도달 경로만 없앤다.
  7. **G1-5 — 사용자 대면 실패는 네 가지다.** DS-3이 이 분류대로 문구와 복구 행동을 만든다.

     | 유형 | 발생 지점 | 복구 행동 |
     |---|---|---|
     | 파일 거부 | 업로드 전 클라이언트 검증 (PDF 아님, `MAX_UPLOAD_BYTES` 초과, 암호화 PDF) | 파일을 고쳐 다시 선택 |
     | 변환 실패 | Audiveris가 악보를 읽지 못함 (이슈 #46 저해상도 포함) | 더 선명한 PDF로 재시도. **스택 트레이스를 보여주지 않는다** (이슈 #47) |
     | 작업 유실 | OMR 서비스 재시작으로 job이 사라짐 (`/status`가 404) | 다시 업로드. 이미 한국어 문구가 있다 |
     | 서비스 불가 | OMR 도달 불가 (503) | 잠시 후 재시도. **저장된 상태를 바꾸지 않는다** |

- Reason: 지금 진실을 아는 곳은 `SheetMusic` 한 곳뿐이고, 다른 후보는 의도적으로 무력화한 경로의
  잔해다. 두 출처를 유지하면 DS-3과 DS-4가 서로 다른 상태를 보여준다. 세부 단계를 화면마다
  보여주지 않기로 한 것은 정보를 아끼려는 게 아니라 **서버가 그걸 모르기 때문**이다.
- Rejected:
  - canonical 경로가 `ProcessingJob`도 쓰게 한다 | 진실의 출처가 둘이 되고, `fileName`·`fileSize`·
    `metadata`를 중복 저장한다. D-010이 죽인 경로의 테이블을 되살리는 방향이다.
  - 두 출처를 유지하고 읽기 전용 뷰를 만든다 | 동기화 실패 시 어느 쪽이 맞는지 판정할 수 없다.
  - `omrJobId`를 목록 API로 노출해 어디서나 단계를 폴링한다 | 목록 렌더마다 OMR 서비스를 찌르고,
    서비스가 내려가면 목록 전체가 503이 된다.
  - `processingStatus` 원값을 그대로 화면에 그린다 | legacy `'pending'` 행이 영원히 "처리 중"이 된다.
  - 4단계를 포기하고 처리 중/완료/실패만 쓴다 | 업로드 화면에서는 실제로 알 수 있는 정보를 버린다.
- Consequence:
  - 내 악보에서는 "처리 중"까지만 보이고 어느 단계인지는 보이지 않는다. 업로드 화면에 머무는
    사용자와 떠난 사용자가 다른 정밀도를 본다 — 이는 서버가 아는 것의 차이를 그대로 반영한 것이다.
  - `'pending'` + `animationDataUrl === ''` 행은 `알 수 없음`으로 분류된다. 운영 데이터에 이런 행이
    몇 건인지는 **확인하지 못했다** (이 저장소의 Supabase 프로젝트에 접근 권한이 없다).
    DS-4 착수 전에 실제 분포를 확인한다.
  - `/processing` 제거로 `useBackgroundProcessing`과 `ProcessingDashboard`가 호출자를 잃는다.
    삭제는 P2-A 소유다.
- Directive:
  - 화면에서 `processingStatus` 원값을 읽지 않는다. 파생 상태만 읽는다.
  - 업로드 화면 밖에서 처리 단계를 표시하지 않는다. 필요해지면 컬럼 추가를 별도 결정으로 다룬다.
  - `ProcessingJob`·`ProcessingNotification`에 새 writer를 추가하지 않는다.
  - OMR 서비스가 503일 때 저장된 상태를 실패로 바꾸지 않는다 (404만 유실로 처리한다).
- Related: 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76), D-010, D-018, D-024,
  이슈 [#46](https://github.com/landfill/ClairKeys/issues/46),
  이슈 [#47](https://github.com/landfill/ClairKeys/issues/47),
  `docs/recovery/phases/DS-G1-processing-state-contract.md`

## D-027: D-019 결정 8은 구조를 고정한 것이지 접근성 수정까지 막지 않는다

- Date: 2026-08-29
- Status: Accepted
- Narrows: **D-019 결정 8** ("공유 `PlaybackControls`는 수정하지 않는다")
- Context:
  - D-019 결정 8의 근거는 "`AnimationPlayer`와 demo 페이지가 현재 형태에 의존한다"였다. **그 demo
    페이지는 DS-1이 제거했다** (DS0-3). 남은 의존자는 `AnimationPlayer` 하나다.
  - DS-2가 이 컴포넌트를 홈의 로그인 전 체험에 올리면서 문제가 드러났다. 재생·일시정지·정지 버튼이
    이모지 `▶️`·`⏸️`·`⏹️`만 담고 있어 **접근 가능한 이름이 아예 없다.** 스크린리더에는 "버튼"으로만
    읽히고, 이제 그것이 서비스의 첫 화면에 있다.
  - DS-2의 완료 조건에는 "샘플 플레이어를 키보드만으로 재생·정지할 수 있고 상태가 스크린리더에
    전달된다"가 있다. 이름 없는 버튼으로는 충족할 수 없다.
- Decision:
  1. D-019 결정 8이 막는 것은 **형태·레이아웃·컨트롤 구성의 변경**이다. 렌더 결과의 구조를 바꾸지
     않는 접근성 속성 추가(`aria-label`, `aria-hidden`, `role`)는 여기 해당하지 않는다.
  2. DS-2는 세 전송 버튼에 `aria-label`을 붙이고 이모지를 `aria-hidden`으로 감춘다. 그 외에는
     아무것도 바꾸지 않는다.
  2-a. **(2026-08-29 추가)** 이미 마우스로 할 수 있는 조작에 **키보드 등가성을 주는 것**도 여기
     포함한다. seek 바가 `onClick`만 달린 `div`라 마우스로만 움직일 수 있었고(WCAG 2.1.1), 이미
     화면에 있던 재생 상태 문구에는 live region이 없었다. 요소를 새로 만들지 않고 `role`,
     `tabIndex`, `aria-*`, `onKeyDown`을 기존 요소에 더하는 선까지가 이 결정의 범위다. 렌더 구조와
     컨트롤 구성은 그대로다.

     axe가 이것을 잡지 못한 것이 이 조항이 필요한 이유다. 정적 검사로는 `div`에 핸들러가 붙었는지
     알 수 없어, 마우스 전용 인터랙션은 초록 CI를 통과한 채로 남는다.
  3. **이모지를 아이콘으로 교체하는 것과 구간 반복 추가는 여전히 DS-5 소유다.** 둘 다 형태를
     바꾸므로 이 결정이 허용하지 않는다. DS-5는 착수 시 D-019 결정 8을 다시 다뤄야 한다 (DS0-9).
- Reason: 접근 가능한 이름이 없는 버튼은 취향 문제가 아니라 WCAG 4.1.2 위반이고, 이슈 #76의 완료
  조건 7이 요구하는 AA에 직접 걸린다. D-019가 지키려던 것은 레이아웃 회귀이지 결함의 보존이 아니다.
- Rejected:
  - 홈 전용 축소 플레이어를 따로 만든다 | 방문자가 첫 화면에서 본 것과 로그인 뒤 만나는 것이 달라져
    전환이 깨진다. 그리고 같은 결함이 운영 플레이어에 그대로 남는다.
  - DS-5까지 미룬다 | 이름 없는 버튼이 그동안 서비스의 첫 화면에 놓인다.
- Consequence:
  - `AnimationPlayer`의 렌더 구조는 그대로다. 추가된 것은 속성뿐이다.
  - 이모지는 아직 남아 있다. 시각적으로는 DS-5가 정리한다.
- Directive:
  - `PlaybackControls`의 버튼 배치·개수·크기를 DS-5 이전에 바꾸지 않는다.
  - 접근성 속성을 이유로 컨트롤을 재구성하지 않는다. 속성만 더한다.
- Related: D-019, D-024, 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76), DS0-9

## D-028: 유실된 작업은 서버가 코드로 이름을 붙인다

- Date: 2026-08-29
- Status: Accepted
- Narrows: **DS-3의 Out of scope** ("OMR 서비스·백엔드 변경. 이 단계는 UI다")
- Context:
  - D-026 결정 7이 실패 4종에 **서로 다른 복구 행동**을 요구한다. 그중 두 가지는 사용자가 할 일이
    정반대다 — 작업 유실은 "같은 파일을 다시 올린다", 변환 실패는 "더 선명한 PDF로 다시 시도한다".
  - 그런데 `/api/omr/status/[jobId]`는 **두 경우 모두 200 + `status: 'failed'`로 답한다.** 404
    분기가 그렇게 만들어진 것은 의도적이다: 폴러가 non-ok 응답에서 던지고 일반 오류로 뭉개기
    때문에, 유실을 서비스가 보고한 실패와 같은 경로에 올린 것이다 (D-018 이후 정착된 동작).
  - 그 결과 화면이 두 실패를 가를 수 있는 신호는 **한국어 문장 하나**(`변환 작업을 찾을 수
    없습니다.`)뿐이었다.
- Decision:
  1. 404 분기의 응답에 `code: 'OMR_JOB_LOST'`를 더한다. HTTP 상태, 저장된 행, 나머지 필드는
     그대로다.
  2. 화면은 실패 종류를 **코드로만** 가른다. 서버가 보낸 문장은 분류에도, 표시에도 쓰지 않는다.
- Reason: 문장 매칭은 어느 쪽도 강제하지 않는 계약이다. 문구를 다듬는 순간 화면이 조용히 잘못된
  안내를 하고, 서버 테스트도 화면 테스트도 그것을 잡지 못한다. 같은 라우트 파일의 다른 실패
  분기와 `/api/omr/upload`의 모든 실패 분기는 이미 `code`로 자신을 밝히고 있다 — 새 개념이 아니라
  빠져 있던 한 곳을 맞추는 것이다. DS-3의 Out of scope가 막으려던 것은 변환 파이프라인과 저장
  동작의 변경이지, UI가 읽을 계약에 이름을 붙이는 일이 아니다.
- Rejected:
  - 한국어 문장으로 분기한다 | 문구 수정이 곧 조용한 회귀가 된다. 계약이 아니라 우연이다.
  - 두 실패를 하나로 합친다 | 사라진 작업에 "더 선명한 PDF"를 권하는 것은 도움이 되지 않는다.
  - 404를 그대로 non-ok로 내보낸다 | 폴러가 일반 오류 경로로 되돌아가고, 그것이 D-018 이후 이
    분기가 200으로 답하게 된 이유다.
- Consequence:
  - 응답에 필드 하나가 는다. 기존 소비자는 영향받지 않는다.
  - DS-4가 목록에서 같은 구분이 필요해지면 파생 상태(D-026 결정 2)로 답이 나온다 — 목록은 단계도
    실패 원인도 노출하지 않으므로 이 코드가 필요하지 않다.
- Directive:
  - 실패 분류를 서버 문장으로 하지 않는다.
  - 사용자 대면 실패를 새로 만들면 그 코드도 같은 자리에서 함께 정한다.
- Related: D-026, D-018, D-010,
  `docs/recovery/phases/DS-3-upload-processing.md`,
  이슈 [#46](https://github.com/landfill/ClairKeys/issues/46),
  이슈 [#47](https://github.com/landfill/ClairKeys/issues/47),
  이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)

## D-029: 내 악보 목록 변경에 별도 live announcement를 만들지 않는다

- Date: 2026-08-30
- Status: Accepted
- Narrows: `docs/recovery/phases/DS-4-my-library.md` 접근성·반응형 검증 항목
- Context:
  - DS-4 목록의 제목 편집·이동·삭제는 현재 시각적 결과와 앱 내 확인 다이얼로그를 통해 즉시 확인된다.
  - 별도 `aria-live` 영역은 화면에 보이지 않는 문장을 유지하고, 같은 변경을 반복적으로 읽어
    스크린리더 흐름을 방해할 수 있다.
  - 사용자는 2026-08-30에 이 화면의 별도 live announcement가 필요하지 않다고 명시했다.
- Decision:
  1. 내 악보 목록의 일반적인 제목 수정·카테고리 이동·삭제 후에는 별도 `aria-live` 메시지를 추가하지
     않는다.
  2. 오류는 기존의 `role="alert"`로 전달한다. 이는 실패를 인지하지 못하게 하는 것이 아니라, 성공한
     목록 변화를 별도 음성 이벤트로 중복하지 않는 선택이다.
  3. 장시간 비동기 처리 완료나 사용자 행동 없이 발생하는 중요한 상태 변화는 이 결정의 대상이 아니다.
     그런 경우에는 해당 화면·단계에서 별도의 접근성 결정을 한다.
- Reason: 이 화면에서 성공 변경은 사용자가 직접 시작하고 결과가 즉시 보인다. 그때마다 보이지 않는
  안내를 추가하는 이득보다 반복 알림의 비용이 크며, 사용자가 요구하지 않는 동작이다.
- Rejected:
  - 모든 목록 변경을 `aria-live="polite"`로 읽는다 | 직접 실행한 행동과 이미 보이는 결과를 중복해
    읽어 탐색 흐름을 방해한다.
  - 오류까지 live region에서 제외한다 | 실패 원인을 놓칠 수 있어 실제 접근성 후퇴다.
- Consequence:
  - DS-4의 `aria-live` 검증 항목을 제거한다.
  - 오류 안내의 `role="alert"`는 유지한다.
- Directive:
  - 이 결정을 장시간 백그라운드 처리나 자동 상태 변경의 live announcement 생략 근거로 넓히지 않는다.
- Related: D-026, DS-4, 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)

## D-030: 이슈 #76에서 WCAG AA 요건을 제거한다

- Date: 2026-08-30
- Status: Accepted
- Replaces: `docs/recovery/ROADMAP.md` 이슈 #76 완료 조건 7과 "조건 7의 판정 기준" 절
- Narrows: DS-1·DS-2·DS-3·DS-4·DS-5·DS-6·DS-7의 "접근성·반응형 검증" 절
- Context:
  - 완료 조건 7은 전 화면 WCAG AA 위반 0건을 자동(axe)과 수동(키보드 순회·포커스 가시성·200%
    확대·명도 대비) 양쪽에서 요구했고, DS-1이 기반을, DS-7이 종단을 판정하는 유일한 2단계
    소유 조건이었다.
  - 자동 검사는 `pr-checks.yml`의 `accessibility-check` job이 홈 한 화면에만 `@axe-core/cli`를
    실행했다. `/upload`·`/library`·`/sheet/[id]`는 인증 뒤라 검사 범위 밖이었고, 수동 검사는
    DS-0부터 한 번도 실행된 적이 없다.
  - 사용자는 2026-08-30에 WCAG 요건을 문서·CI·구현 계약 전 층에서 제거하도록 명시했다.
    선택 시점에 스크린리더·키보드 사용자에게 실제 기능 저하가 발생한다는 점을 함께 확인했다.
- Decision:
  1. 이슈 #76의 완료 조건에서 WCAG AA 항목을 제거한다. 완료 조건은 8개에서 7개가 되고,
     기존 조건 8(종단 완주)이 조건 7이 된다.
  2. 각 phase 문서에서 접근성 요건을 제거한다. "접근성·반응형 검증" 절은 반응형 항목만 남겨
     "반응형 검증"이 되고, `In scope`·`Completion criteria`·`검증 명령`에 흩어져 있던 같은
     요건(DS-5의 색상 외 구분, DS-7의 axe 실행과 키보드·200% 확대·색상 외 수동 검사)도 함께
     지운다. 요건이 한 절에만 있지 않았다 — 절 하나만 지우면 문서가 스스로 모순된다.
  3. `accessibility-check` CI job과 그 job을 고정하던 `prChecksWorkflow.test.ts`의 검사 3건을
     제거한다. 둘은 한 묶음이다 — job만 지우면 워크플로 YAML을 문자열로 파싱하는 그 테스트가
     `undefined`로 터진다.
  4. `PlaybackControls`의 슬라이더 ARIA 시맨틱·버튼 `aria-label`·재생 상태 live region,
     `icons.tsx`의 `role`/`aria-hidden`, `OptimizedImage`의 로딩 `aria-label`을 제거하고
     `playbackControlsA11y.test.tsx`와 `globalStyles.test.ts`의 포커스 계약 가드를 삭제한다.
- Reason: 사용자의 제품 결정이다. 유지 근거가 아니라 지시가 판단의 출처이므로, 코드보다 결정과
  계획 문서를 먼저 고쳐 다음 세션이 "문서와 코드 중 뭐가 맞나"를 묻지 않게 한다.
- Rejected:
  - 계획 문서에서만 제거하고 CI axe와 구현 계약은 유지한다 | 요건 없이 게이트만 남아 무엇을
    근거로 통과·실패를 판정하는지가 사라진다. 사용자가 전 층 제거를 선택했다.
  - `PlaybackControls`의 `tabIndex`·`onKeyDown`까지 제거한다 | 그것은 요건이 아니라 동작하는
    기능이다. 요건 제거가 기능 삭제를 뜻하지 않는다.
  - D-027·D-029를 함께 폐기한다 | 두 결정은 각각 DS-1 구조 고정과 DS-4 live announcement 범위를
    다루며, 그 결론은 이 결정과 독립적으로 유효하다.
- Consequence:
  - DS-7은 종단 접근성 판정을 잃고 상태 통일과 종단 완주만 판정한다. 이월 항목 DS4-2(`/library`
    반응형 근거 부재)의 담당이 사라지므로 반응형 항목으로만 남는다.
  - PR마다 돌던 홈 axe 검사가 사라진다. `main` branch protection의 required check는
    Lint·Security Audit·Run Tests·E2E Tests 4개이고 "Accessibility Check"는 포함되지 않았으므로,
    PR 머지가 막히지는 않는다.
  - 재생 컨트롤이 스크린리더에 이름·값·상태를 알리지 않는다. 키보드 조작 자체는 유지된다.
  - `e2e/application-smoke.spec.ts`의 "로그인 없이 샘플 재생" 검사가 재생 버튼을
    `getByRole('button', { name: /재생|play/i })`로 찾고 있었다. 그 이름의 유일한 출처가
    제거한 `aria-label`이라 검사가 5개 브라우저에서 전부 실패했다. 이 검사는 **완료 조건 3**을
    지키는 것이고 WCAG 요건이 아니므로, ARIA를 되살리지 않고 `data-testid`로 잡는다.
- Directive:
  - 이 결정을 "접근성 개선을 금지한다"로 읽지 않는다. 요건과 게이트를 제거한 것이고, 개별 개선은
    여전히 각 단계의 판단이다.
  - **자동 리뷰 도구는 이 변경을 결함으로 신고한다.** PR #95에서 CodeRabbit이
    `PlaybackControls`의 `role="slider"`·`aria-value*`·버튼 이름·`role="status"`를 전부
    복원하라고 Major로 지적했다. 도구는 diff의 기술적 타당성만 보고 결정 맥락을 보지 못한다 —
    이 저하는 사용자가 명시적으로 선택한 결과이므로 기각한다. 같은 지적이 다시 오면 이 항목을
    근거로 기각하고, 결정을 바꾸려면 사용자에게 물어 D-030을 대체하는 새 결정을 기록한다.
  - 접근성 속성을 테스트 선택자로 쓰면 요건을 제거할 때 무관한 검사가 함께 죽는다. 남은 예로
    스모크의 `[aria-label$="octave marker"]`(낙하 노트 건반)가 있다 — 이 결정은 그것을 건드리지
    않았지만, 다음에 건반 ARIA를 손대면 완료 조건 1 검사가 같은 방식으로 무너진다.
  - `e2e/application-smoke.spec.ts`의 확대 허용 검사와 DS-0의 회귀 계약은 이 결정의 대상이 아니다.
    DS-0 "접근성·회귀 테스트" 절은 기하·전환 계약을 함께 고정하므로 유지한다.
- Related: D-024, D-027, D-029, DS-1, DS-7, 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)

## D-031: 홈은 재생기를 걷어내고 자리만 잡는다

- Date: 2026-08-30
- Status: Accepted
- Replaces: 이슈 #76 완료 조건 1의 ① (`실제 낙하 노트 결과` → `결과가 들어갈 영역의 확보`)
- Narrows: 완료 조건 3의 판정 단계에서 DS-2를 제외한다
- Supersedes: **D-019 결정 8** ("공유 `PlaybackControls`는 수정하지 않는다") — 근거가 소멸한다
- Context:
  - 홈은 `HomeSamplePlayer` → `FallingNotesPlayer` → `PlaybackControls`로 실제 재생기를 올린다.
    로그인 전 방문자에게 결과를 보여주려는 것이었다.
  - 사용자는 2026-08-30에 홈 샘플을 **정적 예시(GIF 등)로 바꾸기로** 했고, 그 전 단계로 **재생기를
    걷어내고 영역만 확보**하도록 지시했다. 작업은 DS-5에서 함께 처리한다.
  - **`PlaybackControls`의 실사용처는 둘뿐이다.** `AnimationPlayer`(악보 상세)와
    `FallingNotesPlayer`(홈). `AdvancedPlaybackControls`는 배럴과 `LazyComponent`가 export만 할 뿐
    렌더하는 화면이 0곳인 죽은 코드다. D-019 결정 8의 원래 근거였던 demo 페이지는 DS-1이 이미
    제거했다(D-027).
  - 따라서 홈이 빠지면 `PlaybackControls`는 **공유 컴포넌트가 아니게 된다.**
- Decision:
  1. DS-5는 홈에서 재생기를 제거하고 그 자리에 **낙하 노트 결과가 들어갈 영역만 확보**한다.
     정적 예시(GIF 등)를 채우는 것은 이 결정의 범위가 아니며 후속 작업이다.
  2. 완료 조건 1의 ①을 `실제 낙하 노트 결과`에서 **`낙하 노트 결과가 들어갈 영역이 첫 화면에
     확보됨`**으로 바꾼다. 이슈 #76 종료가 정적 예시 도입을 기다리지 않는다.
  3. 완료 조건 3(로그인 없이 실제 학습 결과 재생)의 판정 단계에서 **DS-2를 뺀다.** DS-6의 공개
     악보가 단독으로 판정한다.
  4. 홈이 빠지면 D-019 결정 8은 지킬 대상이 없다. DS-5는 `PlaybackControls`에 구간 반복(DS0-9)을
     **props 플래그나 별도 컴포넌트 없이 직접** 추가하고 이모지를 아이콘으로 교체한다.
- Reason: 홈에서 재생기가 하던 일은 "결과를 보여주는 것"이고, 그것은 정적 예시로 더 싸고 안정적으로
  된다. 재생기를 유지하는 대가는 크다 — 홈 첫 화면 높이 예산, 공유 컴포넌트 제약(D-019 결정 8),
  샘플 전용 결함(C5), 그리고 재생 경로 전체가 로그인 전 공개 표면에 노출되는 것이다.
- Rejected:
  - 홈 재생기를 유지한 채 구간 반복만 조건부로 숨긴다 | `showLoop` 같은 플래그가 쌓이면 컴포넌트가
    분기 덩어리가 된다. 홈이 곧 빠지는데 그 대가를 치를 이유가 없다.
  - DS-5 전에 정적 예시부터 넣는다 | 예시 제작은 별개 작업이고, 그것을 기다리면 DS-5가 D-019
    결정 8에 계속 묶인다.
  - 완료 조건 1의 ①을 아예 삭제한다 | 이슈 #76의 원래 문제의식이 "결과를 보여주지 않는 홈"이다.
    자리조차 없으면 그 문제로 되돌아간다.
- Consequence:
  - **깨지는 검사** — DS-5가 함께 처리한다.
    - `e2e/application-smoke.spec.ts`의 `lets a signed-out visitor play the sample without
      logging in` (완료 조건 3). 누를 재생 버튼이 사라진다. 조건 3이 DS-6 단독 판정이 되므로
      이 검사는 DS-6의 공개 악보 경로로 옮기거나 DS-6이 도입할 때까지 제거한다.
    - 같은 파일 첫 화면 검사의 `낙하 노트 건반`(`[aria-label$="octave marker"]`). 확보된 영역을
      재는 검사로 바꾼다.
    - `src/app/__tests__/page.test.tsx`의 `샘플: {제목} · {작곡가}` 표시 검사.
  - **자동으로 소멸하는 이월 항목** — C5(`HOME_SAMPLE_ANIMATION.tempoSource: 'user'`가 "직접
    입력"으로 표시돼 방문자가 입력한 것처럼 읽힘). 그 표시는 재생기 안 `TempoDisplay`다.
  - `HOME_SAMPLE_ANIMATION` fixture는 소비자를 잃는다. 정적 예시를 만들 소스로 쓸 수 있으므로
    DS-5는 삭제하지 않고 남긴다.
  - DS-2는 `DONE`을 유지한다. 그 단계는 당시 계획대로 샘플 체험을 만들었고, 이 결정은 그것을
    되돌리는 것이 아니라 다음 단계에서 대체하는 것이다.
- Directive:
  - 영역만 확보하는 것과 정적 예시를 넣는 것을 한 PR에 묶지 않는다. 전자는 DS-5, 후자는 후속이다.
  - `AdvancedPlaybackControls`와 `LazyAdvancedPlaybackControls`는 죽은 코드다. 이 결정의 근거로
    쓰이지만 제거 자체는 DS-5 범위가 아니다 — 별도 정리 대상으로 이월한다.
  - 홈에서 재생기를 뺀다고 재생 코드를 지우지 않는다. 악보 상세가 같은 경로를 쓴다.
- Related: D-019 결정 8, D-027, D-030, DS-2, DS-5, DS-6, DS0-9,
  이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)

## D-032: 업로드 한도를 플랫폼이 실제로 받는 크기에 맞춘다

- Date: 2026-08-30
- Status: Accepted
- Resolves: 이월 항목 **DS3-1**
- Narrows: D-026 결정 7의 "파일 거부" 행 — 숫자 대신 `MAX_UPLOAD_BYTES`를 가리키게 했다
- Context:
  - 화면과 서버가 모두 50MB를 한도로 말했지만, 이 앱은 Vercel Function 위에서 돈다. Vercel의
    요청 본문 한도는 **4.5MB**이고, 그보다 큰 본문은 **라우트 코드가 실행되기도 전에** 플랫폼이
    413으로 끊는다.
  - 그래서 5MB PDF는 화면의 모든 검사(PDF 헤더, 암호 여부, 크기)를 통과한 뒤 413으로 거부됐다.
    그 413은 `uploadFailures.ts`에서 분류되지 않아 `describeServiceUnavailable()`로 떨어지고,
    사용자는 **"잠시 후 다시 시도"**를 안내받는다. 몇 번을 다시 시도해도 성공할 수 없다.
  - 한도가 네 곳에 각자 적혀 있었다 — `MAX_UPLOAD_BYTES`, `/api/omr/upload` 라우트의 하드코딩,
    홈의 사실 목록, 업로드 폼의 드롭존 문구. 오류 문구 두 개까지 합치면 여섯 곳이다.
  - 사용자는 2026-08-30에 한도를 **4.5MB로** 정했고, 이 변경은 PR을 만들지 말라고 지시했다.
- Decision:
  1. `MAX_UPLOAD_BYTES`를 `4.5 * 1024 * 1024`로 낮춘다. 표시용 `MAX_UPLOAD_MB`를 같은 파일에서
     파생시키고, 화면 문구·서버 응답·테스트가 전부 이 상수를 쓴다. 숫자를 다시 적는 곳을 남기지
     않는다.
  2. `/api/omr/upload`의 하드코딩된 `50 * 1024 * 1024` 검사를 상수 참조로 바꾼다. 두 곳이 같은
     값을 따로 적고 있던 것이 한도가 어긋난 채 남아 있던 이유다.
  3. Supabase 버킷의 `fileSizeLimit`(`fileStorageService.ts`)은 바꾸지 않는다. 그것은 저장소
     용량 제한이고 요청 본문 한도와 다른 관심사다.
- Reason: 화면이 통과시킨 파일을 서버가 받지 못하는 구간이 있으면 그 구간의 사용자는 무엇을 해도
  성공할 수 없다. 한도를 플랫폼이 실제로 받는 크기로 낮추는 것이 그 구간을 없애는 가장 단순한
  방법이고, 업로드 경로를 바꾸는 것(직접 업로드, 서명 URL)보다 훨씬 싸다.
- Rejected:
  - 한도는 50MB로 두고 413만 올바르게 분류한다 | 문구는 정확해지지만 5MB 파일을 올릴 수 없는
    사실은 그대로다. 사용자에게 "올릴 수 있다"고 말한 뒤 거절하는 구조가 남는다.
  - Vercel을 우회하는 업로드 경로로 바꾼다(서명 URL로 Supabase 직접 업로드) | 한도를 되찾는
    올바른 방향이지만 업로드·콜백·정리 경로 전체를 다시 설계해야 한다. 지금 필요한 것은 거짓말을
    멈추는 것이다.
- Consequence:
  - **4.5MB 정각 파일은 여전히 413이 될 수 있다.** 폼은 파일 외에 `title`·`composer`·`tempo`·
    `categoryId`·`isPublic` 다섯 필드를 함께 multipart로 보내고, 경계 문자열과 파트 헤더가
    본문에 더해진다. 한도를 4.5MB에 **정확히** 맞췄으므로 오버헤드만큼의 여유가 없다.
    실무상 4.5MB에 근접한 PDF는 드물지만, 이 구간이 남아 있다는 사실은 기록해 둔다.
  - 413이 `describeServiceUnavailable()`로 떨어져 "잠시 후 재시도"를 권하는 문제는 **그대로다.**
    한도를 낮춰 도달 빈도를 크게 줄였을 뿐 경로를 고치지는 않았다. 위 경계 구간에서는 여전히
    성공할 수 없는 재시도를 안내한다.
  - 기존에 50MB를 전제로 올라간 악보는 영향받지 않는다. 이 한도는 새 업로드에만 걸린다.
- Directive:
  - 한도를 다시 바꿀 때 숫자를 새 파일에 적지 않는다. `MAX_UPLOAD_BYTES` 한 곳만 고치면 화면·
    서버·테스트가 따라온다.
  - 남은 413 경계 구간을 없애려면 한도에 여유를 두거나(예: 4MB) `uploadFailures.ts`에
    `status === 413` 분기를 추가한다. 둘 다 이 결정의 범위가 아니다.
- Related: D-026 결정 7, DS-3, 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76),
  `src/lib/upload/pdfInspection.ts`

## D-033: 업로드 한도에 여유를 둔다 — 서버가 받는 것은 파일이 아니라 본문이다

- Date: 2026-08-30
- Status: Accepted
- Narrows: **D-032 결정 1** (`MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024` → `4 * 1024 * 1024`)
- Resolves: 이월 항목 **DS3-2**
- Context:
  - D-032는 한도를 플랫폼 한도인 4.5MB에 **정각으로** 맞췄고, 그 Consequence에 "4.5MB 정각
    파일은 여전히 413이 될 수 있다"를 남겼다. 사용자가 여유를 두도록 지시했다.
  - 여유가 필요한 이유를 재보니 **두 가지이고 크기가 다르다.**

    | 원인 | 크기 |
    |---|---|
    | `4.5MB`의 MB 해석 (십진 4,500,000 vs 이진 4,718,592) | **218,592 bytes** |
    | multipart 오버헤드 (경계 문자열 + 파트 헤더 6개) | 약 2,100 bytes |

  - 즉 실제 위험은 오버헤드가 아니라 **해석 차이**다. 100배 크고, 어느 해석이 맞는지는 앱이
    정할 수 없다. 플랫폼 문서의 `4.5MB`가 십진이라면 D-032의 이진 4,718,592는 이미 한도를
    218KB 넘긴 값이었다.
  - 폼 필드에 `maxLength`가 없어 `title`·`composer`는 길이 상한이 없다. 실무상 문제되지 않지만
    오버헤드의 상한도 형식적으로는 열려 있다.
- Decision:
  1. `MAX_UPLOAD_BYTES`를 `4 * 1024 * 1024`(4,194,304)로 낮춘다. 십진 해석 기준으로도 약 300KB가
     남아 두 해석 모두에서 안전하다.
  2. 표시 문구는 `MAX_UPLOAD_MB`에서 그대로 나온다 — 값이 정수 4라 "최대 4MB"로 읽힌다.
     문구·서버 검사·테스트를 따로 고치지 않는다.
- Reason: 경계에 정각으로 맞추면 경계의 정의가 흔들릴 때 그대로 무너진다. 여기서 흔들리는 것은
  우리가 통제할 수 없는 것(플랫폼 문서의 단위 해석)이므로, 여유는 방어가 아니라 전제다.
- Rejected:
  - 4.4MB로 최소한만 줄인다 | `4.4 * 1024 * 1024 = 4,613,734`로 십진 4,500,000을 여전히 넘는다.
    MB 해석 위험이 그대로 남는다.
  - 오버헤드만큼(약 2KB)만 뺀다 | 실제 위험의 1%만 다룬다. 해석 차이를 놓친다.
  - 플랫폼 문서의 단위를 확인해 정확히 맞춘다 | 확인해도 플랫폼이 바꿀 수 있다. 300KB는 그
    불확실성의 값으로 싸다.
- Consequence:
  - **테스트를 한 줄도 고치지 않았다.** D-032가 화면 문구·서버 검사·테스트를 전부
    `MAX_UPLOAD_BYTES`에서 파생시켜 둔 덕분에 상수 한 줄로 값이 전파됐다. 단일 출처 정리가
    실제로 작동함을 이 변경이 확인해 준다.
  - 사용자가 올릴 수 있는 크기가 4.5MB에서 4MB로 줄었다. 악보 PDF는 대체로 훨씬 작다.
  - `uploadFailures.ts`에 `status === 413` 분기가 없는 것은 **그대로다.** 다만 여유를 둔 뒤로는
    크기 때문에 413에 도달하는 경로가 사실상 없어졌고, 남는 413은 예외적 상황이다. 견고성
    관점의 잔여 항목으로만 남긴다.
- Directive:
  - 한도를 다시 올릴 때 플랫폼 한도에 정각으로 맞추지 않는다. 서버가 받는 것은 파일이 아니라
    본문이고, 본문에는 우리가 세지 않은 것이 들어 있다.
  - `title`·`composer`에 `maxLength`가 없다. 한도를 다시 좁힐 일이 생기면 이것부터 확인한다.
- Related: D-032, D-026 결정 7, DS-3, `src/lib/upload/pdfInspection.ts`

## D-034: CI 공개 체험은 라우트 fixture로 고정한다

- Date: 2026-08-30
- Status: Accepted
- Applies to: DS-6 공개 악보 탐색·상세·미리보기 회귀 검증
- Context:
  - CI E2E job은 Prisma 스키마만 만들고 seed하지 않아 공개 악보가 없으며, 해당 job에는 Supabase 환경 변수도 없다.
    따라서 실제 DB 행과 저장소 URL에 의존한 E2E는 CI에서 재현되지 않는다.
  - DS-6은 이슈 #76 완료 조건 3의 단독 판정자지만, 실제 배포본에서의 익명 재생은 시크릿 창 수동 확인으로 판정한다.
- Decision:
  1. CI E2E는 Playwright route fixture로 검증된 공개 곡의 목록·상세 응답과 canonical animation JSON을 주입한다.
  2. 공개 상세 화면이 `/api/files/animation`을 호출하지 않고 상세 응답의 `animationDataUrl`을 사용하는지 fixture로 고정한다.
  3. 공개/비공개 권한과 demo provenance 제외는 기존 API route 테스트로 고정하고, 실제 공개 배포본 재생은 수동 확인 항목으로 남긴다.
- Reason: 외부 DB·스토리지 의존을 제거하면서도 탐색에서 상세와 실제 플레이어 mount까지의 사용자 경로를 CI에서 재현할 수 있다.
- Rejected:
  - CI에 seed와 Supabase를 추가한다 | 테스트가 외부 저장소 자격 증명과 데이터 수명주기에 결합되어 PR마다 불안정하다.
  - 통합/유닛 테스트만 사용한다 | 브라우저의 탐색→상세→플레이어 연결과 로그인 복귀 링크를 검증하지 못한다.
  - 검사를 생략하고 수동 확인만 기록한다 | 완료 조건 3의 회귀 근거가 약해지고 공개 경로 변경을 자동으로 감지하지 못한다.
- Constraint: fixture 성공은 배포 데이터·스토리지 설정의 유효성을 증명하지 않으며, 시크릿 창 수동 확인이 필요하다.
- Confidence: high
- Scope-risk: moderate
- Reversibility: clean
- Directive: `src/app/api/files/animation/route.ts` 인증 분기와 플레이어 내부 구현은 이 전략을 위해 변경하지 않는다.
- Tested: Decision recorded before implementation; fixture and route test results to be added with DS-6 implementation.
- Not-tested: CI's real database and Supabase storage contents.
- Related: DS-6, D-030, D-031, 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)

## D-035: 공개 악보 카드의 재생 시간 요건을 제외하고 보안 열거 문제는 별도 작업으로 이월한다

- Date: 2026-08-30
- Status: Accepted
- Applies to: DS-6 공개 악보 탐색·상세·미리보기 완료 조건
- Context:
  - `PublicSheetMusicBrowser` 카드와 `/api/sheet/public` 응답에는 곡명·작곡가·소유자·생성일·카테고리만 있고 재생 시간이 없다.
  - `SheetMusic` 모델에도 재생 시간 컬럼이 없으며, 값은 Supabase Storage의 애니메이션 JSON 안에만 있다. 목록 카드마다 JSON을 가져오는 것은 목록 성능과 저장소 결합을 악화시킨다.
  - `/api/sheet/[id]`는 존재 여부에 따라 익명 요청에 404 또는 403을 반환한다. 이 구분은 DS-6 UI 이전부터 존재했으며 DS-6이 열거 동작을 도입한 것은 아니다.
- Decision:
  1. DS-6 완료 조건과 반복된 로드맵·phase 표현에서 카드 재생 시간 요구를 제거하고 곡명·작곡가 중심으로 판정한다.
  2. `/api/sheet/[id]`의 403/404 열거 가능성은 DS-6에서 수정하지 않고 별도 보안 작업 후보로 이월한다. DS0-1(비공개 악보 public 버킷 노출)과 같은 범위 밖 보안 바구니에서 다룬다.
- Reason: 현재 데이터 모델에 카드용 재생 시간 값이 없으므로 DS-6에서 이를 완료 조건으로 유지하면 구현이 데이터 결정 없이 불가능하다. API 동작을 바꾸면 기존 소유자 흐름과 테스트에 영향을 주므로, 원인과 범위를 분리해 기록하는 것이 안전하다.
- Rejected:
  - `SheetMusic`에 duration 컬럼을 추가한다 | 스키마 비정규화와 생성·갱신 계약이 필요한 별도 데이터 결정이며 DS-6 범위를 넓힌다.
  - 목록 카드마다 애니메이션 JSON을 fetch해 duration을 표시한다 | 목록이 곡별 저장소 요청과 큰 JSON 전송에 결합되고 성능·실패 표면이 커진다.
  - `/api/sheet/[id]`의 403/404 동작을 DS-6에서 통합한다 | DS-6 이전부터 존재한 보안 문제이며 API 계약 변경이 기존 소유자 흐름과 테스트에 영향을 준다.
- Consequence: 사용자는 공개 목록 카드에서 곡 길이를 비교할 수 없다. 후속 작업 후보로 duration의 정규화·조회 계약과 리소스 열거 방어를 남긴다.
- Constraint: DS-6은 기존 `SheetMusic` 모델과 `/api/sheet/[id]` 인증 동작을 변경하지 않는다.
- Confidence: high
- Scope-risk: narrow
- Reversibility: clean
- Directive: 후속 duration 작업은 저장 시점·갱신 시점·목록 조회 비용을 함께 결정한 뒤 구현한다. 보안 작업은 DS0-1과 함께 API 응답·저장소 공개 범위를 별도로 재검토한다.
- Tested: 코드·스키마·목록 응답 대조; DS-6 E2E fixture가 카드·상세·미리보기를 검증하도록 갱신됨.
- Not-tested: duration 정규화 구현과 실제 배포본의 열거 방어; CI의 headless Web Audio 생성·resume은 5개 프로젝트에서 재생 상태를 증명하지 못하므로 실제 오디오 재생은 수동 확인으로 남긴다.
- Related: DS-6, DS0-1, D-030, D-034, 이슈 [#76](https://github.com/landfill/ClairKeys/issues/76)

## D-036: 콜백 주소는 설정에서만 오고, 미설정은 잘못된 설정과 같게 거부한다

- Date: 2026-09-02
- Status: Accepted — D-018 Decision 1의 fallback 절을 개정한다
- Applies to: `src/app/api/omr/upload/route.ts`의 `callback_url` 구성
- Context:
  - D-018 Decision 1은 콜백 URL을 "`NEXTAUTH_URL`을 우선하고 없으면 현재 요청 origin"으로 정했다.
    `request.nextUrl.origin`은 프록시가 전달한 Host 헤더에서 유도된다.
  - OMR 서비스는 이 주소를 검증 없이 받아 `X-ClairKeys-Token`에 공유 비밀을 실어 POST한다
    (`omr-service/app.py` `notify_completion`). 즉 이 fallback이 고르는 것은 **비밀이 전송될 주소**다.
  - PR #68은 "callback authentication fails closed"를 원칙으로 세웠고 실제로 비밀 미설정은 503, 불일치는
    401, 잘못된 URL은 503으로 닫힌다. 미설정 `NEXTAUTH_URL`만 조용히 추측하는 반대 방향이었다 (PR #68
    리뷰 R10, 이슈 #71).
  - 지금 열린 구멍은 아니다. `NEXTAUTH_URL`은 필수로 문서화돼 있고, 2026-09-02 `vercel env ls`로
    **Production·Preview 양쪽에 설정돼 있음을 이름 기준으로 확인**했다(389일 전 등록). 2026-08-28 종단 확인의
    콜백 주소 `https://clairkeys.vercel.app/api/omr/finalize`는 fallback이었어도 같은 값이 나오므로 그것만으로는
    설정 여부를 증명하지 못한다 — 독립 리뷰가 지적한 대로다. `/process`는 공유 비밀 뒤에 있다. 설정 실수
    증폭기이지 독립 취약점이 아니다.
  - 업로드 라우트 테스트 11건 전부가 `NEXTAUTH_URL` 없이 통과하고 있었다 — 스위트가 줄곧 fallback 경로를
    검증해 온 셈이다.
- Decision:
  1. 콜백 base URL은 `NEXTAUTH_URL`에서만 읽는다. 요청 origin으로 대체하지 않는다.
  2. 미설정·공백은 잘못된 절대 URL과 같은 분기 — 503 `OMR_CALLBACK_NOT_CONFIGURED`, 행 생성 전 — 로
     보낸다. 행 생성 전 검증이라는 D-018 Directive의 순서는 그대로다.
  3. 업로드 라우트 테스트 fixture는 `NEXTAUTH_URL`을 명시한다. 설정 없는 성공 경로는 더 이상 존재하지 않는다.
  4. 검증 규칙은 `src/lib/omr/serviceUrl.ts`의 `getOmrCallbackUrl()` 한 곳에 둔다. `getOmrServiceUrl()`과 같은
     파서를 공유하므로 trim·절대 URL·http(s) 스킴·값 비노출 규칙이 두 변수 사이에서 어긋날 수 없다. 처음 PR
     본문에 있던 인라인 구현은 스킴을 검사하지 않았고 `ERR_INVALID_URL`을 통째로 로그해 raw 값을 노출했다 —
     독립 리뷰가 잡았다.
- Reason: 실패 경로가 모두 닫히는데 한 곳만 열려 있으면 그 한 곳이 설정 실수의 출구가 된다. 비밀이 갈
  주소를 외부가 모양 지을 수 있는 헤더에서 유도할 이유는 없고, 운영은 이미 설정값에 의존하고 있다.
- Rejected:
  - `omr-service` `notify_completion`에서 콜백 호스트·스킴을 환경변수로 고정해 검증 (이슈 #71 선택 항목 2) |
    이중 방어로 유효하나 `omr-service/` 변경은 이미지 재빌드·VM 배포 없이 완료를 주장할 수 없다. 이 결정의
    범위 밖으로 남기며, 이슈 #71을 닫을 때 후속으로 분리한다.
  - 미설정 시 경고 로그만 남기고 origin을 계속 사용 | fails-closed 원칙과 정반대이며 이슈가 지적한 상태 그대로다.
- Consequence:
  - `NEXTAUTH_URL` 없는 배포(로컬 개발 포함)에서는 업로드가 503으로 거부된다. 문서상 필수 변수이므로 새 요구가
    아니라 기존 요구의 집행이다.
  - Vercel Preview는 영향이 없다 — 2026-09-02 확인에서 Preview에도 `NEXTAUTH_URL`이 설정돼 있어 이 결정
    전에도 fallback을 타지 않았다. `docs/vm-replacement.md`의 "Production 필수값" 표는 Preview에 없다는 뜻이 아니다.
  - `request.nextUrl`은 이 라우트에서 더 이상 읽지 않는다.
  - `NEXTAUTH_URL`에 path 접두가 있으면(`https://host/app`) `/api/omr/finalize`가 그것을 덮어쓴다. 이 저장소는
    basePath를 쓰지 않으므로 현재 영향은 없고, 이 결정 전에도 같았다.
- Constraint: D-018의 나머지 결정(callback 인증, DB에서 읽은 `omrJobId`를 fetch target으로, 행 생성 전 검증)은
  바뀌지 않는다.
- Confidence: high
- Scope-risk: narrow
- Reversibility: clean
- Directive: 콜백 주소나 그 밖에 공유 비밀이 향하는 주소를 요청 헤더에서 유도하지 않는다. 설정이 없으면 거부한다.
- Tested: `npx jest src/app/api/omr/upload` — 회귀 2건(unset, blank)이 수정 전 `OMR_SERVICE_UNAVAILABLE`로 실패하고
  수정 후 통과; 리뷰 후 스킴·자격증명 유출 회귀 2건이 인라인 구현에서 실패하고 헬퍼로 통과. `npx jest src/lib/omr`
  `getOmrCallbackUrl` 11건. `vercel env ls production|preview`에 `NEXTAUTH_URL` 존재.
- Not-tested: 운영 배포에서의 동작 변화 — 설정돼 있으므로 관측 가능한 차이가 없어야 한다. `vercel env ls`는 이름만
  보여주므로 값이 `https://clairkeys.vercel.app`인지는 확인하지 않았다(값을 내려받지 않기로 했다).
- Related: D-018, 이슈 [#71](https://github.com/landfill/ClairKeys/issues/71), PR #68 리뷰 R10

## D-037: 검은건반 기하는 표준 치수에서 유도하고, 유도 공식을 코드에 남긴다

- Date: 2026-09-02
- Status: Accepted
- Fulfills: 이슈 [#58](https://github.com/landfill/ClairKeys/issues/58) 할 일 1 (기준 결정)
- Context:
  - 이슈 [#56](https://github.com/landfill/ClairKeys/issues/56)을 PR #57이 고칠 때, spec에는 "표의 값 자체는
    실제 피아노의 비대칭 배치를 올바르게 반영하므로 버리지 말 것"이라고 적혀 있었다. **이 주장이 틀렸다는 것이
    #56 검증 과정에서 드러났고, 이슈 #58이 그 사실만 분리해 기록했다.**
  - `pianoLayout.ts`의 오프셋 `{C# 0.65, D# 0.6, F# 0.65, G# 0.6, A# 0.6}`은 다섯 개 전부에 −0.05~−0.10칸의
    **균일한 좌측 편향**을 준다. 실제 피아노는 2건반 그룹과 3건반 그룹이 각각 바깥으로 벌어지는 대칭 패턴이므로
    **D#·A#는 방향이 반대**이고 G#는 경계에 정확히 놓여야 한다. 흑건 폭도 0.6이 아니라 0.583이다.
  - 2026-09-02 이 결정을 위해 표준 치수(백건 23.5mm, 흑건 13.7mm)로 독립 재계산해 이슈의 표를 재현했다.
    G#의 편차가 정확히 0이 나오는 것이 이 모델이 자기정합적이라는 근거다 — 3흑건 그룹의 대칭축이기 때문이다.
  - 기존 테스트 `pianoLayout.test.ts`의 유일한 흑건 위치 검사는 `|중심 − 경계| ≤ 0.35 * keyWidth`라는
    **절대값 상한**이었다. 부호를 보지 않으므로 방향이 반대인 값도 통과한다.
  - 이슈 본문은 `PianoKeyboard.tsx`를 "모바일 전체화면·가로모드·데모가 사용"한다고 적었으나, **현재
    코드베이스에서 그 컴포넌트는 라우트에서 도달할 수 없다.** 유일한 소비자인 `FullScreenPiano.tsx`와
    `LandscapePianoInterface.tsx`를 import하는 파일이 0개다(README 재작성이 확인한 `src/components/mobile/*`
    미도달과 같은 사실). 실제 재생 경로는 `FallingNotesPlayer` → `SimplePianoKeyboard` → `buildKeyLayout()`
    하나뿐이다.
  - 흑건 오프셋과 흑건 폭은 DS-0 "변경하지 않을 회귀 계약"의 고정 상수 7개에 **포함되지 않는다.** 다만 그 절이
    `pianoLayout.ts`를 명시하므로 D-024에 따라 결정을 먼저 기록한다.
- Decision:
  1. **기준은 표준 피아노 치수 백건 23.5mm · 흑건 13.7mm다.** 흑건 폭 비율 `BLACK_KEY_WIDTH_RATIO`는
     `13.7 / 23.5`로 정의한다.
  2. **오프셋은 상수로 적지 않고 유도 함수로 계산한다.** 그룹 내 흰건반의 후면 폭이 균등하다는 가정에서
     `blackKeyLeftOffset(whites, blacks, index)`가 왼쪽 인접 백건 기준 좌변 오프셋을 낸다. 결과는
     C# 0.611, D# 0.806, F# 0.563, G# 0.709, A# 0.854다.
  3. **회귀는 방향 불변식으로 건다.** C#·F#는 경계보다 왼쪽, D#·A#는 오른쪽, G#는 경계와 일치. 테스트는
     기대값을 **구현에서 import하지 않고 표준 치수에서 직접 유도한다.**
  4. **이 결정의 범위는 `pianoLayout.ts`와 그 파생값 하나(`SimplePianoKeyboard`의 장식 축척 기준 폭)뿐이다.**
     이슈 #58 할 일 3(`PianoKeyboard.tsx` 통일)은 그 파일이 죽은 코드이므로 수행하지 않고, HANDOFF의 P2-A
     죽은 코드 정리로 이관한다.
- Reason: 값을 세 자리 소수로 적어 두면 다음 세션이 그것을 취향으로 읽고, 이슈 #56의 spec처럼 "이 표는 맞다"는
  근거 없는 주장이 다시 붙는다. 유도 공식이 코드에 있으면 실제 악기로 검산할 수 있다. 방향 불변식을 절대값
  상한 대신 쓰는 이유도 같다 — 크기는 취향일 수 있어도 방향은 사실이다.
- Rejected:
  - 이슈에 적힌 소수 3자리를 상수로 하드코딩 | 값의 출처가 주석에만 남아, 다음 변경에서 검산 없이 조정된다.
  - `PianoKeyboard.tsx`를 같은 PR에서 통일 | 라우트에서 도달할 수 없어 회귀를 관측할 수 없고, AGENTS.md의
    "한 PR에는 하나의 목적"과 충돌한다. 죽은 코드는 통일이 아니라 제거가 맞는 처리다.
  - 같은 PR에서 죽은 코드 3개 파일 삭제 | 기하 수정과 성격이 다른 변경이라 회귀 원인 분리가 어려워진다.
  - 기존 `|중심 − 경계| ≤ 0.35` 상한을 조이는 것으로 대체 | 부호를 보지 않는 한 방향 오류는 어떤 상한으로도
    관측되지 않는다.
- Consequence:
  - 흑건이 시각적으로 약 0.1~0.15칸(keyWidth 24에서 2.4~3.5px) 움직이고 폭이 0.4px 좁아진다. `PX_PER_SEC`,
    `BASE_PLAYBACK_KEY_WIDTH` 등 DS-0 고정 상수 7개는 **한 픽셀도 바뀌지 않는다.**
  - 낙하 노트의 x는 `buildKeyLayout`에서 오므로 흑건 노트의 낙하 위치도 함께 이동한다. 건반과 노트가 같은
    출처를 쓰므로 둘은 계속 정렬된다.
  - `SimplePianoKeyboard`의 장식 축척 기준값 `14.4`(= 24 × 0.6)가 더 이상 흑건 폭과 같지 않게 되므로
    파생식으로 바꿨다. 이런 파생 상수가 다른 곳에 또 있으면 같은 방식으로 처리한다.
  - `PianoKeyboard.tsx`는 여전히 실제와 2배 이상 과장된 편차를 그린다. 도달 불가이므로 사용자에게는 보이지
    않지만, **되살릴 때는 반드시 이 결정에 맞춰야 한다.**
- Constraint: DS-0 "변경하지 않을 회귀 계약"의 재생 기하 상수 7개와 크롭 불변식은 이 결정의 대상이 아니다.
- Confidence: high
- Scope-risk: narrow
- Reversibility: clean
- Directive: 흑건 오프셋과 폭을 조정할 때 숫자를 직접 고치지 않는다. `WHITE_KEY_MM`·`BLACK_KEY_MM` 또는 유도
  가정을 고치고, 방향 불변식을 통과하는지 확인한다. `PianoKeyboard.tsx`를 되살린다면 같은 유도를 쓴다.
- Tested: 회귀 3건이 수정 전 실패(방향·오프셋·흑건 폭)하고 수정 후 통과하는 것을 관측했다. 전체 Jest
  85 suites / 796 tests, `tsc --noEmit`, `npm run lint` 통과.
- Not-tested: 실제 브라우저·실기기에서의 시각 확인. 변경 폭이 2~4px이라 회귀 테스트가 좌표를 판정하고 육안
  판정은 하지 않았다. `PianoKeyboard.tsx` 경로는 도달 불가라 실행되지 않는다.
- Related: 이슈 [#58](https://github.com/landfill/ClairKeys/issues/58),
  [#56](https://github.com/landfill/ClairKeys/issues/56), PR #57, D-024,
  `docs/recovery/phases/DS-0-current-state-baseline.md`

## D-038: 운지 번호는 원본을 우선하고 누락분만 결정론적 학습 힌트로 보강한다

- Date: 2026-09-03
- Status: Accepted
- Fulfills: 이슈 [#103](https://github.com/landfill/ClairKeys/issues/103)의 운지 데이터 정책 선행 조건
- Context:
  - 피아노 운지 번호는 양손 모두 엄지 1, 검지 2, 중지 3, 약지 4, 소지 5가 표준이다. 그러나 임의의
    악곡 전체에 음높이만으로 적용할 유일한 표준 배열은 없다. Yamaha의 운지 지침도 같은 프레이즈에 복수의
    유효한 선택이 있음을 명시하며, 손 위치·이동·프레이즈를 함께 고려하도록 설명한다.
  - 장음계에는 정형 패턴이 있다. Baylor Piano Basics는 C·G·D·A·E 장음계의 한 옥타브 상행을 오른손
    `1-2-3-1-2-3-4-5`, 왼손 `5-4-3-2-1-3-2-1`로 설명한다. 이 패턴은 장음계라는 문맥이 있을 때의
    표준이지 모든 곡의 모든 음에 붙일 전역 표가 아니다.
  - Simply Piano는 곡 학습 화면에서 손가락 번호를 켜고 끄는 기능을 제공하지만, 공개 도움말은 임의 악보에
    번호를 생성하는 알고리즘을 정의하지 않는다. ClairKeys가 그 비공개 동작을 추측해 동일하다고 주장할 수 없다.
  - canonical animation v1.1은 `finger`를 optional로 두고 MusicXML의 유효한 `<fingering>`만 보존한다.
    현재 두 자동 보강 구현은 서로 다른 규칙과 `Math.random()`을 사용하며, 같은 악보에 서로 다른 번호를
    만들 수 있다. 그중 관리자 API는 일부 음에 운지가 하나라도 있으면 나머지 누락음을 보강하지 않는다.
- Decision:
  1. 번호 의미는 양손 공통으로 엄지 1에서 소지 5까지다. 왼손이라는 이유로 숫자 의미를 반전하지 않는다.
  2. 유효한 원본 MusicXML/저장 JSON의 `finger`가 최우선이며 자동 보강은 이를 덮어쓰지 않는다.
  3. 원본 운지가 없는 음은 플레이어 입력 경계에서 결정론적으로 1~5를 배정한다. 같은 음표열은 실행·기기와
     무관하게 같은 결과를 내야 하며 `Math.random()`을 사용하지 않는다.
  4. 자동값은 **초보자용 학습 힌트**다. 음높이·손·동시음·인접 진행으로 설명 가능한 보수적 규칙만 적용하고,
     프레이즈 분석이나 교사 검수 없이 교육적으로 유일하거나 최적인 운지라고 표현하지 않는다.
  5. canonical 저장 계약의 `finger`는 optional로 유지한다. 기존 저장 파일을 일괄 덮어쓰지 않고 읽기 호환
     경계에서 보강해 신규·기존 악보가 같은 표시 계약을 얻는다.
  6. 화면은 재생 전과 재생 중 모든 유효한 재생 음에 번호를 렌더한다. 번호 높이보다 짧은 음표는 번호를
     삭제하거나 글자를 3px까지 줄이지 않고 낙하 블록 위에 겹쳐 최소 글자 크기를 유지한다. 실제 모바일
     가로 화면은 별도 수동 검증한다.
- Reason: 표준 번호 체계와 특정 악구의 운지 선택을 구분해야 출처가 있는 정보를 보존하면서도 모든 노트에
  일관된 힌트를 제공할 수 있다. 런타임 보강은 저장 데이터 마이그레이션 위험 없이 기존 악보까지 즉시 포괄한다.
- Rejected:
  - 음높이별 고정 좌·우 배열을 모든 곡에 표준으로 적용 | 손 이동·프레이즈·화음 문맥을 잃고 실제 피아노
    교육에 존재하지 않는 단일 정답을 만든다.
  - 관리자 API로 기존 JSON 전체를 즉시 덮어쓴다 | 무작위·부분 보강 결함이 있는 상태에서 원본을 비가역적으로
    변경하고, 신규 변환 경로와 규칙도 다시 갈라진다.
  - `finger`를 canonical v1.1 필수 필드로 바꾼다 | 원본 MusicXML이 운지를 제공하지 않는 정상 입력과 기존
    저장 문서가 모두 계약 위반이 되어 breaking version migration이 필요하다.
- Consequence: 원본 운지가 없는 곡도 번호가 보이지만 자동 번호는 전문 편집자의 운지와 다를 수 있다. 정확도
  개선은 추후 키·박자·프레이즈·손 크기 같은 입력을 갖춘 별도 단계로 진행한다.
- Constraint: P0-A canonical animation의 기존 v1.0/v1.1 읽기 호환성과 원본 `finger` 값은 유지한다.
- Confidence: high (번호 체계·scale 패턴·결정론 요구), medium (일반 악구의 fallback 교육 품질)
- Scope-risk: moderate
- Reversibility: clean
- Directive: 자동 운지를 "표준 정답" 또는 "Simply Piano 알고리즘"으로 부르지 않는다. 규칙을 바꿀 때는
  원본 우선·결정론·기존 저장 호환 회귀를 먼저 갱신한다.
- Tested: 수정 전 경계 회귀 3건(누락 운지, 양손 화음, 짧은 노트 렌더링)이 실패함을 관측. 구현 후 focused
  Jest 4 suites / 39 tests, 전체 Jest 90 suites / 846 tests, `npx tsc --noEmit`, lint, build 통과.
- Not-tested: 실제 악보 전체의 교육적 최적성, 교사 검수, 모바일 가로 화면 가독성.
- Related: 이슈 [#103](https://github.com/landfill/ClairKeys/issues/103), D-009, P0-A,
  `docs/recovery/phases/ISSUE-103-fingering-guidance.md`

## D-039: 자동 운지는 손별 시간 이벤트의 제약 비용으로 선택하고 출처를 player boundary에 남긴다

- Date: 2026-09-04
- Status: Accepted
- Fulfills: 이슈 [#120](https://github.com/landfill/ClairKeys/issues/120)
- Context:
  - 이슈 #120의 운영 JSON은 411음 모두 운지가 없어서 D-038 자동 운지가 화면 번호 전체를 만든다. 원본에
    운지 표기가 없는 높은음자리표/낮은음자리표 악보는 예외적 누락이 아니라 제품의 기본 입력 형태다. 손 구분은
    정상이라 재변환이나 왼손 숫자 의미 반전으로 해결할 문제가 아니다.
  - 기존 구현은 정확한 8음 장음계와 같은-onset 화음만 문맥으로 보고 나머지는 각 MIDI에 독립적인 값을 준다.
    그래서 짧은 상·하행 악구, 반복음, 도약과 화음 전후의 손 위치가 서로 연결되지 않는다.
  - 임의 악곡에 유일한 정답은 없으므로 규칙 수를 늘려 정답표처럼 만드는 대신, 설명 가능한 제약 사이의 비용을
    최소화하는 결정론적 힌트가 필요하다.
- Decision:
  1. 손별로 같은 onset의 음을 하나의 event로 묶고 시간순 phrase에서 동적 계획법으로 후보 운지를 선택한다.
  2. 오른손은 낮은 음→높은 음에서 손가락 번호가 증가하고, 왼손은 감소하는 물리 방향을 하나의 spatial index로
     정규화한다. 상·하행, 반복음, 음정 거리, 검은건반 엄지, 큰 도약과 phrase gap을 비용으로 표현한다.
  3. 같은 손 화음은 음높이순으로 spatial index가 증가해야 한다. 1~5음 후보만 허용하고 원본 손가락이 있는
     위치는 고정 제약으로 필터링한다.
  4. 유효한 원본 `finger`는 절대 덮어쓰지 않는다. player-bound `FallingNote`에 `fingerSource: source|inferred`와
     자동값의 알고리즘 버전을 붙인다. 저장 canonical v1.1은 바꾸거나 일괄 재작성하지 않는다.
  5. 정확히 근거가 있는 CAGED 한 옥타브 scale 패턴은 D-038대로 유지하되, 원본 운지는 계속 우선한다.
  6. 관리자 backfill은 유지하지 않는다. 인증·allowlist 확인 뒤 410을 반환하는 tombstone만 남겨 오래된 호출자가
     명시적인 폐기 응답을 받게 하고, UI 진입점과 무작위 스크립트는 제거한다. 자동값은 저장하지 않고 player
     boundary에서만 생성한다.
- Reason: 손의 진행을 연결하면 단음별 modulo 규칙의 방향 오류를 제거하면서도, 공개 근거가 없는 유일한 정답을
  주장하지 않을 수 있다. 공간 방향 정규화는 왼손 숫자 의미를 뒤집지 않고 건반 위 배열만 대칭으로 다룬다.
- Rejected:
  - 모든 왼손을 `54321`, 오른손을 `12345`로 반복 | 손 이동·엄지 넘김·화음과 악구 경계를 무시한다.
  - PDF/MusicXML 재변환 | 원본에 운지 표기가 없으므로 입력 정보가 늘지 않는다.
  - canonical `finger` 필수화 | 정상적인 무운지 MusicXML과 기존 저장 파일을 계약 위반으로 만든다.
  - 전문 운지 데이터셋 없는 ML 모델 | 결과 근거와 결정론, 배포 비용을 검증할 수 없다.
  - 관리자 backfill을 새 추론기로 통합 | 휴리스틱 값을 저장 `finger`로 굳히면 다음 읽기부터 원본 표기와 구분할
    수 없고, runtime inference가 이미 기존·신규 JSON을 모두 처리하므로 데이터 재작성 위험만 남는다.
- Constraint: D-038의 원본 우선, 결정론, 1~5 의미와 기존 저장 호환 계약을 유지한다.
- Confidence: high (방향·원본 보존·결정론), medium (일반 악구의 교육적 자연스러움)
- Scope-risk: moderate
- Reversibility: clean
- Directive: 비용과 tie-break를 바꿀 때 운영 fixture와 양손 방향 회귀를 먼저 실패시키고, 자동값을 정답 운지로
  표현하지 않는다.
- Tested: 구현 전 회귀로 관측 예정.
- Not-tested: 전문 피아노 교사의 곡 전체 운지 검수, 개인 손 크기별 적합성.
- Related: D-038, 이슈 [#103](https://github.com/landfill/ClairKeys/issues/103),
  [#120](https://github.com/landfill/ClairKeys/issues/120)

## D-040: 저작권 노출을 지는 것은 PDF뿐이다 — 그 이후 산출물은 필요할 때 허용하고, 기존 악보는 재등록으로 감수한다

- Date: 2026-09-05
- Status: Accepted
- Context:
  - 이 정책은 프로젝트 초기에 사용자가 정의했으나 저장소 어디에도 기록되지 않았다. `DECISIONS.md` 전체
    검색 결과 관련 항목이 없고 Footer의 `© 2024` 표기 건만 나온다.
  - 2026-09-05 세션에서 실제로 오독이 발생했다. 코드가 PDF도 MusicXML도 보관하지 않는 것을 보고 "원본을
    일절 보관하지 않는 것이 설계"라고 역추론해, 이슈 [#125](https://github.com/landfill/ClairKeys/issues/125)와
    [#126](https://github.com/landfill/ClairKeys/issues/126)에 "원본 보관 여부를 먼저 결정하라"고 잘못
    기술했다. 사용자가 세 차례에 걸쳐 정정했다. 코드 사실에서 의도를 추론할 수 있다는 가정이 틀렸다.
  - 구현 사실: `SheetMusic`은 `animationDataUrl`만 갖는다(`prisma/schema.prisma:69`). 업로드 라우트는 PDF를
    OMR 서비스로 전달만 한다(`src/app/api/omr/upload/route.ts`). `fileStorageService.uploadSheetMusicFile`과
    `sheet-music-files` 버킷은 존재하지만 프로덕션 호출부가 없다. OMR 서비스는 MusicXML을 `temp_dir`에 만든
    뒤 `shutil.rmtree`로 삭제하며(`omr-service/app.py:342`, `:372`, `:386`), `GET /result/{job_id}` 응답에는
    `animation_data`만 담긴다(`app.py:233`).
  - #125 단계 B(악보 표시)와 #126 3순위(운지 추론용 악구 경계)는 마디 번호·쉼표·이음줄·음표 값·이명동음
    표기를 요구한다. 이 정보는 MusicXML에 있고 canonical JSON에는 없으므로, 원본이 없으면 기존 악보에
    소급할 수 없다.
  - 이 항목은 사용자의 명시적 지시로 PR 없이 `main`에 직접 커밋했다. `AGENTS.md`가 `DECISIONS.md` 신규
    항목을 직접 커밋 예외에서 제외하고 있으므로, 규약 자체는 바뀌지 않았고 이번 반영만 예외다.
- Decision:
  1. **직접적인 저작권 이슈가 있는 원본 PDF는 저장하지 않는다.** 이것이 핵심 정책이며 유일한 금지 대상이다.
  2. **MusicXML 이후의 산출물은 금지 대상이 아니다.** 필요가 있으면 보관을 허용한다. 다만 허용이지 기본값이
     아니므로, 보관을 도입할 때는 그 필요를 개별 사안으로 판단해 기록한다
     ([#127](https://github.com/landfill/ClairKeys/issues/127)).
  3. **기존 악보에 새 표기 정보를 소급하지 않는다.** 사용자가 악보를 다시 등록하는 것으로 감수하며, 신규
     업로드부터 지원한다.
  4. 보관을 도입하는 경우에도 **OMR 서비스에 스토리지 쓰기 자격증명을 주지 않는다**(D-011 유지). 앱이
     `/result`에서 수집해 자신이 이미 가진 키로 저장한다.
- Consequence:
  - #125 단계 B와 #126 3순위는 "변환 시점에 canonical JSON에 표기 정보를 굽는다"로 확정되고, #127의 결론과
    무관하게 진행할 수 있다.
  - 기존 악보는 재등록 전까지 악보 표시와 악구 기반 운지 개선을 받지 못한다. 화면은 그 상태를 표현할 수
    있어야 한다.
  - MusicXML 미보관이 유지되는 동안 [#44](https://github.com/landfill/ClairKeys/issues/44) 같은 인식 결함은
    사용자에게 같은 PDF를 다시 받아야 재현된다. 그 대가는 #127이 다룬다.
- Rejected:
  - PDF도 보관한다 | 저작권 노출을 그대로 떠안는다. 이 정책의 존재 이유다.
  - MusicXML 보관을 정책으로 금지한다 | 진단과 회귀 corpus의 값을 미리 포기한다. 필요할 때 선택할 여지를
    남기는 편이 낫다.
  - 기존 악보를 위한 소급 경로를 만든다 | 재변환할 원본이 없으므로 사용자 재업로드 외에 방법이 없고, 그것은
    재등록과 같다.
- Constraint: D-011(OMR 서비스는 스토리지 쓰기 자격증명을 갖지 않는다)
- Confidence: high
- Scope-risk: narrow
- Reversibility: clean
- Directive: **코드가 아무것도 보관하지 않는다는 사실에서 "일절 보관 금지"를 추론하지 않는다.** 금지 대상은
  PDF뿐이다. MusicXML 보관을 도입할 때는 #127의 수명주기·접근제어·보존기간 항목을 함께 정의한다.
- Tested: 정책 진술은 사용자 확인. 구현 사실은 `prisma/schema.prisma`, `src/app/api/omr/upload/route.ts`,
  `src/services/fileStorageService.ts` 호출부, `omr-service/app.py`를 읽어 확인.
- Not-tested: 코드 변경이 없으므로 실행 검증 대상이 없다.
- Related: D-011, D-038, 이슈 [#44](https://github.com/landfill/ClairKeys/issues/44),
  [#125](https://github.com/landfill/ClairKeys/issues/125),
  [#126](https://github.com/landfill/ClairKeys/issues/126),
  [#127](https://github.com/landfill/ClairKeys/issues/127)

## D-041: 운지 비용은 손 이동과 엄지 넘김으로 표현하고, CAGED 패턴 층은 삭제한다

- Date: 2026-09-05
- Status: Accepted
- Amends: D-039 (결정 2·5), D-038 (CAGED scale 패턴)
- Fulfills: 이슈 [#126](https://github.com/landfill/ClairKeys/issues/126) 2순위
- Context:
  - D-039의 `phrase-dp-v1`은 DP 상태가 손가락 번호뿐이고, 단음 이벤트의 자체 비용은 검은건반 엄지 외에는
    0이다. `transitionCost`는 음 진행 방향과 손가락 번호 이동 방향이 반대인 전이를 `+10` 처벌했다. 엄지
    넘김은 **정의상** 그 전이이므로, 모든 하행 음계의 정석 운지가 모델의 최고 비용 경로였다. 반대로
    `fingerDelta === 0`(같은 손가락 반복)은 어떤 처벌도 받지 않아, `5→1`이 소진된 뒤에는 엄지 반복이
    최적해였다.
  - 이 저장소에서 `addFingeringToNotes`를 직접 실행해 확인했다: RH 하행 C장음계 8음 `5 4 3 2 1 1 1 1`,
    RH 하행 12음은 엄지 8연속, LH 하행 8음 `1 1 1 1 2 3 4 5`, F장조 상행 `1 1 1 2 2 3 4 5`,
    A화성단조는 같은 손가락 5연속. 정석이 나오는 유일한 경우는 `applyMajorScaleRuns`가 매칭되는 상행
    CAGED 8음이었다.
  - 이슈 #126은 복잡도 제약을 명시했다. "손 위치"를 별도 DP 상태 차원으로 넣으면 **단음 이벤트당** 상태
    5→100, 전이 25→10,000이 되어 12,000음 악보가 초 단위로 넘어간다. (5·25는 단음 기준이다. 2·3음 화음
    이벤트는 후보가 `C(5,k)` = 10개라 화음끼리의 전이는 최대 100개다. 상태 차원 추가는 이 수를 똑같이
    20배로 곱한다.)
  - 이슈 #126이 제안한 작업 순서는 1순위(경계 문맥 전달) → 2순위(비용 모델)였다. 이번 작업은 2순위를 먼저
    수행한다. 사용자가 순서를 명시적으로 선택했고(2026-09-05), 화면에 보이는 결함이 2순위에 속하며, 아래
    결정 4가 보여주듯 2순위의 결과가 1순위의 작업 범위(조표 기반 패턴 층 일반화)를 소멸시키기 때문이다.
- Decision:
  1. **손 위치는 상태가 아니라 유도값이다.** 손가락 `f`가 음 `m`을 쳤다면 손 위치는 `m - NATURAL_SPAN[s-1]`
     로 이미 결정된다(`s`는 spatial finger, `NATURAL_SPAN = [0,2,4,5,7]`은 흰건반 C-D-E-F-G 5음 위치의 반음
     간격). 전이 비용에서 앞뒤 이벤트의 암묵 anchor를 비교해 손 이동을 모델링하고, 후보 수는 단음 5개·화음
     `C(5,k)`개로 v1과 동일하게 유지한다.
  2. **손 이동은 레가토를 끊는다 — 넘김만 예외다.** 손이 `HAND_GIVE`(1반음)를 넘어 이동하면 직전 건반에서
     손을 떼야 하므로 `LEGATO_BREAK` 비용을 문다. 이 비용은 음 간격에 반비례해 완화된다. 엄지 넘김은 손을
     떼지 않고 이동하는 유일한 장치이므로 이 비용 대신 조건부 `crossingCost`를 문다. **넘김은 금지가 아니라
     대안 가격이다.** 같은 손가락을 다른 음에 재사용하는 것도 반드시 뗐다 놓아야 하므로 이동 거리와 무관하게
     레가토 비용을 문다 — v1이 빠뜨린 한 줄이 이것이다.
  3. **넘김은 조건부로만 성립한다.** 한쪽 끝이 엄지여야 하고, 상대는 2·3·4번이며(5번은 넘기지도 넘겨지지도
     않는다), 음정은 5반음 이내, 손 이동은 7반음 이내여야 한다. 엄지가 검은건반에 놓이면 추가 비용을 문다.
  4. **`applyMajorScaleRuns`(CAGED 패턴 층)를 삭제한다.** 위 비용만으로 DP가 상행 C장조 `1 2 3 1 2 3 4 5`와
     하행 `5 4 3 2 1 3 2 1`을 스스로 만들어 내므로 패턴 층은 중복이다. 게다가 패턴 층은 DP 결과를 사후에
     덮어써 경계에서 불연속을 만들었다 — G장조 9음에서 DP의 일관된 `1 2 3 4 1 2 3 4 5`를 앞 8음만
     `1 2 3 1 2 3 4 5`로 덮어써 `... 4 5 5`가 나왔다.
  5. **검은건반 제약을 엄지 밖으로 넓힌다.** 엄지(`BLACK_THUMB`)뿐 아니라 5번(`BLACK_PINKY`)에도 비용을
     매긴다. 짧고 약한 손가락을 올라간 건반에 두는 것이 문제이지 엄지만의 문제가 아니다.
  6. **반복음의 손가락 교대는 템포가 결정한다.** 음 간격이 `FAST_REPEAT_SEC`(0.25초) 이상이면 같은 손가락
     유지가 무료다. 그보다 빠르면 한 손가락이 제때 오르내릴 수 없으므로 안쪽으로(손가락 번호 -1) 걸어
     들어가는 그룹을 선호하고, 4·5번은 민첩성 비용을 문다. 또 반복 판정을 이벤트 중심 음고 대신 **음 집합
     동일성**으로 바꾼다 — 중심이 같은 서로 다른 화음이 반복음으로 취급되던 문제를 없앤다.
  7. `FINGERING_ALGORITHM_VERSION`을 `phrase-dp-v2`로 올린다. 저장 canonical 계약과 원본 `finger`는 D-038·
     D-039대로 건드리지 않는다.
- Consequence:
  - 장·화성단조 24개 조성 × 1·2옥타브 × 상·하행 × 양손 192개 음계에서 같은 손가락 최장 연속이 2이고, 그
    과정에서 연주된 검은건반 920개 중 엄지가 놓인 경우는 0이다.
  - 자동 운지 결과가 v1과 달라지는 구간이 있다. 저장 데이터는 바뀌지 않으므로 롤백은 코드 되돌리기뿐이다.
  - **"같은 손가락 3연속 없음"은 순차 진행에 한정된 성질이다.** 결정 3이 넘김을 `CROSSING_MAX_INTERVAL`
    이내로 제한하므로, 도약이 연속되는 구간에는 넘김 후보가 아예 없고 모든 후보가 같은 레가토 비용을 문다.
    RH 하행 옥타브 `[84,72,60,48]`은 `5 1 1 1`을 낸다. 이것은 결함이 아니라 이 결정의 직접적 귀결이며,
    도약 figure에서 한 손가락을 재사용하는 것은 실제 연주와 일치한다. 회귀로 고정했다.
  - 조표·박자표·`voice`를 받지 않고도 조성별로 다른 넘김 위치가 나온다. #126 1순위의 "패턴 층을 조표 기반으로
    일반화한다" 항목은 대상이 사라져 소멸한다. 남은 1순위 범위는 `voice` 기반 이벤트 묶기와 문맥 전달이다.
- Rejected:
  - 손 위치를 별도 DP 상태 차원으로 추가 | 전이가 25에서 10,000으로 늘어 이슈 #126이 명시한 복잡도 제약을
    위반한다. anchor 유도로 같은 표현력을 상태 5개에 담을 수 있다.
  - `directionPenalty`만 제거 | 넘김이 싸지는 대신 아무 데서나 손가락이 역행한다. 넘김을 성립 조건과 함께
    가격으로 표현해야 한다.
  - 패턴 층을 조표 기반으로 일반화 | 비용 모델이 이미 같은 답을 만들고, 사후 덮어쓰기라는 구조적 결함
    (경계 불연속)은 일반화해도 남는다.
  - 상수를 교과서 운지 한 줄에 맞춰 튜닝 | LH 2옥타브 C장조에서 4-그룹의 위치가 교과서와 다르지만 둘 다
    성립하는 분할이다. 임의 악곡에 유일한 정답은 없다는 D-039의 전제를 되돌리는 일이다.
- Confidence: high
- Scope-risk: moderate
- Reversibility: clean
- Directive: 넘김을 다시 일괄 처벌로 바꾸지 않는다. 음 진행과 반대 방향의 손가락 이동은 결함이 아니라 넘김
  그 자체다. 조성별 패턴 테이블을 다시 도입하지 않는다 — 비용 모델이 답을 만들고, 사후 덮어쓰기는 경계
  불연속을 만든다.
- Tested: `src/utils/__tests__/fingeringUtils.test.ts` 이슈 #126 회귀 13건 포함 전체 Jest 870건, `tsc
  --noEmit`, `next lint`, `next build`. 192개 음계 전수 스윕과 12,000음 성능 측정.
- Not-tested: 411음 운영 JSON의 연주 가능성 수동 검토(원본이 저장소에 없다). 전문 피아니스트·교사 검수.
- Related: D-038, D-039, D-040, 이슈 [#120](https://github.com/landfill/ClairKeys/issues/120),
  [#126](https://github.com/landfill/ClairKeys/issues/126)

## D-042: 운영 악보 JSON을 회귀 corpus로 보관하고, 운지 품질을 계측 baseline으로 고정한다

- Date: 2026-09-05
- Status: Accepted
- Fulfills: 이슈 [#130](https://github.com/landfill/ClairKeys/issues/130) 1단계
- Context:
  - 이슈 #120 이후 같은 411음 운영 악보가 세 번 분석 대상이 됐는데(#120, #126, #130), 저장소에는 매번
    아무것도 남지 않았다. #126의 완료 조건에 있던 "411음 운영 JSON 수동 검토"는 원본이 저장소에 없다는
    이유로 세 세션 연속 미완으로 이월됐다. 발견은 매번 원격 URL에서 손으로 재유도됐고 CI가 실행할 수 있는
    형태로 고정된 것이 하나도 없었다.
  - 2026-09-05 사용자가 D-040의 범위를 다시 확인했다: **저작권 노출을 지는 것은 PDF뿐이고 MusicXML 이후
    산출물은 문제없다.** 직전 세션이 "음표 데이터만 익명화해서 넣자"고 제안한 것은 D-040 Directive가 경고한
    바로 그 과잉 추론이었다.
  - 운지는 저장 시점이 아니라 재생 시점에 계산되므로(D-038 결정 5), canonical JSON만 있으면 실제 출하되는
    경로 전체를 재현할 수 있다. PDF도 MusicXML도 필요 없다.
  - `phrase-dp-v2`의 결함은 스칼라 하나로 표현되지 않는다. 화음 도달 불가, 진행 중 손 재배치, 손가락 연속은
    서로 다른 기전이라 따로 세야 한다.
- Decision:
  1. **운영 canonical JSON을 `fixtures/fingering/`에 원본 바이트 그대로 보관한다.** 재포맷하지 않는다 —
     서비스가 만든 정확한 바이트여야 provenance가 성립한다. sha256과 보관 이유를 README에 기록한다.
     PDF는 계속 보관하지 않는다(D-040 결정 1 유지).
  2. **운지 품질을 세 지표로 계측한다** — 도달 불가 화음 쌍, 정방향 진행 중 손 재배치, 같은 손가락 3연속
     이상. 계측 모듈(`scripts/lib/fingeringMetrics.ts`)은 **비용 모델을 import하지 않는다.** 측정 대상의
     용어로 정의된 지표는 그 대상이 틀렸다는 것을 잡을 수 없다. 공유하는 전제는 "손은 위치 하나와 고정
     간격의 손가락 다섯을 갖는다"는 해부학뿐이다.
  3. **현재의 결함 수치를 테스트에 정확히 고정한다(래칫).** 목표값이 아니라 현재값이다. 개선도 회귀만큼
     크게 실패하므로, 추론기를 바꾸는 커밋은 이 숫자를 의도적으로 갱신해야 한다. 몰래 좋아지거나 몰래
     나빠지는 경로를 없앤다.
  4. 도달 한계 표는 **너그럽게** 잡는다. "불편하다"가 아니라 "물리적으로 불가능하다"의 경계여야 지표가
     손 크기나 취향 논쟁에 휘말리지 않는다. Parncutt et al. (1997)의 수치를 인용하지 않는다 — 확인하지
     않은 출처를 붙이지 않으며, 표를 조이려면 그때 실제 문헌을 확인한다.
- Consequence:
  - `fixtures/fingering/love-affair-411.json` 62KB가 저장소에 들어온다. corpus가 커지면 크기를 다시 본다.
  - #126의 "411음 운영 악보 수동 검토" 완료 조건이 비로소 실행 가능해진다. 이번에 수행한 결과가 #130이다.
  - 이후 운지 작업은 지표 변화로 근거를 대야 한다. "좋아 보인다"로는 통과하지 못한다.
- Rejected:
  - 음표 데이터를 익명화해서 보관 | D-040이 금지한 것은 PDF뿐이다. 사용자가 명시적으로 확인했다.
  - 원격 URL을 테스트에서 fetch | CI가 외부 가용성과 네트워크에 묶이고, 대상이 바뀌면 조용히 다른 것을
    측정하게 된다.
  - 지표 하나로 합산한 점수 | 세 기전이 서로 다르므로, 합산하면 한쪽 개선이 다른 쪽 악화를 가린다.
  - 목표값(0)을 단언하고 실패시키기 | CI가 빨간 채로 남아 다른 회귀를 가린다. 래칫이 같은 압력을 주면서
    초록을 유지한다.
- Constraint: D-040(PDF 미보관), D-038 결정 5(재생 시점 계산, 저장 문서 불변)
- Confidence: high
- Scope-risk: narrow
- Reversibility: clean
- Directive: 래칫 숫자를 "테스트를 통과시키려고" 올리지 않는다. 올려야 한다면 그것은 회귀이며 같은 커밋에
  이유를 적는다. 계측 모듈에서 `fingeringUtils`를 import하지 않는다.
- Tested: 전체 Jest 879건(신규 8건), `tsc --noEmit`, `next lint`, `next build`. corpus 파일이 다운로드
  바이트와 동일함을 `cmp`로 확인.
- Not-tested: corpus가 한 곡뿐이라 다른 텍스처(대위, 옥타브 연속, 빠른 패시지)의 지표는 아직 모른다.
- Related: D-038, D-039, D-040, D-041, 이슈 [#120](https://github.com/landfill/ClairKeys/issues/120),
  [#126](https://github.com/landfill/ClairKeys/issues/126), [#130](https://github.com/landfill/ClairKeys/issues/130)
