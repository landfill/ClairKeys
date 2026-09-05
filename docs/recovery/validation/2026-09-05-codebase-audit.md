# 2026-09-05 — 악보 파싱·운지·박자·성능 재점검

## Scope and revision

- 요청: GitHub 이슈와 현재 코드베이스 재점검. 이번 작업은 조사이며 애플리케이션 수정·이슈 변경·PR 생성은 수행하지 않았다.
- 분석 기준: `main` / `2636657ecbdac6d354bd2e874026b9a05ff6d9c1`. `git fetch origin` 후 `main..origin/main` 0건.
- 기존 사용자 변경: `.claude/settings.local.json`. 읽거나 수정하거나 stage하지 않았다.
- GitHub 열린 이슈 15건을 조회했다. 핵심 신규 보고는 #134, #135, #137이며 관련 이슈는 #44, #126, #127, #130이다.
- [실제 JSON 원문·해시 재계산·실행 가능한 진단 코드](2026-09-05-codebase-audit-evidence.md)를 함께 보관한다. PDF는 임시 위치에서 첫 페이지 전체를 렌더링해 확인했으며 저장소에 보관하지 않는다(D-040).

## 결과

기존 정확도 테스트가 통과해도 실제 악보의 학습 가능성을 보장하지 못한다. 이번 사례에서는 입력 단위의 불명확성, 박자표 불일치, 유지음과 실제 손가락 점유의 구분 부재, 반복 재생 제어 오류가 각각 확인됐다. #130의 비용 모델만 계속 조정해서 해결할 수 있는 문제가 아니다. #130에 대한 D-045의 보류 결정을 변경하지 않는다.

### A1 — 높음: #134는 자동 템포 인식 실패만으로 설명되지 않는다

