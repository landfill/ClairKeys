import { midiToSolfege, chooseDoTarget, judgeDo, VISIBLE_RANGE } from '../keyboard'

const names = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시']

it.each(Array.from({ length: 88 }, (_, i) => i + 21))('maps piano MIDI %i to fixed-do and octave', midi => {
  expect(midiToSolfege(midi)).toEqual(expect.objectContaining({ name: names[midi % 12], octave: Math.floor(midi / 12) - 1, middleC: midi === 60 }))
})

it('names the boundaries, middle C and sharps accessibly', () => {
  expect(midiToSolfege(21).name).toBe('라')
  expect(midiToSolfege(108)).toEqual(expect.objectContaining({ name: '도', octave: 8 }))
  expect(midiToSolfege(60).accessibleName).toBe('가운데 도 (4옥타브)')
  expect(midiToSolfege(61).accessibleName).toBe('도 샵 (4옥타브)')
})

it.each([20, 109, 60.5, NaN])('rejects invalid piano MIDI %s', midi => {
  expect(() => midiToSolfege(midi)).toThrow(RangeError)
})

it('chooses only visible Cs with injectable randomness', () => {
  expect(chooseDoTarget(VISIBLE_RANGE, () => 0)).toBe(48)
  expect(chooseDoTarget(VISIBLE_RANGE, () => 0.999)).toBe(72)
  expect(chooseDoTarget({ minMidi: 60, maxMidi: 72 }, () => 0.999)).toBe(72)
  expect(() => chooseDoTarget({ minMidi: 61, maxMidi: 71 }, () => 0)).toThrow()
})

it('requires the requested octave, not just any C', () => {
  expect(judgeDo(60, 60)).toBe('correct')
  expect(judgeDo(60, 61)).toBe('retry')
  expect(judgeDo(60, 48)).toBe('retry')
  expect(judgeDo(60, 72)).toBe('retry')
})

it('shows C3 through C5, ending on a third visible C', () => {
  expect(VISIBLE_RANGE).toEqual({ minMidi: 48, maxMidi: 72 })
  expect(chooseDoTarget(VISIBLE_RANGE, () => 0.5)).toBe(60)
  expect(chooseDoTarget(VISIBLE_RANGE, () => 0.999)).toBe(72)
})

it('excludes the previous C while keeping both other Cs selectable', () => {
  for (const previous of [48, 60, 72]) {
    const others = [48, 60, 72].filter(midi => midi !== previous)
    expect(chooseDoTarget(VISIBLE_RANGE, () => 0, previous)).toBe(others[0])
    expect(chooseDoTarget(VISIBLE_RANGE, () => 0.999, previous)).toBe(others[1])
  }
})

it('keeps the only C when exclusion would leave no question', () => {
  expect(chooseDoTarget({ minMidi: 60, maxMidi: 71 }, () => 0, 60)).toBe(60)
  expect(chooseDoTarget(VISIBLE_RANGE, () => 0, 36)).toBe(48)
})
