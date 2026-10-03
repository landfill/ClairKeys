import type { Metadata } from 'next'
import LessonLayout from '@/components/learn/LessonLayout'
import { SEEK_STEP_SEC } from '@/utils/playbackShortcuts'

export const metadata: Metadata = {
  title: '연습 방법 | ClairKeys',
  description: '느린 속도, 한 손 연습, 구간 반복, 기다리기 모드와 메트로놈을 활용하고 재생 화면의 단축키를 알아봐요.',
}

const shortcuts = [
  { key: 'Space', action: '재생·일시정지' },
  { key: '←', action: `${SEEK_STEP_SEC}초 뒤로 이동` },
  { key: '→', action: `${SEEK_STEP_SEC}초 앞으로 이동` },
]

export default function PracticePage() {
  return (
    <LessonLayout lessonId="practice">
      <div className="space-y-6 text-sm text-ink-muted">
        <section aria-labelledby="slow-start">
          <h2 id="slow-start" className="text-lg font-semibold text-ink">느리게 시작</h2>
          <p className="mt-2">노트의 아랫변이 건반 위 선에 닿을 때 건반을 눌러요. 처음에는 속도를 늦춰 따라가요. 재생 전에는 속도 메뉴에서, 재생 중에는 압축된 조작 바의 재생 속도 메뉴에서 바꿀 수 있어요.</p>
          <p className="mt-2">0.25배부터 2배까지 고를 수 있어요. 느린 속도로 익힌 다음 조금씩 빠르게 연습해 보세요.</p>
        </section>
        <section aria-labelledby="one-hand">
          <h2 id="one-hand" className="text-lg font-semibold text-ink">한 손씩</h2>
          <p className="mt-2">양손 음표가 있는 곡은 재생 전에 연습할 손에서 양손·왼손·오른손을 고를 수 있어요. 한 손을 고르면 다른 손의 노트가 옅어져요.</p>
          <p className="mt-2">다른 손 소리 듣기를 켜면 다른 손의 소리도 함께 들어요. 끄면 연습할 손의 소리만 들어요. 한 손 음표만 있는 곡에는 손 선택이 나오지 않아요.</p>
        </section>
        <section aria-labelledby="ab-loop">
          <h2 id="ab-loop" className="text-lg font-semibold text-ink">A-B 구간 반복</h2>
          <p className="mt-2">어려운 곳은 A와 B로 구간을 정해 반복해요. 재생 위치를 시작 지점에 놓고 A를 누른 뒤, 그보다 뒤의 끝 지점에서 B를 눌러요. A와 B는 누른 시점의 재생 위치로 정해져요.</p>
          <p className="mt-2">재생 전에는 A 시작·B 종료, 재생 중에는 구간 시작 A 설정·구간 끝 B 설정 버튼을 써요. 끝에 도달하면 A로 돌아가요. A-B 구간 반복 초기화 버튼을 누르면 구간 설정을 지워요.</p>
        </section>
        <section aria-labelledby="wait-mode">
          <h2 id="wait-mode" className="text-lg font-semibold text-ink">기다리기 모드</h2>
          <p className="mt-2">재생 전에 기다리기 모드를 켜면 맞는 건반을 누를 때까지 진행이 멈춰요. 화면의 건반을 누르거나 MIDI 피아노 입력을 받을 수 있어요. MIDI 지원 브라우저에서는 모드를 켤 때 연결 권한을 요청해요. MIDI를 지원하지 않는 브라우저에서도 화면 건반은 사용할 수 있어요.</p>
          <p className="mt-2">한 손을 선택했다면 연습할 손의 음표만 기다려요. 같은 시점의 여러 음은 필요한 건반을 모두 눌러야 다음으로 진행해요.</p>
        </section>
        <section aria-labelledby="metronome">
          <h2 id="metronome" className="text-lg font-semibold text-ink">메트로놈</h2>
          <p className="mt-2">재생 전에 메트로놈을 켜면 박자에 맞춘 클릭 소리를 들어요. 시작 전 준비 박자를 켜면 연주가 시작되기 전에 준비 박자를 들어요.</p>
          <p className="mt-2">악보에 필요한 박자 정보가 없으면 메트로놈을 켤 수 없어요. 재생 화면에 나오는 안내를 확인해 주세요.</p>
        </section>
        <section aria-labelledby="keyboard-shortcuts">
          <h2 id="keyboard-shortcuts" className="text-lg font-semibold text-ink">키보드 단축키</h2>
          <p className="mt-2">재생 화면에서 아래 키를 사용할 수 있어요. 터치 기기에는 물리 키보드 단축키가 없어요. 화면의 재생·일시정지·위치 조작을 이용해 주세요.</p>
          <table aria-label="재생 화면 키보드 단축키" className="mt-3 w-full border-collapse text-left">
            <thead><tr className="border-b border-rule"><th scope="col" className="p-2 text-ink">키</th><th scope="col" className="p-2 text-ink">동작</th></tr></thead>
            <tbody>{shortcuts.map(shortcut => (
              <tr key={shortcut.key} className="border-b border-rule">
                <th scope="row" className="p-2 font-normal"><kbd className="rounded border border-rule bg-surface px-1.5 py-0.5 font-sans">{shortcut.key}</kbd></th>
                <td className="p-2">{shortcut.action}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="mt-2">버튼이나 입력 칸에 포커스가 있으면 해당 조작에 필요한 키를 우선해요. 예를 들어 속도 메뉴·슬라이더에서는 방향키로 그 값을 바꿔요. Ctrl·Command·Alt·Shift와 함께 누른 키는 재생 단축키로 처리하지 않아요.</p>
        </section>
      </div>
    </LessonLayout>
  )
}
