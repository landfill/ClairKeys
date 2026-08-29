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

복구 트랙(P0~P2)과 별개로, 초보자 중심 여정·브랜드 전면 개편을 진행한다. 이슈 #76의 실행 계획을
**D-024·D-025 결정에 맞게 조정해** 단계화한 것이며(다크 모드는 D-025로 제외됐다), 한 PR에서
홈·업로드·플레이어를 동시에 교체하지 않는다.

| 순서 | ID | 단계 | 상태 | 권장 브랜치 | 선행 조건 |
|---:|---|---|---|---|---|
| 0 | DS-0 | 현재 상태와 제품 계약 고정 | DONE | `codex/ds-0-current-state-baseline` | P1-A |
| 1 | **DS-G1** | **처리 상태 출처 계약 확정 (결정 gate)** | DONE | `codex/ds-g1-processing-state-contract` | DS-0 |
| 2 | DS-1 | 디자인 토큰과 공통 셸 | DONE | `codex/ds-1-design-foundation` | **DS-G1** |
| 3 | DS-2 | 로그인 전 핵심 가치 전달 (홈·샘플·복귀 계약) | DONE | `codex/ds-2-prelogin-value` | DS-1 |
| 4 | DS-3 | 업로드와 처리 상태 | DONE | `codex/ds-3-upload-processing` | DS-1 |
| 5 | DS-4 | 내 악보 | NOT_STARTED | `codex/ds-4-my-library` | DS-1 |
| 6 | DS-5 | 학습 플레이어 | NOT_STARTED | `codex/ds-5-learning-player` | DS-1 |
| 7 | DS-6 | 탐색과 공개 체험 (`/sheet/[id]` 로그인 전 접근 포함) | NOT_STARTED | `codex/ds-6-explore` | DS-2, **DS-5** |
| 8 | DS-7 | 알림·빈 화면·오류 상태 완결 | NOT_STARTED | `codex/ds-7-states` | **DS-2 ~ DS-6 전부** |

DS-G1이 DS-1보다 앞이므로 DS-3·DS-4는 DS-1만 적으면 된다. `DS-0 → DS-G1 → DS-1 → 나머지`가 이
트랙의 유일한 직렬 구간이다.

### 의존성의 이유

**DS-G1이 DS-1보다 앞이다.** DS-1의 내비게이션 구성은 `처리 상태` 메뉴를 지울지 결정해야 하는데,
그 답은 DS-G1의 G1-4에 있다. 순서를 뒤집으면 메뉴를 만들었다가 다시 지우는 재작업이 생긴다.
DS-G1은 코드를 바꾸지 않으므로 이 직렬화의 비용은 문서 한 건이다.

**DS-1이 그 뒤 전부의 선행 조건이다.** 토큰 없이 개별 화면부터 고치면 색상·간격·대비가 화면마다
흩어지고, DS-7에서 상태 표현을 통일할 근거가 사라진다.

**DS-G1은 UI 단계가 아니라 결정 gate다.** DS-0이 확인한 대로 canonical 업로드 경로
(`/api/omr/upload`, `/api/omr/finalize`)는 `ProcessingJob`·`ProcessingNotification`을 만들지 않고,
실제 상태는 `SheetMusic.processingStatus`(자유 문자열)에만 있다(DS0-2). DS-3의 "처리 단계 표시"와
DS-4의 "처리 중·오류 표시"는 **같은 계약**을 읽으므로, 두 단계가 각자 다른 출처를 가정하면 화면마다
다른 상태가 나온다. DS-G1은 코드를 바꾸지 않고 **어느 상태를 어디서 읽을지**만 결정 문서로 확정한다.
P1-B(영속 큐) 전체가 선행될 필요는 없다 — 필요한 것은 상태 출처의 결정이지 큐의 재구현이 아니다.

**DS-5가 DS-6보다 앞선다.** 둘 다 `/sheet/[id]`를 건드리지만 소유 범위가 다르다(아래 표). DS-6이
그 화면의 인증 경계를 푸는 시점에 플레이어의 형태가 이미 확정돼 있어야, "로그인 전에 본 화면"과
"로그인 후 연습 화면"이 같은 화면이 된다.

**DS-7은 DS-2~DS-6 전부를 선행 조건으로 둔다.** DS-7의 범위가 "각 핵심 화면의 빈 상태·오류 상태·복구
행동을 통일"이므로, 통일 대상 화면이 모두 확정되기 전에 끝낼 수 없다. DS-3·DS-4만 의존하면 DS-2·
DS-5·DS-6의 화면이 나중에 들어오면서 통일이 다시 깨진다.

### 화면 소유 범위 (파일 충돌 방지)

같은 파일을 두 단계가 건드리는 지점만 적는다. 여기에 없는 파일은 해당 화면 단계가 소유한다.

