import { cacheService } from '../cache'

describe('cacheService compression', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await cacheService.clear('memory')
  })

  afterEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await cacheService.clear('memory')
  })

  it('returns the original payload after a compressed storage round trip', async () => {
    const payload = {
      title: 'Keep meaningful spaces',
      notation: `C major phrase ${'x'.repeat(10_050)}`
    }

    await cacheService.set('large-score', payload, {
      storage: 'localStorage',
      compress: true
    })
    await cacheService.clear('memory')

    await expect(cacheService.get<typeof payload>('large-score', {
      storage: 'localStorage'
    })).resolves.toEqual(payload)
  })
})
