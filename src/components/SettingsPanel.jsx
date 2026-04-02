import { useSettingsStore } from '../store/settingsStore'

export function SettingsPanel() {
  const settings = useSettingsStore()

  function set(key, value) {
    useSettingsStore.setState({ [key]: value })
  }

  function toggle(key) {
    useSettingsStore.setState({ [key]: !settings[key] })
  }

  return (
    <div className="settings-page">
      <section className="settings-section">
        <h3>Listening mode</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.autoListen ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.autoListen}
              onChange={() => toggle('autoListen')}
            />
            <div>
              <strong>Auto-start</strong>
              <span>Listening starts automatically each exercise</span>
            </div>
          </label>
        </div>
      </section>

      {settings.autoListen && (
        <section className="settings-section">
          <h3>Auto-start delay</h3>
          <div className="settings-slider-row">
            <input
              type="range"
              min="0"
              max="3000"
              step="250"
              value={settings.autoStartDelay}
              onChange={(e) => set('autoStartDelay', Number(e.target.value))}
            />
            <span className="settings-value">{settings.autoStartDelay}ms</span>
          </div>
          <p className="settings-hint">Time to wait before listening starts</p>
        </section>
      )}

      {settings.autoListen && (
        <section className="settings-section">
          <h3>Max listen duration</h3>
          <div className="settings-slider-row">
            <input
              type="range"
              min="0"
              max="30000"
              step="1000"
              value={settings.maxListenDuration}
              onChange={(e) => set('maxListenDuration', Number(e.target.value))}
            />
            <span className="settings-value">
              {settings.maxListenDuration === 0 ? 'No limit' : `${settings.maxListenDuration / 1000}s`}
            </span>
          </div>
          <p className="settings-hint">Stop listening after this duration (0 = browser decides)</p>
        </section>
      )}

      <section className="settings-section">
        <h3>Feedback mode</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.feedbackText ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.feedbackText}
              onChange={() => toggle('feedbackText')}
            />
            <div>
              <strong>Show text</strong>
              <span>Show the answer on screen</span>
            </div>
          </label>
          <label className={`settings-option ${settings.feedbackVoice ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.feedbackVoice}
              onChange={() => toggle('feedbackVoice')}
            />
            <div>
              <strong>Speak answer</strong>
              <span>Speak the answer aloud (good for background use)</span>
            </div>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h3>Phonetic matching</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.phoneticSoundex ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.phoneticSoundex}
              onChange={() => toggle('phoneticSoundex')}
            />
            <div>
              <strong>Soundex</strong>
              <span>Catches vowel variations (hot / hut) and same-consonant homophones (two / too).</span>
            </div>
          </label>
          <label className={`settings-option ${settings.phoneticMetaphone ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.phoneticMetaphone}
              onChange={() => toggle('phoneticMetaphone')}
            />
            <div>
              <strong>Metaphone</strong>
              <span>Better for silent-letter homophones (write / right, know / no). May miss some vowel homophones.</span>
            </div>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h3>Show microphone transcript</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.showTranscript ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.showTranscript}
              onChange={() => toggle('showTranscript')}
            />
            <div>
              <strong>Show after answer</strong>
              <span>Displays what the microphone heard once the result is shown. Useful for understanding why an answer was accepted or rejected.</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  )
}
