import type { Metadata } from 'next'
import Link from 'next/link'
import LessonLayout from '@/components/learn/LessonLayout'
import LessonSection, { type LessonSectionItem } from '@/components/learn/LessonSection'
import RhythmExamplePanel, { type RhythmPanelItem } from '@/components/learn/RhythmExamplePanel'
import { ReadingAudioProvider } from '@/components/learn/ReadingAudio'

export const metadata: Metadata = {
  title: '악보 읽기 2: 길이와 박자 | ClairKeys',
  description: '음표와 쉼표의 길이, 점음표, 박자표를 예시로 익혀 봐요.',
}

const RHYTHM_SECTIONS: LessonSectionItem[] = [
  { id: 'note-lengths', title: '음표의 길이' },
  { id: 'rest-lengths', title: '쉼표' },
  { id: 'dotted-lengths', title: '점음표' },
  { id: 'meters', title: '박자표' },
]

const NOTE_LENGTH_ITEMS: readonly RhythmPanelItem[] = [
  { id: 'note-whole', beats: '4박' },
  { id: 'note-half', beats: '2박' },
  { id: 'note-quarter', beats: '1박' },
  { id: 'note-eighth', beats: '반 박' },
]

const REST_LENGTH_ITEMS: readonly RhythmPanelItem[] = [
  { id: 'rest-whole' },
  { id: 'rest-half' },
  { id: 'rest-quarter' },
  { id: 'rest-eighth' },
]

const DOTTED_LENGTH_ITEMS: readonly RhythmPanelItem[] = [
  { id: 'note-dotted-half', beats: '3박' },
  { id: 'note-dotted-quarter', beats: '1박 반' },
]

const METER_ITEMS: readonly RhythmPanelItem[] = [
  { id: 'meter-four' },
  { id: 'meter-three' },
  { id: 'meter-six' },
]

export default function ReadingRhythmPage() {
  return (
    <LessonLayout lessonId="reading-rhythm" sections={RHYTHM_SECTIONS}>
      <ReadingAudioProvider>
        <div className="space-y-8">
          <LessonSection section={RHYTHM_SECTIONS[0]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">길이는 4분음표를 한 박으로 놓고 비교해요. 온음표는 4박, 2분음표는 2박, 4분음표는 1박, 8분음표는 반 박이에요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">온음표는 빈 머리만 있고, 2분음표는 빈 머리에 기둥이 있어요. 4분음표는 찬 머리에 기둥이 있고, 8분음표는 찬 머리와 기둥에 꼬리 하나가 붙어요. 이어지는 8분음표는 꼬리 대신 굵은 가로줄로 서로 이어 그리기도 해요.</p>
            <p data-lesson-note className="mt-2 text-sm text-ink-muted max-w-[45rem]">리듬 예시 소리는 4분음표 기준으로 분당 80번의 빠르기예요. 음높이는 같은 솔(G4)을 써서 길이에 집중할 수 있어요.</p>
            <RhythmExamplePanel label="음표 길이 비교" items={NOTE_LENGTH_ITEMS} />
          </LessonSection>

          <LessonSection section={RHYTHM_SECTIONS[1]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">쉼표는 같은 이름의 음표와 같은 길이만큼 쉬는 표시예요. 아래 4분의 4박자 예시에서 온쉼표는 4박, 2분쉼표는 2박, 4분쉼표는 1박, 8분쉼표는 반 박을 쉬어요.</p>
            <p data-lesson-note className="mt-2 text-sm text-ink-muted max-w-[45rem]">쉼표 들어 보기는 소리 없이 정해진 시간만큼 지나가요. 버튼 아래의 재생 차례 글로 진행을 확인할 수 있어요.</p>
            <RhythmExamplePanel label="쉼표 예시" items={REST_LENGTH_ITEMS} />
          </LessonSection>

          <LessonSection section={RHYTHM_SECTIONS[2]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">음표에 점이 하나 붙으면 원래 길이의 절반만큼 길어져요. 원래 길이의 1.5배예요. 점2분음표는 2박에 1박을 더해 3박이고, 점4분음표는 1박에 반 박을 더해 1박 반이에요.</p>
            <RhythmExamplePanel label="점음표 예시" items={DOTTED_LENGTH_ITEMS} />
          </LessonSection>

          <LessonSection section={RHYTHM_SECTIONS[3]}>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">세로줄(마디줄)로 나눈 한 구간이 마디예요. 박자표의 아래 숫자는 세는 기준 음표를 가리키고, 위 숫자는 그 음표 몇 개의 길이가 한 마디에 들어가는지 알려 줘요. 아래 숫자 4는 4분음표, 8은 8분음표를 가리켜요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">4분의 4박자는 4분음표를 한 박으로 네 박, 4분의 3박자는 세 박을 세요. 그림에서는 한 박의 8분음표 두 개를 묶었어요.</p>
            <p className="mt-2 text-base text-ink leading-relaxed max-w-[45rem]">8분의 6박자는 한 마디에 8분음표 여섯 개가 들어가요. 셋씩 두 묶음으로 세요. 전체 길이는 4분음표 세 개와 같아요.</p>
            <p data-lesson-note className="mt-2 text-sm text-ink-muted max-w-[45rem]">들어 보기에서는 각 묶음의 첫 음을 조금 세게 내서, 4분의 3박자는 둘씩 세 묶음으로, 8분의 6박자는 셋씩 두 묶음으로 들려요.</p>
            <RhythmExamplePanel label="박자표 예시" items={METER_ITEMS} />
          </LessonSection>

          <div data-lesson-prose>
            <p className="text-base text-ink leading-relaxed max-w-[45rem]">손가락 번호는 <Link href="/learn/hands" className="inline rounded-sm py-3.5 text-accent hover:underline">손 레슨</Link>에서, 연습 방법은 <Link href="/learn/practice" className="inline rounded-sm py-3.5 text-accent hover:underline">연습 방법 레슨</Link>에서 익혀 봐요.</p>
          </div>
        </div>
      </ReadingAudioProvider>
    </LessonLayout>
  )
}
