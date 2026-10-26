import { SEEK_STEP_SEC } from '@/utils/playbackShortcuts'
import screenshots from './practiceScreenshots.json'

/**
 * 연습 방법 레슨의 재생 화면 둘러보기.
 *
 * 그림은 `scripts/capture-practice-screens.mjs`가 실제 재생기에서 찍고, 각 조작의 위치를
 * `practiceScreenshots.json`에 백분율로 남긴다. 재생 화면을 바꾸면 스크립트를 다시 돌린다(D-103).
 * 여기에는 그 위치에 붙일 이름과 설명만 둔다.
 */

/** [left, top, width, height], 그림 크기에 대한 백분율. */
export type ScreenRect = [number, number, number, number]

export interface ScreenShot {
  src: string
  /** 캡처한 CSS 픽셀 크기. 이미지 비율과 next/image의 크기로 쓴다. */
  width: number
  height: number
  hotspots: Record<string, ScreenRect[]>
}

export type ScreenVariant = 'mobile' | 'desktop'

export interface ScreenSpot {
  id: string
  label: string
  description: string
  /** 더 읽을 곳. 같은 레슨의 섹션은 `#id`로 건다. */
  more?: { href: string; label: string }
  /**
   * 번호표 자리. 기본은 요소의 왼쪽 끝이다. 번호표가 조작 자체(체크 상자, 메뉴의 값)를 가리거나
   * 다른 번호표와 겹치면 옮긴다. 그림마다 배치가 달라 그림별로 줄 수 있다.
   * 겹침은 `practiceScreens.test.ts`가 가장 좁은 표시 폭에서 확인한다.
   */
  anchor?: SpotAnchor | Partial<Record<ScreenVariant, SpotAnchor>>
}

/**
 * start·center·end: 첫 상자의 세로 가운데에서 왼쪽 끝·가운데·오른쪽 끝.
 * above: 첫 상자 가운데 바로 위. 그림 위쪽에 빈 띠가 있는 재생 중 화면의 맨 윗줄 조작에 쓴다.
 */
export type SpotAnchor = 'start' | 'center' | 'end' | 'above'

export interface PlaybackScreen {
  id: 'setup' | 'playing'
  title: string
  intro: string
  alt: string
  spots: ScreenSpot[]
  shots: Record<ScreenVariant, ScreenShot>
}

const section = (id: string, title: string) => ({ href: `#${id}`, label: `‘${title}’ 설명 보기` })

// JSON의 배열은 길이를 모르는 number[]로 읽힌다. 네 값인지는 practiceScreens.test.ts가 확인한다.
const shots = screenshots as unknown as Record<PlaybackScreen['id'], Record<ScreenVariant, ScreenShot>>

