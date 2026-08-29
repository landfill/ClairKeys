'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import LoginButton from '@/components/auth/LoginButton'
import UserProfile from '@/components/auth/UserProfile'
import { CloseIcon, LogoMark, MenuIcon } from '@/components/ui'

/**
 * `playback-chrome`은 장식이 아니다. `globals.css`의
 * `body.playback-active .playback-chrome { display: none }`가 재생 중 이 셸을 걷어내고, 그 픽셀이
 * 낙하 영역으로 간다 (D-019). 클래스를 지우면 재생 화면이 조용히 좁아진다.
 */
export default function Header() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 내비게이션 구성 축소는 도달 경로 변경(B)이라 다음 커밋에서 한다. 이 커밋은 표현만 바꾼다.
  const navItems = [
    { href: '/', label: '홈' },
    ...(session
      ? [
          { href: '/library', label: '내 악보' },
          { href: '/upload', label: '업로드' },
          { href: '/processing', label: '처리 상태' },
        ]
      : []),
    { href: '/explore', label: '탐색' },
  ]

  return (
    <header className="playback-chrome bg-surface border-b border-rule">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink rounded-sm"
          >
            <LogoMark size={24} className="text-accent" />
            Clairkeys
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="주요">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-ink-muted hover:text-ink transition-colors rounded-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-surface-muted animate-pulse" />
            ) : session ? (
              <UserProfile />
            ) : (
              <LoginButton />
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-ink-muted hover:text-ink rounded-sm"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? (
              <CloseIcon size={24} title="메뉴 닫기" />
            ) : (
              <MenuIcon size={24} title="메뉴 열기" />
            )}
          </button>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div id="mobile-navigation" className="md:hidden border-t border-rule">
            <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3" aria-label="주요 (모바일)">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="px-3 py-4 border-t border-rule">
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-surface-muted animate-pulse" />
              ) : session ? (
                <UserProfile showDropdown={false} />
              ) : (
                <LoginButton className="w-full bg-accent text-on-accent px-4 py-2 rounded-md text-sm hover:bg-accent-hover transition-colors" />
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
