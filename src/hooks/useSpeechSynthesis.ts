import { useCallback, useEffect, useRef, useState } from 'react'

// ---- Voice caching --------------------------------------------------------
// Chrome loads voices asynchronously. getVoices() returns [] until the
// voiceschanged event fires.  We cache them at module level so every
// subsequent pickVoice() call gets the full list immediately.
let cachedVoices: SpeechSynthesisVoice[] = []

function refreshVoices() {
  cachedVoices = window.speechSynthesis.getVoices()
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices()
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
}

// Prefer high-quality online voices (Google/Microsoft) over local system voices.
// Local system voices (e.g. "Alex", "Samantha" on macOS) are lower quality than the
// cloud-backed voices Chrome/Edge install. We detect them by checking localService:
// false means the voice is fetched from a server and is typically much higher quality.
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices()
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
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current)
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    }
  }, [])

  const clearResumeInterval = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current)
      resumeIntervalRef.current = null
    }
  }, [])

  const speak = useCallback((text: string, lang = 'ja-JP', rate = 0.9, onEnd?: () => void) => {
    clearResumeInterval()
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }

    window.speechSynthesis.cancel()

    // Small delay after cancel() — Chrome can otherwise cancel the new
    // utterance together with the old one (race condition in some versions).
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = rate

      const voice = pickVoice(lang)
      if (voice) utterance.voice = voice

      utterance.onstart = () => {
        setIsSpeaking(true)
        // Chrome sometimes pauses long utterances or gets "stuck" after many
        // speak/cancel cycles.  Periodically poking resume() prevents this.
        resumeIntervalRef.current = setInterval(() => {
          window.speechSynthesis.resume()
        }, 5000)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        clearResumeInterval()
        onEnd?.()
      }

      utterance.onerror = (e) => {
        // 'canceled' fires when we call cancel() ourselves — not a real error.
        if (e.error === 'canceled') return
        setIsSpeaking(false)
        clearResumeInterval()
        onEnd?.()
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }, 50)
  }, [clearResumeInterval])

  const cancel = useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    clearResumeInterval()
  }, [clearResumeInterval])

  return { isSpeaking, speak, cancel }
}
