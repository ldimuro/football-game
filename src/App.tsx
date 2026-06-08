import { useEffect, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { SetupScreen } from './components/screens/SetupScreen'
import { RoundHub } from './components/round/RoundHub'
import { DraftOffer } from './components/draft/DraftOffer'
import { RosterView } from './components/screens/RosterView'
import { CompleteScreen } from './components/screens/CompleteScreen'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { useTheme } from './logic/useTheme'

export default function App() {
  const { phase, initGame, isLoading, roster } = useGameStore()
  const [showRoster, setShowRoster] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => { initGame() }, [])

  useEffect(() => {
    if (phase === 'complete') setShowRoster(false)
  }, [phase])

  if (isLoading && phase === 'setup' && !roster.QB) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <ThemeToggle theme={theme} onToggle={toggleTheme} className="fixed top-4 right-4" />
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Generating your roster...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Nav */}
      {phase !== 'setup' && phase !== 'complete' ? (
        <nav className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wide text-sm">NFL DRAFT GAME</span>
          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              onClick={() => setShowRoster(v => !v)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {showRoster ? '← Back' : 'My Roster'}
            </button>
          </div>
        </nav>
      ) : (
        <ThemeToggle theme={theme} onToggle={toggleTheme} className="fixed top-4 right-4" />
      )}

      {/* Roster overlay */}
      {showRoster ? (
        <RosterView />
      ) : (
        <>
          {phase === 'setup' && <SetupScreen />}
          {phase === 'round-hub' && <RoundHub />}
          {phase === 'draft-offer' && <DraftOffer />}
          {phase === 'complete' && <CompleteScreen />}
        </>
      )}
    </div>
  )
}
