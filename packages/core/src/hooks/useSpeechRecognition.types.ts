/**
 * Shared interface for speech recognition. Both web (Web Speech API) and
 * native (expo-speech-recognition) implementations return this shape.
 *
 * `contextualStrings` is native-only — a list of expected utterances to bias
 * the recognizer toward (e.g. a flashcard's kana and alt readings). Web
 * implementations ignore it.
 */
export interface UseSpeechRecognitionOptions {
  lang: string
  onResult: (transcripts: string[]) => void
  onError: (msg: string) => void
  contextualStrings?: string[]
}

export interface UseSpeechRecognitionResult {
  isListening: boolean
  start: () => void
  stop: () => void
}
