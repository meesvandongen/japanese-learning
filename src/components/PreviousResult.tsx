import type { Word } from '../types'
import { buildReportUrl } from '../utils/reportUrl'

export interface PreviousResultData {
  japanese: string
  kana: string
  english: string[]
  result: 'correct' | 'incorrect'
  heard: string
  skipped: boolean
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
        {data.skipped ? (
          <span className="prev-result-heard">Skipped (didn't know)</span>
        ) : data.heard ? (
          <span className="prev-result-heard">Heard: "{data.heard}"</span>
        ) : null}
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
      <a
        className="report-mistake-link report-mistake-compact"
        href={buildReportUrl(
          { japanese: data.japanese, kana: data.kana, english: data.english } as Word,
          { heard: data.heard, skipped: data.skipped }
        )}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Report mistake"
      >
        Report
      </a>
    </div>
  )
}
