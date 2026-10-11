import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ciWorkers } from '../playwrightWorkers'

describe('Playwright CI workers', () => {
  it('keeps the default worker count outside CI even with an override', () => {
    expect(ciWorkers({})).toBeUndefined()
    expect(ciWorkers({ PLAYWRIGHT_WORKERS: '4' })).toBeUndefined()
    expect(ciWorkers({ CI: '', PLAYWRIGHT_WORKERS: '4' })).toBeUndefined()
  })

  it.each([undefined, '', '0', '-2', 'abc', '2.5', ' 4 '])(
    'uses one worker on CI when the override is %p',
    (value) => {
      expect(ciWorkers({ CI: 'true', PLAYWRIGHT_WORKERS: value })).toBe(1)
    }
  )

  it.each(['2', '4'])('uses %s workers on CI when requested', (value) => {
    expect(ciWorkers({ CI: 'true', PLAYWRIGHT_WORKERS: value })).toBe(Number(value))
  })

  it('uses the worker helper in the Playwright config', () => {
    const config = readFileSync(join(process.cwd(), 'playwright.config.ts'), 'utf8')
    expect(config).toContain('ciWorkers(')
    expect(config).not.toContain('workers: process.env.CI ? 1')
  })
})
