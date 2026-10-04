import { FINGER_NAMES, FIVE_FINGER_POSITIONS, fingerForKey } from '../hands'

it('uses the same thumb-to-little-finger numbering for both hands', () => {
  expect(FINGER_NAMES).toEqual({ 1: '엄지', 2: '검지', 3: '중지', 4: '약지', 5: '새끼손가락' })
})
it('maps right C4-G4 to 1-5 and left C3-G3 to 5-1', () => {
  expect(FIVE_FINGER_POSITIONS.right).toEqual([{ midi: 60, finger: 1 }, { midi: 62, finger: 2 }, { midi: 64, finger: 3 }, { midi: 65, finger: 4 }, { midi: 67, finger: 5 }])
  expect(FIVE_FINGER_POSITIONS.left).toEqual([{ midi: 48, finger: 5 }, { midi: 50, finger: 4 }, { midi: 52, finger: 3 }, { midi: 53, finger: 2 }, { midi: 55, finger: 1 }])
  expect([60, 62, 64, 65, 67].map(midi => fingerForKey('right', midi))).toEqual([1, 2, 3, 4, 5])
  expect([48, 50, 52, 53, 55].map(midi => fingerForKey('left', midi))).toEqual([5, 4, 3, 2, 1])
})
it('does not assign a finger outside the selected five-key position', () => {
  expect(fingerForKey('right', 61)).toBeUndefined()
  expect(fingerForKey('right', 48)).toBeUndefined()
  expect(fingerForKey('left', 60)).toBeUndefined()
  expect(fingerForKey('left', 72)).toBeUndefined()
})
