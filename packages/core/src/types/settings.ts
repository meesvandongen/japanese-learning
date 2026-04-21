export type ExercisePromptMode = 'audio' | 'audio+text' | 'text'

export interface Settings {
  autoListen: boolean
  autoStartDelay: number
  maxListenDuration: number
  keepScreenAwake: boolean
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
}
