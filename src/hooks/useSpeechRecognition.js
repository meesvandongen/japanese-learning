import { useState, useRef, useCallback } from 'react'

export function useSpeechRecognition({ lang, onResult, onError }) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const results = Array.from(event.results[0]).map((r) => r.transcript)
      onResult?.(results)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'no-speech') {
        onError?.(`Speech recognition error: ${event.error}`)
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
