import { Button, XStack, Text } from 'tamagui'
import { useWalkMode } from '../walkMode'
import type { Word } from '../types'

interface Props {
  promptLang: string
  answerLang: string
  cards: Word[]
}

/**
 * Single-button entry point for walk mode. Starts the session when tapped
 * (which must happen from a user gesture so iOS lets us activate the mic),
 * flips to a Stop button while the session is active, and shows the
 * current lifecycle state as a small subtitle.
 */
export function WalkModeButton({ promptLang, answerLang, cards }: Props) {
  const { state, start, stop } = useWalkMode({ promptLang, answerLang, cards })
  const running = state !== 'idle'

  const label = running ? 'Stop walk mode' : 'Start walk mode'
  const subtitle =
    state === 'prompting' ? 'Playing prompt…'
    : state === 'listening' ? 'Listening…'
    : state === 'feedback' ? 'Feedback…'
    : state === 'paused' ? 'Paused'
    : 'Eyes-off, phone-in-pocket study'

  return (
    <XStack gap="$2" alignItems="center">
      <Button
        theme={running ? 'red' : 'active'}
        onPress={() => (running ? stop() : start())}
      >
        {label}
      </Button>
      <Text color="$textMuted" fontSize="$2">{subtitle}</Text>
    </XStack>
  )
}
