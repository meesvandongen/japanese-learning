import { Button, Text, YStack } from 'tamagui'

interface Props {
  isListening: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  listenMode: 'hold' | 'auto'
}

/**
 * RecordButton — a chunky push-to-talk button.
 *
 * On web: the original used mouseDown/mouseUp/touchStart/touchEnd for
 * hold-to-talk. Tamagui's Button maps press events across platforms:
 * `onPressIn` / `onPressOut` fire on both touch and mouse, so a single
 * pair of handlers works identically on web (react-native-web) and native.
 *
 * `contextMenu` prevention is only meaningful on web; the DOM event slips
 * through react-native-web, so we pass it via pointer props.
 */
export function RecordButton({ isListening, onStart, onStop, disabled, listenMode = 'hold' }: Props) {
  const label = isListening
    ? listenMode === 'auto' ? 'Tap to stop' : 'Listening…'
    : listenMode === 'auto' ? 'Tap to speak' : 'Hold to speak'

  const pressHandlers = listenMode === 'hold'
    ? { onPressIn: onStart, onPressOut: onStop }
    : { onPress: () => (isListening ? onStop() : onStart()) }

  return (
    <Button
      size="$6"
      circular
      backgroundColor={isListening ? '$incorrect' : '$primary'}
      disabled={disabled}
      pressStyle={{ scale: 0.95 }}
      accessibilityLabel={label}
      {...pressHandlers}
    >
      <YStack alignItems="center" gap="$1">
        <Text fontSize={28} col="white">{isListening ? '\u{1F534}' : '\u{1F399}️'}</Text>
        <Text fontSize="$2" col="white">{label}</Text>
      </YStack>
    </Button>
  )
}
