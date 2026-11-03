/** @jest-environment node */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/omr/serviceUrl', () => ({
  getOmrServiceUrl: () => 'http://private-vm:3000',
  omrAuthHeaders: () => ({ 'X-ClairKeys-Token': 'private-token' }),
}))

import { getServerSession } from 'next-auth'
import { GET } from '../route'
import { snapshotFixture } from '../../../../../../fixtures/omr-monitor'

const session = jest.mocked(getServerSession)
const originalEmails = process.env.ADMIN_EMAILS

beforeEach(() => {
  process.env.ADMIN_EMAILS = 'admin@example.com'
  global.fetch = jest.fn()
})
afterAll(() => {
  if (originalEmails === undefined) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = originalEmails
})

it.each([null, { user: { email: 'other@example.com' } }])('blocks direct non-admin access: %j', async value => {
  session.mockResolvedValue(value)
  const response = await GET()
  expect([401, 403]).toContain(response.status)
  expect(global.fetch).not.toHaveBeenCalled()
  expect(response.headers.get('cache-control')).toContain('no-store')
})

it('fails closed when the allowlist is absent', async () => {
  delete process.env.ADMIN_EMAILS
  session.mockResolvedValue({ user: { email: 'admin@example.com' } })
  expect((await GET()).status).toBe(403)
  expect(global.fetch).not.toHaveBeenCalled()
})

it('fails closed without exposing a session provider error', async () => {
  session.mockRejectedValue(new Error('private-session-provider'))
  const response = await GET()
  expect(response.status).toBe(401)
  expect(await response.text()).not.toContain('private')
  expect(fetch).not.toHaveBeenCalled()
})

it('does not return an upstream error body, address or token', async () => {
  session.mockResolvedValue({ user: { email: 'admin@example.com' } })
  jest.mocked(fetch).mockRejectedValue(new Error('http://private-vm:3000?token=private-token'))
  const response = await GET()
  const text = await response.text()
  expect(text).not.toMatch(/private-vm|private-token/)
  expect(response.headers.get('cache-control')).toContain('no-store')
})

it('returns a sanitized snapshot with independent health and no-store upstream requests', async () => {
  session.mockResolvedValue({ user: { email: 'admin@example.com' } })
  jest.mocked(fetch).mockImplementation(async input => Response.json(String(input).endsWith('/health')
    ? { status: 'healthy' } : { ...snapshotFixture(), token: 'private-token', file_info: { title: 'private' } }))
  const response = await GET()
  const body = await response.json()
  expect(body.health.status).toBe('ok')
  expect(body.monitor.snapshot.jobs.queued).toBe(1)
  expect(JSON.stringify(body)).not.toMatch(/private/)
  expect(fetch).toHaveBeenCalledWith('http://private-vm:3000/monitor', expect.objectContaining({
    cache: 'no-store', redirect: 'error', headers: { 'X-ClairKeys-Token': 'private-token' }, signal: expect.any(AbortSignal),
  }))
})

it.each([
  ['old service', () => new Response('private-error', { status: 404 }), 'unsupported'],
  ['invalid JSON', () => new Response('private-error'), 'invalid_response'],
  ['invalid schema', () => Response.json({ version: 9, token: 'private' }), 'invalid_response'],
  ['upstream error', () => new Response('private-error', { status: 503 }), 'http_error'],
  ['oversized', () => new Response('private'.repeat(20000)), 'invalid_response'],
] as const)('shows %s without exposing its body', async (_label, response, status) => {
  session.mockResolvedValue({ user: { email: 'admin@example.com' } })
  jest.mocked(fetch).mockImplementation(async input => String(input).endsWith('/health') ? Response.json({ status: 'healthy' }) : response())
  const body = await (await GET()).json()
  expect(body.health.status).toBe('ok')
  expect(body.monitor.status).toBe(status)
  expect(body.monitor.snapshot).toBeNull()
  expect(JSON.stringify(body)).not.toMatch(/private/)
})

it('distinguishes a timeout from a valid empty queue', async () => {
  session.mockResolvedValue({ user: { email: 'admin@example.com' } })
  jest.mocked(fetch).mockRejectedValue(new DOMException('private-url', 'TimeoutError'))
  const body = await (await GET()).json()
  expect(body.health.status).toBe('timeout')
  expect(body.monitor.status).toBe('timeout')
  expect(body.monitor.snapshot).toBeNull()
})
