/**
 * Hook exports. Each platform-forked hook has `.web.ts` and `.native.ts`
 * implementations; bundlers (Metro for native, Vite for web) resolve the
 * right file via platform-specific extensions.
 *
 * Module resolution is delegated to the bundler: Metro picks *.native.ts
 * first when targeting iOS/Android, Vite picks *.web.ts via its resolver
 * (configured in apps/web/vite.config.ts).
 */
export { useVocabulary } from './useVocabulary'
export { useCardStates } from './useCardState'
export { useKuromoji } from './useKuromoji'
export { useSpeechRecognition } from './useSpeechRecognition'
export { useSpeechSynthesis } from './useSpeechSynthesis'
export { useAudioFeedback } from './useAudioFeedback'
export { useWakeLock } from './useWakeLock'
export type { UseSpeechRecognitionOptions, UseSpeechRecognitionResult } from './useSpeechRecognition.types'
