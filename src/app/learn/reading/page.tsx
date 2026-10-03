import type { Metadata } from 'next'
import Link from 'next/link'
import LessonLayout from '@/components/learn/LessonLayout'
import ReadingExplorer from '@/components/learn/ReadingExplorer'
import ScoreExample from '@/components/learn/ScoreExample'
import { ListenButton, ReadingAudioProvider } from '@/components/learn/ReadingAudio'
import { READING_EXAMPLES } from '@/lib/learn/reading'

export const metadata: Metadata = {
  title: '악보 읽기: 음높이 | ClairKeys',
  description: '오선의 줄과 칸, 높은음자리표와 낮은음자리표를 읽고 가운데 도를 건반과 연결해 봐요.',
}

function Examples({ ids }: { ids: readonly string[] }) {
  return <div className="mt-4 grid gap-5">{READING_EXAMPLES.filter(example => ids.includes(example.id)).map(example => (
    <div key={example.id} className="min-w-0">
      <p className="mb-2 text-sm font-semibold text-ink">{example.title}</p>
      <ScoreExample example={example} />
      <ListenButton midis={example.midis} label={`${example.title} 들어 보기`} />
    </div>
  ))}</div>
}

export default function ReadingPage() {
  return (
    <LessonLayout lessonId="reading">
      <ReadingAudioProvider>
        <div className="space-y-8 text-sm text-ink-muted">
          <section aria-labelledby="staff-intro">
            <h2 id="staff-intro" className="text-lg font-semibold text-ink">오선</h2>
            <p className="mt-2">오선은 다섯 줄과 그 사이의 네 칸으로 이루어져 있어요. 줄과 칸은 아래에서 위로 세요. 같은 음자리표에서 위로 갈수록 높은 음을 나타내요.</p>
          </section>
          <section aria-labelledby="treble-intro">
            <h2 id="treble-intro" className="text-lg font-semibold text-ink">높은음자리표</h2>
            <p className="mt-2">높은음자리표(G clef)는 오른손이 주로 읽어요. 둘째 줄이 솔(G4)이어서 G 음자리표라고 해요.</p>
            <p className="mt-2">줄의 음은 아래부터 미·솔·시·레·파예요. 칸의 음은 아래부터 파·라·도·미예요.</p>
            <Examples ids={['treble-lines', 'treble-spaces']} />
          </section>
          <section aria-labelledby="bass-intro">
            <h2 id="bass-intro" className="text-lg font-semibold text-ink">낮은음자리표</h2>
            <p className="mt-2">낮은음자리표(F clef)는 왼손이 주로 읽어요. 넷째 줄이 파(F3)여서 F 음자리표라고 해요.</p>
            <p className="mt-2">줄의 음은 아래부터 솔·시·레·파·라예요. 칸의 음은 아래부터 라·도·미·솔이에요.</p>
            <Examples ids={['bass-lines', 'bass-spaces']} />
          </section>
          <section aria-labelledby="middle-c-intro">
            <h2 id="middle-c-intro" className="text-lg font-semibold text-ink">가운데 도</h2>
            <p className="mt-2">오선 바깥의 음을 적을 때 짧은 덧줄을 써요. 가운데 도는 높은음자리표의 아래 덧줄 하나, 낮은음자리표의 위 덧줄 하나에 적혀요. 두 그림 모두 같은 건반인 가운데 도(C4, MIDI 60)를 나타내요.</p>
            <p className="mt-2">큰보표는 높은음자리표와 낮은음자리표의 두 오선을 함께 읽는 보표예요. 두 오선에서 가운데 도가 같은 음을 나타낸다는 점으로 연결해 읽을 수 있어요.</p>
            <Examples ids={['middle-treble', 'middle-bass']} />
          </section>
          <section aria-labelledby="pitch-explorer">
            <h2 id="pitch-explorer" className="text-lg font-semibold text-ink">오선과 건반 연결하기</h2>
            <p className="mt-2">음 선택 버튼이나 흰 건반을 누르면 같은 음의 악보와 위치, 계이름을 확인할 수 있어요. 소리는 들어 보기 버튼으로 확인해요. 건반 이름과 위치는 <Link href="/learn/keyboard" className="rounded-sm text-accent hover:underline">건반 레슨</Link>에서도 익힐 수 있어요.</p>
            <ReadingExplorer />
          </section>
        </div>
      </ReadingAudioProvider>
    </LessonLayout>
  )
}
