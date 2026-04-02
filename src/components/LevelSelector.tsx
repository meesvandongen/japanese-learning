import type { Language } from '../types'

interface Props {
  language: Language
  onSelect: (levelId: string) => void
  onBack?: () => void
}

/**
 * LevelSelector — shows available levels for a given language.
 * Used both during onboarding and inside SettingsPage.
 */
export function LevelSelector({ language, onSelect, onBack }: Props) {
  return (
    <div className="selector-screen">
      {onBack && (
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
      )}
      <h2 className="selector-heading">Choose your starting level for {language.name}</h2>
      <div className="selector-grid">
        {language.levels.map((level) => (
          <button
            key={level.id}
            className="selector-card"
            onClick={() => onSelect(level.id)}
          >
            <span className="selector-card-name">{level.label}</span>
            {level.description && (
              <span className="selector-card-desc">{level.description}</span>
            )}
            <span className="selector-card-meta">{level.wordCount} words</span>
          </button>
        ))}
      </div>
    </div>
  )
}
