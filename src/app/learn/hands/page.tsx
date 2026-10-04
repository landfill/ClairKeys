import type { Metadata } from 'next'
import Link from 'next/link'
import LessonLayout from '@/components/learn/LessonLayout'
import HandsKeyboard from '@/components/learn/HandsKeyboard'

export const metadata: Metadata = {
  title: '손 자세와 손가락 번호 | ClairKeys',
  description: '양손의 손가락 번호와 기본 손 모양을 알아보고, 도부터 솔까지 다섯 손가락 자리를 건반에서 익혀요.',
}

export default function HandsPage() {
  return (
    <LessonLayout lessonId="hands">
      <div className="space-y-6 text-sm text-ink-muted">
        <section aria-labelledby="finger-numbers">
          <h2 id="finger-numbers" className="text-lg font-semibold text-ink">손가락 번호</h2>
          <p className="mt-2">양손 모두 엄지는 1, 검지는 2, 중지는 3, 약지는 4, 새끼손가락은 5예요. 같은 번호는 같은 손가락을 가리켜요. 두 손의 번호 배치는 거울처럼 대칭이에요.</p>
          <p className="mt-2">악보와 재생 화면에서 음에 붙은 운지 숫자는 음의 이름이 아니라 사용할 손가락을 가리켜요.</p>
        </section>
        <section aria-labelledby="hand-shape">
          <h2 id="hand-shape" className="text-lg font-semibold text-ink">기본 손 모양</h2>
          <p className="mt-2">손가락을 자연스럽게 둥글게 두고 손끝으로 건반을 눌러요. 손목과 팔에 불필요한 힘을 빼고, 손목이 건반보다 아래로 처지지 않게 해요.</p>
          <p className="mt-2">건반을 정면으로 보도록 의자를 놓고 앉아요. 팔꿈치가 건반 높이와 비슷하도록 의자 높이를 맞추고, 팔과 손을 편하게 움직일 수 있는 거리를 두어요.</p>
        </section>
        <section aria-labelledby="five-fingers">
          <h2 id="five-fingers" className="text-lg font-semibold text-ink">다섯 손가락 자리</h2>
          <p className="mt-2">오른손은 엄지(1)를 가운데 도(C4)에 놓아요. 도·레·미·파·솔(C4~G4)에 1·2·3·4·5를 차례로 놓아요.</p>
          <p className="mt-2">왼손은 새끼손가락(5)을 한 옥타브 아래 도(C3)에 놓아요. 도·레·미·파·솔(C3~G3)에 5·4·3·2·1을 차례로 놓아요.</p>
          <p className="mt-2">이 자리는 다섯 손가락을 익히는 한 가지 연습이에요. 다른 곡에서도 도를 언제나 같은 손가락으로 치는 것은 아니에요. 건반 위치는 <Link href="/learn/keyboard" className="rounded-sm text-accent hover:underline">건반 레슨</Link>에서 확인해 보세요.</p>
          <HandsKeyboard />
        </section>
        <section aria-labelledby="playback-fingers">
          <h2 id="playback-fingers" className="text-lg font-semibold text-ink">재생 화면과 연결</h2>
          <p className="mt-2">떨어지는 음표에 붙는 숫자도 이 손가락 번호예요. 번호가 있는 음표에 표시되고, 한 손 연습에서 옅게 보이는 다른 손의 음표에는 숫자가 숨겨져요.</p>
          <p className="mt-2">악보 패널을 켜면 현재 누를 음 중 연습하는 손의 건반에도 손가락 번호가 보여요. 번호가 없는 음에는 숫자가 나오지 않아요.</p>
          <p className="mt-2">숫자는 악보에 적힌 손가락 번호이거나 앱이 계산한 연습 제안 번호예요. 악보 데이터에 유효한 1~5 번호가 있으면 유지하고, 번호가 없으면 자동 제안을 계산해요. 손가락 번호 보기 링크는 원본 번호나 자동 제안이 있는 곡의 재생 전 설정에 있어요.</p>
          <p className="mt-2">한 손씩 연습하거나 속도를 늦추는 방법은 <Link href="/learn/practice" className="rounded-sm text-accent hover:underline">연습 방법 레슨</Link>에서 알아봐요.</p>
        </section>
      </div>
    </LessonLayout>
  )
}
