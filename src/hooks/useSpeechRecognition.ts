import { useState, useRef, useCallback } from 'react'

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
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

declare var SpeechRecognition: {
  new(): SpeechRecognitionInstance
}

interface UseSpeechRecognitionProps {
  lang: string
  onResult: (transcripts: string[]) => void
  onError: (msg: string) => void
}

export function useSpeechRecognition({ lang, onResult, onError }: UseSpeechRecognitionProps): {
  isListening: boolean
  start: () => void
  stop: () => void
} {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const start = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results[0]).map((r) => r.transcript)
      onResult(results)
    }

    recognition.onerror = (event: SpeechRecognitionEvent) => {
      setIsListening(false)
      if (event.error !== 'no-speech') {
        onError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => setIsListening(false)

    recognition.start()
  }, [lang, onResult, onError])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, start, stop }
}
