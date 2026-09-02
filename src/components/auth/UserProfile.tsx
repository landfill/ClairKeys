'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import LogoutButton from './LogoutButton'

interface UserProfileProps {
  showDropdown?: boolean
  className?: string
}

const MENU_LINKS = [
  { href: '/profile', label: '프로필' },
  { href: '/library', label: '내 악보' }
]

export default function UserProfile({
  showDropdown = true,
  className = ""
}: UserProfileProps) {
  const { data: session, status } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin status when user is logged in
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/auth/is-admin')
        .then(res => res.json())
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => setIsAdmin(false))
    } else {
      setIsAdmin(false)
    }
  }, [session])

  // The backdrop closes the menu on a click, but a keyboard user has no way to
  // reach it. Escape is the one that matters for them.
  useEffect(() => {
    if (!isDropdownOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDropdownOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isDropdownOpen])

  if (status === 'loading') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const { user } = session
  // The name is optional on the session; the address is what is always there.
  const label = user.name || user.email || '계정'

  const avatar = user.image ? (
    <Image
      src={user.image}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  ) : null

  if (!showDropdown) {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        {avatar}
        <span
          data-testid="account-menu-label"
          className="truncate text-sm text-ink"
        >
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        aria-label="계정 메뉴"
        // The focus ring comes from the global :focus-visible rule, as it does
        // for Button — a per-component ring makes focus differ page to page.
        className="flex max-w-[14rem] items-center gap-2 rounded-full p-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        {avatar}
        <span
          data-testid="account-menu-label"
          className="max-w-[9rem] truncate"
        >
          {label}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />

          <div
            role="menu"
            aria-label="계정"
            className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-rule bg-surface py-1 shadow-lg"
          >
            <div className="border-b border-rule px-4 py-3">
              {user.name && (
                <div
                  data-testid="account-menu-name"
                  className="truncate text-sm font-medium text-ink"
                >
                  {user.name}
                </div>
              )}
              {user.email && (
                // A 32-character address is one unbroken token; without
                // break-all it has nowhere to wrap and runs past the menu.
                <div className="break-all text-xs text-ink-muted">
                  {user.email}
                </div>
              )}
            </div>

            {MENU_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                className="block px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                onClick={() => setIsDropdownOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                href="/admin/update-finger-data"
                role="menuitem"
                className="block px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface-muted"
                onClick={() => setIsDropdownOpen(false)}
              >
                관리자 도구
              </Link>
            )}

            <div className="border-t border-rule px-4 py-2">
              <LogoutButton className="text-sm text-state-error transition-colors hover:brightness-90" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
