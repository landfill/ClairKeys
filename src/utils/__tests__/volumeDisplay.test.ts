import { formatVolumePercent } from '../volumeDisplay'

describe('formatVolumePercent', () => {
  it('reports the slider position as a share of its range', () => {
    expect(formatVolumePercent(0, 0.6)).toBe('0%')
    expect(formatVolumePercent(0.3, 0.6)).toBe('50%')
    expect(formatVolumePercent(0.6, 0.6)).toBe('100%')
  })

  it('never reads outside 0–100% or divides by an empty range', () => {
    expect(formatVolumePercent(0.9, 0.6)).toBe('100%')
    expect(formatVolumePercent(-0.1, 0.6)).toBe('0%')
    expect(formatVolumePercent(0.3, 0)).toBe('0%')
  })
})
