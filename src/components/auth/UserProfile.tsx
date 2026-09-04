'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import LogoutButton from './LogoutButton'

interface UserProfileProps {
  showDropdown?: boolean
  className?: string
}

const MENU_LINKS = [
  { href: '/profile', label: '프로필' },
  { href: '/library', label: '내 악보' }
]

const ITEM_CLASSES =
  'block px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink'

export default function UserProfile({
  showDropdown = true,
  className = ""
}: UserProfileProps) {
  const { data: session, status } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // The backdrop closes the menu on a click, but a keyboard user has no way to
  // reach it. Escape also has to hand focus back: if it closes while focus is
  // on a menu item, that element unmounts and focus falls to <body>, so the
  // next Tab restarts from the top of the document instead of the header.
  useEffect(() => {
    if (!isDropdownOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsDropdownOpen(false)
      triggerRef.current?.focus()
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
      <div className={`flex min-w-0 items-center gap-3 ${className}`}>
        {avatar}
        <span
          data-testid="account-menu-label"
          className="min-w-0 flex-1 truncate text-sm text-ink"
        >
          {label}
        </span>
        {/*
          Logout used to live only in the desktop dropdown, so the mobile menu —
          which renders this variant and nothing else for the account — offered
          no way to sign out at all.
        */}
        <LogoutButton className="shrink-0 text-sm text-state-error transition-colors hover:brightness-90" />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        // No aria-haspopup: "true" is defined as equivalent to "menu", so it
        // announces "menu button" and invites the arrow-key navigation this
        // popup does not implement — the same promise dropping role="menu"
        // removed. aria-expanded alone is the disclosure pattern.
        aria-expanded={isDropdownOpen}
        // The visible name has to survive into the accessible name (WCAG 2.5.3):
        // a bare "계정 메뉴" label leaves voice control unable to address the
        // control the user is looking at, and hides which account is signed in.
        aria-label={`${label} 계정 메뉴`}
        // The focus ring comes from the global :focus-visible rule, as it does
        // for Button — a per-component ring makes focus differ page to page.
        className="flex max-w-[14rem] items-center gap-2 rounded-full p-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        {avatar}
        <span
          data-testid="account-menu-label"
          aria-hidden="true"
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

          {/*
            Deliberately not role="menu". That role obliges arrow-key navigation
            and a roving tabindex, neither of which is implemented here, and it
            may only own menuitems — which drops the identity block and the
            logout button for screen-reader users in menu mode. Plain links and
            a button, reached by Tab, are what this actually is.

            No `overflow-hidden` either: globals.css draws focus as an outline
            with a positive offset, and the full-width items have no room for it
            inside a clipped box. Hiding the global ring right after deleting
            this component's own one would leave keyboard users worse off.
          */}
          <div
            data-testid="account-menu"
            className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-rule bg-surface py-1 shadow-lg"
          >
            <div className="border-b border-rule px-4 py-3">
              {user.name && (
                <div
                  data-testid="account-menu-name"
                  // break-words, not truncate: this is the one block whose job
                  // is to say which account is signed in, and the address below
                  // it wraps rather than clipping for the same reason.
                  className="break-words text-sm font-medium text-ink"
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
                className={ITEM_CLASSES}
                onClick={() => setIsDropdownOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-1 border-t border-rule pt-1">
              <LogoutButton
                className={`w-full text-left ${ITEM_CLASSES} text-state-error hover:text-state-error`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
