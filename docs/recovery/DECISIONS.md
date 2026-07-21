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
