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
    ? (listenMode === 'auto' ? 'Tap to stop' : 'Recording \u2014 release to stop')
    : (listenMode === 'auto' ? 'Tap to speak' : 'Hold to speak')

  const micLabel = isListening
    ? 'Listening...'
    : (listenMode === 'auto' ? 'Tap to speak' : 'Hold to speak')

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        className={`
          w-[72px] h-[72px] rounded-full flex items-center justify-center
          text-3xl transition-all select-none touch-none
          ${isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse-recording scale-110'
            : disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white shadow-lg shadow-primary/30 active:scale-95'
          }
        `}
        onMouseDown={listenMode === 'hold' ? onStart : undefined}
        onMouseUp={listenMode === 'hold' ? onStop : undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={listenMode === 'hold' ? onStop : undefined}
        onClick={listenMode === 'auto' ? handleClick : undefined}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-label={label}
      >
        {isListening ? '\uD83D\uDD34' : '\uD83C\uDF99\uFE0F'}
      </button>
      <span className={`text-xs font-medium ${isListening ? 'text-red-500' : 'text-gray-500'}`}>
        {micLabel}
      </span>
    </div>
  )
}
