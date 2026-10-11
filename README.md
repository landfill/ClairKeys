# ClairKeys

PDF 피아노 악보를 인식해 낙하 노트와 피아노 소리로 재생하고, 한 손·구간 반복·기다리기 모드로
연습하는 웹 애플리케이션이다. 악보를 읽지 못해도 노트가 건반에 닿는 순간을 보고 따라 칠 수
있게 하는 것이 목표다. 기초 학습과 첫 연습곡은 PDF 업로드 없이도 이용할 수 있다.

- 배포: <https://clairkeys.vercel.app>
- 저장소: <https://github.com/landfill/ClairKeys>

## 지원 범위

현재 구현된 기능이다. 데이터에 따른 조건과 실기기 검증의 한계는 아래에 구분했다.

| 기능 | 설명 |
|---|---|
| PDF 업로드와 악보 변환 | 최대 4 MiB(4,194,304바이트) PDF를 Audiveris로 인식해 MusicXML과 애니메이션 JSON을 만든다. 브라우저에서 확장자·헤더·암호화 징후·중복 선택을 검사한다 |
| 낙하 노트와 피아노 재생 | 노트가 히트라인에 닿는 시점에 소리가 난다. 곡의 음역에 맞춘 건반과 녹음된 피아노 샘플을 사용한다 |
| 재생 조절 | 0.25~2배 속도 선택, 음량 조절, A–B 구간 반복, 재생·일시정지와 위치 이동 단축키를 제공한다 |
| 한 손 연습 | 양손 데이터가 있는 곡에서 왼손·오른손·양손을 선택하고 다른 손의 반주를 켜거나 끈다 |
| 기다리기 모드 | 필요한 음을 입력할 때까지 진행을 기다린다. 화면 건반·컴퓨터 키보드를 사용하며, Web MIDI를 제공하는 브라우저에서는 사용자 요청으로 MIDI 입력을 연결한다 |
| 연습 보조 | 계이름과 데이터에 있는 손가락 번호를 표시한다. 메트로놈과 시작 전 준비 박자는 곡의 박자·타이밍 정보를 사용한다 |
| PC 악보 패널 | MusicXML이 있는 곡에서 악보와 현재 재생 위치, 손가락 번호 보조 표시를 제공한다. 기존 곡은 XML 없이도 낙하 노트로 재생된다 |
| 이어 연습하기 | 곡별 재생 위치를 같은 브라우저의 `localStorage`에 저장해 다시 방문할 때 이어 재생할 수 있다 |
| 연습 기록 | 로그인한 사용자의 10초 이상 실제 재생 시간을 기록하고 `/practice`에서 확인한다. 가장 멀리 도달한 재생 위치를 표시하며 연주 정확도·숙련도·곡 완주 판정은 하지 않는다 |
| 기초 학습 | `/learn`에 건반·악보 읽기 1·악보 읽기 2·손·연습 방법의 다섯 레슨, 용어 사전, 오른손·왼손·양손 첫 연습곡을 제공한다 |
| 로그인과 내 악보 | Google·GitHub 로그인, 카테고리 분류, 곡명·작곡가 검색, 공개·비공개 상태 표시를 제공한다. 공개 여부는 업로드할 때 정한다 |
| 공개 악보 탐색 | 로그인 없이 `/explore`에서 공개 악보를 찾고 `/sheet/[id]`에서 재생할 수 있다 |
| 모바일 가로 재생 | 세로 터치 기기에서 재생을 시작하면 지원되는 API로 전체화면·가로 방향 잠금을 요청한다. 사용할 수 없거나 요청이 실패하면 CSS 회전 레이아웃을 사용한다. 일시정지는 재생 세션을 유지하고 정지는 끝낸다 |

빠르기는 업로드할 때 20~400 범위의 4분음표 BPM으로 입력할 수 있다. 입력값이 있으면 우선
사용하고, 없으면 MusicXML의 빠르기를 사용한다. 사용할 수 있는 빠르기가 없으면 미상으로
표시한다. PDF에 인쇄된 빠르기가 OMR 결과에 반영되는 것은 보장하지 않는다.
메트로놈은 신뢰할 수 있는 박자 정보가 없는 곡에서 사용할 수 없다.

