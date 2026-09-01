/** @jest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('sheet lookup indexes', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
  const migration = readFileSync(
    join(process.cwd(), 'prisma/migrations/20260901060000_add_sheet_lookup_indexes/migration.sql'),
    'utf8'
  )

  it('covers the library and public browsing orderings as the table grows', () => {
    expect(schema).toContain('@@index([userId, updatedAt])')
    expect(schema).toContain('@@index([isPublic, provenance, createdAt])')
    expect(schema).toContain('@@index([categoryId, isPublic, provenance])')

    expect(migration).toContain('"SheetMusic_userId_updatedAt_idx"')
    expect(migration).toContain('"SheetMusic_isPublic_provenance_createdAt_idx"')
    expect(migration).toContain('"SheetMusic_categoryId_isPublic_provenance_idx"')
  })
})
