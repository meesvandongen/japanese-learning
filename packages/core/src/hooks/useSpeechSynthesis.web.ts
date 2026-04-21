import { useCallback, useRef, useState } from 'react'

// Prefer high-quality online voices (Google/Microsoft) over local system voices.
// Local system voices (e.g. "Alex", "Samantha" on macOS) are lower quality than the
// cloud-backed voices Chrome/Edge install. We detect them by checking localService:
// false means the voice is fetched from a server and is typically much higher quality.
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const locale = lang.toLowerCase()

  // Exact locale match e.g. 'en-us', 'ja-jp'
  const exact = voices.filter((v) => v.lang.toLowerCase() === locale)
  // Prefix match e.g. 'en-*' or 'ja-*'
  const prefix = voices.filter((v) => v.lang.toLowerCase().startsWith(locale.split('-')[0]))

  const pool = exact.length > 0 ? exact : prefix
  if (pool.length === 0) return undefined

  // Prefer online (non-local-service) voices — they are higher quality
  const online = pool.filter((v) => !v.localService)
  return online[0] ?? pool[0]
}

export function useSpeechSynthesis(): {
  isSpeaking: boolean
  speak: (text: string, lang?: string, rate?: number, onEnd?: () => void) => void
  cancel: () => void
} {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, lang = 'ja-JP', rate = 0.9, onEnd?: () => void) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate

    const voice = pickVoice(lang)
    if (voice) utterance.voice = voice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => { setIsSpeaking(false); onEnd?.() }
    utterance.onerror = () => { setIsSpeaking(false); onEnd?.() }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, speak, cancel }
}
