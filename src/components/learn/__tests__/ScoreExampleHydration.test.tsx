import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server.node'
import { hydrateRoot, type Root } from 'react-dom/client'
import ScoreExample from '../ScoreExample'
import { READING_EXAMPLES } from '@/lib/learn/reading'

it('hydrates the same initial placeholder without mocking OSMD', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const recoverable = jest.fn()
  const container = document.createElement('div')
  let root: Root | undefined
  try {
    container.innerHTML = renderToString(<ScoreExample example={READING_EXAMPLES[4]} />)
    expect(container.querySelector('svg')).toBeNull()
    const label = container.querySelector('[role="img"]')?.getAttribute('aria-label')
    document.body.appendChild(container)
    await act(async () => { root = hydrateRoot(container, <ScoreExample example={READING_EXAMPLES[4]} />, { onRecoverableError: recoverable }) })
    expect(container.querySelector('[role="img"]')).toHaveAttribute('aria-label', label)
    expect(recoverable).not.toHaveBeenCalled()
    // 실제 OSMD는 jsdom의 캔버스 글자 측정이 없어 실패할 수 있으므로 하이드레이션 오류를 구분한다.
    expect(error.mock.calls.filter(args => /hydration|server rendered/i.test(args.map(String).join(' ')))).toHaveLength(0)
  } finally {
    await act(async () => { root?.unmount() })
    container.remove()
    error.mockRestore()
    warn.mockRestore()
  }
})
