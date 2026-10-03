import { getKeyLabel, readNoteNames, writeNoteNames, NOTE_NAMES_KEY } from '../keyLabels'

it('labels all white keys at 18px, only Cs at 14px, only middle C below that', () => {
  expect(getKeyLabel(62, 18)).toEqual({ name: '레', marker: false })
  expect(getKeyLabel(62, 17.9)).toBeNull()
  expect(getKeyLabel(48, 14)).toEqual({ name: '도', marker: false })
  expect(getKeyLabel(48, 13.9)).toBeNull()
  expect(getKeyLabel(60, 4)).toEqual({ name: '도', marker: true })
  expect(getKeyLabel(61, 40)).toBeNull()
})

beforeEach(() => localStorage.clear())
afterEach(() => jest.restoreAllMocks())
it('defaults off, writes and restores the browser preference', () => {
  expect(readNoteNames()).toBe(false)
  writeNoteNames(true)
  expect(localStorage.getItem(NOTE_NAMES_KEY)).toBe('true')
  expect(readNoteNames()).toBe(true)
  writeNoteNames(false)
  expect(readNoteNames()).toBe(false)
})
it.each(['broken', '1', 'TRUE', '{}'])('treats corrupt value %s as off', value => {
  localStorage.setItem(NOTE_NAMES_KEY, value)
  expect(readNoteNames()).toBe(false)
})
it('tolerates blocked storage reads and writes', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  expect(readNoteNames()).toBe(false)
  expect(() => writeNoteNames(true)).not.toThrow()
})
