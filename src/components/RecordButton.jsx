export function RecordButton({ isListening, onStart, onStop, disabled }) {
  return (
    <button
      className={`record-btn ${isListening ? 'recording' : ''}`}
      onMouseDown={onStart}
      onMouseUp={onStop}
      onTouchStart={onStart}
      onTouchEnd={onStop}
      disabled={disabled}
      aria-label={isListening ? 'Recording — release to stop' : 'Hold to speak'}
    >
      <span className="mic-icon">{isListening ? '🔴' : '🎙️'}</span>
      <span className="mic-label">
        {isListening ? 'Listening…' : 'Hold to speak'}
      </span>
    </button>
  )
}
