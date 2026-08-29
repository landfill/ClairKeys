# Recovery Roadmap

ClairKeys의 우선순위는 제품 핵심 정확도, 실행 안전성, 운영 안정성, 구조 정리 순이다. 각 단계는 별도 브랜치와 별도 PR로 진행한다.

## 우선순위 개요

| 순서 | ID | 단계 | 상태 | 권장 브랜치 | 선행 조건 |
|---:|---|---|---|---|---|
| 0 | DOC-1 | 기본 브랜치 `main` 전환 | DONE | `codex/default-branch-main-migration` | DOC-0 |
| 1 | P0-A | 애니메이션 계약과 golden fixture 확립 | DONE | `codex/p0-animation-contract` | DOC-1 |
| 2 | P0-B | MusicXML 변환 정확도 재구현 | DONE | `codex/p0-musicxml-converter` | P0-A |
| 3 | P0-C | 오디오·애니메이션 동기화 복구 | DONE | `codex/p0-playback-sync-stages-4-5` | P0-A, P0-B |
| 4 | P0-D | 인증·타입·테스트·CI 기준선 복구 | DONE | `codex/p0-quality-gates` | DOC-1 |
| 5 | P1-A | 업로드 경로 단일화 | DONE | `codex/p1-upload-pipeline` | P0-A~D |
| 6 | P1-B | 영속 작업 큐와 OMR 보안 | NOT_STARTED | `codex/p1-durable-omr` | P1-A |
| 7 | P2-A | 중복 계층과 설정 정리 | NOT_STARTED | `codex/p2-architecture-cleanup` | P1-A~B |

P0-A와 P0-D는 서로 다른 파일 범위를 갖도록 설계하면 병렬 진행할 수 있다. 그 외 단계는 표의 선행 조건을 지킨다.

## 디자인 개편 트랙 (이슈 [#76](https://github.com/landfill/ClairKeys/issues/76))

복구 트랙(P0~P2)과 별개로, 초보자 중심 여정·브랜드 전면 개편을 8단계로 진행한다. 이슈 #76의 실행
계획을 그대로 단계화한 것이며, 한 PR에서 홈·업로드·플레이어를 동시에 교체하지 않는다.

| 순서 | ID | 단계 | 상태 | 권장 브랜치 | 선행 조건 |
|---:|---|---|---|---|---|
| 0 | DS-0 | 현재 상태와 제품 계약 고정 | IN_PROGRESS | `codex/ds-0-current-state-baseline` | P1-A |
| 1 | DS-1 | 디자인 토큰과 공통 셸 | NOT_STARTED | `codex/ds-1-design-foundation` | DS-0 |
| 2 | DS-2 | 로그인 전 핵심 가치 전달 | NOT_STARTED | `codex/ds-2-prelogin-value` | DS-1 |
| 3 | DS-3 | 업로드와 처리 상태 | NOT_STARTED | `codex/ds-3-upload-processing` | DS-1 |
| 4 | DS-4 | 내 악보 | NOT_STARTED | `codex/ds-4-my-library` | DS-1 |
| 5 | DS-5 | 학습 플레이어 | NOT_STARTED | `codex/ds-5-learning-player` | DS-1 |
| 6 | DS-6 | 탐색과 공개 체험 | NOT_STARTED | `codex/ds-6-explore` | DS-2 |
| 7 | DS-7 | 알림·빈 화면·오류 상태 완결 | NOT_STARTED | `codex/ds-7-states` | DS-3, DS-4 |

DS-1은 나머지 전부의 선행 조건이다. 토큰 없이 개별 화면부터 고치면 색상·간격·대비가 화면마다
흩어지고, DS-7에서 상태 표현을 통일할 근거가 사라진다.

DS-3과 DS-7은 실제 백엔드 계약에 의존한다. DS-0이 확인한 대로 canonical 업로드 경로는
`ProcessingJob`·`ProcessingNotification`을 쓰지 않으므로, 처리 단계 문구와 완료 알림은 UI 이전에
**어느 상태를 어디서 읽을지**를 먼저 정해야 한다.

