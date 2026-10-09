import { LEARN_LESSONS, type LearnLesson } from '@/lib/learn/lessons'

export type GlossaryTermId =
  | 'middle-c'
  | 'solfege'
  | 'staff'
  | 'lines-spaces'
  | 'treble-clef'
  | 'bass-clef'
  | 'ledger-line'
  | 'grand-staff'
  | 'whole-note'
  | 'half-note'
  | 'quarter-note'
  | 'eighth-note'
  | 'rests'
  | 'dotted-note'
  | 'time-signature'
  | 'measure'
  | 'barline'
  | 'fingering'
  | 'five-finger-position'
  | 'playback-speed'
  | 'one-hand-practice'
  | 'ab-loop'
  | 'wait-mode'
  | 'metronome'
  | 'count-in'

export interface GlossaryTerm {
  id: GlossaryTermId
  name: string
  definition: string
  href: string
}

/** Short reminders of the published lessons; source checks live in recovery validation. */
export interface GlossaryGroup {
  id: string
  title: string
  terms: GlossaryTerm[]
}

const reading = '/learn/reading'
const rhythm = '/learn/reading/rhythm'
const practice = '/learn/practice'
const hands = '/learn/hands'

export const GLOSSARY_GROUPS: GlossaryGroup[] = [
  {
    id: 'pitch', title: '건반과 음높이', terms: [
      { id: 'middle-c', name: '가운데 도', definition: '건반과 악보를 연결할 때 기준으로 삼는 도(C4)예요. 높은음자리표 아래 덧줄 하나, 낮은음자리표 위 덧줄 하나에 적혀요.', href: `${reading}#middle-c-intro` },
      { id: 'solfege', name: '계이름', definition: '도·레·미·파·솔·라·시로 음을 부르는 이름이에요. 이 앱에서는 C를 도로 표시해요.', href: `${practice}#slow-start` },
      { id: 'staff', name: '오선', definition: '음높이를 적는 다섯 줄과 그 사이의 네 칸이에요. 줄과 칸은 아래에서 위로 세요.', href: `${reading}#staff-intro` },
      { id: 'lines-spaces', name: '줄·칸', definition: '오선의 선 위가 줄, 두 줄 사이가 칸이에요. 같은 음자리표에서는 위로 갈수록 높은 음을 나타내요.', href: `${reading}#staff-intro` },
      { id: 'treble-clef', name: '높은음자리표', definition: '오선의 둘째 줄을 솔(G4)로 정하는 음자리표예요. 피아노에서는 주로 오른손이 읽어요.', href: `${reading}#treble-intro` },
      { id: 'bass-clef', name: '낮은음자리표', definition: '오선의 넷째 줄을 파(F3)로 정하는 음자리표예요. 피아노에서는 주로 왼손이 읽어요.', href: `${reading}#bass-intro` },
      { id: 'ledger-line', name: '덧줄', definition: '오선 바깥의 음을 적을 때 더하는 짧은 줄이에요.', href: `${reading}#middle-c-intro` },
      { id: 'grand-staff', name: '큰보표', definition: '피아노 악보에서 높은음자리표와 낮은음자리표의 두 오선을 함께 읽는 보표예요.', href: `${reading}#middle-c-intro` },
    ],
  },
  {
    id: 'rhythm', title: '음표와 박자', terms: [
      { id: 'whole-note', name: '온음표', definition: '4분음표를 한 박으로 놓으면 네 박 길이예요. 빈 머리만 있어요.', href: `${rhythm}#note-lengths` },
      { id: 'half-note', name: '2분음표', definition: '4분음표를 한 박으로 놓으면 두 박 길이예요. 빈 머리에 기둥이 있어요.', href: `${rhythm}#note-lengths` },
      { id: 'quarter-note', name: '4분음표', definition: '4분음표를 한 박으로 놓으면 한 박 길이예요. 찬 머리에 기둥이 있어요.', href: `${rhythm}#note-lengths` },
      { id: 'eighth-note', name: '8분음표', definition: '4분음표를 한 박으로 놓으면 반 박 길이예요. 찬 머리와 기둥에 꼬리 하나가 있고, 이어서 그릴 때는 굵은 가로줄로 묶기도 해요.', href: `${rhythm}#note-lengths` },
      { id: 'rests', name: '온쉼표·2분쉼표·4분쉼표·8분쉼표', definition: '쉼표는 소리를 내지 않고 쉬는 길이를 나타내요. 기본 길이를 비교하면 각각 같은 이름의 음표와 길이가 같아요.', href: `${rhythm}#rest-lengths` },
      { id: 'dotted-note', name: '점음표', definition: '음표 오른쪽의 점 하나는 원래 길이의 절반을 더해요. 점2분음표는 4분음표 세 개, 점4분음표는 4분음표 한 개 반의 길이예요.', href: `${rhythm}#dotted-lengths` },
      { id: 'time-signature', name: '박자표', definition: '아래 숫자는 길이의 기준이 되는 음표를, 위 숫자는 그 음표 몇 개의 길이가 한 마디에 들어가는지 알려 줘요.', href: `${rhythm}#meters` },
      { id: 'measure', name: '마디', definition: '악보에서 세로줄로 나누어 놓은 구간이에요. 박자표는 한 마디에 들어가는 기본 길이를 알려 줘요.', href: `${rhythm}#meters` },
      { id: 'barline', name: '세로줄', definition: '악보를 마디로 나누는 세로선이에요.', href: `${rhythm}#meters` },
    ],
  },
  {
    id: 'fingers', title: '손과 손가락', terms: [
      { id: 'fingering', name: '손가락 번호·운지', definition: '음에 붙은 숫자는 사용할 손가락을 가리켜요. 양손 모두 엄지부터 새끼손가락까지 1·2·3·4·5예요.', href: `${hands}#finger-numbers` },
      { id: 'five-finger-position', name: '다섯 손가락 자리', definition: '이 레슨에서는 도~솔의 다섯 건반에 손가락을 하나씩 놓는 연습을 해요. 다른 곡에서도 도를 언제나 같은 손가락으로 치는 것은 아니에요.', href: `${hands}#five-fingers` },
    ],
  },
  {
    id: 'practice', title: '재생과 연습', terms: [
      { id: 'playback-speed', name: '재생 속도', definition: '곡이 진행되는 빠르기를 배율로 바꾸는 설정이에요. 이 앱에서는 0.25배부터 2배까지 고를 수 있어요.', href: `${practice}#slow-start` },
      { id: 'one-hand-practice', name: '한 손 연습', definition: '양손 음표가 있는 곡에서 왼손이나 오른손을 골라 연습해요. 다른 손의 음표는 옅어져요.', href: `${practice}#one-hand` },
      { id: 'ab-loop', name: 'A-B 구간 반복', definition: '재생 위치로 시작 A와 끝 B를 정해 그 사이를 반복하는 기능이에요. B에 도달하면 A로 돌아가요.', href: `${practice}#ab-loop` },
      { id: 'wait-mode', name: '기다리기 모드', definition: '맞는 건반을 누를 때까지 곡의 진행이 멈추는 모드예요. 같은 시점의 음이 여러 개면 필요한 건반을 모두 눌러요.', href: `${practice}#wait-mode` },
      { id: 'metronome', name: '메트로놈', definition: '박자에 맞춰 클릭 소리를 내는 기능이에요. 이 앱에서는 필요한 박자 정보가 있는 곡에서 사용할 수 있어요.', href: `${practice}#metronome` },
      { id: 'count-in', name: '준비 박자', definition: '연주가 시작되기 전에 들려주는 박자예요. 기다리기 모드에서는 메트로놈과 준비 박자가 나오지 않아요.', href: `${practice}#metronome` },
    ],
  },
]

export function glossaryTermHref(id: GlossaryTermId): string {
  return `/learn/glossary#term-${id}`
}

export function lessonForHref(href: string): LearnLesson | undefined {
  const path = href.split('#')[0]
  return LEARN_LESSONS.find(lesson => lesson.href === path)
}

export function filterGlossary(
  groups: readonly GlossaryGroup[],
  options: { query?: string; groupId?: string }
): GlossaryGroup[] {
  const trimmed = options.query?.trim()
  const lowerQuery = trimmed ? trimmed.toLowerCase() : ''
  const targetGroup = options.groupId && options.groupId !== 'all' ? options.groupId : null

  const filteredGroups: GlossaryGroup[] = []

  for (const group of groups) {
    if (targetGroup && group.id !== targetGroup) continue

    const matchingTerms = group.terms.filter(term => {
      if (!lowerQuery) return true
      return (
        term.name.toLowerCase().includes(lowerQuery) ||
        term.definition.toLowerCase().includes(lowerQuery)
      )
    })

    if (matchingTerms.length > 0) {
      filteredGroups.push({
        ...group,
        terms: matchingTerms,
      })
    }
  }

  return filteredGroups
}