## 동작 방식

```mermaid
flowchart LR
  U["브라우저"]
  subgraph V["Vercel · Next.js"]
    R["API 라우트<br/>업로드 · 상태 조회"]
    F["완료 콜백<br/>/api/omr/finalize"]
  end
  subgraph M["OMR VM · podman"]
    O["FastAPI"] --> A["Audiveris<br/>PDF → MusicXML"] --> C["converter.py<br/>MusicXML → JSON · 위치 매핑"]
  end
  subgraph S["Supabase"]
    DB[("PostgreSQL<br/>메타데이터 · MusicXML · 위치 매핑")]
    ST[("Storage<br/>애니메이션 JSON")]
  end

  U --> R
  R -->|"변환 요청 · 공유 시크릿"| O
  O -->|"완료 콜백 · 공유 시크릿"| F
  F -->|"결과 조회"| O
  R --> DB
  F --> DB
  F --> ST
  U -.->|"JSON 직접 fetch"| ST
```

1. `/upload`에서 PDF와 곡 정보를 제출한다. Next.js가 `SheetMusic` 행을 만들고 OMR 서비스의
   `/process`에 파일과 완료 콜백 주소를 전달한다.
2. OMR 서비스가 백그라운드에서 Audiveris로 PDF를 MusicXML로 인식하고 애니메이션 JSON과
   악보 위치 매핑을 생성한다. 변환 시간은 악보 크기와 복잡도에 따라 달라진다.
3. 변환이 끝나면 OMR 서비스가 Next.js의 `/api/omr/finalize`를 호출한다. 앱 서버가 결과를
   조회해 JSON은 Storage에, MusicXML과 위치 매핑은 DB의 `SheetScoreArtifact`에 저장한다.
4. 브라우저의 상태 조회는 약 5초 간격으로 이어지며, 콜백이 저장하지 못한 결과를 저장하는
   보조 경로이기도 하다. 콜백이 도달하면 업로드 탭을 닫아도 결과를 저장할 수 있다.
5. `/sheet/[id]`는 Storage의 JSON을 직접 받아 재생하고, 악보 패널은
   `/api/sheet/[id]/score`에서 MusicXML과 위치 매핑을 받는다. 오디오와 낙하 노트는
   하나의 `AudioContext` 시계를 기준으로 진행한다.

OMR 작업·결과와 콜백 재시도 상태는 프로세스 메모리에 있다. 서비스가 재시작되면 작업이
유실될 수 있으며 영속 큐는 구현되지 않았다. 원본 PDF는 처리용 임시 파일로만 사용하고
영구 보관하지 않는다. 완료 콜백은 서버 간 저장 신호이며 사용자 푸시 알림은 아니다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| 백엔드 | Next.js Route Handlers, Prisma 6, PostgreSQL |
| 인증 | NextAuth.js 4 (Google · GitHub, JWT 세션) |
| 오디오·악보 표시 | Web Audio API, 피아노 샘플 MP3, OpenSheetMusicDisplay 2 |
| 악보 인식 | Audiveris, Python FastAPI 서비스 |
| 인프라 | Vercel, Supabase (DB + Storage), 모두의AI 할당 VM (podman) |
| 테스트 | Jest, Playwright, GitHub Actions |

로그인은 NextAuth OAuth를 사용한다. Supabase Auth로 사용자를 인증하지 않는다.
정확한 의존성 버전은 [package-lock.json](package-lock.json)을 따른다.

## 빠른 시작

Node.js 22.3 이상, npm 10 이상이 필요하다.

```bash
git clone https://github.com/landfill/ClairKeys.git
cd ClairKeys
npm ci
```

프로젝트 루트에 `.env`를 직접 만들고 DB·OAuth·Storage 값을 채운다. `.env.example`은 없다.
OAuth 공급자에는 실행 주소에 맞는 콜백 URL을 등록한다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="REPLACE_WITH_RANDOM_SECRET"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GITHUB_CLIENT_ID="YOUR_GITHUB_CLIENT_ID"
GITHUB_CLIENT_SECRET="YOUR_GITHUB_CLIENT_SECRET"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

