/**
 * LanguageSelector — shows available languages from the manifest.
 * Used both during onboarding and inside SettingsPage.
 *
 * Props:
 *   manifest   — the fetched manifest object
 *   onSelect   — called with (languageId: string) when the user picks a language
 *   onBack     — optional; if provided, renders a back button
 */
export function LanguageSelector({ manifest, onSelect, onBack }) {
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
