import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="playback-chrome bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <span className="text-xl font-bold text-gray-900">🎹 Clairkeys</span>
            </div>
            <p className="text-gray-600 text-sm max-w-md">
              PDF 악보를 시각적 피아노 애니메이션으로 변환하여 누구나 쉽게 피아노를 배울 수 있는 플랫폼입니다.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">빠른 링크</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
                  홈
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-sm text-gray-600 hover:text-gray-900">
                  공개 악보 탐색
                </Link>
              </li>
              <li>
                <Link href="/upload" className="text-sm text-gray-600 hover:text-gray-900">
                  악보 업로드
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">지원</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  도움말
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  문의하기
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  개인정보처리방침
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 Clairkeys. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