| 파일 | 소유 단계 | 다른 단계가 하지 않을 것 |
|---|---|---|
| `src/app/sheet/[id]/page.tsx` — `AuthGuard`, 데이터 로딩 경로 | **DS-6** | DS-5는 이 파일의 인증·fetch 분기를 건드리지 않는다 |
| `src/components/animation/FallingNotesPlayer.tsx`, `src/components/playback/*` | **DS-5** | DS-6은 플레이어 내부 레이아웃·컨트롤을 바꾸지 않는다 |
| 홈의 로그인 전 샘플 체험 | **DS-2** | DS-2는 `/sheet/[id]`를 사용하지 않는다. 자체 완결된 샘플 데이터를 쓴다 |
| 로그인 후 복귀 계약 (`LoginButton`의 `callbackUrl`) | **DS-2**가 설계·구현 | DS-6은 그 계약을 `/sheet/[id]` 진입에 적용만 한다 |
| `src/app/globals.css`, `src/app/layout.tsx`, `Header`/`Footer`/`Container`/`PageHeader` | **DS-1** | 이후 단계는 토큰을 소비만 하고 새 토큰을 추가하지 않는다 |
| `src/components/library/LibrarySheetMusicList.tsx` | **DS-4** | DS-7은 이 목록의 빈 상태 문구만 통일한다 |
| `src/components/upload/OMRUploadForm.tsx`, `OMRProcessingStatus.tsx` | **DS-3** | DS-7은 오류 문구·복구 행동만 통일한다 |

### DS-0: 현재 상태와 제품 계약 고정

- 라우트 인벤토리와 인증 경계 (middleware + `AuthGuard`, 그리고 그 경계가 실제로 막지 못하는 것)
- 이슈 #76 완료 조건 7개에 대한 지원 / 부분 지원 / 미지원 판정
- 디자인 개편이 바꾸지 않을 회귀 계약(D-013, D-017~D-023 등)
- 신규 결함 10건(DS0-1~DS0-10)의 대장과 담당 단계 배정 — GitHub 이슈가 아니라 phase 문서에 기록한다
- DS-1 진입 조건 6개
- 상세: [DS-0](phases/DS-0-current-state-baseline.md)

### DS-G1: 처리 상태 출처 계약 확정 (결정 gate)

- **결정 완료 → [D-026](DECISIONS.md)**. 상태 출처는 `SheetMusic` 한 곳이고, 화면은 원값이 아니라
  파생 상태(연습 가능 / 처리 중 / 오류 / 알 수 없음)를 읽는다
- 4개 처리 단계는 **업로드 화면에서만** 표시한다 — 서버가 단계를 저장하지 않는다
- 별도 알림 시스템을 만들지 않는다. `/processing` 화면과 `처리 상태` 메뉴를 제거한다
- 사용자 대면 실패 4종: 파일 거부 / 변환 실패 / 작업 유실 / 서비스 불가
- 코드 변경 0건
- 상세: [DS-G1](phases/DS-G1-processing-state-contract.md)

### DS-1: 디자인 토큰과 공통 셸

- 라이트 팔레트 한 벌의 색·타이포·간격·상태 토큰 (D-025로 다크는 제외)
- Header, Footer, Container, PageHeader와 3개 내비게이션
- 포커스·키보드 탐색·명도 대비·색상 외 상태 구분을 공통 컴포넌트에서 고정
- DS0-3(고아 라우트), DS0-5(죽은 링크·2024 저작권), DS0-10(죽은 다크 CSS) 처리
- 상세: [DS-1](phases/DS-1-design-foundation.md)

### DS-2: 로그인 전 핵심 가치 전달

- 홈의 **자체 완결 샘플 체험** (`/sheet/[id]`를 쓰지 않는다)
- CTA를 `내 악보로 시작하기`로 통일
- 로그인 화면의 이유 설명과 **로그인 후 원래 행동 복귀 계약** 설계·구현
- 상세: [DS-2](phases/DS-2-prelogin-value.md)

### DS-3: 업로드와 처리 상태