### DS-0: 현재 상태와 제품 계약 고정

- 라우트 인벤토리와 두 겹 인증 경계(middleware + `AuthGuard`)
- 이슈 #76 완료 조건 7개에 대한 지원 / 부분 지원 / 미지원 판정
- 디자인 개편이 바꾸지 않을 회귀 계약(D-013, D-017~D-023 등)
- 상세: [DS-0](phases/DS-0-current-state-baseline.md)

## 단계별 결과물

### DOC-1: 기본 브랜치 `main` 전환

- 현재 운영 문서와 신규 PR base를 `main` 기준으로 정렬
- GitHub 기본 브랜치 rename과 원격 HEAD 확인
- 로컬 추적 브랜치·보호 규칙·Actions·Vercel 검증
- 과거 PR #1과 baseline의 `master` 기록은 역사적 증거로 보존
- 상세: [DOC-1](phases/DOC-1-default-branch-main-migration.md)

### P0-A: 애니메이션 계약과 fixture

- Python과 TypeScript가 공유하는 canonical JSON 필드 정의
- 런타임 스키마 검증과 버전 정책
- 단선율, 코드, 쉼표, 양손, 다성부, 셋잇단음표, 템포 변경 fixture
- 변환 정확도 측정 기준
- 상세: [P0-A](phases/P0-A-animation-contract.md)

### P0-B: MusicXML 변환 정확도

- `divisions`, BPM, 박자표 기반 tick-to-seconds 계산
- `chord`, `rest`, `tie`, `dot`, `time-modification`, `backup`, `forward` 처리
- `part`, `staff`, `voice` 기반 양손·다성부 타임라인
- canonical JSON 출력
- 상세: [P0-B](phases/P0-B-musicxml-converter.md)

### P0-C: 재생 동기화

- AudioContext 단일 기준 시계
- 긴 곡을 위한 rolling look-ahead 스케줄러
- 재생, 일시정지, seek, 속도 변경 시 재동기화
- 장시간 재생 누적 오차 테스트
- 상세: [P0-C](phases/P0-C-playback-sync.md)

### P0-D: 플랫폼 안전성

- 신규 사용자 ID 생성과 NextAuth 흐름 수정
- Jest 환경과 누락된 테스트 의존성 복구
- TypeScript와 ESLint 오류 제거
- 빌드 우회 설정 제거
- `main` 대상 GitHub Actions 실행, 보호 규칙과 필수 체크 검증
- 상세: [P0-D](phases/P0-D-quality-gates.md)

### P1-A: 업로드 경로 단일화

- 네 가지 업로드 경로의 요구와 호출자 비교
- 검증된 실제 OMR 경로를 canonical path로 선택
- deprecated/demo 경로 격리와 migration
- 상세: [P1-A](phases/P1-A-upload-pipeline.md)

### P1-B: 영속 작업 큐와 OMR 보안

- 서버 프로세스 메모리에 저장된 파일·작업 상태 제거
- 재시작·수평 확장 가능한 영속 큐
- OMR 서비스 인증, 용량 제한, CORS 제한, 소유권 검증
- 상세: [P1-B](phases/P1-B-durable-omr.md)
- 전체 맥락: [P1 overview](phases/P1-processing-platform.md)

### P2-A: 구조 정리

- 사용되지 않는 `Refactored` 계층 처리
- Prisma·캐시·큐 구현 단일화
- `next.config.mjs`와 `next.config.ts` 통합
- 문서와 실제 버전·명령 일치
- 상세: [P2-A](phases/P2-A-architecture-cleanup.md)

## 전체 완료 조건

- 대표 golden score에서 음높이·시작 시각·길이·손 배정 기준을 충족한다.
- 긴 곡 재생과 속도 변경에서 오디오·시각 누적 오차가 허용 범위 내다.
- lint, typecheck, unit, integration, build가 우회 설정 없이 통과한다.
- 처리 중 재시작 후에도 작업 상태와 결과를 복구할 수 있다.
- 모든 단계가 별도 PR과 리뷰 기록을 보유한다.
