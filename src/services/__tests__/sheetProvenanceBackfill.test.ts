import {
  classifySheetProvenance,
  runSheetProvenanceBackfill,
} from '../sheetProvenanceBackfill'

const demo = {
  tempo: 120,
  timeSignature: '4/4',
  notes: [
    { note: 'G4', startTime: 0, duration: 0.5, velocity: 0.8 },
    { note: 'A4', startTime: 0.5, duration: 0.5, velocity: 0.8 },
    { note: 'B4', startTime: 1, duration: 1, velocity: 0.8 },
    { note: 'C5', startTime: 2, duration: 1, velocity: 0.9 },
  ],
}

describe('D-010 provenance classification', () => {
  it('fails configuration validation before fetching or updating any row', async () => {
    const loadAnimation = jest.fn()
    const updateProvenance = jest.fn()

    await expect(runSheetProvenanceBackfill({
      listRows: async () => [
        { id: 1, omrJobId: 'job-1', animationDataUrl: 'https://storage/omr.json' },
        { id: 2, omrJobId: null, animationDataUrl: 'https://storage/candidate.json' },
      ],
      loadAnimation,
      validateAnimationStorage: () => {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
      },
      updateProvenance,
    }, true)).rejects.toThrow('NEXT_PUBLIC_SUPABASE_URL is required')

    expect(loadAnimation).not.toHaveBeenCalled()
    expect(updateProvenance).not.toHaveBeenCalled()
  })

  it('classifies an OMR job without fetching its animation', async () => {
    const load = jest.fn()

    await expect(classifySheetProvenance({
      id: 1,
      omrJobId: 'job-1',
      animationDataUrl: 'https://storage/score.json',
    }, load)).resolves.toEqual({ id: 1, provenance: 'omr', fetchFailed: false })
    expect(load).not.toHaveBeenCalled()
  })

  it('classifies only an exact historical payload as demo', async () => {
    await expect(classifySheetProvenance({
      id: 2,
      omrJobId: null,
      animationDataUrl: 'https://storage/demo.json',
    }, async () => demo)).resolves.toEqual({ id: 2, provenance: 'demo', fetchFailed: false })
  })

  it('keeps ambiguous and unreadable rows unknown', async () => {
    await expect(classifySheetProvenance({
      id: 3,
      omrJobId: null,
      animationDataUrl: 'https://storage/score.json',
    }, async () => ({ ...demo, tempo: 60 }))).resolves.toEqual({
      id: 3,
      provenance: 'unknown',
      fetchFailed: false,
    })

    await expect(classifySheetProvenance({
      id: 4,
      omrJobId: null,
      animationDataUrl: 'https://storage/missing.json',
    }, async () => { throw new Error('missing') })).resolves.toEqual({
      id: 4,
      provenance: 'unknown',
      fetchFailed: true,
    })
  })
})
