/** @jest-environment node */
import { fetchAndStoreOmrResult } from '../finalizeJob'
import { prisma } from '@/lib/prisma'
import { FileStorageService } from '@/services/fileStorageService'
jest.mock('@/lib/prisma', () => ({ prisma: { sheetMusic: { update: jest.fn() } } }))
jest.mock('@/services/fileStorageService')
jest.mock('../serviceUrl', () => ({ getOmrServiceUrl: () => 'http://omr', omrAuthHeaders: () => ({}) }))
const update = prisma.sheetMusic.update as jest.Mock
const upload = jest.fn()
const artifact = { version: 1, musicxml: '<score-partwise/>', timingReferenceBpm: 60, measures: [], notes: [] }
describe('OMR private artifact persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(FileStorageService.getInstance as jest.Mock).mockReturnValue({ uploadOmrAnimationData: upload })
    upload.mockResolvedValue({ success: true, url: 'http://storage/animation.json' })
    update.mockResolvedValue({})
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ animation_data: { notes: [] }, score_artifact: artifact }) })
  })
  it('links private artifact to the stored owner/job before declaring success', async () => {
    await expect(fetchAndStoreOmrResult('job', 'owner')).resolves.toBe('http://storage/animation.json')
    expect(update).toHaveBeenCalledWith({
      where: { omrJobId: 'job', userId: 'owner' },
      data: { scoreArtifact: { upsert: { create: { data: artifact }, update: { data: artifact } } } },
    })
  })
  it('fails retryably if private storage fails or the sheet was deleted', async () => {
    update.mockRejectedValue(new Error('missing row'))
    await expect(fetchAndStoreOmrResult('job', 'owner')).rejects.toMatchObject({ code: 'SCORE_STORAGE_FAILED' })
  })
  it('rejects malformed artifact rather than completing without notation', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ animation_data: {}, score_artifact: { musicxml: 'bad' } }) })
    await expect(fetchAndStoreOmrResult('job', 'owner')).rejects.toMatchObject({ code: 'INVALID_SCORE_ARTIFACT' })
    expect(update).not.toHaveBeenCalled()
  })
  it.each([
    '<score-partwise>' + ' '.repeat(5 * 1024 * 1024) + '</score-partwise>',
    '<score-partwise>' + '"'.repeat(2500000) + '</score-partwise>',
  ])('rejects artifacts exceeding the hosted response budget including JSON escaping', async musicxml => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
      animation_data: {}, score_artifact: { ...artifact, musicxml },
    }) })
    await expect(fetchAndStoreOmrResult('job', 'owner')).rejects.toMatchObject({ code: 'INVALID_SCORE_ARTIFACT', status: 422 })
    expect(update).not.toHaveBeenCalled()
  })
  it('keeps legacy converters compatible', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ animation_data: {} }) })
    await expect(fetchAndStoreOmrResult('job', 'owner')).resolves.toBe('http://storage/animation.json')
    expect(update).not.toHaveBeenCalled()
  })
})
