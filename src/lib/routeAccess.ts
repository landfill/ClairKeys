/**
 * 어떤 경로가 로그인해야 열리는지만 정한다.
 *
 * `middleware.ts`에 두면 테스트가 `next-auth/middleware` → `next/server`를 함께 끌고 와 edge
 * 런타임의 `Request`를 찾다가 죽는다. 판정은 문자열 연산이므로 런타임이 필요 없다.
 */

export const PROTECTED_PATHS = ['/library', '/upload', '/profile', '/admin'] as const

/**
 * 세그먼트 경계로 판정한다. `startsWith`만 쓰면 `/admin`이 `/administrator`와 `/admin-tools`까지,
 * `/upload`가 `/uploads`까지 잡는다. 지금 그런 라우트가 없어 실동작은 같지만, 나중에 그런 이름을
 * 만든 사람은 자기 화면이 왜 로그인을 요구하는지 알 방법이 없다.
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}
