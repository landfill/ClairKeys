import { getSigninCopy } from '../signinCopy'

describe('getSigninCopy', () => {
  it('keeps the upload journey wording for the upload return path', () => {
    expect(getSigninCopy('/upload').title).toBe('악보를 맡기기 전에 로그인해 주세요')
  })

  it('does not ask a reader who opened their library to upload something', () => {
    const copy = getSigninCopy('/library')
    expect(copy.title).toBe('내 악보를 보려면 로그인해 주세요')
    expect(copy.title).not.toMatch(/맡기기/)
  })

  it('speaks about continuing practice when returning to a sheet', () => {
    expect(getSigninCopy('/sheet/92').title).toBe('이 곡을 이어서 연습하려면 로그인해 주세요')
  })

  it('falls back to a neutral request for any other path', () => {
    for (const path of ['/', '/explore', '/profile', '/library-x', '/uploads']) {
      expect(getSigninCopy(path).title).toBe('ClairKeys에 로그인해 주세요')
    }
  })

  it('always gives the reader reasons to sign in', () => {
    for (const path of ['/upload', '/library', '/sheet/1', '/']) {
      expect(getSigninCopy(path).reasons.length).toBeGreaterThan(0)
    }
  })
})
