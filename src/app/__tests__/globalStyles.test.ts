/**
 * 전역 스타일시트의 토큰 계약을 고정한다.
 *
 * CSS는 렌더링해야 확인할 수 있어 단위 테스트가 어렵다. 대신 다시 들어오면 안 되는 패턴을
 * 소스에서 막는다 — 이 가드는 "왜 안 되는지"를 실패 메시지로 알려주는 것이 목적이다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

/** 주석을 걷어낸다. */
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('globals.css — 토큰', () => {
  it('keeps every colour behind a token', () => {
    // 토큰 정의부(`--ck-*`) 밖에 hex 리터럴이 남으면 팔레트를 한 곳에서 바꿀 수 없다.
    const nonTokenLines = withoutComments
      .split('\n')
      .filter((line) => /#[0-9a-fA-F]{3,8}\b/.test(line))
      .filter((line) => !/^\s*--ck-/.test(line))

    expect(nonTokenLines).toEqual([])
  })

  it('does not reintroduce a dark palette (D-025)', () => {
    expect(withoutComments).not.toMatch(/prefers-color-scheme/)
  })
})

describe('manifest.json — 브랜드 색', () => {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public/manifest.json'), 'utf8'))
  const token = (name: string) =>
    css.match(new RegExp(`--ck-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase()

  it('paints the installed app chrome with the site tokens, not the retired blue and black', () => {
    // 설치된 PWA의 상태 표시줄과 시작 화면은 이 두 값으로 칠해진다. 사이트는 아이보리 종이와
    // 테라코타인데 파랑(#2563eb)·검정이 남아 있었다.
    expect(manifest.theme_color.toLowerCase()).toBe(token('accent'))
    expect(manifest.background_color.toLowerCase()).toBe(token('canvas'))
  })
})
