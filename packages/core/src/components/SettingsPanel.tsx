import { YStack, XStack, Text, H3, Switch, RadioGroup, Label, Separator, Slider } from 'tamagui'
import { useSettingsStore } from '../store'
import type { ExercisePromptMode, Settings } from '../types'

const PROMPT_MODES: { value: ExercisePromptMode; label: string; description: string }[] = [
  { value: 'audio', label: 'Audio only', description: 'Hear the prompt, no text shown' },
  { value: 'audio+text', label: 'Audio + text', description: 'Hear and see the prompt' },
  { value: 'text', label: 'Text only', description: 'See the prompt, no audio' },
]

export function SettingsPanel() {
  const settings = useSettingsStore()

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    useSettingsStore.setState({ [key]: value } as Partial<Settings>)
  }

  return (
    <YStack gap="$4">
      <PromptModeSection
        title="Exercise prompt — English"
        description='How the English prompt is presented in the "Say in Japanese" exercise'
        value={settings.englishExerciseMode}
        onChange={(v) => set('englishExerciseMode', v)}
      />

      <PromptModeSection
        title="Exercise prompt — Japanese"
        description='How the Japanese prompt is presented in the "Translate to English" exercise'
        value={settings.japaneseExerciseMode}
        onChange={(v) => set('japaneseExerciseMode', v)}
      />

      <Separator />

      <ToggleRow
        title="Auto-start"
        description="Listening starts automatically each exercise"
        value={settings.autoListen}
        onChange={(v) => set('autoListen', v)}
      />

      {settings.autoListen && (
        <ToggleRow
          title="Keep screen awake"
          description="Prevent the screen from turning off while studying"
          value={settings.keepScreenAwake}
          onChange={(v) => set('keepScreenAwake', v)}
        />
      )}

      {settings.autoListen && (
        <YStack gap="$2">
          <H3 fontSize="$4">Auto-start delay</H3>
          <XStack alignItems="center" gap="$3">
            <Slider
              flex={1}
              min={0}
              max={3000}
              step={250}
              value={[settings.autoStartDelay]}
              onValueChange={([v]) => set('autoStartDelay', v)}
            >
              <Slider.Track>
                <Slider.TrackActive />
              </Slider.Track>
              <Slider.Thumb index={0} circular />
            </Slider>
            <Text width={80} textAlign="right">{settings.autoStartDelay}ms</Text>
          </XStack>
          <Text color="$textMuted" fontSize="$2">Time to wait before listening starts</Text>
        </YStack>
      )}

      {settings.autoListen && (
        <YStack gap="$2">
          <H3 fontSize="$4">Max listen duration</H3>
          <XStack alignItems="center" gap="$3">
            <Slider
              flex={1}
              min={0}
              max={30000}
              step={1000}
              value={[settings.maxListenDuration]}
              onValueChange={([v]) => set('maxListenDuration', v)}
            >
              <Slider.Track>
                <Slider.TrackActive />
              </Slider.Track>
              <Slider.Thumb index={0} circular />
            </Slider>
            <Text width={90} textAlign="right">
              {settings.maxListenDuration === 0 ? 'No limit' : `${settings.maxListenDuration / 1000}s`}
            </Text>
          </XStack>
          <Text color="$textMuted" fontSize="$2">Stop listening after this duration (0 = browser decides)</Text>
        </YStack>
      )}

      <Separator />

      <YStack gap="$2">
        <H3 fontSize="$4">Feedback mode</H3>
        <ToggleRow
          title="Play sound"
          description="A short tone indicates correct or incorrect (good for background use)"
          value={settings.feedbackSound}
          onChange={(v) => set('feedbackSound', v)}
        />
        <ToggleRow
          title="Show text"
          description="Show the answer on screen"
          value={settings.feedbackText}
          onChange={(v) => set('feedbackText', v)}
        />
        <ToggleRow
          title="Speak answer"
          description="Speak the answer aloud (good for background use)"
          value={settings.feedbackVoice}
          onChange={(v) => set('feedbackVoice', v)}
        />
      </YStack>

      <Separator />

      <ToggleRow
        title="Allow grade correction"
        description="Show buttons to mark a correct answer as wrong or a wrong answer as correct"
        value={settings.manualGrading}
        onChange={(v) => set('manualGrading', v)}
      />

      <ToggleRow
        title="Speak wrong answers"
        description="When you get an answer wrong, you must speak the correct answer before moving on."
        value={settings.speakToCorrect}
        onChange={(v) => set('speakToCorrect', v)}
      />

      <Separator />

      <YStack gap="$2">
        <H3 fontSize="$4">Phonetic matching</H3>
        <ToggleRow
          title="Soundex"
          description="Catches vowel variations (hot / hut) and same-consonant homophones (two / too)."
          value={settings.phoneticSoundex}
          onChange={(v) => set('phoneticSoundex', v)}
        />
        <ToggleRow
          title="Metaphone"
          description="Better for silent-letter homophones (write / right, know / no)."
          value={settings.phoneticMetaphone}
          onChange={(v) => set('phoneticMetaphone', v)}
        />
      </YStack>

      <ToggleRow
        title="Show microphone transcript"
        description="Displays what the microphone heard once the result is shown."
        value={settings.showTranscript}
        onChange={(v) => set('showTranscript', v)}
      />
    </YStack>
  )
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap="$3" paddingVertical="$2">
      <YStack flex={1}>
        <Text fontWeight="600">{title}</Text>
        <Text color="$textMuted" fontSize="$2">{description}</Text>
      </YStack>
      <Switch checked={value} onCheckedChange={onChange}>
        <Switch.Thumb />
      </Switch>
    </XStack>
  )
}

function PromptModeSection({
  title,
  description,
  value,
  onChange,
}: {
  title: string
  description: string
  value: ExercisePromptMode
  onChange: (v: ExercisePromptMode) => void
}) {
  return (
    <YStack gap="$2">
      <H3 fontSize="$4">{title}</H3>
      <Text color="$textMuted" fontSize="$2">{description}</Text>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as ExercisePromptMode)}>
        <YStack gap="$2">
          {PROMPT_MODES.map((opt) => (
            <XStack key={opt.value} alignItems="center" gap="$3">
              <RadioGroup.Item value={opt.value} id={`prompt-${title}-${opt.value}`}>
                <RadioGroup.Indicator />
              </RadioGroup.Item>
              <Label htmlFor={`prompt-${title}-${opt.value}`} flex={1}>
                <YStack>
                  <Text fontWeight="600">{opt.label}</Text>
                  <Text color="$textMuted" fontSize="$2">{opt.description}</Text>
                </YStack>
              </Label>
            </XStack>
          ))}
        </YStack>
      </RadioGroup>
    </YStack>
  )
}
