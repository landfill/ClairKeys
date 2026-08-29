import Link from 'next/link'
import { LogoMark } from '@/components/ui'

/**
 * 지원 링크 세 개가 `href="#"`이었고 저작권이 2024에 멈춰 있었다 (DS0-5). 목적지가 없는 링크는
 * 링크로 두지 않는다 — 문의는 실제로 닿는 곳(이슈 트래커)으로 보내고, 나머지는 만들 때 추가한다.
 *
 * `playback-chrome`은 재생 중 이 셸을 숨기는 계약이다 (D-019).
 */
export default function Footer() {
  return (
    <footer className="playback-chrome bg-surface border-t border-rule mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <LogoMark size={22} className="text-accent" />
              <span className="text-base font-semibold tracking-tight text-ink">Clairkeys</span>
            </div>
            <p className="text-sm text-ink-muted max-w-md">
              가지고 있는 PDF 악보를 따라 치기 쉬운 피아노 연습으로 바꿔 드립니다.
            </p>
          </div>

          <nav aria-label="사이트">
            <h2 className="text-sm font-semibold text-ink mb-3">둘러보기</h2>
            <ul className="space-y-2">
              <li>
                <Link href="/explore" className="text-sm text-ink-muted hover:text-ink rounded-sm">
                  악보 탐색
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/landfill/ClairKeys/issues"
                  className="text-sm text-ink-muted hover:text-ink rounded-sm"
                  target="_blank"
                  rel="noreferrer"
                >
                  문의·버그 신고
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-rule mt-8 pt-6">
          <p className="text-center text-sm text-ink-muted">
            © {new Date().getFullYear()} Clairkeys
          </p>
        </div>
      </div>
    </footer>
  )
}
