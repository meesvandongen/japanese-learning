/**
 * Copy kuromoji dictionary files into the locations each workspace needs.
 *
 * Sources: node_modules/kuromoji/dict/*.dat.gz (12 files, ~12 MB total)
 *
 * Targets:
 *   apps/mobile/public/dict/        — served by Metro for web (fetch /dict/...)
 *   apps/mobile/assets/dict/        — bundled into the native APK
 *   packages/core/assets/dict/      — required by packages/core/src/tokenizer/
 *                                     loadDict.native.ts (the require() path
 *                                     resolves to packages/core/assets/...)
 *
 * Runs at workspace root postinstall so a single `npm install` materialises
 * everything. Skips silently when source files are missing (npm warnings
 * about kuromoji not being a deps target shouldn't fail the install).
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const source = join(root, 'node_modules', 'kuromoji', 'dict')

const targets = [
  join(root, 'apps', 'mobile', 'public', 'dict'),
  join(root, 'apps', 'mobile', 'assets', 'dict'),
  join(root, 'packages', 'core', 'assets', 'dict'),
]

if (!existsSync(source)) {
  console.warn(`[copy-dict] ${source} missing; skipping`)
  process.exit(0)
}

const files = readdirSync(source).filter((f) => f.endsWith('.dat.gz'))

for (const dir of targets) {
  mkdirSync(dir, { recursive: true })
  for (const f of files) copyFileSync(join(source, f), join(dir, f))
  console.log(`[copy-dict] ${dir} (${files.length} files)`)
}
