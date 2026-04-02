import { useCallback, useRef, useState } from 'react'

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

    // Prefer a Japanese voice if available
    if (lang === 'ja-JP') {
      const voices = window.speechSynthesis.getVoices()
      const jaVoice = voices.find(
        (v) => v.lang === 'ja-JP' || v.lang.startsWith('ja')
      )
      if (jaVoice) utterance.voice = jaVoice
    }

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
