/** @jest-environment node */
import { saveSheetTempo } from '../sheetTempoService'
import { getSupabaseServer } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/supabase/server', () => ({ getSupabaseServer: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { sheetMusic: { updateMany: jest.fn(), findUnique: jest.fn() } } }))

const sheet = { id: 1, userId: 'owner', animationDataUrl: 'https://score.supabase.co/storage/v1/object/public/animation-data/owner/source.json', updatedAt: new Date('2026-09-05T00:00:00Z') }
const source = { version: '1.1', title: 'score', composer: 'composer', duration: 2, tempo: 60, timingReferenceBpm: 60, tempoSource: 'score', scoreTempo: 60, timeSignature: '4/4', notes: [{ midi: 60, start: 0, duration: 2 }] }
const bucket = {
  download: jest.fn(), upload: jest.fn(), remove: jest.fn(),
  getPublicUrl: jest.fn((path: string) => ({ data: { publicUrl: `https://score.supabase.co/storage/v1/object/public/animation-data/${path}` } })),
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://score.supabase.co'
  jest.mocked(getSupabaseServer).mockReturnValue({ storage: { from: () => bucket } } as unknown as ReturnType<typeof getSupabaseServer>)
  bucket.download.mockResolvedValue({ data: { text: async () => JSON.stringify(source) }, error: null })
  bucket.upload.mockResolvedValue({ error: null })
  bucket.remove.mockResolvedValue({ error: null })
  jest.mocked(prisma.sheetMusic.updateMany).mockResolvedValue({ count: 1 })
  jest.mocked(prisma.sheetMusic.findUnique).mockResolvedValue(null)
})

it('writes a new time-scaled object and switches the URL only if the original revision still matches', async () => {
  await saveSheetTempo(sheet, 120, { title: 'new title' })
  expect(bucket.download).toHaveBeenCalledWith('owner/source.json')
  const [path, body, options] = bucket.upload.mock.calls[0]
  expect(path).toMatch(/^owner\/tempo_[a-f0-9-]+\.json$/)
  expect(options.upsert).toBe(false)
  expect(JSON.parse(body.toString())).toMatchObject({ tempo: 120, scoreTempo: 60, duration: 1, notes: [{ duration: 1 }] })
  expect(prisma.sheetMusic.updateMany).toHaveBeenCalledWith({
    where: sheet,
    data: { title: 'new title', animationDataUrl: expect.stringContaining(path) },
  })
  expect(bucket.remove).not.toHaveBeenCalled()
})

it('rejects foreign storage URLs before using privileged storage', async () => {
  await expect(saveSheetTempo({ ...sheet, animationDataUrl: 'https://attacker.example/file.json' }, 120, {})).rejects.toThrow()
  expect(bucket.download).not.toHaveBeenCalled()
  expect(prisma.sheetMusic.updateMany).not.toHaveBeenCalled()
})

it('does not update the database if upload fails', async () => {
  bucket.upload.mockResolvedValue({ error: { message: 'offline' } })
  await expect(saveSheetTempo(sheet, 120, {})).rejects.toThrow()
  expect(prisma.sheetMusic.updateMany).not.toHaveBeenCalled()
})

it('removes only its unreferenced new object after a definite edit conflict', async () => {
  jest.mocked(prisma.sheetMusic.updateMany).mockResolvedValue({ count: 0 })
  await expect(saveSheetTempo(sheet, 120, {})).rejects.toMatchObject({ status: 409 })
  expect(bucket.remove).toHaveBeenCalledWith([bucket.upload.mock.calls[0][0]])
})

it('preserves the new object when a database failure leaves commit outcome uncertain', async () => {
  jest.mocked(prisma.sheetMusic.updateMany).mockRejectedValue(new Error('connection lost'))
  await expect(saveSheetTempo(sheet, 120, {})).rejects.toThrow('connection lost')
  expect(bucket.remove).not.toHaveBeenCalled()
})
