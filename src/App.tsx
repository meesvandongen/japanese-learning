import { useState, useCallback } from 'react'
import { Page, Navbar, Tabbar, TabbarLink, ToolbarPane, Segmented, SegmentedButton, Block, Preloader, Button, Dialog, DialogButton, Badge } from 'konsta/react'
import { useKuromoji } from './hooks/useKuromoji'
import { useVocabulary } from './hooks/useVocabulary'
import { FlashcardMode1 } from './components/FlashcardMode1'
import { FlashcardMode4 } from './components/FlashcardMode4'
import { PreviousResult } from './components/PreviousResult'
import type { PreviousResultData } from './components/PreviousResult'
import { SessionStats } from './components/SessionStats'
import { ProfilePage } from './components/ProfilePage'
import { LanguageSelector } from './components/LanguageSelector'
import { LevelSelector } from './components/LevelSelector'
import { SettingsPage } from './components/SettingsPage'
import { useAppStore } from './store/appStore'
import { useSettingsStore } from './store/settingsStore'
import { applyReview } from './srs/sm2'
import { getNextCard, getSessionStats } from './srs/scheduler'
import type { Word, Manifest, Language, Level } from './types'

export default function App() {
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)
  const { setLanguage, setLevel } = useAppStore()

  const { words, isManifestLoading, isManifestError, isVocabLoading, isVocabError, manifest, activeLang, activeLevel } =
    useVocabulary(selectedLanguageId, selectedLevelId)

  if (isManifestLoading) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Preloader />
        </div>
      </Page>
    )
  }

  if (isManifestError) {
    return (
      <Page>
        <Block strong inset className="text-center">
          <p className="text-red-500">Failed to load vocabulary catalog. Check your connection and refresh.</p>
        </Block>
      </Page>
    )
  }

  if (!selectedLanguageId) {
    return (
      <Page>
        <Navbar title="Japanese Flashcards" />
        <LanguageSelector manifest={manifest!} onSelect={setLanguage} />
      </Page>
    )
  }

  if (!selectedLevelId) {
    return (
      <Page>
        <Navbar
          title="Choose Level"
          left={<Button clear onClick={() => useAppStore.setState({ selectedLanguageId: null })}>Back</Button>}
        />
        <LevelSelector language={activeLang!} onSelect={setLevel} />
      </Page>
    )
  }

  return (
    <StudyApp
      words={words}
      isVocabLoading={isVocabLoading}
      isVocabError={isVocabError}
      manifest={manifest}
      activeLang={activeLang}
      activeLevel={activeLevel}
    />
  )
}

interface StudyAppProps {
  words: Word[]
  isVocabLoading: boolean
  isVocabError: boolean
  manifest: Manifest | undefined
  activeLang: Language | undefined
  activeLevel: Level | undefined
}

