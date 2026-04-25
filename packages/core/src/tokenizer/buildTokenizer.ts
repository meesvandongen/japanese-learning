import type { KuromojiTokenizer } from '../types/kuromoji'
import type { DictFileMap } from './loadDict.types'

/**
 * Build a kuromoji tokenizer from an in-memory dictionary map.
 *
 * We use @patdx/kuromoji — a maintained fork that accepts dictionaries as
 * ArrayBuffers rather than a server-side path. This removes the need for a
 * `<script>` tag (web) and works without a file-system loader (native).
 *
 * The fork's API mirrors kuromoji.js closely; we just skip dicPath and pass
 * the buffers directly. See packages/core/src/types/kuromoji.d.ts for the
 * tokenizer shape — it's identical to the classic kuromoji output so the
 * rest of the codebase (normalize.ts) is unchanged.
 */
export async function buildTokenizer(dict: DictFileMap): Promise<KuromojiTokenizer> {
  const kuromoji = await import('@patdx/kuromoji')
  const loader = {
    loadArrayBuffer(url: string): Promise<ArrayBuffer> {
      const name = url.split('/').pop()!
      const buf = dict.get(name)
      if (!buf) return Promise.reject(new Error(`Missing dict file: ${name}`))
      return Promise.resolve(buf)
    },
  }
  // The fork exposes `builder()` returning a promise-aware builder when a
  // loader is provided instead of dicPath.
  const builder = kuromoji.builder({ loader })
  return builder.build()
}
