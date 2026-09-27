# FEAT — 메트로놈과 시작 전 준비 박자

Status: `IN_PROGRESS` — branch `codex/feat-metronome-count-in`.
Base: 2026-09-27 main `5645b60`.

## Objective

재생 화면에 박을 들려주는 수단이 없다. 노트와 **정확히 같은 시계**로 울리는 메트로놈과, 재생을 누른 뒤
한 마디를 세고 시작하는 준비 박자를 추가한다. 틀린 박을 들려주는 것은 박이 없는 것보다 나쁘므로,
박 위치를 믿을 수 있는 경우에만 메트로놈을 제공한다.

## Beat grid (D-083)

- 악보 artifact의 마디 map(`start/end` 초, `startQuarter/endQuarter`)이 있으면 그것으로 박을 만든다. 마디 안
  템포 변화까지 따라가고, 첫 마디가 짧으면 못갖춘마디로 보고 가상의 강박에서 센다. 강박은 강조음이다.
- map이 없으면 초가 한 템포로 구워진 경우(`tempoSource: user|unknown`)에만 기준 BPM의 균등 격자를 쓴다.
  마디 시작을 모르므로 강조음은 없다.
- `tempoSource: score`인데 map이 없으면 곡 중간 템포 변화로 어긋날 수 있어 메트로놈을 끄고 이유를 보여준다.
- 박 단위: 6/8·9/8·12/8은 점4분음표, 그 외는 `4/분모` 4분음표.

## Work stages

1. 박 격자·오디오 클릭·재생 훅 준비 박자·플레이어 UI 테스트를 먼저 실패시킨다.
2. `beatGrid` 유틸, 오디오 `startAudio(..., { clicks, notesFrom })`로 클릭을 노트와 같은 anchor에 예약한다.
3. `useFallingNotesPlayer(notes, { clicks, countIn })`: 준비 박자는 시계를 한 마디 앞에서 시작하고, 재개 위치
   전의 노트는 소리 내지 않으며, 그동안 화면은 재개 위치에 멈추고 카운트다운을 보여준다.
4. 재생 준비 화면에 `메트로놈`·`시작 전 준비 박자`(기억됨)를 둔다. 악보 artifact는 켤 때만 받고
   `ScorePanel`과 한 번의 다운로드를 공유한다.

## Completion criteria

- 클릭은 노트와 같은 song-time anchor로 예약되어 재생 속도를 따른다. 음소거·정지 시 함께 멈춘다.
- 준비 박자 중에는 노트가 소리 나지 않고 화면이 움직이지 않으며, 일시정지하면 재개 위치로 돌아간다.
- 메트로놈 on/off는 재생 중 현재 위치에서 다시 예약된다.
- 관련 unit/E2E·타입·lint·build 통과, non-draft PR과 CI·리뷰 처리. 사용자 승인 전 병합하지 않는다.

## Out of scope

재생 중(압축 바) 토글, 클릭 음량 별도 조절, A-B 반복마다 준비 박자, 박 단위 선택, 실제 청취 음량 튜닝.
준비 박자는 map이 없으면 기준 BPM으로 센다. 템포가 곡 중간에 바뀌는 악보를 중간부터 재개하면 준비 박자의
빠르기가 그 지점과 다를 수 있다.
