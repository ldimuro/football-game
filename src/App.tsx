import { useEffect, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { SetupScreen } from './components/screens/SetupScreen'
import { RoundHub } from './components/round/RoundHub'
import { DraftOffer } from './components/draft/DraftOffer'
import { RosterView } from './components/screens/RosterView'
import { CompleteScreen } from './components/screens/CompleteScreen'
import { GameScreen } from './components/game/GameScreen'
import { SettingsModal } from './components/ui/SettingsModal'
import { useTheme } from './logic/useTheme'

export default function App() {
  const { phase, initGame, isLoading, roster } = useGameStore()
  const [showRoster, setShowRoster] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => { initGame() }, [])

  useEffect(() => {
    if (phase === 'complete') setShowRoster(false)
  }, [phase])

  const gearButton = (className = '') => (
    <button
      onClick={() => setSettingsOpen(true)}
      aria-label="Open settings"
      className={`text-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
    >
      ⚙️
    </button>
  )

  if (isLoading && phase === 'setup' && !roster.QB) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        {gearButton('fixed top-4 right-4')}
        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} theme={theme} onToggleTheme={toggleTheme} />}
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Generating your roster...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Nav */}
      {phase !== 'setup' && phase !== 'complete' && phase !== 'game' ? (
        <nav className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wide text-sm">NFL DRAFT GAME</span>
          <div className="flex items-center gap-4">
            {gearButton()}
            <button
              onClick={() => setShowRoster(v => !v)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {showRoster ? '← Back' : 'My Roster'}
            </button>
          </div>
        </nav>
      ) : (
        gearButton('fixed top-4 right-4 z-40')
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} theme={theme} onToggleTheme={toggleTheme} />}

      {/* Roster overlay */}
      {showRoster ? (
        <RosterView />
      ) : (
        <>
          {phase === 'setup' && <SetupScreen />}
          {phase === 'round-hub' && <RoundHub />}
          {phase === 'draft-offer' && <DraftOffer />}
          {phase === 'game' && <GameScreen />}
          {phase === 'complete' && <CompleteScreen />}
        </>
      )}
    </div>
  )
}
