/**
 * 보호 경로 판정은 세그먼트 경계로 한다.
 *
 * `startsWith`만 쓰던 판정은 `/admin`이 `/administrator`를, `/upload`가 `/uploads`를 함께 잡았다.
 * 지금은 그런 라우트가 없어 실동작이 같지만, 나중에 그런 이름을 만든 사람은 자기 화면이 왜
 * 로그인을 요구하는지 알 방법이 없다. CodeRabbit이 PR #89에서 지적했다.
 */
import { PROTECTED_PATHS, isProtectedPath } from '@/lib/routeAccess'

describe('isProtectedPath', () => {
  it.each(PROTECTED_PATHS)('protects %s itself', (path) => {
    expect(isProtectedPath(path)).toBe(true)
  })

  it.each(PROTECTED_PATHS)('protects sub-paths of %s', (path) => {
    expect(isProtectedPath(`${path}/anything`)).toBe(true)
    expect(isProtectedPath(`${path}/nested/deeper`)).toBe(true)
  })

  it.each(PROTECTED_PATHS)('does not protect a sibling that merely shares %s as a prefix', (path) => {
    expect(isProtectedPath(`${path}s`)).toBe(false)
    expect(isProtectedPath(`${path}-tools`)).toBe(false)
    expect(isProtectedPath(`${path}istrator`)).toBe(false)
  })

  it('leaves public routes open', () => {
    for (const pathname of ['/', '/explore', '/sheet/2', '/auth/signin', '/auth/error', '/offline']) {
      expect(isProtectedPath(pathname)).toBe(false)
    }
  })
})
