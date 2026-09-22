#!/usr/bin/env node
// Measure the Vercel Function bundles produced by `vercel build`.
//
// Usage: vercel build --prod && node scripts/measure-function-size.mjs [--json out.json] [--top N]
//
// `vercel build` groups routes that share a runtime configuration into one
// Lambda: each route is a `*.func` entry, but most are symlinks to a few real
// directories whose `.vc-config.json` `filePathMap` lists the traced files by
// repository path instead of copying them. Vercel stores one bundle per real
// Lambda, so the storage-relevant size is the sum over real directories, and
// the per-route view only tells which routes share a bundle.
//
// Sizes are uncompressed bytes plus a per-file deflate estimate. Vercel reports
// the zipped size, which the deflate estimate approximates. Native binaries
// (e.g. the Prisma query engine) are resolved for the build host's platform, so
// a macOS build carries a darwin engine where Vercel carries a linux one.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = process.cwd()
const functionsDir = path.join(root, '.vercel/output/functions')
const args = process.argv.slice(2)
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null
const top = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) : 12

if (!fs.existsSync(functionsDir)) {
  console.error('No .vercel/output/functions. Run `vercel build --prod` first.')
  process.exit(1)
}

const fileSizeCache = new Map()
function measureFile(absPath) {
  if (fileSizeCache.has(absPath)) return fileSizeCache.get(absPath)
  let result = { raw: 0, deflated: 0 }
  try {
    const stat = fs.statSync(absPath)
    if (stat.isFile()) {
      const data = fs.readFileSync(absPath)
      result = { raw: data.length, deflated: zlib.deflateRawSync(data).length }
    }
  } catch {
    // A traced path that no longer exists contributes nothing.
  }
  fileSizeCache.set(absPath, result)
  return result
}

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      visit(abs, true)
    } else if (entry.isDirectory()) {
      if (entry.name.endsWith('.func')) visit(abs, false)
      else walk(abs, visit)
    }
  }
}

function packageOf(bundlePath) {
  const parts = bundlePath.split('/')
  const i = parts.lastIndexOf('node_modules')
  if (i === -1) return bundlePath.startsWith('.next/') ? '(next server output)' : '(other)'
  const name = parts[i + 1]?.startsWith('@') ? `${parts[i + 1]}/${parts[i + 2]}` : parts[i + 1]
  return name ?? '(other)'
}

const routes = []
const lambdas = new Map()

walk(functionsDir, (abs, isLink) => {
  const route = path.relative(functionsDir, abs).replace(/\.func$/, '')
  const real = isLink ? fs.realpathSync(abs) : abs
  routes.push({ route, lambda: path.relative(functionsDir, real).replace(/\.func$/, '') })
  if (lambdas.has(real)) return

  const config = JSON.parse(fs.readFileSync(path.join(real, '.vc-config.json'), 'utf8'))
  const files = new Map()
  const addOwn = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) addOwn(p)
      else if (entry.name !== '.vc-config.json') files.set(path.relative(real, p), p)
    }
  }
  addOwn(real)
  for (const [bundlePath, source] of Object.entries(config.filePathMap ?? {})) {
    files.set(bundlePath, path.resolve(root, source))
  }

  let raw = 0
  let deflated = 0
  const byPackage = new Map()
  for (const [bundlePath, source] of files) {
    const size = measureFile(source)
    raw += size.raw
    deflated += size.deflated
    const pkg = packageOf(bundlePath)
    const acc = byPackage.get(pkg) ?? { raw: 0, deflated: 0, files: 0 }
    acc.raw += size.raw
    acc.deflated += size.deflated
    acc.files += 1
    byPackage.set(pkg, acc)
  }
  lambdas.set(real, {
    lambda: path.relative(functionsDir, real).replace(/\.func$/, ''),
    runtime: config.runtime,
    maxDuration: config.maxDuration ?? null,
    files: files.size,
    raw,
    deflated,
    byPackage: [...byPackage.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.raw - a.raw),
  })
})

const list = [...lambdas.values()]
  .map((l) => ({ ...l, routes: routes.filter((r) => r.lambda === l.lambda).length }))
  .sort((a, b) => b.raw - a.raw)
const mb = (n) => (n / 1e6).toFixed(2)
const sum = (key) => list.reduce((acc, l) => acc + l[key], 0)
const perRouteDeflated = list.reduce((acc, l) => acc + l.deflated * l.routes, 0)

console.log(`routes: ${routes.length}  lambdas: ${list.length}`)
console.log(`total unique lambdas: ${mb(sum('raw'))} MB raw, ~${mb(sum('deflated'))} MB deflated`)
console.log(`per-route sum (every route counted with its lambda): ~${mb(perRouteDeflated)} MB deflated`)
console.log('')
console.log('lambda | runtime | maxDuration | routes | files | raw MB | ~deflated MB')
for (const l of list) {
  console.log(`${l.lambda} | ${l.runtime} | ${l.maxDuration ?? '-'} | ${l.routes} | ${l.files} | ${mb(l.raw)} | ${mb(l.deflated)}`)
}
const largest = list[0]
if (largest) {
  console.log('')
  console.log(`largest lambda ${largest.lambda}: top packages`)
  for (const p of largest.byPackage.slice(0, top)) {
    console.log(`  ${p.name} | ${p.files} files | ${mb(p.raw)} MB raw | ~${mb(p.deflated)} MB deflated`)
  }
}

if (jsonOut) {
  fs.writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        routes: routes.length,
        lambdas: list.length,
        totalRaw: sum('raw'),
        totalDeflated: sum('deflated'),
        perRouteDeflated,
        list,
        routeMap: routes.sort((a, b) => a.route.localeCompare(b.route)),
      },
      null,
      2,
    ),
  )
}
