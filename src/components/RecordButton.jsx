export function RecordButton({ isListening, onStart, onStop, disabled, listenMode = 'hold' }) {
  function handleTouchStart(e) {
    e.preventDefault() // prevent text-selection vibration / long-press context menu
    if (listenMode === 'hold') onStart(e)
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
    ? 'Listening…'
    : (listenMode === 'auto' ? 'Tap to speak' : 'Hold to speak')

  return (
    <button
      className={`record-btn ${isListening ? 'recording' : ''}`}
      onMouseDown={listenMode === 'hold' ? onStart : undefined}
      onMouseUp={listenMode === 'hold' ? onStop : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={listenMode === 'hold' ? onStop : undefined}
      onClick={listenMode === 'auto' ? handleClick : undefined}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      aria-label={label}
    >
      <span className="mic-icon">{isListening ? '🔴' : '🎙️'}</span>
      <span className="mic-label">{micLabel}</span>
    </button>
  )
}
