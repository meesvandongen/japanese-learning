import { useCallback, useEffect, useState } from 'react'
import * as Speech from 'expo-speech'

/**
 * Native TTS via expo-speech.
 *
 * Walk mode wraps this in a react-native-track-player queue so lock-screen
 * controls work — plain TTS calls still go through this hook for every
 * non-walk study session.
 */
export function useSpeechSynthesis(): {
  isSpeaking: boolean
  speak: (text: string, lang?: string, rate?: number, onEnd?: () => void) => void
  cancel: () => void
} {
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    return () => {
      Speech.stop()
    }
  }, [])

  const speak = useCallback((text: string, lang = 'ja-JP', rate = 0.9, onEnd?: () => void) => {
    Speech.stop()
    setIsSpeaking(true)
    Speech.speak(text, {
      language: lang,
      rate,
      onDone: () => { setIsSpeaking(false); onEnd?.() },
      onStopped: () => { setIsSpeaking(false) },
      onError: () => { setIsSpeaking(false); onEnd?.() },
    })
  }, [])

  const cancel = useCallback(() => {
    Speech.stop()
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, speak, cancel }
}
