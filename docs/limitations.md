# 제한사항과 미구현 기능

README의 [제한사항](../README.md#제한사항) 목록에 대한 근거다. 판정 시점의 검증 기록은
`docs/recovery/validation/`에 있다.

## 악보 인식

### 메트로놈 표기를 인식하지 못한다

빠르기 처리는 두 층으로 나뉘고, 둘 중 하나만 완성돼 있다.

| 층 | 하는 일 | 위치 | 상태 |
|---|---|---|---|
| 1. 인식 | 지면의 `♩ = 60` → MusicXML `<metronome>` | VM의 Audiveris | 동작하지 않는다 |
| 2. 해석 | MusicXML `<metronome>` → JSON `tempo` | `omr/converter.py` | 완성 (`<beat-unit>`·부점까지 환산) |

`converter.py`의 `_find_tempo`·`_metronome_quarter_bpm`은 `<sound tempo>`와 `<metronome>`을 읽어
4분음표 BPM으로 환산하고, 중간에 바뀌는 빠르기도 마디 단위 타임라인에 반영한다. 1층이
`<metronome>`을 만들어 주지 않으면 이 코드는 실행되지 않는다.

OCR을 되살린 뒤에도 같은 악보의 MusicXML에서 `<metronome>`은 0개였다. Audiveris 5.11은
`MetronomeInter`·`BeatUnitInter`·`TextRole.Metronome`을 갖고 있고 이를 끄는 `ProcessingSwitch`도
없으므로 경로 자체는 배선돼 있으나, 원인은 아직 규명되지 않았다
([이슈 #48](https://github.com/landfill/ClairKeys/issues/48)).

그래서 빠르기는 업로드 폼의 선택 입력으로 받는다. 결과 JSON의 `tempoSource`는 입력이 있으면
`user`, 없으면 `unknown`이며, `score`는 실제 악보에서 관측된 적이 없다.

### OCR이 곡명·작곡가를 채우지 않는다

OCR은 별도 서비스가 아니라 같은 Audiveris 실행의 `TEXTS` 단계에서 Tesseract를 호출하는 방식이다.

2026-08-23 실측에서 OCR이 읽어낸 글자는 전부 `<credit-words>`로 나왔다.

```
'Piano Solo - Love Affair'   'Love Affair OST'
'Ennio Morricone'            'trans. Jose Hernandez'
'10' '13' '16' '19' '25' '28'        (마디 번호)
```

지면의 제목·부제·작곡가·편곡자를 정확히 읽은 것은 맞다. 그러나 변환기가 읽는 `<work-title>`과
`<creator type="composer">`를 Audiveris가 함께 채우는지는 검증되지 않았다. 채우지 않는다면 이
글자들은 어디에도 반영되지 않는다. 마디 번호는 JSON에 나오지 않고, 가사·나타냄말은 `<words>`로
나오지만 변환기가 쓰지 않는다.

화면에 보이는 제목·작곡가는 DB `SheetMusic` 행의 값이고, 그 행은 서비스가 돌려준 값으로
덮어쓰지 않는다. 즉 사용자가 업로드 폼에 입력한 값이 그대로 표시된다.

이 결함이 오래 보이지 않은 이유는 업로드 폼이 제목과 작곡가를 묻기 때문이다. 사용자가 타이핑한
값이 OCR이 채웠어야 할 자리를 메워, 완전히 죽은 텍스트 파이프라인이 동작하는 것처럼 보였다
([이슈 #49](https://github.com/landfill/ClairKeys/issues/49), 2026-08-23 수정).

실측 전문: `docs/recovery/validation/2026-08-23-omr-image-rebuild-after-48-49.md`.

#### traineddata를 체크섬으로 고정한 이유

`omr-service/Dockerfile.audiveris`는 Ubuntu 패키지가 설치한 `eng.traineddata`를 덮어쓴다.

- `tesseract-ocr-eng` 패키지의 영어 모델은 4,113,088 B짜리 LSTM 전용이다.
- Audiveris는 Tesseract를 legacy 엔진 모드로 초기화하고, 엔진 모드를 바꿀 설정 상수를 노출하지 않는다.
- 그 조합은 페이지마다 `Could not initialize TessBaseAPI languages: eng in legacy mode`와
  `No OCR'd lines`를 남기고 글자를 한 자도 읽지 못한다.

그래서 `tesseract-ocr/tessdata` 4.1.0의 23,466,654 B legacy+LSTM 통합 모델을 sha256 핀과 함께
받아 같은 경로에 설치한다. 프로비저닝된 언어는 `eng` 하나다.

### 박자가 맞지 않는 인식 결과를 걸러내지 않는다

마디 길이가 박자표와 어긋나도 지금은 조용히 그대로 재생된다
([이슈 #44](https://github.com/landfill/ClairKeys/issues/44)).

## 미구현 기능

아래 항목은 코드가 존재하지만 어떤 라우트에서도 도달할 수 없다. "파일이 있으니 동작한다"고
읽히지 않도록 여기에 적는다.

| 항목 | 코드 위치 | 상태 |
|---|---|---|
| 연습 모드 · 따라하기 모드 | `FallingNotesPlayer.handleModeChange` | 모드 전환 핸들러가 로그만 남기고 반환한다. 실동작은 듣기 모드 하나 |
| 전체화면 피아노, 터치 제스처, 햅틱 | `src/components/mobile/*` | 어떤 페이지도 import하지 않는다 |
| PWA 설치 프롬프트 | `src/components/pwa/PWAInstallPrompt.tsx` | 마운트되지 않는다 |
| 푸시 알림 | `src/components/pwa/PushNotifications.tsx`, `/api/notifications/*` | 컴포넌트가 마운트되지 않는다 |
| Tone.js 기반 오디오 | `src/services/audioService.ts`, `src/lib/audio/piano.ts` | `useAudio` → `PianoKeyboard` 사슬 끝이 미마운트라 재생 경로에 없다 |
| `AnimationPlayer` | `src/components/animation/AnimationPlayer.tsx` | `/sheet/[id]`는 `FallingNotesPlayer`를 쓴다 |

service worker(`public/sw.js`)는 `layout.tsx`에서 등록되어 정적 파일·피아노 샘플 캐싱을 수행한다.
`/offline` 페이지도 존재한다. 다만 오프라인 상태에서 어느 범위까지 사용 가능한지는 검증된 적이 없다.

## 처리 상태와 알림

canonical 업로드 경로(`/api/omr/upload`, `/api/omr/finalize`)는 `ProcessingJob`·`ProcessingNotification`
행을 만들지 않는다. 실제 진행 상태는 `SheetMusic.processingStatus`에만 있다. 그래서 `/api/notifications`가
읽는 알림은 실사용 경로에서 발생하지 않고, 업로드 상태는 해당 화면의 폴링으로만 확인한다.
근거는 `docs/recovery/phases/DS-G1-processing-state-contract.md`.

## 접근 제어

비공개 악보(`isPublic: false`)의 애니메이션 JSON도 공개 Supabase Storage 버킷에 있다.
`GET /api/sheet/<id>`는 익명 요청에 `Access denied`를 주지만, 소유자로 얻은 URL을 자격증명 없이
요청하면 200으로 파일이 내려온다. 비공개 악보의 보호는 현재 URL 은닉뿐이다.
자세한 내용은 [security.md](security.md).
