import { Button } from 'konsta/react'

export interface PreviousResultData {
  japanese: string
  kana: string
  english: string[]
  result: 'correct' | 'incorrect'
  heard: string
  mode: 1 | 4
}

interface Props {
  data: PreviousResultData
  manualGrading: boolean
  onOverride: (quality: number) => void
}

export function PreviousResult({ data, manualGrading, onOverride }: Props) {
  const isCorrect = data.result === 'correct'
  const primaryEnglish = data.english[0]

  return (
    <div
      className={`rounded-xl mb-4 px-3 py-2.5 flex items-center gap-2.5 text-sm animate-prev-slide-in ${
        isCorrect
          ? 'border border-green-300 bg-green-50'
          : 'border border-red-300 bg-red-50'
      }`}
    >
      <span className={`font-bold text-base shrink-0 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
        {isCorrect ? '\u2713' : '\u2717'}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-medium truncate">
          {data.mode === 1 ? primaryEnglish : data.japanese}
          {' \u2192 '}
          {data.mode === 1 ? data.japanese : primaryEnglish}
        </span>
        {data.heard && (
          <span className="text-xs italic text-gray-500 truncate">Heard: &quot;{data.heard}&quot;</span>
        )}
      </div>

      {manualGrading && !isCorrect && (
        <Button small rounded outline className="shrink-0 !text-green-600 !border-green-600 !text-xs" onClick={() => onOverride(4)}>
          Mark correct
        </Button>
      )}
      {manualGrading && isCorrect && (
        <Button small rounded outline className="shrink-0 !text-red-500 !border-red-500 !text-xs" onClick={() => onOverride(1)}>
          Mark incorrect
        </Button>
      )}
    </div>
  )
}