function StudyApp({ words, isVocabLoading, isVocabError, manifest, activeLang, activeLevel }: StudyAppProps) {
  const [page, setPage] = useState<'study' | 'profile' | 'settings'>('study')
  const [mode, setMode] = useState<1 | 4>(1)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [lastShownId, setLastShownId] = useState<string | null>(null)
  const [cardKey, setCardKey] = useState(0)
  const [previousResult, setPreviousResult] = useState<PreviousResultData | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const cardStates = useAppStore((s) => s.cards)
  const streakCount = useAppStore((s) => s.streakCount)
  const { applyCardReview, reset, recordStudyDay } = useAppStore()
  const settings = useSettingsStore()
  const { tokenizer, isLoading: kuromojiLoading, isError: kuromojiError } = useKuromoji()

  const { card, cardType } = getNextCard(words, cardStates, lastShownId)
  const { dueCount, newCount } = getSessionStats(words, cardStates)

  const nextDueDate =
    cardType === 'extra'
      ? Math.min(...words.map((v) => cardStates[v.kana]?.dueDate ?? Infinity).filter(isFinite))
      : null

  const handleAnswer = useCallback(
    (quality: number, heard: string) => {
      const existing = cardStates[card.kana]
      const updated = applyReview(existing, quality)
      applyCardReview(card.kana, updated)
      recordStudyDay()
      setPreviousResult({
        japanese: card.japanese,
        kana: card.kana,
        english: card.english,
        result: quality >= 3 ? 'correct' : 'incorrect',
        heard,
        mode,
      })
      setLastShownId(card.kana)
      setReviewedCount((n) => n + 1)
      setCardKey((k) => k + 1)
    },
    [card, cardStates, applyCardReview, recordStudyDay, mode]
  )

  const handlePreviousOverride = useCallback(
    (quality: number) => {
      if (!previousResult) return
      const existing = cardStates[previousResult.kana]
      const updated = applyReview(existing, quality)
      applyCardReview(previousResult.kana, updated)
      setPreviousResult({ ...previousResult, result: quality >= 3 ? 'correct' : 'incorrect' })
    },
    [previousResult, cardStates, applyCardReview]
  )

  function handleModeChange(newMode: 1 | 4) {
    setMode(newMode)
    setLastShownId(null)
    setPreviousResult(null)
    setCardKey((k) => k + 1)
  }

  function handleSettingsClose() {
    setLastShownId(null)
    setReviewedCount(0)
    setPreviousResult(null)
    setCardKey((k) => k + 1)
    setPage('study')
  }

  function handleReset() {
    reset()
    setReviewedCount(0)
    setLastShownId(null)
    setCardKey((k) => k + 1)
    setPage('study')
    setResetDialogOpen(false)
  }

  const navbarTitle = (
    <span className="flex items-center gap-2">
      {activeLang?.name ?? 'Flashcards'}
      {activeLevel && (
        <Badge className="text-[10px]">{activeLevel.label}</Badge>
      )}
    </span>
  )

  const isStudyReady = page === 'study' && !isVocabLoading && !isVocabError && !kuromojiLoading && !kuromojiError

  return (
    <Page className="flex flex-col">
      <Navbar
        title={navbarTitle}
        right={
          <Button clear small className="text-red-500" onClick={() => setResetDialogOpen(true)}>
            Reset
          </Button>
        }
      />

      {page === 'study' && (
        <Block className="!mt-2 !mb-0 shrink-0">
          <Segmented strong rounded>
            <SegmentedButton active={mode === 1} onClick={() => handleModeChange(1)}>
              Say in Japanese
            </SegmentedButton>
            <SegmentedButton active={mode === 4} onClick={() => handleModeChange(4)}>
              Translate to English
            </SegmentedButton>
          </Segmented>
        </Block>
      )}

      {/* Non-study pages: scrollable content with bottom padding for tabbar */}
      {page !== 'study' && (
        <div className="flex-1 overflow-auto px-4 pb-safe-20">
          {page === 'settings' && (
            <SettingsPage
              manifest={manifest!}
              activeLang={activeLang}
              activeLevel={activeLevel}
              onClose={handleSettingsClose}
            />
          )}

          {page === 'profile' && (
            <ProfilePage words={words} activeLang={activeLang} activeLevel={activeLevel} />
          )}
        </div>
      )}

      {/* Study page: flex column that fills between header and bottom chrome */}
      {page === 'study' && (
        <>
          {(isVocabLoading || kuromojiLoading) && (
            <div className="flex flex-col items-center gap-4 py-12 text-gray-500">
              <Preloader />
              <p>Loading {activeLang?.name ?? ''} dictionary...</p>
              <p className="text-xs text-gray-400">First load ~20MB -- subsequent loads are instant</p>
            </div>
          )}

          {!isVocabLoading && (isVocabError || kuromojiError) && (
            <Block strong inset className="text-center">
              <p className="text-red-500">Failed to load dictionary. Check your connection and refresh.</p>
            </Block>
          )}

          {isStudyReady && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Top: stats + previous result */}
              <div className="px-4 shrink-0">
                <SessionStats
                  dueCount={dueCount}
                  newCount={newCount}
                  reviewedCount={reviewedCount}
                  nextDueDate={nextDueDate}
                  cardType={cardType}
                  streakCount={streakCount}
                />

                {previousResult && settings.manualGrading && (
                  <PreviousResult
                    data={previousResult}
                    manualGrading={settings.manualGrading}
                    onOverride={handlePreviousOverride}
                  />
                )}
              </div>

              {/* Flashcard content fills remaining space */}
              {mode === 1 && (
                <FlashcardMode1
                  key={`m1-${cardKey}`}
                  card={card}
                  words={words}
                  tokenizer={tokenizer}
                  cardType={cardType}
                  onAnswer={handleAnswer}
                />
              )}
              {mode === 4 && (
                <FlashcardMode4
                  key={`m4-${cardKey}`}
                  card={card}
                  cardType={cardType}
                  onAnswer={handleAnswer}
                />
              )}
            </div>
          )}
        </>
      )}

      {/*
        Fixed bottom chrome: action bar (study only) + tabbar.
        Stacked in a single fixed container so they don't independently
        overlap each other or the scrollable content.
      */}
      <div className="fixed left-0 right-0 bottom-0 z-20 flex flex-col">
        {/* Study action bar — rendered by flashcard via portal target */}
        <div id="study-action-bar" />

        {/* Tabbar with ToolbarPane wrapping links */}
        <Tabbar labels icons={false}>
          <ToolbarPane>
            <TabbarLink
              active={page === 'study'}
              label="Study"
              onClick={() => setPage('study')}
            />
            <TabbarLink
              active={page === 'profile'}
              label="Profile"
              onClick={() => setPage('profile')}
            />
            <TabbarLink
              active={page === 'settings'}
              label="Settings"
              onClick={() => setPage('settings')}
            />
          </ToolbarPane>
        </Tabbar>
      </div>

      <Dialog
        opened={resetDialogOpen}
        onBackdropClick={() => setResetDialogOpen(false)}
        title="Reset Progress"
        content="Reset all learning progress? This cannot be undone."
        buttons={
          <>
            <DialogButton onClick={() => setResetDialogOpen(false)}>Cancel</DialogButton>
            <DialogButton onClick={handleReset} className="text-red-500">Reset</DialogButton>
          </>
        }
      />
    </Page>
  )
}
