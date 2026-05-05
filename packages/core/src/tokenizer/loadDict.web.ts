import { KUROMOJI_DICT_FILES, type DictFileMap } from './loadDict.types'

export type { DictFileMap } from './loadDict.types'

/**
 * Fetches the 12 kuromoji dict files from `/dict/*.dat.gz` and returns
 * them as a Map<filename, ArrayBuffer>.
 *
 * The bytes are still gzipped at this point — `buildTokenizer` decompresses
 * them with pako (same code path as native). Cloudflare's `_headers` file
 * pins `Content-Encoding: identity` so the SW + the browser cache see the
 * raw bytes once and don't re-decode on every request.
 *
 * The service worker caches `/dict/*` with stale-while-revalidate so
 * subsequent sessions hit zero network.
 */
export async function loadDictFiles(): Promise<DictFileMap> {
  const map: DictFileMap = new Map()
  await Promise.all(
    KUROMOJI_DICT_FILES.map(async (name) => {
      const url = `/dict/${name}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
      map.set(name, await res.arrayBuffer())
    })
  )
  return map
}
