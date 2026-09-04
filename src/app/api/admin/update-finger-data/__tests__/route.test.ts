jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth/next'
import { POST } from '../route'

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('retired finger-data backfill', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })

  afterAll(() => {
    if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = originalAdminEmails
  })

  it('keeps the retired mutation behind authentication', async () => {
    mockedSession.mockResolvedValue(null)

    expect((await POST()).status).toBe(401)
  })

  it('keeps the retired mutation behind the admin allowlist', async () => {
    mockedSession.mockResolvedValue({ user: { email: 'user@example.com' } })

    expect((await POST()).status).toBe(403)
  })

  it('refuses to overwrite stored score data even for an administrator', async () => {
    mockedSession.mockResolvedValue({ user: { email: 'admin@example.com' } })

    const response = await POST()
    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Stored fingering backfill has been retired',
    })
  })
})
