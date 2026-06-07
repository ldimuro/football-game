import { StatBar } from '../ui/StatBar'
import type { TeamStats } from '../../types'

function rankColor(rank: number): string {
  if (rank <= 8) return 'text-green-400'
  if (rank <= 24) return 'text-yellow-400'
  return 'text-red-400'
}

export function OpponentPreview({ opponent }: { opponent: TeamStats }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Opponent</h3>
      <p className="text-white font-bold text-lg mb-1">{opponent.team} <span className="text-gray-500 font-normal">'{String(opponent.year).slice(2)}</span></p>
      <div className="grid grid-cols-2 gap-x-4 mt-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Offense</p>
          <p className={`text-sm font-semibold ${rankColor(opponent.offenseRank)}`}>#{opponent.offenseRank}/32</p>
          <StatBar label="QB YPG" value={opponent.qbAvgYPG.toFixed(1)} />
          <StatBar label="RB YPG" value={opponent.rbAvgYPG.toFixed(1)} />
          <StatBar label="WR YPG" value={opponent.wrAvgYPG.toFixed(1)} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Defense</p>
          <p className={`text-sm font-semibold ${rankColor(opponent.defenseRank)}`}>#{opponent.defenseRank}/32</p>
          <StatBar label="Pts Allowed/G" value={opponent.defPointsAllowed.toFixed(1)} />
        </div>
      </div>
    </div>
  )
}
