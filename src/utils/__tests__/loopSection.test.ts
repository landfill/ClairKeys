import { createLoopSection } from '../loopSection'

describe('createLoopSection', () => {
  it('does not invent a duration before the learner marks both endpoints', () => {
    expect(createLoopSection(12, null, 60)).toBeNull()
  })

  it('keeps the selected A–B range within the piece', () => {
    expect(createLoopSection(-2, 99, 60)).toEqual({ start: 0, end: 60 })
  })

  it('rejects a B marker that is not after A', () => {
    expect(createLoopSection(12, 12, 60)).toBeNull()
  })
})
