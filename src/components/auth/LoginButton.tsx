'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface LoginButtonProps {
  className?: string
  children?: React.ReactNode
  callbackUrl?: string
}

export default function LoginButton({ 
  className = "bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors",
  children = "로그인",
  callbackUrl = "/"
}: LoginButtonProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className={className}>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (session) {
    router.push(callbackUrl)
    return null
  }

  const handleSignIn = () => {
    signIn(undefined, { callbackUrl })
  }

  return (
    <button
      onClick={handleSignIn}
      className={className}
    >
      {children}
    </button>
  )
}