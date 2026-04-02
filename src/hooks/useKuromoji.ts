import { useQuery } from '@tanstack/react-query'
import type { KuromojiTokenizer } from '../types/kuromoji'

// kuromoji is loaded as a classic <script> tag (public/kuromoji.js) which sets
// window.kuromoji. This keeps it completely outside Vite/Cloudflare's module
// bundler and avoids CJS-in-ESM issues with its zlibjs dependency.
// Dictionary files are served from /dict (copied from node_modules at postinstall).

async function buildTokenizer(): Promise<KuromojiTokenizer> {
  const kuromoji = window.kuromoji
  if (!kuromoji) throw new Error('kuromoji script not loaded')
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: '/dict' })
      .build((err, tokenizer) => {
        if (err) reject(err)
        else resolve(tokenizer)
      })
  })
}

export function useKuromoji(): { tokenizer: KuromojiTokenizer | undefined; isLoading: boolean; isError: boolean } {
  const { data: tokenizer, isLoading, isError } = useQuery({
    queryKey: ['kuromoji'],
    queryFn: buildTokenizer,
    staleTime: Infinity,
    retry: 2,
  })

  return { tokenizer, isLoading, isError }
}
