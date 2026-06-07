import { StatBar } from '../ui/StatBar'
import { getTeamColor } from '../../logic/teamColors'
import type {
  TeamStats, Roster, RosterPosition, Player, TeamUnit,
  QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats,
} from '../../types'

function rankColor(rank: number): string {
  if (rank <= 8) return 'text-green-400'
  if (rank <= 24) return 'text-yellow-400'
  return 'text-red-400'
}

const POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']
const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

function headlineStat(slot: Player | TeamUnit): string {
  const s = slot.stats
  if ('passYPG' in s) return `${(s as QBStats).passYPG.toFixed(1)} pass YPG`
  if ('recYPG' in s) return `${(s as WRStats).recYPG.toFixed(1)} rec YPG`
  if ('rushYPG' in s) return `${(s as RBStats).rushYPG.toFixed(1)} rush YPG`
  if ('fgAccuracy' in s) return `${((s as KStats).fgAccuracy * 100).toFixed(1)}% FG`
  if ('sacksAllowedPerGame' in s) return `#${(s as OLineStats).normalizedRank} ranked`
  if ('sacksPerGame' in s) return `#${(s as DLineStats).normalizedRank} ranked`
  return `#${(s as SecondaryStats).normalizedRank} ranked`
}

function SlotSummary({ slot }: { slot: Player | TeamUnit | null }) {
  if (!slot) {
    return (
      <div className="flex-1 rounded-lg border border-dashed border-gray-800 px-3 py-2 flex items-center justify-center min-h-[3.25rem]">
        <span className="text-xs text-gray-600">—</span>
      </div>
    )
  }
  const name = 'name' in slot ? slot.name : `${slot.team} ${slot.position}`
  return (
    <div
      className="flex-1 min-w-0 rounded-lg border border-gray-800 border-l-4 bg-gray-950/50 px-3 py-2"
      style={{ borderLeftColor: getTeamColor(slot.team) }}
    >
      <p className="text-sm font-semibold text-white truncate">{name}</p>
      <p className="text-xs text-gray-500 truncate">{slot.team} '{String(slot.year).slice(2)} · {headlineStat(slot)}</p>
    </div>
  )
}

export function OpponentPreview({ opponent, opponentRoster, userRoster }: { opponent: TeamStats; opponentRoster: Roster; userRoster: Roster }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Opponent</h3>
      <p className="text-white font-bold text-lg mb-1 text-center">{opponent.team} <span className="text-gray-500 font-normal">'{String(opponent.year).slice(2)}</span></p>
      <div className="flex justify-center">
        <div className="grid grid-cols-2 gap-x-4 mt-3 w-full max-w-xs">
          <div>
            <p className="text-xs text-gray-500 mb-1 text-center">Offense</p>
            <p className={`text-sm font-semibold text-center ${rankColor(opponent.offenseRank)}`}>#{opponent.offenseRank}/32</p>
            <StatBar label="QB YPG" value={opponent.qbAvgYPG.toFixed(1)} />
            <StatBar label="RB YPG" value={opponent.rbAvgYPG.toFixed(1)} />
            <StatBar label="WR YPG" value={opponent.wrAvgYPG.toFixed(1)} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1 text-center">Defense</p>
            <p className={`text-sm font-semibold text-center ${rankColor(opponent.defenseRank)}`}>#{opponent.defenseRank}/32</p>
            <StatBar label="Pts Allowed/G" value={opponent.defPointsAllowed.toFixed(1)} />
          </div>
        </div>
      </div>

      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2 text-center">Position Matchups</h4>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-600 mb-1 px-1">
        <span>{opponent.team}</span>
        <span>Your Team</span>
      </div>
      <div className="flex flex-col gap-2">
        {POSITIONS.map(pos => (
          <div key={pos}>
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider text-center mb-1">{POSITION_LABELS[pos]}</p>
            <div className="flex gap-2">
              <SlotSummary slot={opponentRoster[pos]} />
              <SlotSummary slot={userRoster[pos]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
