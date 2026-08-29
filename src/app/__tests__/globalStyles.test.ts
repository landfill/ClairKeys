/**
 * 전역 스타일시트의 접근성 계약을 고정한다.
 *
 * DS-1은 포커스 링을 `globals.css`의 전역 `:focus-visible` 한 곳으로 모았다. 그런데
 * `.playback-controls .slider:focus { outline: none }`가 그것보다 specificity가 높아, 재생
 * 슬라이더는 키보드로 포커스해도 아무 표시가 없었다. CodeRabbit이 PR #89에서 지적했다.
 *
 * CSS는 렌더링해야 확인할 수 있어 단위 테스트가 어렵다. 대신 다시 들어오면 안 되는 패턴을
 * 소스에서 막는다 — 이 가드는 "왜 안 되는지"를 실패 메시지로 알려주는 것이 목적이다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

/** 주석을 걷어낸다. 이 파일은 `outline: none`을 설명하는 주석을 갖고 있다. */
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('globals.css — 포커스 계약', () => {
  it('defines the shared focus ring on :focus-visible', () => {
    expect(withoutComments).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ck-accent\)/)
  })

  it('never suppresses the focus outline', () => {
    // `outline: none`은 specificity가 전역 규칙보다 높은 순간 포커스를 조용히 없앤다.
    expect(withoutComments).not.toMatch(/outline:\s*none/)
    expect(withoutComments).not.toMatch(/outline:\s*0(?![.\d])/)
  })

  it('leaves focus styling to the shared rule instead of per-component :focus', () => {
    // `:focus`는 마우스 클릭에도 걸린다. 좁혀야 하면 `:focus-visible`을 쓴다.
    const focusSelectors = withoutComments.match(/^[^{}\n]*:focus(?!-visible)[^{}\n]*\{/gm) ?? []
    expect(focusSelectors).toEqual([])
  })
})

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
