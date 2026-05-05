import { inflate } from 'pako'
import type { KuromojiTokenizer } from '../types/kuromoji'
import type { DictFileMap } from './loadDict.types'

/**
 * Build a kuromoji tokenizer from an in-memory dictionary map.
 *
 * @patdx/kuromoji's `loadDictionary` expects each `loadArrayBuffer(name)`
 * call to return the *decompressed* dictionary bytes. The platform
 * loaders (`loadDict.{web,native}.ts`) ship raw gzipped bytes — web
 * fetches them with `Content-Encoding: identity`, native pulls them
 * out of base64-encoded JS strings — and we gunzip here, in pure JS
 * via pako. Pako runs everywhere (web, RN, Node) and adds ~45 KB to
 * the bundle; decompressing the full IPA dict is ~150 ms one-shot.
 *
 * Why not gunzip in the loader? Doing it here keeps the loader thin,
 * keeps the dictionary bytes contract explicit (raw .gz in, raw .gz
 * out), and avoids running pako twice during the test round-trip.
 */
export async function buildTokenizer(dict: DictFileMap): Promise<KuromojiTokenizer> {
  const kuromoji = await import('@patdx/kuromoji')

  const decompressed = new Map<string, ArrayBuffer>()
  for (const [name, gz] of dict) {
    const out = inflate(new Uint8Array(gz))
    // Copy into a fresh, offset-0 ArrayBuffer so kuromoji's typed-array
    // views (Int32Array, Uint16Array, Uint8Array) line up correctly.
    const buf = new Uint8Array(out.byteLength)
    buf.set(out)
    decompressed.set(name, buf.buffer)
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
