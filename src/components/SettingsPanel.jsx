import { useStore } from '../store/index'
import { settingsStore } from '../store/settingsStore'

export function SettingsPanel() {
  const settings = useStore(settingsStore)

  function set(key, value) {
    settingsStore.setState({ [key]: value })
  }

  return (
    <div className="settings-page">
      <section className="settings-section">
        <h3>Listening mode</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.listeningMode === 'hold' ? 'active' : ''}`}>
            <input
              type="radio"
              name="listeningMode"
              value="hold"
              checked={settings.listeningMode === 'hold'}
              onChange={() => set('listeningMode', 'hold')}
            />
            <div>
              <strong>Hold to speak</strong>
              <span>Hold the button while speaking</span>
            </div>
          </label>
          <label className={`settings-option ${settings.listeningMode === 'auto' ? 'active' : ''}`}>
            <input
              type="radio"
              name="listeningMode"
              value="auto"
              checked={settings.listeningMode === 'auto'}
              onChange={() => set('listeningMode', 'auto')}
            />
            <div>
              <strong>Auto-start</strong>
              <span>Listening starts automatically each exercise</span>
            </div>
          </label>
        </div>
      </section>

      {settings.listeningMode === 'auto' && (
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

      {settings.listeningMode === 'auto' && (
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
          <label className={`settings-option ${settings.feedbackMode === 'text' ? 'active' : ''}`}>
            <input
              type="radio"
              name="feedbackMode"
              value="text"
              checked={settings.feedbackMode === 'text'}
              onChange={() => set('feedbackMode', 'text')}
            />
            <div>
              <strong>Text only</strong>
              <span>Show the answer on screen</span>
            </div>
          </label>
          <label className={`settings-option ${settings.feedbackMode === 'voice' ? 'active' : ''}`}>
            <input
              type="radio"
              name="feedbackMode"
              value="voice"
              checked={settings.feedbackMode === 'voice'}
              onChange={() => set('feedbackMode', 'voice')}
            />
            <div>
              <strong>Voice only</strong>
              <span>Speak the answer aloud (good for background use)</span>
            </div>
          </label>
          <label className={`settings-option ${settings.feedbackMode === 'both' ? 'active' : ''}`}>
            <input
              type="radio"
              name="feedbackMode"
              value="both"
              checked={settings.feedbackMode === 'both'}
              onChange={() => set('feedbackMode', 'both')}
            />
            <div>
              <strong>Text and voice</strong>
              <span>Show and speak the answer</span>
            </div>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h3>Phonetic matching</h3>
        <div className="settings-options">
          {[
            { value: 'off',       label: 'Off',       desc: 'Spelling and fuzzy-spelling match only.' },
            { value: 'soundex',   label: 'Soundex',   desc: 'Catches vowel variations (hot / hut) and same-consonant homophones (two / too).' },
            { value: 'metaphone', label: 'Metaphone', desc: 'Better for silent-letter homophones (write / right, know / no). May miss some vowel homophones.' },
            { value: 'both',      label: 'Both',      desc: 'Union of Soundex and Metaphone. Highest coverage, slightly higher false-positive rate.' },
          ].map(({ value, label, desc }) => (
            <label key={value} className={`settings-option ${settings.phoneticAlgorithm === value ? 'active' : ''}`}>
              <input
                type="radio"
                name="phoneticAlgorithm"
                value={value}
                checked={settings.phoneticAlgorithm === value}
                onChange={() => set('phoneticAlgorithm', value)}
              />
              <div>
                <strong>{label}</strong>
                <span>{desc}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>Show microphone transcript</h3>
        <div className="settings-options">
          {[
            { value: 'off',       label: 'Off',              desc: 'Never shown. Clean and distraction-free.' },
            { value: 'on-result', label: 'Show after answer', desc: 'Displays what the microphone heard once the result is shown. Useful for understanding why an answer was accepted or rejected.' },
          ].map(({ value, label, desc }) => (
            <label key={value} className={`settings-option ${settings.showTranscript === value ? 'active' : ''}`}>
              <input
                type="radio"
                name="showTranscript"
                value={value}
                checked={settings.showTranscript === value}
                onChange={() => set('showTranscript', value)}
              />
              <div>
                <strong>{label}</strong>
                <span>{desc}</span>
              </div>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
