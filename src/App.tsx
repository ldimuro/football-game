import { useEffect, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { SetupScreen } from './components/screens/SetupScreen'
import { RoundHub } from './components/round/RoundHub'
import { DraftOffer } from './components/draft/DraftOffer'
import { RosterView } from './components/screens/RosterView'
import { CompleteScreen } from './components/screens/CompleteScreen'

export default function App() {
  const { phase, initGame, isLoading, roster } = useGameStore()
  const [showRoster, setShowRoster] = useState(false)

  useEffect(() => { initGame() }, [])

  useEffect(() => {
    if (phase === 'complete') setShowRoster(false)
  }, [phase])

  if (isLoading && phase === 'setup' && !roster.QB) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Generating your roster...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      {phase !== 'setup' && phase !== 'complete' && (
        <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="text-indigo-400 font-bold tracking-wide text-sm">NFL DRAFT GAME</span>
          <button
            onClick={() => setShowRoster(v => !v)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showRoster ? '← Back' : 'My Roster'}
          </button>
        </nav>
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
