import { useQuery } from '@tanstack/react-query'

// Lightweight mock tokenizer used during e2e tests (VITE_MOCK_KUROMOJI=true).
// Returns each character as its own token with reading === surface_form so
// hiragana strings pass through wanakana.toHiragana unchanged.
function mockTokenizer() {
  return {
    tokenize: (text) =>
      [...text].map((char) => ({ surface_form: char, reading: char })),
  }
}

async function buildTokenizer() {
  if (import.meta.env.VITE_MOCK_KUROMOJI === 'true') {
    return mockTokenizer()
  }
  // Dynamic import keeps kuromoji (and its zlibjs dep) out of the initial bundle
  // and prevents its module-level side-effects from running during tests.
  const kuromoji = await import('kuromoji')
  return new Promise((resolve, reject) => {
    kuromoji.default
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
