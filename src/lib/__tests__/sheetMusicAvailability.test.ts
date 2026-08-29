import { deriveSheetMusicAvailability } from '../sheetMusicAvailability'

describe('deriveSheetMusicAvailability', () => {
  it.each([
    ['stored animation data', 'https://storage.example/song.json', 'pending', 'ready'],
    ['active conversion', '', 'processing', 'processing'],
    ['failed conversion', '', 'failed', 'failed'],
    ['legacy pending row', '', 'pending', 'unknown'],
    ['unrecognized source status', '', 'something-new', 'unknown'],
  ])('returns %s as %s', (_description, animationDataUrl, processingStatus, expected) => {
    expect(deriveSheetMusicAvailability({ animationDataUrl, processingStatus })).toBe(expected)
  })
})
