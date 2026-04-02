import type { Manifest } from '../types'

interface Props {
  manifest: Manifest
  onSelect: (languageId: string) => void
  onBack?: () => void
}

/**
 * LanguageSelector — shows available languages from the manifest.
 * Used both during onboarding and inside SettingsPage.
 */
export function LanguageSelector({ manifest, onSelect, onBack }: Props) {
  return (
    <div className="selector-screen">
      {onBack && (
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
      )}
      <h2 className="selector-heading">Choose a language to learn</h2>
      <div className="selector-grid">
        {manifest.languages.map((lang) => (
          <button
            key={lang.id}
            className="selector-card"
            onClick={() => onSelect(lang.id)}
          >
            <span className="selector-card-name">{lang.name}</span>
            <span className="selector-card-meta">
              {lang.levels.length} level{lang.levels.length !== 1 ? 's' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
