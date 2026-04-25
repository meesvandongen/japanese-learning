import { XStack, YStack, Text, Button, Anchor } from 'tamagui'
import { buildReportUrl } from '../utils'
import type { Word } from '../types'

export interface PreviousResultData {
  japanese: string
  kana: string
  english: string[]
  result: 'correct' | 'incorrect'
  heard: string
  skipped: boolean
  mode: 1 | 4
}

interface Props {
  data: PreviousResultData
  manualGrading: boolean
  onOverride: (quality: number) => void
}

export function PreviousResult({ data, manualGrading, onOverride }: Props) {
  const isCorrect = data.result === 'correct'
  const primaryEnglish = data.english[0]

  return (
    <XStack
      gap="$2"
      alignItems="center"
      padding="$2"
      borderRadius="$3"
      backgroundColor={isCorrect ? '#e8f5e9' : '#ffebee'}
    >
      <Text fontSize="$6" fontWeight="700" color={isCorrect ? '$correct' : '$incorrect'}>
        {isCorrect ? '✓' : '✗'}
      </Text>

      <YStack flex={1}>
        <Text fontWeight="600">
          {data.mode === 1 ? primaryEnglish : data.japanese}
          {' → '}
          {data.mode === 1 ? data.japanese : primaryEnglish}
        </Text>
        {data.skipped ? (
          <Text fontSize="$2" color="$textMuted">Skipped (didn't know)</Text>
        ) : data.heard ? (
          <Text fontSize="$2" color="$textMuted">Heard: "{data.heard}"</Text>
        ) : null}
      </YStack>

      {manualGrading && !isCorrect && (
        <Button size="$2" theme="green" onPress={() => onOverride(4)}>
          Mark as correct
        </Button>
      )}
      {manualGrading && isCorrect && (
        <Button size="$2" theme="red" onPress={() => onOverride(1)}>
          Mark as incorrect
        </Button>
      )}
      <Anchor
        href={buildReportUrl(
          { japanese: data.japanese, kana: data.kana, english: data.english } as Word,
          { heard: data.heard, skipped: data.skipped }
        )}
        target="_blank"
        rel="noopener noreferrer"
        fontSize="$2"
        color="$textMuted"
        textDecorationLine="underline"
      >
        Report
      </Anchor>
    </XStack>
  )
}
