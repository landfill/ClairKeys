import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

// Next resolves `next.config.js`, `.mjs`, then `.ts` and stops at the first hit,
// so a second config file is silently ignored. Issue #178 found production
// running without the settings written in the ignored `next.config.ts`.

const root = path.resolve(__dirname, '../../..')
const CONFIG_NAMES = ['next.config.js', 'next.config.cjs', 'next.config.mjs', 'next.config.ts', 'next.config.mts']

function loadConfig(file: string) {
  // Jest runs CommonJS; the config is an ES module, so evaluate it in Node.
  const script = `
    const mod = await import(${JSON.stringify(path.join(root, file))});
    const config = mod.default;
    const headers = config.headers ? await config.headers() : [];
    console.log(JSON.stringify({ ...config, headers }));
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production' },
  })
  if (result.status !== 0) throw new Error(result.stderr)
  return JSON.parse(result.stdout)
}

describe('Next config', () => {
  const present = CONFIG_NAMES.filter((name) => fs.existsSync(path.join(root, name)))

  it('exists exactly once so no setting is silently ignored', () => {
    expect(present).toEqual(['next.config.mjs'])
  })

  it('keeps the settings production depends on', () => {
    const config = loadConfig(present[0])

    const samples = config.headers.find((h: { source: string }) => h.source === '/samples/piano/:file*')
    expect(samples?.headers).toContainEqual({
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    })

    const hosts = config.images.remotePatterns.map((p: { hostname: string }) => p.hostname)
    expect(hosts).toEqual(expect.arrayContaining(['lh3.googleusercontent.com', 'avatars.githubusercontent.com']))

    expect(config.experimental?.optimizeCss).toBe(true)
  })
})
