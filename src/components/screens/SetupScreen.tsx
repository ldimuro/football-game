import { useGameStore } from '../../store/gameStore'
import { RosterGrid } from '../roster/RosterGrid'
import { Button } from '../ui/Button'
import type { RosterPosition } from '../../types'

export function SetupScreen() {
  const { roster, setupRerollsRemaining, rerollSetupSlot, confirmSetup, isLoading } = useGameStore()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Starting Roster</h1>
          <p className="text-gray-400 mt-1">
            {setupRerollsRemaining} re-rolls remaining — swap out any player before the season begins
          </p>
        </div>
        <Button onClick={confirmSetup} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Start Season →'}
        </Button>
      </div>
      <RosterGrid
        roster={roster}
        onReroll={(pos: RosterPosition) => rerollSetupSlot(pos)}
        rerollsRemaining={setupRerollsRemaining}
      />
    </div>
  )
}
