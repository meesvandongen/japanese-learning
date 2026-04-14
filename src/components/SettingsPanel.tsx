import { useSettingsStore } from '../store/settingsStore'
import type { ExercisePromptMode, Settings } from '../types'

export function SettingsPanel() {
  const settings = useSettingsStore()

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    useSettingsStore.setState({ [key]: value } as Partial<Settings>)
  }

  function toggle(key: keyof Settings) {
    useSettingsStore.setState({ [key]: !settings[key] })
  }

  const promptModeOptions: { value: ExercisePromptMode; label: string; description: string }[] = [
    { value: 'audio', label: 'Audio only', description: 'Hear the prompt, no text shown' },
    { value: 'audio+text', label: 'Audio + text', description: 'Hear and see the prompt' },
    { value: 'text', label: 'Text only', description: 'See the prompt, no audio' },
  ]

  return (
    <>
      <section className="settings-group">
        <h3 className="settings-group-title">Exercise prompt — English</h3>
        <p className="settings-hint">How the English prompt is presented in the "Say in Japanese" exercise</p>
        <div className="settings-options">
          {promptModeOptions.map((opt) => (
            <label
              key={opt.value}
              className={`settings-option ${settings.englishExerciseMode === opt.value ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="englishExerciseMode"
                value={opt.value}
                checked={settings.englishExerciseMode === opt.value}
                onChange={() => set('englishExerciseMode', opt.value)}
              />
              <div>
                <strong>{opt.label}</strong>
                <span>{opt.description}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-group">
        <h3 className="settings-group-title">Exercise prompt — Japanese</h3>
        <p className="settings-hint">How the Japanese prompt is presented in the "Translate to English" exercise</p>
        <div className="settings-options">
          {promptModeOptions.map((opt) => (
            <label
              key={opt.value}
              className={`settings-option ${settings.japaneseExerciseMode === opt.value ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="japaneseExerciseMode"
                value={opt.value}
                checked={settings.japaneseExerciseMode === opt.value}
                onChange={() => set('japaneseExerciseMode', opt.value)}
              />
              <div>
                <strong>{opt.label}</strong>
                <span>{opt.description}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-group">
        <h3 className="settings-group-title">Listening mode</h3>
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
        <section className="settings-group">
          <div className="settings-options">
            <label className={`settings-option ${settings.keepScreenAwake ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={settings.keepScreenAwake}
                onChange={() => toggle('keepScreenAwake')}
              />
              <div>
                <strong>Keep screen awake</strong>
                <span>Prevent the screen from turning off while studying</span>
              </div>
            </label>
          </div>
        </section>
      )}

      {settings.autoListen && (
        <section className="settings-group">
          <h3 className="settings-group-title">Auto-start delay</h3>
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
        <section className="settings-group">
          <h3 className="settings-group-title">Max listen duration</h3>
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

      <section className="settings-group">
        <h3 className="settings-group-title">Feedback mode</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.feedbackSound ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.feedbackSound}
              onChange={() => toggle('feedbackSound')}
            />
            <div>
              <strong>Play sound</strong>
              <span>A short tone indicates correct or incorrect (good for background use)</span>
            </div>
          </label>
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

      <section className="settings-group">
        <h3 className="settings-group-title">Manual grading</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.manualGrading ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.manualGrading}
              onChange={() => toggle('manualGrading')}
            />
            <div>
              <strong>Allow grade correction</strong>
              <span>Show buttons to mark a correct answer as wrong or a wrong answer as correct</span>
            </div>
          </label>
        </div>
      </section>

      <section className="settings-group">
        <h3 className="settings-group-title">Speak to correct</h3>
        <div className="settings-options">
          <label className={`settings-option ${settings.speakToCorrect ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={settings.speakToCorrect}
              onChange={() => toggle('speakToCorrect')}
            />
            <div>
              <strong>Speak wrong answers</strong>
              <span>When you get an answer wrong, you must speak the correct answer before moving on. Reinforces learning through active recall and production.</span>
            </div>
          </label>
        </div>
      </section>

      <section className="settings-group">
        <h3 className="settings-group-title">Phonetic matching</h3>
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

      <section className="settings-group">
        <h3 className="settings-group-title">Show microphone transcript</h3>
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
    </>
  )
}
