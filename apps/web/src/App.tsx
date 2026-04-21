import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation } from '@tanstack/react-router'
import { useVocabulary, useAppStore } from '@japanese-learning/core'
import { LanguageSelector } from './components/LanguageSelector'
import { LevelSelector } from './components/LevelSelector'
import { VocabularyProvider, useVocabContext } from './context/VocabularyContext'

/**
 * RootLayout — onboarding gate, compact header with hamburger menu, and route outlet.
 *
 * Renders loading/error states and the language/level selectors until the user
 * has made their selections, then renders the router outlet for child routes.
 */
export default function RootLayout() {
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)
  const { setLanguage, setLevel } = useAppStore()

  const { words, isManifestLoading, isManifestError, isVocabLoading, isVocabError, manifest, activeLang, activeLevel } =
    useVocabulary(selectedLanguageId, selectedLevelId)

  if (isManifestLoading) {
    return (
      <div className="app">
        <main className="app-main">
          <div className="loading">
            <div className="spinner" />
          </div>
        </main>
      </div>
    )
  }

  if (isManifestError) {
    return (
      <div className="app">
        <main className="app-main">
          <div className="error-msg">
            Failed to load vocabulary catalog. Check your connection and refresh.
          </div>
        </main>
      </div>
    )
  }

  if (!selectedLanguageId) {
    return (
      <div className="app">
        <main className="app-main">
          <LanguageSelector manifest={manifest!} onSelect={setLanguage} />
        </main>
      </div>
    )
  }

  if (!selectedLevelId) {
    return (
      <div className="app">
        <main className="app-main">
          <LevelSelector
            language={activeLang!}
            onSelect={setLevel}
            onBack={() => useAppStore.setState({ selectedLanguageId: null })}
          />
        </main>
      </div>
    )
  }

  return (
    <VocabularyProvider value={{ words, isVocabLoading, isVocabError, manifest: manifest!, activeLang: activeLang!, activeLevel: activeLevel! }}>
      <AppShell />
    </VocabularyProvider>
  )
}

function AppShell() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="app">
      <header className="app-header">
        {isHome ? <HomeHeader /> : <SubpageHeader />}
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>Requires Chrome or Edge · Progress saved automatically</p>
        <p>
          <a href="https://github.com/meesvandongen/japanese-learning" target="_blank" rel="noopener noreferrer" className="github-link">
            GitHub
          </a>
          {' · '}
          {__GIT_DATE__}
        </p>
      </footer>
    </div>
  )
}

function HomeHeader() {
  const { activeLang, activeLevel } = useVocabContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="header-compact">
      <span className="header-title-compact">
        {activeLang.name}
        {activeLevel && <span className="header-level-badge">{activeLevel.label}</span>}
      </span>
      <div className="menu-wrapper" ref={menuRef}>
        <button
          className="menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {menuOpen && (
          <nav className="menu-dropdown">
            <Link to="/profile" className="menu-item" onClick={() => setMenuOpen(false)}>
              Profile
            </Link>
            <Link to="/settings" className="menu-item" onClick={() => setMenuOpen(false)}>
              Settings
            </Link>
          </nav>
        )}
      </div>
    </div>
  )
}

function SubpageHeader() {
  const location = useLocation()
  const title = location.pathname === '/settings' ? 'Settings' : location.pathname === '/profile' ? 'Profile' : ''

  return (
    <div className="header-compact">
      <Link to="/" className="back-btn">← Back</Link>
      <span className="header-page-title">{title}</span>
    </div>
  )
}
