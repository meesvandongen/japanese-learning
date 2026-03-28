import { useQuery } from '@tanstack/react-query'
import kuromoji from 'kuromoji'

async function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict' })
      .build((err, tokenizer) => {
        if (err) reject(err)
        else resolve(tokenizer)
      })
  })
}

export function useKuromoji() {
  const { data: tokenizer, isLoading, isError, error } = useQuery({
    queryKey: ['kuromoji'],
    queryFn: buildTokenizer,
    staleTime: Infinity,
    retry: 2,
  })

  return { tokenizer, isLoading, isError, error }
}
