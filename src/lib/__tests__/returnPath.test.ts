/**
 * 로그인 후 복귀 경로의 계약 (DS-2).
 *
 * DS-0이 확인한 결함: `AuthGuard`는 `pathname + search`를 보존하지만 Header의 `LoginButton`은
 * `callbackUrl = "/"` 기본값이라 어디서 눌러도 홈으로 갔다. 두 경로가 같은 규칙을 쓰게 만든다.
 *
 * 복귀 대상은 **같은 origin의 경로만** 허용한다. 외부에서 넘어온 문자열이 그대로 리다이렉트
 * 대상이 되면 오픈 리다이렉트가 된다 — 로그인 화면은 그 문자열이 쿼리로 오는 자리다.
 */
import { toSafeReturnPath } from '@/lib/returnPath'

describe('toSafeReturnPath', () => {
  it('keeps an ordinary in-app path', () => {
    expect(toSafeReturnPath('/library')).toBe('/library')
    expect(toSafeReturnPath('/sheet/2')).toBe('/sheet/2')
  })

  it('keeps the query string — it is part of where the user was', () => {
    expect(toSafeReturnPath('/explore?tab=search')).toBe('/explore?tab=search')
  })

  it('rejects absolute URLs', () => {
    expect(toSafeReturnPath('https://evil.example/steal')).toBe('/')
    expect(toSafeReturnPath('http://evil.example')).toBe('/')
  })

  it('rejects protocol-relative URLs', () => {
    // `//evil.example`은 브라우저가 현재 스킴의 절대 URL로 읽는다.
    expect(toSafeReturnPath('//evil.example/steal')).toBe('/')
  })

  it('rejects backslash variants that some parsers fold into slashes', () => {
    expect(toSafeReturnPath('/\\evil.example')).toBe('/')
    expect(toSafeReturnPath('\\\\evil.example')).toBe('/')
  })

  it('rejects anything that is not a path', () => {
    expect(toSafeReturnPath('javascript:alert(1)')).toBe('/')
    expect(toSafeReturnPath('library')).toBe('/')
    expect(toSafeReturnPath('')).toBe('/')
    expect(toSafeReturnPath(null)).toBe('/')
    expect(toSafeReturnPath(undefined)).toBe('/')
  })

  it('honours a caller-supplied fallback', () => {
    expect(toSafeReturnPath('https://evil.example', '/library')).toBe('/library')
  })

  it('refuses an unsafe fallback too', () => {
    expect(toSafeReturnPath(null, 'https://evil.example')).toBe('/')
  })
})
