import { useState } from 'react'

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
  onDismiss: () => void
}

export function PreviousResult({ data, manualGrading, onOverride, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false)

  const isCorrect = data.result === 'correct'
  const primaryEnglish = data.english[0]

  return (
    <div className={`prev-result ${isCorrect ? 'prev-correct' : 'prev-incorrect'}`}>
      <button
        className="prev-result-summary"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="prev-result-icon">{isCorrect ? '✓' : '✗'}</span>
        <span className="prev-result-word">
          {data.mode === 1 ? primaryEnglish : data.japanese}
          {' → '}
          {data.mode === 1 ? data.japanese : primaryEnglish}
        </span>
        <span className="prev-result-chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="prev-result-details">
          <div className="prev-result-row">
            <span className="prev-detail-label">Japanese</span>
            <span className="prev-detail-value">{data.japanese}</span>
          </div>
          <div className="prev-result-row">
            <span className="prev-detail-label">English</span>
            <span className="prev-detail-value">{data.english.join(' / ')}</span>
          </div>
          {data.heard && (
            <div className="prev-result-row">
              <span className="prev-detail-label">Heard</span>
              <span className="prev-detail-value prev-heard">"{data.heard}"</span>
            </div>
          )}

          <div className="prev-result-actions">
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
            <button className="prev-dismiss-btn" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
