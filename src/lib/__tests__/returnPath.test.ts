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

  /**
   * 이 블록이 이 테스트에서 유일하게 중요한 부분이다. 나머지는 구현에 적어둔 금지 목록을 되읽는
   * 것이라 구현이 놓친 것도 함께 놓친다 — 실제로 그랬다.
   *
   * URL 파서는 경로 앞뒤의 ASCII 탭·LF·CR을 **제거한 뒤** 해석한다. 그래서 `/<TAB>/evil.example`은
   * 문자열로는 `/`로 시작하고 `//`도 아니고 백슬래시도 없지만, 브라우저에서는
   * `https://evil.example`이 된다. 판정은 문자열 모양이 아니라 **파서가 어떻게 읽는지**를 따라야 한다.
   */
  it.each([
    ['탭', '/\t/evil.example/x'],
    ['LF', '/\n/evil.example/x'],
    ['CR', '/\r/evil.example/x'],
    ['탭 + 프로토콜 상대', '/\t//evil.example'],
    ['앞쪽 공백과 탭', ' \t/\t/evil.example'],
    ['NUL', '/\0/evil.example'],
  ])('rejects a path the URL parser folds into another origin (%s)', (_label, candidate) => {
    expect(toSafeReturnPath(candidate)).toBe('/')
  })

  it('resolves to the same origin for everything it accepts', () => {
    // 통과시킨 값은 반드시 같은 origin으로 해석돼야 한다. 이것이 진짜 계약이다.
    const base = 'https://clairkeys.example/auth/signin'
    for (const candidate of [
      '/library',
      '/sheet/2',
      '/explore?tab=search',
      '/\t/evil.example/x',
      '//evil.example',
      'https://evil.example',
      '/\\evil.example',
    ]) {
      const safe = toSafeReturnPath(candidate)
      expect(new URL(safe, base).origin).toBe('https://clairkeys.example')
    }
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