[DB 구성 절차](DATABASE_SETUP.md)와 [Storage 설정](SUPABASE_STORAGE_SETUP.md)을 먼저
따른다. DB 가이드는 신규 DB와 기존 DB 업데이트를 구분하며, concurrent index SQL 때문에
신규 설치를 단순 `prisma migrate deploy`로 대체할 수 없다. `db:push`는 SQL에 정의된 RLS와
마이그레이션 이력을 재현하지 않으므로 신규·운영 설치 명령으로 사용하지 않는다.
Seed와 Storage 초기화 스크립트는 개발 서버 시작의 필수 단계가 아니다.

```bash
npm run db:generate
npm run dev              # http://localhost:3000
```

PDF 변환에는 별도로 실행 중인 OMR 서비스가 필요하다. 앱 환경에 다음 값을 추가한다.

```env
OMR_SERVICE_URL="http://YOUR_OMR_HOST:3000"
OMR_SHARED_SECRET="REPLACE_WITH_SHARED_SECRET"
```

`OMR_SERVICE_URL`과 `NEXTAUTH_URL`은 유효한 절대 HTTP(S) URL이어야 한다. 둘 중 하나가
없거나 잘못되면 업로드는 DB 행을 만들기 전에 거절된다. 완료 콜백 주소는 `NEXTAUTH_URL`의
origin에 `/api/omr/finalize`를 붙여 만든다. 원격 OMR VM은 앱의 `localhost`에 접근할 수
없으므로 원격 서비스와 연결할 때는 OMR에서 도달할 수 있는 앱 주소를 설정해야 한다.

배포된 OMR 서비스와 앱의 완료 콜백은 같은 `OMR_SHARED_SECRET`이 필요하다.
앱은 시크릿이 없어도 업로드 요청을 보낼 수 있으며, 이것은 행 생성 전 URL 검증과 별개다.
로컬 OMR 서비스는 `ENVIRONMENT=development`일 때 시크릿 없이 요청을 받을 수 있지만,
앱의 완료 콜백은 시크릿이 없으면 거절한다. `SUPABASE_SERVICE_ROLE_KEY`는 앱 서버에만 두며
`NEXT_PUBLIC_` 변수나 OMR VM에 배치하지 않는다.
OMR 실행 절차는 [서비스 README](omr-service/README.md), 배포 절차는
[OMR 배포 가이드](omr-service/deploy/README.md)를 참고한다.
위 예시는 배포 가이드의 외부 3000 → 컨테이너 8000 구성을 따른다. 기존 VM의 평문 HTTP 노출은
시험 운영의 기한부 제약(D-012)이므로 TLS가 제공된다고 가정하지 않는다.
관련 결정과 종료 조건은 [DECISIONS](docs/recovery/DECISIONS.md)를 확인한다.

## 개발과 검증

```bash
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드 (Prisma 클라이언트 생성 포함)
npm run start            # 빌드 결과 실행
npm run db:push          # 개발용 스키마 반영
npm run db:migrate       # 개발용 마이그레이션 생성·적용
npm run db:studio        # Prisma Studio
npm run analyze          # 번들 크기 분석
```

전체 Jest에는 Python으로 실행하는 OMR 회귀 검사가 포함된다. CI는 Python 3.10과
[requirements-ci.txt](omr-service/requirements-ci.txt)를 사용한다. 가상환경은 저장소 밖에
만들고 활성화해 `python3`를 PATH에 넣거나 `PYTHON_BIN`으로 지정한다.

```bash
python3.10 -m venv /tmp/clairkeys-omr-ci-venv
source /tmp/clairkeys-omr-ci-venv/bin/activate
python -m pip install -r omr-service/requirements-ci.txt
export PYTHON_BIN="$VIRTUAL_ENV/bin/python"

npm test
npx tsc --noEmit --incremental false
npm run lint
```

