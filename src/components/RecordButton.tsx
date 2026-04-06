import { Button } from 'konsta/react'

interface Props {
  isListening: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  listenMode: 'hold' | 'auto'
}

export function RecordButton({ isListening, onStart, onStop, disabled, listenMode = 'hold' }: Props) {
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    if (listenMode === 'hold') onStart()
  }

  function handleClick() {
    if (listenMode === 'auto') {
      if (isListening) onStop()
      else onStart()
    }
  }

  const label = isListening
    ? (listenMode === 'auto' ? 'Tap to stop' : 'Recording — release to stop')
    : (listenMode === 'auto' ? 'Tap to speak' : 'Hold to speak')

  const micLabel = isListening
    ? 'Listening...'
    : (listenMode === 'auto' ? 'Tap to speak' : 'Hold to speak')

  return (
    <Button
      rounded
      large
      className={isListening ? '!bg-red-500 !border-red-500 animate-pulse-recording' : ''}
      onMouseDown={listenMode === 'hold' ? onStart : undefined}
      onMouseUp={listenMode === 'hold' ? onStop : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={listenMode === 'hold' ? onStop : undefined}
      onClick={listenMode === 'auto' ? handleClick : undefined}
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      disabled={disabled}
      aria-label={label}
    >
      <span className="mr-2 text-lg">{isListening ? '\uD83D\uDD34' : '\uD83C\uDF99\uFE0F'}</span>
      {micLabel}
    </Button>
  )
}
