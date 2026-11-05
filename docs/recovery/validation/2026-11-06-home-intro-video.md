# 홈 소개 영상 검증 — 2026-11-06 KST

## 범위

후속 `68c88f6`의 Safari preload 테스트 계약 보완·추가 검증은 [보완 원본](2026-11-06-home-intro-preload-hint.md)에 있다.

- 기준 main `d5ebd05538db3482b0628122a2805fcfa2ecfed3`, origin/main과 동일함을 fetch로 확인.
- 작업 브랜치 `codex/home-intro-video`, 코드 커밋 `e8a5c7f6bb96932423fe1b8d83927172532e7183`.
- 사용자 제공 영상으로 홈의 정적 이미지와 figcaption 전체를 교체한다. D-106·[phase](https://github.com/landfill/ClairKeys/blob/e8a5c7f6bb96932423fe1b8d83927172532e7183/docs/recovery/phases/HOME-intro-video.md).
- 사용자 소유 미추적 `.codex/`는 보존·미포함. 앱 연습 엔진·OMR·DB 변경 없음.

## 미디어와 재현 명령

원본 `C:\Users\surro\Downloads\clairkeys-demo-sound.mp4`는 Git에 추가하지 않았다.
원본 SHA256 `7a58e6706f2bd401d17ef4b1d5f91d0486fea38ddd090759e1d162530201e69b`.

```powershell
ffmpeg -hide_banner -loglevel warning -i C:\Users\surro\Downloads\clairkeys-demo-sound.mp4 -map 0:v:0 -map 0:a:0 -vf "scale=1280:720:flags=lanczos" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -c:a copy -map_metadata -1 -movflags +faststart -y public/videos/clairkeys-intro.mp4
ffmpeg -hide_banner -loglevel error -ss 3 -i public/videos/clairkeys-intro.mp4 -frames:v 1 -q:v 3 -y public/videos/clairkeys-intro-poster.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration,sample_rate,channels:format=size,duration -of json public/videos/clairkeys-intro.mp4
ffmpeg -hide_banner -loglevel error -i public/videos/clairkeys-intro.mp4 -f null -
```

FFmpeg 8.0.1, 모든 명령 exit 0. 원본 7,279,902 bytes(1920×1080/60fps) → MP4 **2,238,610 bytes**, 69.25% 감소.
H.264/yuv420p, 1280×720/60fps, 28.000s, AAC 48kHz/stereo/28.000s. 포스터 42,132 bytes, 3초 위치.
양쪽 파일을 각각 `ffmpeg -v error -i <file> -map 0:a:0 -c:a copy -f hash -hash sha256 -`로 비교:
`aafd1ac4523858eded83b3d2f471e60851318bd2ec33836d19ce8f8924125d44`로 동일. 청취 평가와 구분한다.

추가 압축 확인: main에서 코드 커밋의 MP4를 Git blob 그대로 로컬 결과 폴더에 추출한 뒤
`ffmpeg -i <original> -i <optimized> -filter_complex "[0:v]scale=1280:720:flags=lanczos[ref];[ref][1:v]ssim" -an -f null -` 실행 exit 0.
전체 1680 frames의 SSIM All **0.995478**. 원본을 같은 720p로 축소한 참조와의 압축 비교이며, 1080p 해상도 보존이나 주관적 화질 평가를 뜻하지 않는다.

## 회귀 및 로컬 검증

| 명령·확인 | 결과 |
|---|---|
| 구현 전 `npx jest src/app/__tests__/page.test.tsx --runInBand` | 새 소개 영상 계약 1 fail / 기존 7 pass. 영상 label 부재로 의도한 실패 |
| 수정 후 같은 홈 Jest | 8 tests pass |
| `npx tsc --noEmit --incremental false` | 최종 exit 0 |
| `npm run lint` | exit 0, 경고·오류 0 |
| `npx playwright test e2e/home-intro-video.spec.ts e2e/application-smoke.spec.ts --grep 'introduction\|real home page\|first screen\|zoom' --project=chromium --project=firefox --project='Mobile Chrome' --workers=2 --reporter=line` | 기존 홈 9 pass. 새 영상 선택자가 부모 region까지 잡아 3 fail; 아래 선택자 수정 후 3 pass |
| `npx playwright test e2e/home-intro-video.spec.ts --project=chromium --project=firefox --project='Mobile Chrome' --workers=2 --reporter=line` | 3 pass, 14.4s. 교체·수동 재생·초기 영상 요청 0·실제 MP4/JPEG HTTP 200/MIME·4MB 이하·390/762/1440px 화면비와 가로 경계 |
| 실제 Chromium 미디어 재생 | 네이티브 play 클릭 → 1.177s/76 frames, 1280×720, duration=28, muted=false, error=null. 7초 seek·Space 일시정지/재개·26초 seek 후 ended=true, 1 pass/9.1s |
| 최종 로딩 후 캡처·동일 미디어 시나리오 | 1 pass/8.5s. 1.641s/103 frames, error=null |
| `git diff --check`, staged diff 확인 | exit 0, 관련 파일만 포함 |

미디어 검증용 임시 spec/config는 Git 제외 `local-test-data/results/home-intro-video/media.{spec,config}.ts`.
명령은 `npx playwright test --config=local-test-data/results/home-intro-video/media.config.ts --reporter=line`.
원본 응답 fixture 없이 실제 로컬 Next dev 서버의 자산을 디코딩했다. 오디오 시계 모사·codec 실패 skip 없음.
검증용 서버는 `NEXTAUTH_SECRET=test-secret`, `NEXTAUTH_URL=http://localhost:3000`, `npm run dev`로 실행.

실제 화면: [1440×900](https://github.com/landfill/ClairKeys/blob/e8a5c7f6bb96932423fe1b8d83927172532e7183/docs/recovery/validation/2026-11-06-home-intro-desktop.png), [390px 모바일 전체 페이지](https://github.com/landfill/ClairKeys/blob/e8a5c7f6bb96932423fe1b8d83927172532e7183/docs/recovery/validation/2026-11-06-home-intro-mobile.png).
기존 figcaption이 사라졌고 16:9 포스터/조작기가 같은 홈 영역에 표시된다. 캡처의 Next 개발 표시기는 운영 UI가 아니다.

## 전체 Jest

- `PYTHON_BIN=<venv-monitor310>/Scripts/python.exe npx jest --runInBand --json --outputFile=...`: **180 suites 중 172 pass / 8 fail, 1784 tests 중 1773 pass / 11 fail**, 350.65s.
- 실패 묶음은 `postMergeVerified`, `omrRuntimeContract`, `pianoSamples`, `course`, `uploadPathInventory`, `nextConfig`, `prChecksWorkflow`, `postMergeWorkflow`.
  [PR261 당시 Windows baseline](2026-11-03-omr-monitor-pilot.md#전체-회귀와-baseline-차이)과 파일·실패 11개가 대응한다.
  CRLF 문자열 비교·POSIX 셸 실행·Windows ESM URL·NamedTemporaryFile 재열기 제한이며 영상 구현과 무관한 경로다.
- 현 main에서 실패한 8개 묶음만 `npx jest --runTestsByPath <8 files> --runInBand --json`으로 대조:
  **8 suites fail / 12 tests fail / 145 tests pass**, 226.385s. 두 JSON의 실패 이름을 정렬해 `Compare-Object`로 비교:
  작업 브랜치 실패 **11개 모두 main에서도 실패**, main에만 `passes test_audiveris_runtime.py` 실패 1개 추가.
  추가 실패는 10ms timeout mock의 `SuccessfulProcess.kill` 부재이며 [PR261 기록](2026-11-03-omr-monitor-pilot.md#전체-회귀와-baseline-차이)에도 같은 시간 의존 경로가 있다.
  영상 변경의 새 실패 없음. 로컬 전체 통과로 표현하지 않는다.

## 환경에서 실패한 시도와 한계

- 최초 sandbox의 전체 Jest는 Python 하위 실행에서 진행이 멈춰 중단했다. 정상 권한으로 전체 실행을 다시 시작했다.
- sandbox의 Playwright는 브라우저 경로가 별도 sandbox 프로필을 가리켜 executable 부재로 실패했다.
  서버 재사용 확인도 실패해 불필요한 build를 시도했고 Google Fonts DNS·`.next` 쓰기 EPERM으로 실패했다. production build 성공으로 세지 않는다.
- dev 서버 시작과 타입 검사를 동시에 수행해 `.next/types` 파일이 바뀌는 도중 TS6053이 발생했다.
  저장소 안 `.next` 경로를 확인·정리하고 정상 서버가 준비된 뒤 타입 검사 exit 0을 확인했다.
- Aside는 실행 중이지 않아 연결되지 않았고, in-app browser는 localhost 연결 시간 초과였다.
  화면·실제 재생은 로컬 Playwright Chromium에서 검증했다.
- 실제 iOS/Android, 스크린리더, 주관적 청취, 운영 배포는 미검증.
- 로컬 dev 서버 종료 로그에 기존 Windows ARM/Prisma native engine 비호환 오류가 있었다.
  비로그인 홈의 정적 자산·실제 영상 재생 확인 범위이며, 로컬 로그인·DB 기능 검증을 의미하지 않는다.
- production build·전체 브라우저 E2E·최신 head 리뷰는 PR CI에서 판정한다. 병합·배포는 승인 범위 밖.
- GitHub push의 `Internal Server Error` 후 작업 브랜치는 재시도로 원격 SHA 일치를 확인했다.
  상태 기록 main push는 반복 `fatal error in commit_refs`로 실패했다. Git API로 동일한 tree·author·committer·message를 전송해
  로컬과 동일한 커밋 SHA `e30735f`를 생성한 뒤 `force=false` ref 갱신으로 반영했다. fetch 후 origin/main과 로컬 main의 차이 0.
