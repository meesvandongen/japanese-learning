import { useQuery } from '@tanstack/react-query'
import type { KuromojiTokenizer } from '../types/kuromoji'
import { buildTokenizer } from '../tokenizer/buildTokenizer'
import { loadDictFiles } from '../tokenizer/loadDict.web'

/**
 * Loads kuromoji as proper ESM (@patdx/kuromoji), fetching the dict files
 * from `/dict/*` as ArrayBuffers and feeding them directly to the builder.
 * No UMD `<script>` tag, no global `window.kuromoji`, no CJS-in-ESM hacks.
 *
 * Service worker caches `/dict/*` after the first load so subsequent
 * sessions cost nothing network-wise.
 */
async function buildWebTokenizer(): Promise<KuromojiTokenizer> {
  const dict = await loadDictFiles()
  return buildTokenizer(dict)
}

export function useKuromoji(): { tokenizer: KuromojiTokenizer | undefined; isLoading: boolean; isError: boolean } {
  const { data: tokenizer, isLoading, isError } = useQuery({
    queryKey: ['kuromoji'],
    queryFn: buildWebTokenizer,
    staleTime: Infinity,
    retry: 2,
  })

  return { tokenizer, isLoading, isError }
}
