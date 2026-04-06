import { Button } from 'konsta/react'

interface Props {
  result: 'correct' | 'incorrect' | null
  heard: string
  showText: boolean
  showTranscript: boolean
  correctText: string
  incorrectText: string
  manualGrading?: boolean
  onOverrideCorrect?: () => void
  onOverrideIncorrect?: () => void
}

export function FlashcardFeedback({
  result,
  heard,
  showText,
  showTranscript,
  correctText,
  incorrectText,
  manualGrading,
  onOverrideCorrect,
  onOverrideIncorrect,
}: Props) {
  if (!result) return null

  return (
    <>
      {result === 'correct' && showText && (
        <div className="w-full rounded-xl bg-green-100 border border-green-300 p-4 text-center font-semibold text-green-900">
          <span className="block text-xl mt-1">{correctText}</span>
        </div>
      )}
      {result === 'incorrect' && showText && (
        <div className="w-full rounded-xl bg-red-100 border border-red-300 p-4 text-center font-semibold text-red-900">
          <span className="block text-xl mt-1">{incorrectText}</span>
        </div>
      )}
      {!showText && (
        <div className={`text-3xl font-bold ${result === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
          {result === 'correct' ? '\u2713' : '\u2717'}
        </div>
      )}
      {showTranscript && heard && (
        <p className="text-xs text-gray-400 italic text-center mt-2">Heard: &quot;{heard}&quot;</p>
      )}
      {manualGrading && (
        <div className="mt-2 flex justify-center">
          {result === 'incorrect' && (
            <Button small rounded outline className="!text-green-600 !border-green-600" onClick={onOverrideCorrect}>
              Mark as correct
            </Button>
          )}
          {result === 'correct' && (
            <Button small rounded outline className="!text-red-500 !border-red-500" onClick={onOverrideIncorrect}>
              Mark as incorrect
            </Button>
          )}
        </div>
      )}
    </>
  )
}
