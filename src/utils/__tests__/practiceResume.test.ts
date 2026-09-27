import { readResume, resumeKeyFor, shouldOfferResume, writeResume, clearResume } from '../practiceResume'

describe('practice resume storage', () => {
  beforeEach(() => localStorage.clear())

  it('keys the position by sheet', () => {
    expect(resumeKeyFor(92)).toBe('clairkeys.resume.92')
  })

  it('round-trips a saved position and ignores anything malformed', () => {
    writeResume('clairkeys.resume.1', 83.4, new Date('2026-09-27T00:00:00Z'))
    expect(readResume('clairkeys.resume.1')).toEqual({ time: 83.4, savedAt: '2026-09-27T00:00:00.000Z' })

    localStorage.setItem('clairkeys.resume.2', '{not json')
    expect(readResume('clairkeys.resume.2')).toBeNull()
    localStorage.setItem('clairkeys.resume.3', JSON.stringify({ time: -4 }))
    expect(readResume('clairkeys.resume.3')).toBeNull()
    localStorage.setItem('clairkeys.resume.4', JSON.stringify({ time: 'x' }))
    expect(readResume('clairkeys.resume.4')).toBeNull()
  })

  it('forgets a position', () => {
    writeResume('clairkeys.resume.1', 10)
    clearResume('clairkeys.resume.1')
    expect(readResume('clairkeys.resume.1')).toBeNull()
  })

  it('survives storage that throws', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readResume('k')).toBeNull()
    expect(() => writeResume('k', 12)).not.toThrow()
    getItem.mockRestore(); setItem.mockRestore()
  })
})

describe('shouldOfferResume', () => {
  it('offers only a position worth returning to', () => {
    expect(shouldOfferResume(null, 120)).toBe(false)
    // Barely started: starting over costs nothing.
    expect(shouldOfferResume({ time: 3, savedAt: '' }, 120)).toBe(false)
    expect(shouldOfferResume({ time: 45, savedAt: '' }, 120)).toBe(true)
    // At the very end: the run was finished.
    expect(shouldOfferResume({ time: 118, savedAt: '' }, 120)).toBe(false)
    // Past the end of a piece that has since been re-converted shorter.
    expect(shouldOfferResume({ time: 200, savedAt: '' }, 120)).toBe(false)
  })
})
