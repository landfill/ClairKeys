import type { Metadata } from 'next'
import Link from 'next/link'
import LessonLayout from '@/components/learn/LessonLayout'
import LessonSection, { type LessonSectionItem } from '@/components/learn/LessonSection'
import ReadingExplorer from '@/components/learn/ReadingExplorer'
import ScoreExample from '@/components/learn/ScoreExample'
import { ListenButton, ReadingAudioProvider } from '@/components/learn/ReadingAudio'
import { RHYTHM_EXAMPLES } from '@/lib/learn/rhythm'
import { READING_EXAMPLES } from '@/lib/learn/reading'

export const metadata: Metadata = {
  title: '악보 읽기 | ClairKeys',
  description: '오선의 음높이를 건반과 연결하고, 음표와 쉼표의 길이, 점음표, 박자표를 예시로 익혀 봐요.',
}

const READING_SECTIONS: LessonSectionItem[] = [
  { id: 'staff-intro', title: '오선' },
  { id: 'treble-intro', title: '높은음자리표' },
  { id: 'bass-intro', title: '낮은음자리표' },
  { id: 'middle-c-intro', title: '가운데 도' },
  { id: 'pitch-explorer', title: '오선과 건반 연결하기' },
  { id: 'note-lengths', title: '음표의 길이' },
  { id: 'rest-lengths', title: '쉼표' },
  { id: 'dotted-lengths', title: '점음표' },
  { id: 'meters', title: '박자표' },
]

function Examples({ ids }: { ids: readonly string[] }) {
  return <div className="mt-4 grid gap-5">{READING_EXAMPLES.filter(example => ids.includes(example.id)).map(example => (
    <div key={example.id} className="min-w-0">
      <p data-lesson-note className="mb-2 text-sm font-semibold text-ink">{example.title}</p>
      <ScoreExample example={example} />
      <ListenButton midis={example.midis} label={`${example.title} 들어 보기`} />
    </div>
  ))}</div>
}

function RhythmExamples({ ids }: { ids: readonly string[] }) {
  return <div className="mt-4 grid gap-5">{RHYTHM_EXAMPLES.filter(example => ids.includes(example.id)).map(example => (
    <div key={example.id} className="min-w-0">
      <p data-lesson-note className="mb-2 text-sm font-semibold text-ink">{example.title}</p>
      <ScoreExample example={example} />
      <ListenButton rhythm={example} label={`${example.title} 들어 보기`} />
    </div>
  ))}</div>
}