출처: [#134](https://github.com/landfill/ClairKeys/issues/134), [원본 PDF](https://github.com/user-attachments/files/31858211/Clair_de_Lune_easy_300dpi.pdf), [실제 서빙 JSON](https://ghgiqtinaxjsuotfzmcw.supabase.co/storage/v1/object/public/animation-data/804629/omr_6a946dd7-05e3-4c03-9e0d-8017aeab5d22.json).

| 항목 | 원본 첫 페이지 | 서빙 JSON |
| --- | --- | --- |
| 박자표 | 9/8 | `6/8` |
| 템포 표기 | 점4분음표=46 | `tempo: 46`, `tempoSource: user` |
| 시간 계산에 쓰인 4분음표 BPM | 표기의 환산값 69 | `timingReferenceBpm: 46` |
| 자동 인식값 | 위 표기와 대응 | `scoreTempo: 69` |

133음, 저장 duration `80.86956500000001`초, `generated_at: 2026-09-05T04:52:58.598673`.
SHA-256: `16e3e8717a90b52d466524f34fe2afcb5648efc3ef67b846972481bda1707541`.

`converter.py:82`는 사용자 숫자가 있으면 악보의 템포를 덮어쓰고, `:100` 이후의 시간 계산에도 그 값을 사용한다. 점4분음표 46은 4분음표 기준 69이므로, 같은 음표 길이에 대해 46을 쓰면 시간은 1.5배가 된다. 이는 **템포 단위 차이만의 효과**이며 전체 곡의 오류가 정확히 1.5배라는 주장은 아니다.

`OMRUploadForm.tsx:427`은 단위를 단순히 `BPM`이라고 표시한다. 악보에 인쇄된 46을 그대로 입력하기 쉬운 구조다. 자동 인식된 69는 보존됐지만 선택되지 않았다. 이는 입력 동작의 증거이며 사용자가 어떤 의도로 46을 입력했는지까지 입증하지 않는다.

원본 9/8과 저장 6/8의 불일치는 템포 숫자 수정으로 해결되지 않는다. 플레이어 정규화와 `canonicalToFallingNotes`를 실행했을 때 133음의 MIDI·start·duration 변경은 0건이다. 이 사례에서 잘못된 박자표는 이미 저장본에 있다. 다만 이 업로드의 중간 MusicXML과 OMR `/result`를 확보하지 않았으므로 **Audiveris 인식 오류와 MusicXML→JSON 변환 오류의 기여를 분리하지 못했다**. #44의 계보 확인 원칙을 유지한다.

### A2 — 높음: #135는 유지음까지 손으로 누르라고 보이는 계약 공백이다

출처: [#135](https://github.com/landfill/ClairKeys/issues/135), [원본 PDF](https://github.com/user-attachments/files/31858485/Premiere_Gymnopedie_300dpi.pdf), [실제 서빙 JSON](https://ghgiqtinaxjsuotfzmcw.supabase.co/storage/v1/object/public/animation-data/804629/omr_76e63915-5fd8-4a65-8a38-ec27255c25cf.json).

283음, 3/4, 사용자 BPM 76, `scoreTempo: null`, duration `111.315789`초.
SHA-256: `bedf109c747a274368629876e24e112d9790854ae00c572aaf263d6db33f34c0`.

첫 마디 원본과 JSON은 낮은 베이스음이 3박 지속되고 한 박 뒤 위쪽 화음이 들어오는 점에서 일치한다. 따라서 단순히 낮은음자리표를 오른손으로 옮기는 식의 수정은 근거가 없다. 283음의 `staff→hand` 불일치는 0건이고 정규화·플레이어 경계에서 MIDI·시간 변경도 0건이다.

| 구간 | 유지되는 베이스 | 나중에 시작하는 화음 | 동시에 눌러야 한다고 읽으면 |
| --- | --- | --- | --- |
| 첫 마디 0.789474초 | G2, finger 5, 0~2.368421초 | B3/D4/F#4, fingers 4/3/2 | 23반음 폭 |
| 둘째 마디 3.157895초 | D2, finger 5, 2.368421~4.736842초 | A3/C#4/F#4, fingers 5/3/2 | 28반음 폭, 서로 다른 음에 finger 5 중복 |

`fingeringUtils.ts:275`는 손별 **같은 시작 시각**만 이벤트로 묶는다. 이미 울리고 있는 다른 이벤트의 음은 화음 도달 검사에 포함하지 않는다. `dataConverter.ts:97`은 voice와 staff도 버린다. `CanonicalNote`에는 하나의 `duration`만 있고, 페달·키 해제 시각·소리의 지속과 손가락 점유를 구분하는 필드가 없다. `visualUtils.ts:79`는 duration 전체 동안 건반을 활성 상태로 표시한다.

현재 모델로 이 악보의 동시 시작 그룹만 검사하면 도달 불가 그룹은 **0**이다. 각 전체 onset에서 이미 지속 중인 음까지 포함하면 도달 불가 손별 관측 시점은 **65**다. 이는 65개의 독립적인 화음이나 65개의 정답 운지 오류를 뜻하지 않는다. 같은 유지 상태를 여러 onset에서 관측할 수 있으며, 소리의 지속을 손가락 유지로 해석할 때의 모순을 측정한 수치다.

베이스의 음가를 임의로 줄이거나 페달을 자동 발명하는 것도 이번 조사에서 정당화되지 않는다. 필요한 후속 설계는 악보 음가, 실제 타건/해제, 페달 또는 유지음 안내를 어떻게 구분할지 정하는 것이다. `voice`별 추론만 도입해도 서로 다른 성부가 같은 손가락을 중복 점유할 수 있으므로, #126의 경계 정보 전달만으로 해결 완료를 선언하면 안 된다.

### A3 — 높음: A–B 반복 첫 복귀에서 애니메이션 프레임이 끊긴다

위치: `src/hooks/useFallingNotesPlayer.ts:197`.

B에 도달하면 `handleSeek(A)`를 호출한 뒤 `return`하여 `requestAnimationFrame(animationLoop)`에 도달하지 않는다. 정상적인 seek 성공에서는 `isPlaying`이 true로 유지되고 effect 의존성도 유지되므로 프레임 예약이 다시 시작되지 않는다.

실제 hook을 jsdom에서 실행하고 실제 audio hook처럼 안정된 콜백 참조를 제공한 진단 결과:

```text
A=2, B=4, audio clock=4.1
before: pending RAF=1
after wrap: pending RAF=0, isPlaying=true, displayTime=2, audioStarts=2
```

오디오는 재시작하지만 화면은 A에서 멈추며 후속 반복 경계도 검사하지 못한다. 실기기 성능 저하와 별도로 발생하는 제어 흐름 결함이다. 기존 `useFallingNotesPlayer.test.ts`는 A/B 마커의 유효성만 검사하며 B를 통과하지 않는다. 이 테스트의 audio mock은 매 렌더마다 새 콜백을 만들어 실제 참조 안정성과도 다르다. 이번 진단은 브라우저 청감 또는 물리 기기 검증은 아니다.

### A4 — 중간: 변환기가 마디 내부 템포 변경 위치를 무시한다

위치: `omr-service/omr/converter.py:238`, `:378`, `:417`.

한 마디에서 첫 템포 하나를 찾아 마디 전체에 사용한다. 이후 direction의 현재 위치와 offset은 노트 순회에서 처리하지 않는다. MusicXML의 sound 변경은 현재 악보 위치 및 offset에 연결되며 tempo 단위는 4분음표/분이다([W3C sound reference](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/sound/)).

최소 재현: 60 BPM에서 4초짜리 첫 마디, 다음 마디의 D4 1박, 그 뒤 120 BPM 변경과 E4 1박.

```text
기대: D4 start=4 duration=1;   E4 start=5   duration=0.5
실제: D4 start=4 duration=0.5; E4 start=4.5 duration=0.5
```

이는 합성 입력으로 확인한 변환 결함이며 #134의 직접 원인으로 확정한 것은 아니다. 기존 tempo corpus는 마디 경계의 변경을 검증하므로 이 사례를 잡지 못한다.

### A5 — 중간: 악보 구조가 보존·검증되지 않는 범위가 넓다

- `converter.py:294`는 박자표와의 일치 여부를 검사하지 않고 관측한 최대 진행 길이를 다음 마디 시작에 더한다. pickup·불완전 마디의 정당한 예외와 OMR 오인식을 구별하는 진단이 없다. 모든 마디를 박자표 길이로 강제 보정하는 것은 해결책으로 결정하지 않았다.
- `<barline>/<repeat>/<ending>`을 처리하지 않는다. `times=2`가 있는 1음짜리 반복 마디를 넣어도 1번만 출력된다. #135 원본에는 1·2번 ending이 있지만 그 업로드의 XML이 없으므로 인식 결과에 이 표기가 남았는지는 확인하지 못했다. 반복 구간과 횟수의 의미는 [W3C repeat reference](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/repeat/)와 대조했다.
- `_extract_key_signature`는 음수 fifths와 minor mode를 처리하지 않는다. F major(`fifths=-1`)와 A minor(`fifths=0, mode=minor`) 모두 `C`가 나온다. 현재 운지 모델은 이 필드를 읽지 않으므로 이번 두 운지 증상의 직접 원인이라고 주장하지 않는다. #126에서 조표를 소비하기 전에 공급자의 정확성을 먼저 확인해야 한다.
- tie key가 `(midi, voice)`뿐이다(`converter.py:267`). 같은 voice ID를 두 staff에서 재사용한 합성 입력은 독립된 tie 두 쌍을 2음으로 합치는 대신 3음, 길이 1/2/1초로 만든다. 일반적인 Audiveris 출력이나 두 사용자 악보에서 발생했다고 입증한 것은 아니다. 단순히 staff를 key에 추가하면 cross-staff tie를 깨뜨릴 수 있으므로 수정 방식도 미결정이다.
- `eventCandidates:390`은 도달 가능한 후보가 0이면 도달 불가능한 원래 후보를 다시 사용한다. 이는 D-043에 명시된 기존 예외다. 따라서 현재의 reach 검사는 **모든 악보에 대한 불가능 운지 0 보증이 아니다**. 진단·경고 없이 추론 번호를 보여주는 한계가 남는다.
- MusicXML은 `app.py:349`의 변환 뒤 `:373`에서 삭제되고 `/result`는 JSON만 반환한다. #127의 진단 자료 보관 문제는 이번 #134에서도 원인 분리를 제한했다. 보관 정책 자체는 이번 조사에서 변경하지 않았다.

### A6 — 중간: #137의 템포 안내와 편집 범위가 실제 동작과 맞지 않는다

- **자동 인식 기능은 있다.** `_find_tempo`는 `<sound tempo>` 및 metronome의 beat unit/dot을 읽는다. #134의 `scoreTempo:69`는 실제 산출물에서도 그 경로의 증거다. 숫자 없는 `Lent et douloureux` 같은 표현에서 숫자를 추정하는 기능은 없다.
- 업로드의 "비워두면 빠르기 미상" 안내(`OMRUploadForm.tsx:446`)는 악보 템포가 있으면 이를 채택하는 변환기와 불일치한다. 단위도 단순 BPM만 표시한다.
- `type=number`, `step=any`이며 wheel 입력 방지 처리가 없다. 사용자의 스크롤 오입력 보고와 맞는 UI 구조이나 이번 세션에서 해당 브라우저의 wheel 동작 자체는 실측하지 않았다.
- 2026-09-05 호출 경로 추가 확인: **실제 LibrarySheetMusicList 편집 대화상자는 제목만 수정한다.** 별도 `SheetMusicEditForm`과 `PUT /api/sheet/[id]`에는 제목·작곡가·카테고리·공개 여부 지원이 있지만 라이브러리는 이 폼을 사용하지 않는다. **템포 편집은 UI와 API 모두 지원하지 않는다.** 최초 기록의 PATCH 표기도 PUT으로 정정했다.
- 템포는 이미 노트의 초 단위 시간에 반영돼 있다. 메타데이터 숫자만 바꾸는 수정은 재생 속도를 바꾸지 않는다. 저장 템포 수정의 의미와 시간 변환 범위를 먼저 정의해야 한다.

## 성능: 확인한 비용과 미확인 범위

현재 재생 경로는 `FallingNotesPlayer → useFallingNotesPlayer → useFallingNotesAudio`다. 별도 `animationEngine`이나 미사용 `audiveris_docker.py`의 결함을 현재 사용자 경로의 원인으로 혼동하지 않았다.

- 운지 추론은 player의 `useMemo([animationData])` 안에서 실행된다. 매 프레임 DP가 재실행되는 구조는 아니다.
- 최초 진단 실행에서 12,000음 단음 입력 4회 추론은 **42.01 / 21.46 / 22.12 / 16.93ms**, 48,000음은 **81.67 / 95.68 / 67.94 / 76.96ms**였다. 저장된 재현 코드 재실행에서는 초기 비용이 달랐다(12,000음 첫 회 49.75ms). 이 수치는 실기기 SLA나 최대 복잡도의 화음 벤치마크가 아니다.
- 매 frame `calculateSongLength` 전체 reduce, `getActiveNotes` 전체 filter, `notesToVisualNotes` 전체 순회가 있다. audio window 선택도 100ms마다 전체 filter와 선택 집합 sort를 수행한다. visible note만 렌더링해도 검색 비용은 전체 음 수에 비례한다.
- 이 세 시각 계산과 매 6회 audio window 선택을 600회 실행한 평균은 최초 실행에서 12,000음 **0.195ms**, 48,000음 **0.577ms**였다. React 조정, DOM layout/paint, 오디오 노드 생성, 샘플 디코딩, 모바일 CPU는 제외했다. 따라서 검색 비용만으로 현재의 심각한 버벅임을 입증하지 못했다.
- 첫 음 재생 전에는 샘플 로딩을 최대 **2.5초** 기다리는 경로가 있다(`useFallingNotesAudio.ts:143, :588`). 이는 기존에 의도된 음색 정책이다. 실측한 사용자 지연으로 보고하지 않으며 초기 로딩 지연과 재생 중 frame 끊김을 구분해 측정해야 한다.
- `getActiveNotes`는 끝점을 `<=`로 포함한다. 정확한 경계 시각 t=1에서 끝난 C4와 새 D4를 모두 반환하는 작은 시각적 중복도 재현했다. #135의 수 초짜리 유지음 문제와는 규모가 다르다.

## 검증 명령과 결과

| 명령 | 결과 |
| --- | --- |
| `npm test -- --runInBand src/utils/__tests__/converterCorpus.test.ts src/utils/__tests__/converterTempoContract.test.ts src/utils/__tests__/fingeringUtils.test.ts src/utils/__tests__/fingeringCorpus.test.ts src/utils/__tests__/fingeringMetricValidity.test.ts src/utils/__tests__/audioScheduler.test.ts src/utils/__tests__/playbackClock.test.ts src/hooks/__tests__/useFallingNotesPlayer.test.ts src/hooks/__tests__/useFallingNotesAudio.test.ts` | 9 suites / 116 tests PASS |
| `npm test -- --runInBand` | 94 suites / 904 tests PASS, 14.003초. ProfilePage의 act 경고 등 console 출력 있음 |
| `npx tsc --noEmit --incremental false` | PASS, exit 0 |
| `npm run lint` | PASS. `next lint` 폐기 예정 CLI 안내만 있음 |
| evidence 문서의 JavaScript 진단 명령 | 두 원문 해시 확인, 유지음 모순과 A–B RAF 0 재현, exit 0 |
| evidence 문서의 Python 진단 명령 | 마디 내부 템포·repeat·조표·동일 voice cross-staff tie 관측 재현, exit 0 |
| 정규화→플레이어 전체 노트 비교 | #134 133음 / #135 283음, MIDI·start·duration 변경 각각 0, staff→hand 불일치 각각 0 |

진단 코드의 exit 0은 **기존 결함을 재현했다는 의미**다. 원하는 동작으로 수정됐다는 의미가 아니다. 전체 Jest 통과 역시 실제 악보의 음악적 정확도 검증 완료를 뜻하지 않는다.

미실행: production build, Playwright E2E, 실제 모바일 프레임 프로파일, 브라우저 오디오 청감 비교, VM 부하 측정, Audiveris 재변환. 새 변환 작업을 만들거나 운영 데이터를 수정하지 않았다. 이번 두 업로드의 중간 MusicXML과 `/result` 전체 동일성도 미확인이다.

## 후속 작업 제안 — 계획 변경 또는 착수 승인을 뜻하지 않음

1. **독립된 작은 수정:** A–B 반복의 실제 B 통과 회귀 테스트와 frame 예약 복구. 음악적 정답 운지나 새 저장 계약 없이 다룰 수 있다.
2. **#134 + #137:** 4분음표/점4분음표 단위와 자동 인식 안내를 명확히 하고, 원본 9/8이 6/8로 된 지점을 같은 업로드의 XML 계보로 분리한다. 메타데이터만 덮어써 완료 처리하지 않는다.
3. **#135:** 두 실제 JSON을 회귀 corpus로 승격하고, 유지음·손가락 점유·페달 안내의 계약을 정한다. 현행 동시 onset reach 검사와 sustained-note 점유 검사를 구별한다.
4. **변환 정확도:** 마디 중간 템포·반복/ending·박자 진단을 각각 재현 fixture와 목적별 PR로 진행한다. #127의 진단 산출물 보관 판단을 함께 검토한다.
5. **성능:** 모바일에서 첫 재생 대기, 재생 중 frame, seek/loop를 각각 프로파일링한 뒤 측정된 병목부터 수정한다. 이번 미세 벤치마크만으로 전면 재작성의 필요성을 주장하지 않는다.

상태 문서 커밋 이후의 GitHub check 조회는 HANDOFF와 GitHub live state를 함께 확인한다. 위 검증 대상 SHA는 애플리케이션 코드의 분석 기준이며, 이후 상태 기록 커밋 SHA와 혼동하지 않는다.