- PDF 선택 / 파일 검증 / 변환 요청을 서로 다른 상태로 분리
- DS-G1이 정한 출처로 처리 단계 표시
- 이탈해도 처리가 계속됨과 예상 대기 시간 명시 (DS0-7)
- 실패 시 Java 스택 트레이스 대신 사용자가 취할 행동 (이슈 #47)
- 상세: [DS-3](phases/DS-3-upload-processing.md)

### DS-4: 내 악보

- 처리 중 / 연습 가능 / 오류를 한 화면에서 구분 (DS0-6)
- 파일명보다 사용자 제목 우선, 편집 흐름 (DS0-4, DS0-8)
- 이어하기와 신규 업로드 CTA
- 상세: [DS-4](phases/DS-4-my-library.md)

### DS-5: 학습 플레이어

- 떨어지는 노트와 건반을 최우선 시각 영역으로 유지
- 재생·정지, 속도, **구간 반복**을 1차 컨트롤로 (DS0-9)
- 메트로놈 값·출처를 재생 전과 재생 중 모두 확인 가능하게 (이슈 #82)
- 재생 기하(D-017, D-020~D-023)와 가로 전환(D-019) 회귀 검증
- 상세: [DS-5](phases/DS-5-learning-player.md)

### DS-6: 탐색과 공개 체험

- 공개 악보를 곡명·작곡가·난이도·재생 시간 중심으로 정리 (DS0-4)
- `/sheet/[id]`의 로그인 전 접근과 미리보기, 로그인 후 원래 곡 복귀
- 검증된 샘플 콘텐츠만 사회적 증거로 사용 (P1-A provenance)
- 상세: [DS-6](phases/DS-6-explore.md)

### DS-7: 알림·빈 화면·오류 상태 완결

- 변환 완료 알림과 전역 상태 진입점 (DS-G1의 결정을 따른다)
- DS-2~DS-6이 확정한 **모든** 핵심 화면의 빈 상태·오류 상태·복구 행동 통일
- 홈 → 업로드 → 이탈 → 완료 → 첫 재생 종단 검증
- 상세: [DS-7](phases/DS-7-states.md)

## 이슈 #76 전체 완료 조건

DS-1~DS-7이 전부 `DONE`이고 아래를 모두 충족할 때 이슈 #76을 닫는다. 각 항목은 담당 단계가 자기
phase 문서의 완료 조건에서 검증하고, 여기서는 종단 판정만 한다.

| # | 조건 | 판정 방법 | 최종 판정 단계 |
|---|---|---|---|
| 1 | 홈 최초 뷰포트(1440×900, 스크롤 0) 안에 ①실제 낙하 노트 결과 ②`PDF → 변환 → 시각적 연습` 3단계 ③주 CTA가 모두 보인다 | 관측 가능 | DS-2 |
| 2 | 주요 CTA가 `내 악보로 시작하기`로 일관된다 | 문자열 검사 | DS-2 |
| 3 | 로그인하지 않은 상태에서 실제 학습 결과를 최소 한 번 재생할 수 있다 | 시크릿 창 수동 확인 | DS-2(홈 샘플), DS-6(공개 악보) |
| 4 | 업로드 후 현재 처리 단계와 예상 대기 시간이 화면에 있다 | 실제 업로드 1회 | DS-3 |
| 5 | 처리 중 화면에 이탈해도 계속된다는 문구가 고정 노출된다 | 관측 가능 | DS-3 |
| 6 | 첫 플레이어 진입 후 안내 없이 재생·속도 조절 컨트롤에 도달할 수 있다 | 1차 컨트롤 구성 확인 | DS-5 |
| 7 | **WCAG AA 위반이 0건이다** — 자동 검사와 수동 검사(키보드 순회, 포커스 가시성, 200% 확대, 명도 대비) 양쪽에서 | 아래 참조 | DS-1(기반), DS-7(종단) |
| 8 | 홈 → 업로드 → 페이지 이탈 → 완료 → 첫 재생을 안내 없이 완주한다 | 종단 수동 1회 | DS-7 |

### 조건 1이 측정하지 않는 것

조건 1은 화면에 무엇이 **보이는지**만 판정한다. "신규 방문자가 5초 안에 설명할 수 있다"는 사용자
이해도이고, 그것은 **초보자 3~5명 관찰 테스트로만** 확인할 수 있다. 관찰 테스트를 하지 않는다면
이슈를 닫을 때 "사용자가 이해한다"고 쓰지 않고 "이해에 필요한 요소가 첫 화면에 있다"고 쓴다.
DS-2가 관찰 테스트를 실행하면 그 결과를 조건 1의 상위 근거로 기록한다.

### 조건 7의 판정 기준

axe 같은 자동 검사는 WCAG 성공 기준의 일부만 기계적으로 판정한다. 자동 검사 통과를 AA 준수로
읽지 않는다. 조건 7은 **자동 + 수동 양쪽**을 요구한다.

- 자동: 전 화면 axe(또는 동등 도구) 실행, 위반 0건
- 수동: 키보드만으로 전 화면 순회 가능, 포커스가 항상 보임, 브라우저 200% 확대에서 내용 손실 없음,
  본문 4.5:1 / 큰 텍스트 3:1, 상태가 색상 외 수단을 동반

**유예된 AA 위반이 하나라도 남아 있으면 이슈 #76을 닫지 않는다.** 위반을 남긴 채 종료해야 할 사정이
생기면 그것은 유예가 아니라 조건 7의 변경이므로, `DECISIONS.md`에 이유와 함께 기록한 뒤 닫는다.

DS-0의 "변경하지 않을 회귀 계약"이 종료 시점에도 그대로여야 한다. 재생 기하 상수 7개, D-019의 가로
전환 조건식, `playback-chrome` 계약, D-010·D-011·D-018의 저장 경계가 대상이다.

DS0-1(비공개 악보 public 버킷 노출)은 이 완료 조건에 포함되지 않는다. DS 범위 밖의 별도 보안 작업이다.

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
