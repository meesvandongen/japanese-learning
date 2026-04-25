import { useQuery } from '@tanstack/react-query'
import type { KuromojiTokenizer } from '../types/kuromoji'
import { buildTokenizer } from '../tokenizer/buildTokenizer'
import { loadDictFiles } from '../tokenizer/loadDict.native'

/**
 * Native kuromoji loader — pulls dict files from the app bundle via
 * expo-asset and builds the tokenizer with @patdx/kuromoji.
 *
 * First launch unpacks the 12 .dat.gz files from the bundle (~12 MB) into
 * the cache dir. Subsequent launches hit the cache.
 */
async function buildNativeTokenizer(): Promise<KuromojiTokenizer> {
  const dict = await loadDictFiles()
  return buildTokenizer(dict)
}

export function useKuromoji(): { tokenizer: KuromojiTokenizer | undefined; isLoading: boolean; isError: boolean } {
  const { data: tokenizer, isLoading, isError } = useQuery({
    queryKey: ['kuromoji'],
    queryFn: buildNativeTokenizer,
    staleTime: Infinity,
    retry: 2,
  })

  return { tokenizer, isLoading, isError }
}
