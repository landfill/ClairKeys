import type { Metadata } from 'next'
import Link from 'next/link'
import LessonLayout from '@/components/learn/LessonLayout'
import LessonSection, { type LessonSectionItem } from '@/components/learn/LessonSection'
import ReadingExplorer from '@/components/learn/ReadingExplorer'
import ScoreExample from '@/components/learn/ScoreExample'
import { ListenButton, ReadingAudioProvider } from '@/components/learn/ReadingAudio'
import { READING_EXAMPLES } from '@/lib/learn/reading'

export const metadata: Metadata = {
  title: '악보 읽기 1: 음높이 | ClairKeys',
  description: '오선의 음높이를 건반과 연결하고 예시로 익혀 봐요.',
}

const READING_SECTIONS: LessonSectionItem[] = [
  { id: 'staff-intro', title: '오선' },
  { id: 'treble-intro', title: '높은음자리표' },
  { id: 'bass-intro', title: '낮은음자리표' },
  { id: 'middle-c-intro', title: '가운데 도' },
  { id: 'pitch-explorer', title: '오선과 건반 연결하기' },
]

function Examples({ ids, alwaysPair }: { ids: readonly string[]; alwaysPair?: boolean }) {
  return (
    <div className={`mt-4 grid gap-5 ${alwaysPair ? 'grid-cols-2 gap-3 md:gap-5' : 'md:grid-cols-2'}`}>
      {READING_EXAMPLES.filter(example => ids.includes(example.id)).map(example => (
        <div key={example.id} className="min-w-0">
          <p data-lesson-note className="mb-2 text-sm font-semibold text-ink">{example.title}</p>
          <ScoreExample example={example} />
          <ListenButton midis={example.midis} label={`${example.title} 들어 보기`} />
        </div>
      ))}
    </div>
  )
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
            <Examples ids={['middle-treble', 'middle-bass']} alwaysPair />
          </LessonSection>

          <LessonSection section={READING_SECTIONS[4]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">음 선택 버튼이나 흰 건반을 누르면 같은 음의 악보와 위치, 계이름을 확인할 수 있어요. 소리는 들어 보기 버튼으로 확인해요. 건반 이름과 위치는 <Link href="/learn/keyboard" className="inline rounded-sm py-3.5 text-accent hover:underline">건반 레슨</Link>에서도 익힐 수 있어요.</p>
            <ReadingExplorer />
          </LessonSection>
        </div>
      </ReadingAudioProvider>
    </LessonLayout>
  )
}
