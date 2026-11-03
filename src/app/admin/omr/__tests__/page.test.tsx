jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('not_found') } }))
jest.mock('@/components/admin/OmrMonitor', () => ({ __esModule: true, default: () => <div>monitor</div> }))
import { getServerSession } from 'next-auth'
import Page from '../page'

const original = process.env.ADMIN_EMAILS
afterAll(() => {
  if (original === undefined) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = original
})

it.each([null, { user: { email: 'ordinary@example.com' } }])('refuses direct page access: %j', async value => {
  process.env.ADMIN_EMAILS = 'admin@example.com'
  jest.mocked(getServerSession).mockResolvedValue(value)
  await expect(Page()).rejects.toThrow('not_found')
})

it('allows the configured operator without a new account system', async () => {
  process.env.ADMIN_EMAILS = 'admin@example.com'
  jest.mocked(getServerSession).mockResolvedValue({ user: { email: 'admin@example.com' } })
  await expect(Page()).resolves.toBeTruthy()
})