변경 전 재현 테스트와 변경 영역 테스트를 먼저 확인하고, 같은 변경 트리에서 전체 Jest·타입
검사·lint를 한 번씩 수행한다. 문서만 바꾸면 편집 문서의 링크를 확인한다.
`next.config.mjs`는 빌드 중 타입·lint 검사를 생략하므로 빌드 성공만으로 이 검사를 대신할 수 없다.

로컬 E2E는 [e2e/](e2e/)의 변경 영역 spec을 필요한 브라우저로 실행한다. 예를 들어:

```bash
npx playwright install chromium
NEXTAUTH_SECRET="local-e2e-secret" NEXTAUTH_URL="http://localhost:3000" \
  npm run test:e2e -- e2e/hand-practice.spec.ts --project=chromium
```

DB를 포함한 앱 실행 환경은 먼저 준비해야 한다. [playwright.config.ts](playwright.config.ts)의
`webServer`가 서버가 없으면 `npm run build && npm start`를 실행한다. 로컬에서는 기존 서버를
재사용할 수 있다. 다른 브라우저를 검사할 때는 해당 브라우저를 설치하고 project를 선택한다.

PR CI는 Chromium·Firefox·WebKit·Firefox keyboard·Mobile Chrome·Mobile Safari의 여섯
project를 worker 2로 실행하며 production build도 검사한다. 문서만 바꾼 PR은 `Lint`의
ESLint·타입 검사만 실행하고 단위 테스트·E2E·보안 검사·빌드를 건너뛴다.
필수 check는 `Lint`·`Run Tests`·`E2E Tests`·`Security Audit`이다.
병합 후에는 D-101에 따라 통과한 PR head와 코드가 같다고 확인되면 Lint·단위 테스트·E2E를
생략하고 해당 PR의 검증 근거를 사용한다. 생략을 병합 후 E2E 통과로 기록하지 않는다.
실행 기준은 [WORKFLOW](docs/recovery/WORKFLOW.md), CI 정의는
[PR Checks](.github/workflows/pr-checks.yml)와 [Post-merge checks](.github/workflows/deploy.yml),
실행 결과와 한계는 [검증 기록](docs/recovery/validation/)을 따른다.

## 프로젝트 구조와 라우트

```text
ClairKeys/
├── src/
│   ├── app/              # 페이지와 API 라우트 (/learn, /practice 포함)
│   ├── components/       # 학습·업로드·재생·악보 표시 UI
│   ├── hooks/            # 재생, MIDI 입력, 연습 기록, 화면 방향
│   ├── lib/              # 인증, 업로드 검사, OMR 결과 저장, 학습 데이터
│   ├── services/         # 애니메이션 엔진, 오디오, 파일 저장
│   ├── repositories/     # Prisma 접근 계층
│   ├── utils/            # 애니메이션 계약, 건반, 박자, 손 선택
│   └── types/            # TypeScript 타입 정의
├── omr-service/          # PDF → MusicXML → JSON 변환 서비스 (Python)
├── prisma/               # DB 스키마와 마이그레이션
├── e2e/                  # Playwright 테스트
├── public/               # 피아노 음원, 학습용 악보와 정적 파일
├── scripts/              # DB·Storage 점검과 운영 도구
└── docs/recovery/         # 현재 상태, 결정, 단계, 검증·리뷰 기록
```

`/`, `/explore`, `/learn`과 하위 레슨·용어 사전·연습곡은 공개 페이지다.
`/sheet/[id]`는 공개 악보를 로그인 없이 재생하며 비공개 악보는 소유자만 접근한다.
`/upload`, `/library`, `/practice`, `/profile`은 로그인이 필요하다.

## 제한사항

- OMR 인식 정확도는 악보에 따라 달라진다. 박자표와 마디 길이가 어긋난 결과가 남을 수 있고,
  곡명·작곡가는 업로드 폼의 입력값을 사용한다. 인식 결과의 정확성을 보장하지 않는다.
