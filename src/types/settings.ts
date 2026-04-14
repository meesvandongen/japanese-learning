export type ExercisePromptMode = 'audio' | 'audio+text' | 'text'

export interface Settings {
  autoListen: boolean
  autoStartDelay: number
  maxListenDuration: number
  feedbackText: boolean
  feedbackVoice: boolean
  feedbackSound: boolean
  phoneticSoundex: boolean
  phoneticMetaphone: boolean
  showTranscript: boolean
  japaneseExerciseMode: ExercisePromptMode
  englishExerciseMode: ExercisePromptMode
  manualGrading: boolean
  speakToCorrect: boolean
  /** When set, forces the study page to show this specific card (by kana). */
  debugCardKana: string | null
}
