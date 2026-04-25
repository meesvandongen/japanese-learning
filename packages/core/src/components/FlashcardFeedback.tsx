import { YStack, XStack, Text, Button, Anchor } from 'tamagui'

interface Props {
  result: 'correct' | 'incorrect' | null
  heard: string
  showText: boolean
  showTranscript: boolean
  correctText: string
  incorrectText: string
  kanaReading?: string
  onPlayAgain?: () => void
  isPlaying?: boolean
  manualGrading?: boolean
  onOverrideCorrect?: () => void
  onOverrideIncorrect?: () => void
  reportUrl?: string
}

export function FlashcardFeedback({
  result,
  heard,
  showText,
  showTranscript,
  correctText,
  incorrectText,
  kanaReading,
  onPlayAgain,
  isPlaying,
  manualGrading,
  onOverrideCorrect,
  onOverrideIncorrect,
  reportUrl,
}: Props) {
  if (!result) return null

  const answerText = result === 'correct' ? correctText : incorrectText
  const color = result === 'correct' ? '$correct' : '$incorrect'

  return (
    <YStack gap="$2" alignItems="center">
      {showText ? (
        <XStack alignItems="center" gap="$2" flexWrap="wrap" justifyContent="center">
          {result === 'correct' && <Text color={color} fontWeight="700" fontSize="$5">✓</Text>}
          <Text color={color} fontWeight="700" fontSize="$6">{answerText}</Text>
          {kanaReading && kanaReading !== answerText && (
            <Text color="$textMuted" fontSize="$4">{kanaReading}</Text>
          )}
          {onPlayAgain && (
            <Button size="$2" chromeless onPress={onPlayAgain}>
              {isPlaying ? '\u{1F50A} Playing…' : '\u{1F50A} Play again'}
            </Button>
          )}
        </XStack>
      ) : (
        <Text color={color} fontSize="$10" fontWeight="700">
          {result === 'correct' ? '✓' : '✗'}
        </Text>
      )}

      {showTranscript && heard && (
        <Text color="$textMuted" fontSize="$2">Heard: "{heard}"</Text>
      )}

      {manualGrading && (
        <XStack gap="$2">
          {result === 'incorrect' && (
            <Button size="$2" theme="green" onPress={onOverrideCorrect}>
              Mark as correct
            </Button>
          )}
          {result === 'correct' && (
            <Button size="$2" theme="red" onPress={onOverrideIncorrect}>
              Mark as incorrect
            </Button>
          )}
        </XStack>
      )}

      {reportUrl && (
        <Anchor
          href={reportUrl}
          // RN's Linking will open the URL in the system browser; on web this
          // falls through to the underlying <a href> so the target attr still
          // works the way the web version relied on.
          target="_blank"
          rel="noopener noreferrer"
          fontSize="$2"
          color="$textMuted"
          textDecorationLine="underline"
        >
          Report mistake
        </Anchor>
      )}
    </YStack>
  )
}
