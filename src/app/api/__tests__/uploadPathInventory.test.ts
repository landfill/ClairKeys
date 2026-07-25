import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * P1-A stage 1 — pins what each upload path actually does today.
 *
 * ClairKeys grew four PDF upload entry points. Only one of them converts a
 * score: `/api/omr/upload`, which proxies the Fly.io OMR service. The other
 * three end up in `src/services/pdfParser.ts`, whose `createEnhancedDemo()`
 * picks a canned melody by file *length* — it never reads the PDF.
 *
 * That would be harmless if the fabricated output were labelled as such. It is
 * not: every path writes an ordinary `SheetMusic` row with an
 * `animationDataUrl`, so a demo melody is indistinguishable from a real
 * conversion once stored.
 *
 * These assertions are deliberately split:
 *
 *   - "inventory" describes structure P1-A intends to keep proving (one real
 *     converter, one canonical path).
 *   - "defects" pins the behaviour P1-A intends to *remove*. Those tests are
 *     written to fail the moment the demo paths are isolated or deleted. That
 *     failure is the signal to rewrite them, not a regression.
 */

const readSource = (relativePath: string): string =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

const OMR_ROUTE = 'src/app/api/omr/upload/route.ts'
const ASYNC_ROUTE = 'src/app/api/upload-async/route.ts'
const BACKGROUND_ROUTE = 'src/app/api/processing/route.ts'
const IMMEDIATE_ROUTE = 'src/app/api/upload/route.ts'

const ASYNC_PROCESSOR = 'src/services/asyncUploadProcessor.ts'
const BACKGROUND_PROCESSOR = 'src/services/backgroundProcessor.ts'
const DEMO_GENERATOR = 'src/services/pdfParser.ts'

/** Every `.ts`/`.tsx` file under `src/`, excluding tests. */
function productSourceFiles(dir = join(process.cwd(), 'src')): string[] {
  const collected: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue
      collected.push(...productSourceFiles(full))
      continue
    }

    if (!/\.tsx?$/.test(entry)) continue
    if (/\.(test|spec)\.tsx?$/.test(entry)) continue
    collected.push(full)
  }

  return collected
}

describe('upload path inventory', () => {
  it('has exactly one path that reaches the real OMR service', () => {
    const omrRoute = readSource(OMR_ROUTE)
    expect(omrRoute).toContain('OMR_SERVICE_URL')
    expect(omrRoute).toContain('/process')

    for (const route of [ASYNC_ROUTE, BACKGROUND_ROUTE, IMMEDIATE_ROUTE]) {
      expect(readSource(route)).not.toContain('OMR_SERVICE_URL')
    }
  })

  it('routes the three non-OMR paths into the demo generator', () => {
    // Direct: the immediate route calls the parser itself.
    expect(readSource(IMMEDIATE_ROUTE)).toContain("from '@/services/pdfParser'")

    // Indirect: each async path delegates to a processor that calls it.
    expect(readSource(ASYNC_ROUTE)).toContain('asyncUploadProcessor')
    expect(readSource(ASYNC_PROCESSOR)).toContain("from './pdfParser'")

    expect(readSource(BACKGROUND_ROUTE)).toContain('backgroundProcessor')
    expect(readSource(BACKGROUND_PROCESSOR)).toContain("from './pdfParser'")
  })

  it('selects the demo melody from file length rather than file content', () => {
    const generator = readSource(DEMO_GENERATOR)
    expect(generator).toContain('createEnhancedDemo')
    expect(generator).toMatch(/bufferLength % melodyVariations\.length/)
  })
})

describe('upload path defects P1-A removes', () => {
  it('persists demo output as an ordinary sheet music record', () => {
    // Both demo processors create a SheetMusic row with a real
    // animationDataUrl and no marker separating it from a true conversion.
    for (const processor of [ASYNC_PROCESSOR, BACKGROUND_PROCESSOR]) {
      const source = readSource(processor)
      expect(source).toContain('prisma.sheetMusic.create')
      expect(source).toContain('animationDataUrl')
      expect(source).not.toMatch(/isDemo|isSynthetic|source:\s*['"]demo['"]/)
    }
  })

  it('shows a fabricated OMR progress bar on the async path', () => {
    // 25 seconds of invented progress for a stage that never runs.
    expect(readSource(ASYNC_PROCESSOR)).toMatch(
      /simulateProgress\(\s*sessionId,\s*'omr',\s*25000/
    )
  })

  it('keeps /api/upload reachable while no product code calls it', () => {
    const callers = productSourceFiles().filter((file) => {
      const source = readFileSync(file, 'utf8')
      return /['"`]\/api\/upload['"`]/.test(source) || /useFileUpload/.test(source)
    })

    // Only the hook that defines it — nothing renders or imports the hook.
    const relative = callers.map((file) => file.replace(`${process.cwd()}/`, ''))
    expect(relative).toEqual(['src/hooks/useFileUpload.ts'])
  })
})