export default function ReadingPage() {
  return (
    <LessonLayout lessonId="reading" sections={READING_SECTIONS}>
      <ReadingAudioProvider>
        <div className="space-y-8">
          <LessonSection section={READING_SECTIONS[0]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">오선은 다섯 줄과 그 사이의 네 칸으로 이루어져 있어요. 줄과 칸은 아래에서 위로 세요. 같은 음자리표에서 위로 갈수록 높은 음을 나타내요.</p>
          </LessonSection>

          <LessonSection section={READING_SECTIONS[1]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">높은음자리표(G clef)는 오른손이 주로 읽어요. 둘째 줄이 솔(G4)이어서 G 음자리표라고 해요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">줄의 음은 아래부터 미·솔·시·레·파예요. 칸의 음은 아래부터 파·라·도·미예요.</p>
            <Examples ids={['treble-lines', 'treble-spaces']} />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[2]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">낮은음자리표(F clef)는 왼손이 주로 읽어요. 넷째 줄이 파(F3)여서 F 음자리표라고 해요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">줄의 음은 아래부터 솔·시·레·파·라예요. 칸의 음은 아래부터 라·도·미·솔이에요.</p>
            <Examples ids={['bass-lines', 'bass-spaces']} />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[3]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">오선 바깥의 음을 적을 때 짧은 덧줄을 써요. 가운데 도는 높은음자리표의 아래 덧줄 하나, 낮은음자리표의 위 덧줄 하나에 적혀요. 두 그림 모두 같은 건반인 가운데 도(C4, MIDI 60)를 나타내요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">큰보표는 높은음자리표와 낮은음자리표의 두 오선을 함께 읽는 보표예요. 두 오선에서 가운데 도가 같은 음을 나타낸다는 점으로 연결해 읽을 수 있어요.</p>
            <Examples ids={['middle-treble', 'middle-bass']} />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[4]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">음 선택 버튼이나 흰 건반을 누르면 같은 음의 악보와 위치, 계이름을 확인할 수 있어요. 소리는 들어 보기 버튼으로 확인해요. 건반 이름과 위치는 <Link href="/learn/keyboard" className="inline rounded-sm py-3 text-accent hover:underline">건반 레슨</Link>에서도 익힐 수 있어요.</p>
            <ReadingExplorer />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[5]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">길이는 4분음표를 한 박으로 놓고 비교해요. 온음표는 4박, 2분음표는 2박, 4분음표는 1박, 8분음표는 반 박이에요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">온음표는 빈 머리만 있고, 2분음표는 빈 머리에 기둥이 있어요. 4분음표는 찬 머리에 기둥이 있고, 8분음표는 찬 머리와 기둥에 꼬리 하나가 붙어요. 이어지는 8분음표는 꼬리 대신 굵은 가로줄로 서로 이어 그리기도 해요.</p>
            <p data-lesson-note className="mt-2 text-sm text-ink-muted max-w-[45rem]">리듬 예시 소리는 4분음표 기준으로 분당 80번의 빠르기예요. 음높이는 같은 솔(G4)을 써서 길이에 집중할 수 있어요.</p>
            <table className="mt-3 w-full border-collapse text-left text-sm text-ink-muted">
              <caption className="mb-2 text-left font-semibold text-ink">음표 길이 비교</caption>
              <thead><tr className="border-b border-rule"><th scope="col" className="p-2 text-ink">음표 이름</th><th scope="col" className="p-2 text-ink">4분음표 기준 박 수</th></tr></thead>
              <tbody>{[['온음표', '4박'], ['2분음표', '2박'], ['4분음표', '1박'], ['8분음표', '반 박'], ['점2분음표', '3박'], ['점4분음표', '1박 반']].map(([name, length]) => (
                <tr key={name} className="border-b border-rule"><th scope="row" className="p-2 font-normal">{name}</th><td className="p-2">{length}</td></tr>
              ))}</tbody>
            </table>
            <RhythmExamples ids={['note-whole', 'note-half', 'note-quarter', 'note-eighth']} />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[6]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">쉼표는 같은 이름의 음표와 같은 길이만큼 쉬는 표시예요. 아래 4분의 4박자 예시에서 온쉼표는 4박, 2분쉼표는 2박, 4분쉼표는 1박, 8분쉼표는 반 박을 쉬어요.</p>
            <p data-lesson-note className="mt-2 text-sm text-ink-muted max-w-[45rem]">쉼표 들어 보기는 소리 없이 정해진 시간만큼 지나가요. 버튼 아래의 재생 차례 글로 진행을 확인할 수 있어요.</p>
            <RhythmExamples ids={['rest-whole', 'rest-half', 'rest-quarter', 'rest-eighth']} />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[7]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">음표에 점이 하나 붙으면 원래 길이의 절반만큼 길어져요. 원래 길이의 1.5배예요. 점2분음표는 2박에 1박을 더해 3박이고, 점4분음표는 1박에 반 박을 더해 1박 반이에요.</p>
            <RhythmExamples ids={['note-dotted-half', 'note-dotted-quarter']} />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[8]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">세로줄(마디줄)로 나눈 한 구간이 마디예요. 박자표의 아래 숫자는 세는 기준 음표를 가리키고, 위 숫자는 그 음표 몇 개의 길이가 한 마디에 들어가는지 알려 줘요. 아래 숫자 4는 4분음표, 8은 8분음표를 가리켜요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">4분의 4박자는 4분음표를 한 박으로 네 박, 4분의 3박자는 세 박을 세요. 그림에서는 한 박의 8분음표 두 개를 묶었어요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">8분의 6박자는 한 마디에 8분음표 여섯 개가 들어가요. 셋씩 두 묶음으로 세요. 전체 길이는 4분음표 세 개와 같아요.</p>
            <p data-lesson-note className="mt-2 text-sm text-ink-muted max-w-[45rem]">들어 보기에서는 각 묶음의 첫 음을 조금 세게 내서, 4분의 3박자는 둘씩 세 묶음으로, 8분의 6박자는 셋씩 두 묶음으로 들려요.</p>
            <RhythmExamples ids={['meter-four', 'meter-three', 'meter-six']} />
          </LessonSection>

          <p className="text-base text-ink leading-relaxed max-w-[45rem]">손가락 번호는 <Link href="/learn/hands" className="inline rounded-sm py-3 text-accent hover:underline">손 레슨</Link>에서, 연습 방법은 <Link href="/learn/practice" className="inline rounded-sm py-3 text-accent hover:underline">연습 방법 레슨</Link>에서 익혀 봐요.</p>
        </div>
      </ReadingAudioProvider>
    </LessonLayout>
  )
}
