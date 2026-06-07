import { PlayerCard } from './PlayerCard'
import type { Roster, RosterPosition } from '../../types'

interface RosterGridProps {
  roster: Roster
  onReroll?: (position: RosterPosition) => void
  rerollsRemaining?: number
}

const POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']

export function RosterGrid({ roster, onReroll, rerollsRemaining = 0 }: RosterGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {POSITIONS.map(pos => {
        const slot = roster[pos]
        if (!slot) return (
          <div key={pos} className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-4 flex items-center justify-center">
            <span className="text-gray-600 text-sm">Loading...</span>
          </div>
        )
        return (
          <PlayerCard
            key={pos}
            slot={slot}
            position={pos}
            onReroll={onReroll ? () => onReroll(pos) : undefined}
            rerollsRemaining={rerollsRemaining}
          />
        )
      })}
    </div>
  )
}
