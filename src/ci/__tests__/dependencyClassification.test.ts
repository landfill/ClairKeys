import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * The Security Audit gate only checks deployed dependencies (`npm audit --omit=dev`, D-095),
 * so a package that is not shipped must live in devDependencies and one that is shipped must not.
 * jimp (and its vulnerable zod 3) is used only by the development demo generator `pdfParser.ts`,
 * which product code reaches through `import type` alone.
 */
const root = process.cwd()
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sourceFiles(full)
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [full] : []
  })
}

const productFiles = sourceFiles(path.join(root, 'src'))

describe('dependency classification for the deployed-only audit gate', () => {
  it('keeps jimp out of the deployed dependencies', () => {
    expect(pkg.dependencies).not.toHaveProperty('jimp')
    expect(pkg.devDependencies).toHaveProperty('jimp')
  })

  it('imports jimp only from the development demo generator', () => {
    const importers = productFiles
      .filter(file => /from ['"]jimp['"]|require\(['"]jimp['"]\)/.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(root, file))
    expect(importers).toEqual(['src/services/pdfParser.ts'])
  })

  it('reaches the demo generator from product code through type imports only', () => {
    const valueImporters = productFiles
      .filter(file => !file.endsWith(path.join('services', 'pdfParser.ts')))
      .filter(file => readFileSync(file, 'utf8').split('\n').some(line =>
        /(from|import\()\s*['"](\.\/|@\/services\/|\.\.\/services\/)pdfParser['"]/.test(line) && !/^\s*import type /.test(line)))
      .map(file => path.relative(root, file))
    expect(valueImporters).toEqual([])
  })
})
