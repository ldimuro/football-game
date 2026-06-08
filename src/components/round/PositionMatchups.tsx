import { PlayerCard } from '../roster/PlayerCard'
import type { Roster, RosterPosition } from '../../types'

const POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']
const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

interface PositionMatchupsProps {
  opponentTeam: string
  opponentRoster: Roster
  userRoster: Roster
}

function EmptySlot() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center min-h-[8rem]">
      <span className="text-gray-500 dark:text-gray-600 text-sm">—</span>
    </div>
  )
}

export function PositionMatchups({ opponentTeam, opponentRoster, userRoster }: PositionMatchupsProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">Position Matchups</h3>
      <div className="grid grid-cols-2 text-center text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
        <span>{opponentTeam}</span>
        <span>Your Team</span>
      </div>
      <div className="flex flex-col gap-6">
        {POSITIONS.map(pos => {
          const opponentSlot = opponentRoster[pos]
          const userSlot = userRoster[pos]
          return (
            <div key={pos}>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-center mb-2">{POSITION_LABELS[pos]}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {opponentSlot ? <PlayerCard slot={opponentSlot} position={pos} /> : <EmptySlot />}
                {userSlot ? <PlayerCard slot={userSlot} position={pos} /> : <EmptySlot />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
