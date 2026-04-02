import { useState, useCallback, useEffect, useRef } from 'react'
import { RecordButton } from './RecordButton'
import { CardTypeBadge } from './CardTypeBadge'
import { FlashcardFeedback } from './FlashcardFeedback'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { compareJapanese } from '../utils/normalize'
import { useSettingsStore } from '../store/settingsStore'
import type { Word } from '../types'
import type { KuromojiTokenizer } from '../types/kuromoji'

interface Props {
  card: Word
  tokenizer: KuromojiTokenizer | undefined
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number) => void
}

export function FlashcardMode1({ card, tokenizer, cardType, onAnswer }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const settings = useSettingsStore()
  const { speak } = useSpeechSynthesis()
  const autoStarted = useRef(false)

  const handleResult = useCallback(
    (transcripts: string[]) => {
      const correct = compareJapanese(card.kana, transcripts, tokenizer ?? null)
      const r = correct ? 'correct' : 'incorrect'
      setResult(r)
      setHeard(transcripts[0] ?? '')
      if (settings.feedbackVoice) {
        speak(card.japanese, 'ja-JP')
      }
    },
    [card, tokenizer, settings.feedbackVoice, speak]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'ja-JP',
    onResult: handleResult,
    onError: setErrorMsg,
  })

  // Auto-start listening on card mount
  useEffect(() => {
    if (!settings.autoListen || autoStarted.current) return
    autoStarted.current = true
    const timer = setTimeout(() => start(), settings.autoStartDelay)
    return () => clearTimeout(timer)
  }, [settings.autoListen, settings.autoStartDelay, start])

  // Enforce max listen duration in auto mode
  useEffect(() => {
    if (!isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [isListening, settings.maxListenDuration, stop])

  // Auto-advance after result
  useEffect(() => {
    if (!result) return
    const delay = result === 'correct' ? 1200 : 2500
    const timer = setTimeout(() => onAnswer(result === 'correct' ? 4 : 1), delay)
    return () => clearTimeout(timer)
  }, [result, onAnswer])

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english

  return (
    <div className={`flashcard ${result ? `flash-${result}` : ''}`}>
      <CardTypeBadge type={cardType} />
      <div className="card-label">Say this in Japanese:</div>
      <div className="card-prompt english-prompt">{primaryEnglish}</div>

      {card.english.length > 1 && (
        <div className="synonyms">Also accepted: {card.english.slice(1).join(', ')}</div>
      )}

      <FlashcardFeedback
        result={result}
        heard={heard}
        showText={settings.feedbackText}
        showTranscript={settings.showTranscript}
        correctText={card.japanese}
        incorrectText={card.japanese}
      />

      {result === null && (
        <div className="answer-actions">
          <RecordButton
            isListening={isListening}
            onStart={start}
            onStop={stop}
            listenMode={settings.autoListen ? 'auto' : 'hold'}
          />
          <button className="dont-know-btn" onClick={() => setResult('incorrect')} aria-label="Don't know">
            ?
          </button>
        </div>
      )}

      {errorMsg && <div className="error-msg">{errorMsg}</div>}
    </div>
  )
}
