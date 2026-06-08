import { useGameStore } from '../../store/gameStore'
import { RosterGrid } from '../roster/RosterGrid'
import { RosterSummary } from '../roster/RosterSummary'

export function RosterView() {
  const { roster } = useGameStore()
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Roster</h2>
      <RosterSummary roster={roster} />
      <RosterGrid roster={roster} />
    </div>
  )
}
