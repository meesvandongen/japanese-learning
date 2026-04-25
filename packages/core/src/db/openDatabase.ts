import type { DB, DBOpenOptions } from './types'

/**
 * Platform router for openDatabase.
 *
 * Vite resolves to `./openDatabase.web.ts` via its platform-extensions
 * resolver; Metro picks `./openDatabase.native.ts` on iOS/Android.
 */
export async function openDatabase(opts: DBOpenOptions = {}): Promise<DB> {
  const mod = await import('./openDatabase.web')
  return mod.openDatabase(opts)
}
