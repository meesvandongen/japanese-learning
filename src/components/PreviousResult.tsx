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
    <div className={`prev-result ${isCorrect ? 'prev-correct' : 'prev-incorrect'}`}>
      <span className="prev-result-icon">{isCorrect ? '✓' : '✗'}</span>

      <div className="prev-result-body">
        <span className="prev-result-word">
          {data.mode === 1 ? primaryEnglish : data.japanese}
          {' → '}
          {data.mode === 1 ? data.japanese : primaryEnglish}
        </span>
        {data.heard && (
          <span className="prev-result-heard">Heard: "{data.heard}"</span>
        )}
      </div>

      {manualGrading && !isCorrect && (
        <button
          className="override-btn override-correct"
          onClick={() => onOverride(4)}
        >
          Mark as correct
        </button>
      )}
      {manualGrading && isCorrect && (
        <button
          className="override-btn override-incorrect"
          onClick={() => onOverride(1)}
        >
          Mark as incorrect
        </button>
      )}
    </div>
  )
}
