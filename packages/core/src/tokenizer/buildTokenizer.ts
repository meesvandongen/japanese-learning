import { inflate } from 'pako'
import type { KuromojiTokenizer } from '../types/kuromoji'
import type { DictFileMap } from './loadDict.types'

/**
 * Build a kuromoji tokenizer from an in-memory dictionary map.
 *
 * @patdx/kuromoji's `loadDictionary` expects each `loadArrayBuffer(name)`
 * call to return the *decompressed* dictionary bytes — the file naming
 * (".dat.gz") is historical. The package's built-in NodeDictionaryLoader
 * decompresses with `zlib.gunzip`; the BrowserDictionaryLoader relies on
 * the browser's `Content-Encoding: gzip` auto-decompression in `fetch`.
 *
 * Our `loadDict.{web,native}.ts` loaders ship the raw gzipped bytes
 * straight from `<bundled .gz file>` because either the platform doesn't
 * support gzip-encoded fetch (RN) or we deliberately disable it on the
 * web (Cloudflare _headers serves /dict/* with `Content-Encoding:
 * identity` so our service-worker cache caches the raw bytes once).
 *
 * Therefore we gunzip here, in pure JS via pako. Pako runs everywhere
 * (web, RN, Node) and adds ~45 KB to the bundle. Decompression for the
 * full IPA dict is one-shot, ~150 ms on device.
 */
export async function buildTokenizer(dict: DictFileMap): Promise<KuromojiTokenizer> {
  const kuromoji = await import('@patdx/kuromoji')

  const decompressed = new Map<string, ArrayBuffer>()
  for (const [name, gz] of dict) {
    // pako accepts a Uint8Array view; the result is a fresh Uint8Array
    // whose `.buffer` is a standalone ArrayBuffer (no offset). Kuromoji
    // wraps it directly in Int32Array / Uint16Array / Uint8Array views.
    const out = inflate(new Uint8Array(gz))
    decompressed.set(name, out.buffer)
  }

  const loader = {
    loadArrayBuffer(url: string): Promise<ArrayBuffer> {
      const name = url.split('/').pop()!
      const buf = decompressed.get(name)
      if (!buf) return Promise.reject(new Error(`Missing dict file: ${name}`))
      return Promise.resolve(buf)
    },
  }

  const builder = kuromoji.builder({ loader })
  return builder.build()
}
