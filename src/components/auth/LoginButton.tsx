'use client'

import { signIn, useSession } from 'next-auth/react'
import { currentReturnPath, toSafeReturnPath } from '@/lib/returnPath'

export interface LoginButtonProps {
  className?: string
  children?: React.ReactNode
  /** 로그인 후 돌아갈 경로. 넘기지 않으면 **누른 자리**로 돌아온다. */
  callbackUrl?: string
}

/**
 * 기본값이 `"/"`였다. 그래서 `AuthGuard`를 거친 사용자는 원래 화면으로 돌아왔지만, Header에서
 * 로그인을 누른 사용자는 무엇을 하려던 중이었든 홈으로 갔다 (DS-0). 이제 둘 다
 * `toSafeReturnPath`를 쓴다.
 *
 * 이미 로그인한 상태에서는 아무것도 그리지 않는다. 이전에는 렌더 중에 `router.push`를 호출했는데,
 * 그건 렌더의 부수효과라 React가 언제 실행할지 보장하지 않는다. 이 버튼을 보여줄지 말지는 부모가
 * 세션으로 이미 정하고 있으므로 여기서 이동시킬 이유가 없다.
 */
export default function LoginButton({
  className = 'bg-accent text-on-accent px-4 py-2 rounded-md text-sm hover:bg-accent-hover transition-colors',
  children = '로그인',
  callbackUrl,
}: LoginButtonProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className={className} aria-hidden="true">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session) {
    return null
  }

  const handleSignIn = () => {
    signIn(undefined, {
      callbackUrl: callbackUrl ? toSafeReturnPath(callbackUrl) : currentReturnPath(),
    })
  }

  return (
    <button type="button" onClick={handleSignIn} className={className}>
      {children}
    </button>
  )
}
