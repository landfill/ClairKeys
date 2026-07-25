import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * P1-A — pins the upload pipeline to a single canonical path.
 *
 * Stage 1 of this phase found four PDF upload entry points, only one of which
 * converted a score. The other three reached `pdfParser.createEnhancedDemo()`,
 * which picks a canned melody by file *length* and never opens the PDF, then
 * stored the result as an ordinary `SheetMusic` row — indistinguishable from a
 * real conversion. D-001 has forbidden that since 2026-07-19.
 *
 * Stages 3–5 (D-010) removed it. What this file now asserts is the end state:
 *
 *   - "inventory" — one real converter, reached by one canonical path.
 *   - "demo output cannot be persisted" — the property D-010 bought. These are
 *     the tests that replaced the earlier "defects P1-A removes" block; that
 *     block described the old behaviour and went red here, as its own header
 *     predicted.
 *   - "provenance identifiers" — what a later migration needs in order to
 *     classify rows that were already stored before this landed.
 */

const readSource = (relativePath: string): string =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

const OMR_ROUTE = 'src/app/api/omr/upload/route.ts'
const ASYNC_ROUTE = 'src/app/api/upload-async/route.ts'
const BACKGROUND_ROUTE = 'src/app/api/processing/route.ts'

const ASYNC_PROCESSOR = 'src/services/asyncUploadProcessor.ts'
const BACKGROUND_PROCESSOR = 'src/services/backgroundProcessor.ts'
const DEMO_GENERATOR = 'src/services/pdfParser.ts'

const UPLOAD_PAGE = 'src/app/upload/page.tsx'

/** Paths deleted by D-010 decisions 2 and 5. */
const REMOVED_PATHS = [
  'src/app/api/upload/route.ts',
  'src/hooks/useFileUpload.ts',
]

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

const relativeTo = (file: string) => file.replace(`${process.cwd()}/`, '')

/**
 * A runtime import of the demo generator — the thing that can actually produce
 * fabricated notes. Type-only imports are excluded deliberately: they compile
 * away and cannot generate anything. `musicDataConverter.ts` still takes
 * `PianoAnimationData`/`PianoNote` from here, because the identically named
 * types in `src/types/piano.ts` have a different shape (`key` vs `note`).
 * Reconciling them is P2-A's duplicate-layer work, not P1-A's.
 */
const IMPORTS_DEMO_GENERATOR =
  /import\s+(?!type\s)\{[^}]*\}\s+from\s+'(?:\.\/pdfParser|@\/services\/pdfParser)'/

describe('upload path inventory', () => {
  it('has exactly one path that reaches the real OMR service', () => {
    const omrRoute = readSource(OMR_ROUTE)
    expect(omrRoute).toContain('OMR_SERVICE_URL')
    expect(omrRoute).toContain('/process')

    for (const route of [ASYNC_ROUTE, BACKGROUND_ROUTE]) {
      expect(readSource(route)).not.toContain('OMR_SERVICE_URL')
    }
  })

  it('offers the canonical path alone on the upload page', () => {
    const page = readSource(UPLOAD_PAGE)

    expect(page).toContain('OMRUploadForm')
    // The three-mode selector is gone: no mode state, no alternative forms.
    expect(page).not.toContain('uploadMode')
    expect(page).not.toContain('MultiStageUploadUI')
    expect(page).not.toContain('BackgroundFileUpload')
  })

  it('has removed the caller-less immediate path entirely', () => {
    for (const path of REMOVED_PATHS) {
      expect(existsSync(join(process.cwd(), path))).toBe(false)
    }

    const referencing = productSourceFiles()
      .filter((file) => /['"`]\/api\/upload['"`]|useFileUpload/.test(readFileSync(file, 'utf8')))
      .map(relativeTo)

    expect(referencing).toEqual([])
  })
})

describe('demo output cannot be persisted', () => {
  it('keeps every SheetMusic writer away from the demo generator', () => {
    const writers = productSourceFiles()
      .filter((file) => /prisma\.sheetMusic\.create|this\.prisma\.sheetMusic\.create/.test(
        readFileSync(file, 'utf8')
      ))
      .map(relativeTo)
      .sort()

    // Three writers remain. The two demo processors are no longer among them:
    // stage 4 removed their persistence entirely rather than guarding it.
    expect(writers).toEqual([
      'src/app/api/omr/upload/route.ts',
      'src/app/api/sheet/route.ts',
      'src/repositories/SheetMusicRepository.ts',
    ])

    for (const writer of writers) {
      expect(readSource(writer)).not.toMatch(/from '\.\/pdfParser'|from '@\/services\/pdfParser'/)
    }
  })

  it('fails the async and background paths explicitly instead of fabricating', () => {
    // D-001: a fallback must return an explicit failure or a demo state. These
    // two keep their progress contract (P1-B inherits it) but can no longer
    // finish a job with invented notes.
    for (const processor of [ASYNC_PROCESSOR, BACKGROUND_PROCESSOR]) {
      const source = readSource(processor)
      expect(source).not.toMatch(IMPORTS_DEMO_GENERATOR)
      expect(source).toContain('CONVERSION_UNAVAILABLE')
    }
  })

  it('confines the demo generator to development', () => {
    const generator = readSource(DEMO_GENERATOR)
    expect(generator).toContain('assertDemoGenerationAllowed')
    expect(generator).toMatch(/NODE_ENV.*production|production.*NODE_ENV/)
  })

  it('leaves no product code able to invoke the demo generator', () => {
    const importers = productSourceFiles()
      .filter((file) => relativeTo(file) !== DEMO_GENERATOR)
      .filter((file) => IMPORTS_DEMO_GENERATOR.test(readFileSync(file, 'utf8')))
      .map(relativeTo)

    expect(importers).toEqual([])
  })
})

describe('provenance identifiers for rows stored before this landed', () => {
  it('sets omrJobId only on the real path', () => {
    // First-pass filter for the migration in D-010 decision 5. It narrows
    // candidates; it does not decide, because /api/sheet and
    // SheetMusicRepository also write rows with no omrJobId.
    expect(readSource(OMR_ROUTE)).toContain('omrJobId')

    for (const ambiguous of ['src/app/api/sheet/route.ts', 'src/repositories/SheetMusicRepository.ts']) {
      expect(readSource(ambiguous)).not.toContain('omrJobId')
    }
  })

  it('keeps the demo melodies fixed so stored rows can be matched against them', () => {
    // The discriminator that actually decides. Demo rows already in the
    // database carry one of these literals; changing them breaks the only
    // reliable way to classify those rows.
    const generator = readSource(DEMO_GENERATOR)
    expect(generator).toContain('melodyVariations')
    expect(generator).toMatch(/tempo:\s*120/)
    expect(generator).toMatch(/timeSignature:\s*'4\/4'/)
    expect(generator).toMatch(/note:\s*'C4',\s*startTime:\s*0/)
  })
})
