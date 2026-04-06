import { BlockTitle, List, ListItem, Toggle, Range } from 'konsta/react'
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
      <BlockTitle>Exercise prompt -- English</BlockTitle>
      <List strong inset outline>
        {promptModeOptions.map((opt) => (
          <ListItem
            key={opt.value}
            label
            title={opt.label}
            subtitle={opt.description}
            media={
              <input
                type="radio"
                name="englishExerciseMode"
                checked={settings.englishExerciseMode === opt.value}
                onChange={() => set('englishExerciseMode', opt.value)}
                className="accent-primary"
              />
            }
            onClick={() => set('englishExerciseMode', opt.value)}
          />
        ))}
      </List>

      <BlockTitle>Exercise prompt -- Japanese</BlockTitle>
      <List strong inset outline>
        {promptModeOptions.map((opt) => (
          <ListItem
            key={opt.value}
            label
            title={opt.label}
            subtitle={opt.description}
            media={
              <input
                type="radio"
                name="japaneseExerciseMode"
                checked={settings.japaneseExerciseMode === opt.value}
                onChange={() => set('japaneseExerciseMode', opt.value)}
                className="accent-primary"
              />
            }
            onClick={() => set('japaneseExerciseMode', opt.value)}
          />
        ))}
      </List>

      <BlockTitle>Listening mode</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Auto-start"
          subtitle="Listening starts automatically each exercise"
          after={
            <Toggle
              checked={settings.autoListen}
              onChange={() => toggle('autoListen')}
            />
          }
        />
      </List>

      {settings.autoListen && (
        <>
          <BlockTitle>Auto-start delay</BlockTitle>
          <List strong inset outline>
            <ListItem
              title={`${settings.autoStartDelay}ms`}
              subtitle="Time to wait before listening starts"
              innerChildren={
                <Range
                  value={settings.autoStartDelay}
                  min={0}
                  max={3000}
                  step={250}
                  onInput={(e) => set('autoStartDelay', Number(e.target.value))}
                  className="w-full mt-2"
                />
              }
            />
          </List>

          <BlockTitle>Max listen duration</BlockTitle>
          <List strong inset outline>
            <ListItem
              title={settings.maxListenDuration === 0 ? 'No limit' : `${settings.maxListenDuration / 1000}s`}
              subtitle="Stop listening after this duration (0 = browser decides)"
              innerChildren={
                <Range
                  value={settings.maxListenDuration}
                  min={0}
                  max={30000}
                  step={1000}
                  onInput={(e) => set('maxListenDuration', Number(e.target.value))}
                  className="w-full mt-2"
                />
              }
            />
          </List>
        </>
      )}

      <BlockTitle>Feedback mode</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Play sound"
          subtitle="A short tone indicates correct or incorrect"
          after={
            <Toggle
              checked={settings.feedbackSound}
              onChange={() => toggle('feedbackSound')}
            />
          }
        />
        <ListItem
          title="Show text"
          subtitle="Show the answer on screen"
          after={
            <Toggle
              checked={settings.feedbackText}
              onChange={() => toggle('feedbackText')}
            />
          }
        />
        <ListItem
          title="Speak answer"
          subtitle="Speak the answer aloud"
          after={
            <Toggle
              checked={settings.feedbackVoice}
              onChange={() => toggle('feedbackVoice')}
            />
          }
        />
      </List>

      <BlockTitle>Manual grading</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Allow grade correction"
          subtitle="Show buttons to mark a correct answer as wrong or vice versa"
          after={
            <Toggle
              checked={settings.manualGrading}
              onChange={() => toggle('manualGrading')}
            />
          }
        />
      </List>

      <BlockTitle>Speak to correct</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Speak wrong answers"
          subtitle="When wrong, you must speak the correct answer before moving on"
          after={
            <Toggle
              checked={settings.speakToCorrect}
              onChange={() => toggle('speakToCorrect')}
            />
          }
        />
      </List>

      <BlockTitle>Phonetic matching</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Soundex"
          subtitle="Catches vowel variations and same-consonant homophones"
          after={
            <Toggle
              checked={settings.phoneticSoundex}
              onChange={() => toggle('phoneticSoundex')}
            />
          }
        />
        <ListItem
          title="Metaphone"
          subtitle="Better for silent-letter homophones (write/right, know/no)"
          after={
            <Toggle
              checked={settings.phoneticMetaphone}
              onChange={() => toggle('phoneticMetaphone')}
            />
          }
        />
      </List>

      <BlockTitle>Show microphone transcript</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Show after answer"
          subtitle="Displays what the microphone heard once the result is shown"
          after={
            <Toggle
              checked={settings.showTranscript}
              onChange={() => toggle('showTranscript')}
            />
          }
        />
      </List>
    </>
  )
}
