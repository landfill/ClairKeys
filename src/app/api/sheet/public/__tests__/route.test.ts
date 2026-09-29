/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { GET } from '../route'

jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    sheetMusic: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  },
}))

const mockConnect = prisma.$connect as jest.Mock
const mockFindMany = prisma.sheetMusic.findMany as jest.Mock
const mockCount = prisma.sheetMusic.count as jest.Mock
const mockCategories = prisma.category.findMany as jest.Mock

const PUBLIC_ONLY = { isPublic: true, provenance: { not: 'demo' } }

const get = (query = '') => GET(new NextRequest(`http://localhost/api/sheet/public${query}`))

describe('GET /api/sheet/public', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConnect.mockResolvedValue(undefined)
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    mockCategories.mockResolvedValue([])
  })

  it('excludes only confirmed demo rows from both the page and total', async () => {
    const response = await get()

    expect(response.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: PUBLIC_ONLY }))
    expect(mockCount).toHaveBeenCalledWith({ where: PUBLIC_ONLY })
  })

  // #197: this is now the only list the explore page reads, so every filter the
  // retired search tab offered lands here — inside the same public condition.
  it('narrows by trimmed search text and category without widening visibility', async () => {
    await get('?search=%20bach%20&categoryId=7')

    const where = mockFindMany.mock.calls[0][0].where
    expect(where).toEqual({
      ...PUBLIC_ONLY,
      categoryId: 7,
      OR: [
        { title: { contains: 'bach', mode: 'insensitive' } },
        { composer: { contains: 'bach', mode: 'insensitive' } },
      ],
    })
    expect(mockCount).toHaveBeenCalledWith({ where })
  })

  it.each([
    ['newest', [{ createdAt: 'desc' }, { id: 'desc' }]],
    ['oldest', [{ createdAt: 'asc' }, { id: 'asc' }]],
    ['title', [{ title: 'asc' }, { id: 'asc' }]],
    ['composer', [{ composer: 'asc' }, { id: 'asc' }]],
    ['unknown', [{ createdAt: 'desc' }, { id: 'desc' }]],
  ])('orders %s with an id tie-break so pages cannot overlap', async (sortBy, orderBy) => {
    await get(`?sortBy=${sortBy}`)

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy }))
  })

  it('reports the page size it actually applied', async () => {
    mockCount.mockResolvedValue(120)

    const clamped = await (await get('?limit=500&offset=-5')).json()
    expect(mockFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 50, skip: 0 }))
    expect(clamped.pagination).toEqual({ total: 120, limit: 50, offset: 0, hasMore: true })

    const fallback = await (await get('?limit=abc')).json()
    expect(mockFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 12, skip: 0 }))
    expect(fallback.pagination.limit).toBe(12)
  })

  // Categories belong to their owners; the public page may only name one that
  // holds a public, non-demo sheet, and it needs that list with the first page
  // so opening the page costs one request.
  it('returns the public category list with the first page only', async () => {
    mockCategories.mockResolvedValue([
      { id: 2, name: '재즈', _count: { sheetMusic: 0 } },
      { id: 7, name: '클래식', _count: { sheetMusic: 3 } },
    ])

    const first = await (await get('?search=bach&categoryId=7')).json()
    expect(first.categories).toEqual([{ id: 7, name: '클래식', count: 3 }])
    expect(mockCategories).toHaveBeenCalledWith({
      include: { _count: { select: { sheetMusic: { where: PUBLIC_ONLY } } } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })

    mockCategories.mockClear()
    const next = await (await get('?offset=12')).json()
    expect(next.categories).toBeUndefined()
    expect(mockCategories).not.toHaveBeenCalled()
  })

  // Carried over from the retired /api/sheet/search (#197): the public list is
  // the same for every reader, so it never pays for a session, asks for no
  // private rows whatever the query says, and sends its queries in one wave.
  it('answers every reader alike without a session lookup, in one database wave', async () => {
    let releaseCount: (value: number) => void = () => undefined
    mockCount.mockReturnValue(new Promise<number>(resolve => { releaseCount = resolve }))

    const pending = get('?isPublic=false&userId=user-1')
    await Promise.resolve()
    await Promise.resolve()

    expect(getServerSession).not.toHaveBeenCalled()
    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockCount).toHaveBeenCalledTimes(1)
    expect(mockCategories).toHaveBeenCalledTimes(1)
    expect(mockFindMany.mock.calls[0][0].where).toEqual(PUBLIC_ONLY)

    releaseCount(0)
    const response = await pending
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300')
    expect(response.headers.get('Server-Timing')).toMatch(/db;dur=[\d.]+;desc="3 queries", total;dur=[\d.]+/)
  })

  // #187: a slow miss can be a cold instance, the connection, or the queries.
  // The header names each so a measurement says which one it was.
  it('times the connection apart from the queries and marks a cold instance', async () => {
    let releaseConnect: () => void = () => undefined
    mockConnect.mockReturnValue(new Promise<void>(resolve => { releaseConnect = resolve }))

    const pending = get()
    await Promise.resolve()
    expect(mockConnect).toHaveBeenCalledTimes(1)
    expect(mockFindMany).not.toHaveBeenCalled()

    releaseConnect()
    const timing = (await pending).headers.get('Server-Timing')
    expect(timing).toMatch(
      /^instance;desc="(cold|warm)", connect;dur=[\d.]+, db;dur=[\d.]+;desc="3 queries", total;dur=[\d.]+$/
    )
  })

  it('calls only the first request of an instance cold', async () => {
    await jest.isolateModulesAsync(async () => {
      const { prisma: fresh } = await import('@/lib/prisma')
      ;(fresh.$connect as jest.Mock).mockResolvedValue(undefined)
      ;(fresh.sheetMusic.findMany as jest.Mock).mockResolvedValue([])
      ;(fresh.sheetMusic.count as jest.Mock).mockResolvedValue(0)
      ;(fresh.category.findMany as jest.Mock).mockResolvedValue([])
      const { GET: freshGet } = await import('../route')
      const request = () => freshGet(new NextRequest('http://localhost/api/sheet/public'))

      expect((await request()).headers.get('Server-Timing')).toMatch(/^instance;desc="cold", /)
      expect((await request()).headers.get('Server-Timing')).toMatch(/^instance;desc="warm", /)
    })
  })
})
