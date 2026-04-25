import { KUROMOJI_DICT_FILES, type DictFileMap } from './loadDict.types'

export type { DictFileMap } from './loadDict.types'

/**
 * Fetches the 12 kuromoji dict files from `/dict/*` and returns them as a
 * Map<filename, ArrayBuffer> ready to feed into @patdx/kuromoji.
 *
 * The dict files are served as raw binary (application/octet-stream) by the
 * Vite plugin in apps/web/vite.config.ts — without that plugin the browser
 * auto-decompresses the .gz, which breaks kuromoji's internal decompression.
 *
 * Service worker caches `/dict/*` with staleWhileRevalidate so after the
 * first load there is zero network traffic for subsequent sessions.
 */
export async function loadDictFiles(): Promise<DictFileMap> {
  const map: DictFileMap = new Map()
  await Promise.all(
    KUROMOJI_DICT_FILES.map(async (name) => {
      const res = await fetch(`/dict/${name}`)
      if (!res.ok) throw new Error(`Failed to fetch /dict/${name}: ${res.status}`)
      map.set(name, await res.arrayBuffer())
    })
  )
  return map
}