export const PLAYBACK_SCREENS: PlaybackScreen[] = [
  {
    id: 'setup',
    title: '재생 전 화면',
    intro: '곡을 열면 처음 보이는 화면이에요. 연습에 쓰는 설정이 모두 여기에 있어요.',
    alt: '재생 전 화면. 위에서부터 빠르기 표시, 재생 위치 막대, 재생·일시정지·중지 버튼과 A-B 구간 반복 버튼, 속도 메뉴, 연습할 손 선택, 계이름·메트로놈·준비 박자·기다리기 모드 체크 상자, 음량 막대, 노트 색상 안내가 있어요.',
    shots: shots.setup,
    spots: [
      {
        id: 'tempo', label: '빠르기 표시',
        description: '♩=60은 1분에 4분음표를 60번 치는 빠르기예요. 괄호 안은 이 값을 어디서 가져왔는지 알려 줘요(악보에서 읽음, 직접 입력 등).',
        anchor: 'end',
      },
      {
        id: 'progress', label: '재생 위치',
        description: '왼쪽 숫자는 지금 위치, 오른쪽 숫자는 곡 길이예요. 막대를 누르면 그 위치로 옮겨요.',
        more: section('ab-loop', 'A-B 구간 반복'),
        anchor: 'center',
      },
      {
        id: 'transport', label: '재생 · 일시정지 · 중지',
        description: '재생을 누르면 조작이 한 줄로 줄어든 재생 중 화면으로 바뀌어요. 중지는 처음 위치로 돌아가요.',
        more: section('keyboard-shortcuts', '키보드 단축키'),
        anchor: 'end',
      },
      {
        id: 'loop', label: 'A-B 구간 반복',
        description: 'A 시작은 지금 위치를 구간의 시작으로, B 종료는 끝으로 정해요. 초기화는 구간을 지워요. 정한 구간은 바로 아래 줄에 나와요.',
        more: section('ab-loop', 'A-B 구간 반복'),
        anchor: 'end',
      },
      {
        id: 'speed', label: '속도',
        description: '0.25배부터 2배까지 골라요. 처음에는 느리게 시작해 조금씩 올려요.',
        more: section('slow-start', '느리게 시작'),
        anchor: 'end',
      },
      {
        id: 'hands', label: '연습할 손',
        description: '양손·왼손·오른손 중에서 골라요. 한 손을 고르면 다른 손 소리 듣기가 함께 나와요. 양손 음표가 있는 곡에만 보여요.',
        more: section('one-hand', '한 손씩'),
        anchor: 'end',
      },
      {
        id: 'noteNames', label: '건반에 계이름 표시',
        description: '켜면 흰 건반 아래에 도·레·미·파·솔·라·시가 나와요.',
        more: section('slow-start', '느리게 시작'),
        anchor: 'end',
      },
      {
        id: 'metronome', label: '메트로놈 · 시작 전 준비 박자',
        description: '메트로놈은 박자마다 클릭 소리를 내고, 준비 박자는 연주가 시작되기 전에 박자를 들려줘요.',
        more: section('metronome', '메트로놈'),
        anchor: 'end',
      },
      {
        id: 'waitMode', label: '기다리기 모드',
        description: '맞는 건반을 누를 때까지 진행이 멈춰요. 켜면 바로 아래에 MIDI 연결 상태가 나와요.',
        more: section('wait-mode', '기다리기 모드'),
        anchor: 'end',
      },
      {
        id: 'volume', label: '음량',
        description: '앱이 내는 소리의 크기예요. 오른쪽 숫자는 조절할 수 있는 범위 중 몇 %인지예요.',
        anchor: 'center',
      },
      {
        id: 'colors', label: '노트 색상',
        description: '떨어지는 노트의 색으로 손을 구분해요. 파랑은 왼손, 빨강은 오른손이에요.',
        more: section('one-hand', '한 손씩'),
        anchor: 'end',
      },
      {
        id: 'scoreToggle', label: '악보 보기',
        description: '가로 1024px 이상 화면에서 마우스로 볼 때만 나와요. 켜면 노트 위에 악보를 함께 보여 주고, 재생 중에는 지금 마디를 표시해요.',
      },
    ],
  },
  {
    id: 'playing',
    title: '재생 중 화면',
    intro: '재생하면 노트가 화면을 넓게 쓰도록 조작이 맨 위 한 줄로 모여요. 일시정지해도 이 화면에 머물러요.',
    alt: '재생 중 화면. 맨 위 한 줄에 재생·일시정지, A·B·초기화, 정지 버튼, 재생 위치 막대, 속도 메뉴, 음량 막대가 있고, 그 아래에 빠르기 표시, 떨어지는 노트와 피아노 건반이 있어요.',
    shots: shots.playing,
    spots: [
      {
        id: 'transport', label: '재생 · 일시정지',
        description: '한 버튼으로 재생과 일시정지를 오가요. Space 키도 같은 일을 해요.',
        more: section('keyboard-shortcuts', '키보드 단축키'),
        anchor: 'above',
      },
      {
        id: 'loop', label: 'A · B · 초기화',
        description: '치면서 바로 구간을 정해요. A는 구간 시작, B는 구간 끝, ↻는 구간을 지워요.',
        more: section('ab-loop', 'A-B 구간 반복'),
        anchor: 'above',
      },
      {
        id: 'stop', label: '정지',
        description: '처음 위치로 돌아가 재생 전 화면으로 나가요. 손·메트로놈·기다리기 설정을 바꿀 때 눌러요.',
        anchor: 'above',
      },
      {
        id: 'progress', label: '재생 위치',
        description: `막대를 눌러 위치를 옮겨요. 키보드에서는 ←·→ 키로 ${SEEK_STEP_SEC}초씩 움직여요. 넓은 화면에서는 왼쪽에 지금 시간과 곡 길이가 나와요.`,
        more: section('keyboard-shortcuts', '키보드 단축키'),
        anchor: { mobile: 'end', desktop: 'above' },
      },
      {
        id: 'speed', label: '재생 속도',
        description: '재생 중에도 속도를 바꿀 수 있어요.',
        more: section('slow-start', '느리게 시작'),
        anchor: 'above',
      },
      {
        id: 'volume', label: '음량',
        description: '재생 중에도 소리 크기를 바꿀 수 있어요.',
        anchor: 'above',
      },
      {
        id: 'tempo', label: '빠르기 표시',
        description: '재생 중에는 조작 바 아래 작은 한 줄로 남아요.',
        anchor: 'end',
      },
      {
        id: 'scoreToggle', label: '악보 보기',
        description: '넓은 화면에서 마우스로 볼 때만 나와요. 켜 두면 노트 위에 악보가 나오고 지금 치는 마디를 표시해요.',
      },
      {
        id: 'lane', label: '떨어지는 노트',
        description: '노트가 위에서 내려와요. 노트가 길수록 건반을 오래 눌러요. 노트 안 숫자는 손가락 번호예요(번호가 있는 곡만).',
        more: { href: '/learn/hands#finger-numbers', label: '‘손가락 번호’ 레슨 보기' },
      },
      {
        id: 'keyboard', label: '건반 위 선과 건반',
        description: '노트의 아랫변이 건반 위 선에 닿을 때 그 건반을 눌러요. 지금 소리 나는 건반은 밝게 켜져요.',
        more: section('slow-start', '느리게 시작'),
      },
    ],
  },
]

/**
 * 번호표 자리(백분율). `above`이면 `top`은 상자의 윗변이고, 번호표는 그 위에 통째로 놓인다(그리는 쪽이 옮긴다).
 * 나머지는 번호표의 가운데가 이 점에 온다.
 */
export function spotAnchor(spot: ScreenSpot, rects: ScreenRect[], variant: ScreenVariant): { left: number; top: number; above: boolean } {
  const [left, top, width, height] = rects[0]
  const anchor = typeof spot.anchor === 'string' ? spot.anchor : spot.anchor?.[variant] ?? 'start'
  if (anchor === 'above') return { left: left + width / 2, top, above: true }
  const offset = anchor === 'end' ? width : anchor === 'center' ? width / 2 : 0
  return { left: left + offset, top: top + height / 2, above: false }
}
