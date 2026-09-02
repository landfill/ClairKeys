'use client'

import { signOut } from 'next-auth/react'
import { useState } from 'react'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
  callbackUrl?: string
}

export default function LogoutButton({ 
  className = "text-sm text-ink-muted hover:text-ink transition-colors",
  children = "로그아웃",
  callbackUrl = "/"
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut({ callbackUrl })
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border border-rule-strong border-t-transparent"></div>
          <span>로그아웃 중...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}