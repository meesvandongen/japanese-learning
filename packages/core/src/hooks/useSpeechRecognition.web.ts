import { useState, useRef, useCallback, useEffect } from 'react'
import type { UseSpeechRecognitionOptions, UseSpeechRecognitionResult } from './useSpeechRecognition.types'

// Web Speech API types (not in standard lib — available in Chrome/Edge)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare var SpeechRecognition: {
  new(): SpeechRecognitionInstance
}

// Reasons the Web Speech API can stop unexpectedly:
// 1. Chrome's STT is cloud-based — any network hiccup aborts recognition silently.
// 2. The browser auto-stops after a period of silence (no `continuous` mode by default).
// 3. On mobile, audio focus can be stolen by another app/tab.
// 4. If start() is called while a previous instance is still active, the new instance
//    may fail to start or the old one may fire `onend` and leave `isListening` in a
//    stale state.
// 5. Calling stop() right after start() (race condition) can cause an `aborted` error.
//
// Mitigations applied here:
// - Always abort() the previous instance before creating a new one.
// - Use refs for callbacks so the recognition instance always calls the latest version.
// - Distinguish `aborted` errors (expected on restart) from real errors.

export function useSpeechRecognition({ lang, onResult, onError }: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Keep latest callbacks in refs so the recognition instance never captures stale closures
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const start = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      onErrorRef.current('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    // Abort any in-progress recognition before starting fresh to avoid overlapping instances
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
      recognitionRef.current = null
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results[0]).map((r) => r.transcript)
      onResultRef.current(results)
    }

    recognition.onerror = (event: SpeechRecognitionEvent) => {
      setIsListening(false)
      // 'no-speech': user was quiet — not an error worth surfacing
      // 'aborted': we called abort() ourselves — expected on restart
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onErrorRef.current(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => setIsListening(false)

    try {
      recognition.start()
    } catch (e) {
      // InvalidStateError thrown if start() is called on an already-started instance
      setIsListening(false)
      onErrorRef.current(`Could not start speech recognition: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [lang])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }
    setIsListening(false)
  }, [])

  return { isListening, start, stop }
}