- 기존 악보에는 MusicXML을 소급 생성하지 않는다. 악보 패널의 위치·손가락 번호 보조 표시는
  해당 데이터가 있을 때 제공한다. 저장된 MusicXML에 임의 수정 내용을 반영하는 기능은 없다.
- 이어 연습하기의 위치는 해당 브라우저에만 저장되며 계정으로 동기화되지 않는다.
  곡별 속도·손 선택·반복 구간 저장, 최근 연습곡 홈 표시, 연습 기록 삭제·초기화는 아직 구현되지
  않았다. 레슨 진행률·수료 기록도 제공하지 않는다.
- 실제 MIDI 피아노와 브라우저 권한 팝업, 실기기 터치·회전, 클릭·반주 청취 레벨,
  스크린리더 검증은 남아 있다. 자동화 테스트의 모바일 뷰포트 검사를 실기기 호환성 보장으로
  해석하지 않는다. 현재 검증 범위는 [HANDOFF](docs/recovery/HANDOFF.md)를 따른다.
- **비공개 악보의 애니메이션 JSON은 URL을 알면 익명으로 받을 수 있다.** 현재 플레이어가
  공개 Storage 버킷의 URL을 직접 사용하기 때문이다. MusicXML은 DB RLS로 직접 조회를 막고,
  서버 API에서 공개 여부·소유권을 확인한다. 공개 악보 XML은 누구나 조회하고, 비공개 악보 XML의
  비소유자·비로그인 요청은 404다. 자세한 저장·접근 조건은
  [Storage 설정](SUPABASE_STORAGE_SETUP.md)과 [DB 구성](DATABASE_SETUP.md)에 있다.
- OMR 큐는 영속화되지 않았으며 사용자 푸시 알림과 PWA 설치 안내 UI는 제공하지 않는다.

## 문서

현재 구성·기능·검증의 기준은 다음 문서와 코드다.

| 문서 | 내용 |
|---|---|
| [DATABASE_SETUP.md](DATABASE_SETUP.md) | 신규 DB 구성, 기존 DB 업데이트, MusicXML 저장·접근 조건 |
| [SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md) | Storage 구성, 현재 JSON 직접 접근의 제약 |
| [docs/recovery/HANDOFF.md](docs/recovery/HANDOFF.md) | 현재 상태, 다음 작업, 유효한 제약과 근거 |
| [docs/recovery/DECISIONS.md](docs/recovery/DECISIONS.md) | 설계·구현 결정과 이유 |
| [docs/recovery/validation/](docs/recovery/validation/) | 검증 명령·결과와 미검증 범위 |
| [docs/recovery/reviews/](docs/recovery/reviews/) | PR CI·리뷰·병합 기록 |
| [omr-service/deploy/README.md](omr-service/deploy/README.md) | OMR VM과 컨테이너 배포 |

[아키텍처](docs/architecture.md), [환경변수](docs/environment.md),
[제한사항](docs/limitations.md), [테스트](docs/testing.md),
[OMR 서비스 README](omr-service/README.md)는 일부 설명이 현재 구현보다 오래됐다.
설치·지원 범위·콜백·테스트 구성은 위 가이드와 현재 코드·CI 정의를 함께 확인한다.
[보안](docs/security.md), [배포](docs/deployment.md), [VM 교체](docs/vm-replacement.md) 문서도
관련 운영 작업의 참고 자료다.

## 기여

핵심 작업 규약은 [AGENTS.md](AGENTS.md), 실행 절차는
[WORKFLOW](docs/recovery/WORKFLOW.md), 커밋 형식은
[Lore](docs/recovery/LORE_COMMIT_PROTOCOL.md)를 따른다.
버그 리포트와 기능 제안은 [GitHub Issues](https://github.com/landfill/ClairKeys/issues)로 받는다.

## 라이선스

애플리케이션 코드에 적용되는 루트 `LICENSE` 파일은 없다. 코드 사용 조건은 이슈로 문의한다.
피아노 샘플은 별도의 [음원 라이선스](public/samples/piano/LICENSE.txt)에 따라
Alexander Holm의 Salamander Grand Piano V3를 수정한 CC BY 3.0 자산이다.
